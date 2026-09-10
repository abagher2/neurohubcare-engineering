---
title: "The Planning Matrix: How We Stopped 50 Autonomous Agents From Colliding in Git"
date: 2026-06-05T09:00:00Z
author: "NeuroHub Engineering Team"
tags: ["multi-agent-systems", "bothuddle", "concurrency", "architecture", "typescript", "python", "ai"]
summary: "As we deployed more agents to handle background processing, we started experiencing silent data corruption. Multiple agents would independently decide to update the same regional center workflow at the same time. Because LLM reasoning cycles take 30-90 seconds, traditional database locks were either timing out or causing cascading deadlocks across the platform."
---

# The Planning Matrix: How We Stopped 50 Autonomous Agents From Colliding in Git

As NeuroHub scaled its background processing capabilities to serve thousands of families across multiple regional centers, we deployed an increasing number of autonomous agents. These agents were tasked with handling complex, asynchronous workflows: verifying Regional Center compliance checks, processing sprawling medical documents, and conducting automated reimbursement reconciliations. The promise of this architecture was massive operational leverage, but as our fleet of agents grew, this increased automation introduced a critical, insidious vulnerability: silent data corruption.

## The Concurrency Crisis

In our initial implementations, we observed a pattern where multiple agents would frequently—and entirely independently—decide to update the exact same regional center workflow at the same time. In standard, human-driven web applications, we solve these problems easily. We rely on Optimistic Concurrency Control (OCC) or simple pessimistic locking in our database layer. A user clicks a button, a lock is acquired (or a version number is checked), the transaction completes in 50 milliseconds, and the lock is released. 

But AI agents fundamentally break traditional concurrency models. An LLM reasoning cycle is not a 50-millisecond operation. Depending on the complexity of the prompt and the size of the context window, an agent's reasoning cycle can take anywhere from 30 to 90 seconds. 

If an agent acquires a lock, reads the database state, spends a full minute "thinking" about a complex authorization policy, and then finally attempts a write, any traditional DynamoDB conditional expression will likely fail due to intervening writes by other components. When OCC fails in a traditional app, you just ask the user to refresh. When OCC fails for an agent, the agent must retry the entire 90-second reasoning cycle. This burns massive amounts of AI tokens, incurs huge API latencies, causes cascading deadlocks as multiple agents enter synchronized retry storms, and severely degrades the overall throughput of the system. 

To prevent these autonomous actors from corrupting domain state or entering catastrophic retry loops, we designed and built **The Planning Matrix**, a robust, in-memory spatial-temporal reservation system native to our AWS Amplify and DynamoDB stack.

## The Pivot from BotHuddle to Antigravity

Our journey to The Planning Matrix was not a straight line. Initially, we attempted to orchestrate our multi-agent matrix using BotHuddle, running on a custom Zulip/Forgejo architecture. We thought that treating agents like chat participants in a persistent matrix would elegantly solve coordination. 

However, we quickly realized that maintaining an always-on, persistent cluster for agent coordination was a massive architectural mistake and prohibitively expensive. BotHuddle was burning over $350/mo purely in idling infrastructure costs, long before we even factored in the actual LLM inference overhead or the operational burden of managing a parallel messaging architecture just for machines. 

Consequently, we made the hard decision to kill the BotHuddle integration entirely. We pivoted completely to utilizing Antigravity's local `/teamwork` slash commands for orchestration. This shift allowed us to execute highly localized, on-demand agent interactions directly within our Next.js architecture, leaning entirely on our serverless AWS infrastructure (DynamoDB, AppSync, EventBridge) to manage state, rather than a separate chat matrix.

## The Vector of Intent

We needed a mechanism for agents to definitively "call their shots" *before* they initiated their expensive LLM reasoning cycles. Instead of locking a database row, which blocks all reads and writes, an agent submits a "Vector of Intent" to the Planning Matrix. 

This vector mathematically defines the boundaries of the agent's planned operation:
- **Spatial Bounds**: The precise URIs or DynamoDB partition keys the agent intends to mutate. This isn't just one record; it's a declared graph of dependencies.
- **Action Type**: The severity of the operation (`READ`, `MODIFY_CRITICAL`, `APPEND_ONLY`).
- **Temporal Window**: An estimated time-to-completion, serving as an absolute Time-To-Live (TTL).
- **Priority Class**: The task's urgency (e.g., synchronous user request, which is extremely high, vs. asynchronous background audit, which is low).

### Matrix Implementation in DynamoDB

To enforce these reservations globally across our distributed serverless environment, we implemented a centralized matrix registry backed by a high-throughput DynamoDB table with TTL enabled. We use Global Secondary Indexes (GSIs) on the spatial bounds to rapidly query for overlapping intents without doing full table scans.

Before an agent begins its LLM generation phase, it must successfully build and persist a reservation entity. We enforce strict validation using our standard entity construction patterns, guaranteeing that the entity is perfectly well-formed before it touches the network. For a deep dive into how we handle persistence safety across the codebase, see our detailed guide on [Strict ORM Builders](/2026-09-18-strict-orm-builders).

```typescript
export class PlanningMatrixService {
  async requestReservation(intent: IntentVector): Promise<Reservation> {
    if (await this.hasActiveConflict(intent.uris)) {
        return this.rulesEngine.resolveConflict(intent);
    }
    const reservation = ReservationBuilder.build(intent);
    await this.dynamoDb.put(reservation);
    return reservation;
  }
}
```

By ensuring that the entire lifecycle of a reservation is routed through a rigorous `Builder.build()` pattern, we guarantee that no malformed intents ever enter the matrix. If the Rules Engine detects a conflict, it evaluates the priority classes and decides whether to reject the new intent, queue it, or evict the existing one.

## Heartbeats and Edge Cases: The Stalling LLM

One of the most challenging edge cases we encountered involved generation stalls and transient network failures from upstream LLM providers. What happens if an agent requests a 60-second temporal window based on historical averages, but a sudden spike in AI API latency pushes its reasoning cycle to 120 seconds? If the DynamoDB TTL expires, the matrix assumes the agent died. Another agent might step in, acquire a new reservation for the same spatial bounds, and begin its own reasoning cycle. When the first agent finally finishes and writes its data, we get a collision.

To solve this without reverting to pessimistic locks, we implemented an asynchronous heartbeat mechanism via AWS SQS. As the agent streams tokens back to the AppSync GraphQL subscription, a lightweight background thread pulses an SQS queue every 10 seconds. An AWS EventBridge rule consumes these pulses and conditionally extends the DynamoDB TTL for the reservation. This ensures the lock remains active *only* as long as the agent is tangibly making progress and actively streaming tokens. If the LLM provider hangs completely, the heartbeat stops, the TTL expires, and the system self-heals.

## Preemption, Starvation, and UI Dominance

A core tenet of NeuroHub's architecture is UI Dominance: critical human-in-the-loop workflows must never be blocked by background agent tasks. The UI must always remain buttery smooth and immediately responsive. 

If a human Coordinator interacts with the NeuroHub Action Center to manually approve a Receipt, and a low-priority agent is currently holding a reservation on that Receipt to run an automated fraud audit, the human cannot be asked to wait 60 seconds. In this scenario, the matrix issues an immediate `EVICT` signal to the agent.

This eviction mechanism relies heavily on AppSync subscriptions. When the human action triggers the eviction via a GraphQL mutation, the AppSync layer broadcasts a cancellation token directly to the agent's serverless execution context. The agent's internal loop catches this token, halts the LLM inference mid-stream, cleans up its memory footprint, and exits gracefully. 

To prevent lower-priority background tasks from suffering permanent starvation (where they are constantly evicted by human activity and never finish), we utilize a Priority Escalation Algorithm. Every time a background task is evicted, its priority class is permanently boosted upon the subsequent retry. This ensures that even the lowest-priority background tasks eventually graduate to a high enough priority to run to completion, a crucial balance we also explored during our UI synchronization work on [Visual Testing](/2026-07-15-visual-testing-and-local-llm-migration).

## Alternatives Rejected

During the massive architectural design phase that led to The Planning Matrix, we rigorously evaluated several standard concurrency models, ultimately finding them fundamentally incompatible with our specific AI-driven serverless architecture:

- **Strict Actor Model**: We experimented with placing each workflow behind a strict single-threaded actor. However, this approach severely bottlenecked parallel reads. It also violated our core stateless ORM principles, forcing us to maintain stateful containers in an ecosystem designed to be entirely serverless.
- **Generic Distributed Mutexes**: We built a prototype using standard DynamoDB distributed locks (locking a whole row with a boolean flag). These standard locks lacked any semantic awareness. They forced sequential execution on entirely unrelated updates to the same parent entity, drastically reducing the overall throughput of our system. 
- **SQS FIFO Queues for Serialization**: We tried dumping all requests into an SQS FIFO queue grouped by entity ID. While this guaranteed ordering, it destroyed our ability to process non-conflicting sub-tasks in parallel and introduced unacceptable latency for high-priority UI updates.

By designing and utilizing The Planning Matrix, NeuroHub successfully achieved safe, highly concurrent multi-agent operations, entirely eliminating silent data corruption without sacrificing the infinite scalability of our AWS serverless foundation.
