---
title: "Ephemeral Workspaces: Why We Give AI Agents 7-Day Disposable Chat Streams"
date: "2026-06-19"
slug: "ephemeral-zulip-spaces"
tags: ["Context Management", "Zulip", "BotHuddle", "Architecture", "State Machines"]
summary: "Agent communication was becoming a chaotic mess of overlapping context windows and noisy global channels. Our CI times were slowing down because agents were processing irrelevant chat history. We desperately needed a way to isolate agent workflows to reduce token costs and improve focus."
---
# Ephemeral Workspaces: Why We Give AI Agents 7-Day Disposable Chat Streams

**Motivation:** When we first launched BotHuddle, our autonomous agents communicated like a startup in a single open-plan office—everything happened in a few global Zulip channels like `#architecture` and `#frontend`. Within days, the context windows of our LLMs were completely overwhelmed. An `@auditor` agent trying to verify a California Regional Center spending plan line item under Title 17 was being fed conversations about DynamoDB indexing strategies from two days prior. When another agent was debugging an expense reimbursement flow for a family's specialized therapy provider, it was distracted by unrelated discussions about Next.js static builds. Token costs exploded, and hallucination rates spiked because the signal-to-noise ratio was abysmal. We desperately needed a way to isolate agent workflows to reduce token costs and improve focus on our core healthcare and fintech product.

To prevent context pollution, we engineered the concept of **Ephemeral Zulip Spaces**: hyper-isolated, temporary communication streams that exist only for the duration of a specific product task, and are then purged.

## The Architecture of a Breakout Room

*We built this isolation mechanism to ensure agents only saw the exact chronological reasoning they needed for their specific sub-task—such as validating an Individual Program Plan (IPP) milestone or reconciling an FMS timesheet—acting as a physical constraint on the LLM's context window.*

Instead of relying on LLMs to "ignore" irrelevant data via prompting, we constrained their physical access to data. When a lead agent (like the `@director`) identifies a complex sub-task that requires debate, it utilizes a Zod-validated tool called `spawn_ephemeral_space`.

This tool invocation doesn't just make an API call to Zulip; it triggers a strict state machine governed by our Compliance Engine. We use our standard immutable Builder pattern to persist the state to DynamoDB:

```typescript
export class EphemeralSpaceBuilder {
  private state: Partial<EphemeralSpaceState> = {};

  public withTopic(topic: string): this {
    this.state.topic = topic;
    return this;
  }

  public inviteAgents(agentIds: string[]): this {
    this.state.participants = agentIds;
    return this;
  }

  public build(): EphemeralSpace {
    if (!this.state.topic || !this.state.participants) {
      throw new Error("Invalid ephemeral space construction");
    }
    // Set a strict 7-day TTL for DynamoDB
    this.state.expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    return new EphemeralSpace(this.state as EphemeralSpaceState);
  }
}
```

Once the entity is built and persisted, an event-driven worker provisions the stream in Zulip, invites *only* the requested agents (e.g., `@developer` and `@qa`), and posts an initial structured briefing to ground the LLMs.

## Overcoming the Execution Challenges

*Implementing this wasn't as simple as making a few API calls. We immediately hit severe infrastructure roadblocks.*

### 1. The Zulip Rate Limiting Trap
Autonomous agents generate text an order of magnitude faster than humans. When an `@architect` and a `@developer` engaged in a deep debate about component state, they would fire dozens of messages a minute. Zulip's API aggressively rate-limited us, causing our agent orchestration loop to throw unhandled `429 Too Many Requests` errors.

We had to implement a local adaptive backoff queue. Before an agent's response hits Zulip, it is placed in an SQS FIFO queue with a minimum delay threshold, ensuring the conversation flows at a rate the API can digest.

### 2. The Knowledge Black Hole
The greatest challenge with ephemeral spaces is knowledge retention. If the space is destroyed, how does the global system remember the architectural decisions made inside it? 

We could not simply dump the raw transcript into our Semantic Discovery Engine—that would defeat the entire purpose of context reduction. 

To solve this, we introduced the **Knowledge Extraction Pipeline**:
1. When a space's task is marked complete, a specialized `@summarizer` agent is invoked.
2. It reads the entire chronological flow of the ephemeral debate.
3. It extracts *only* the final architectural decisions, the rejected alternatives, and the generated code payloads.
4. This highly condensed, markdown-formatted brief is then ingested into **Orama** (our in-memory vector database), completely unpolluted by the conversational back-and-forth.

## Automated Garbage Collection

Once the knowledge is safely extracted, the space must be purged to respect data privacy and maintain a clean Zulip UI. We rely on DynamoDB's native TTL features combined with a nightly Lambda worker to enforce this.

```typescript
export const gcWorker = async () => {
    // Fetch spaces where the TTL has expired
    const expiredSpaces = await EphemeralSpace.query()
      .index('expiresAtIndex')
      .lt(Math.floor(Date.now() / 1000))
      .exec();

    for (const space of expiredSpaces) {
        // Destroy the Zulip stream
        await zulip.streams.deleteById(space.streamId);
        
        // Mark the immutable entity as terminated
        const terminatedSpace = space.transitionTo('TERMINATED');
        await repository.save(terminatedSpace);
    }
};
```

## Alternatives Rejected

Why go through the effort of building dynamic Zulip streams?

- **Global Shared Memory**: Stifled organic conversational debate. Agents were constantly apologizing for interrupting other threads.
- **Vector Databases (RAG) Only**: We use RAG for discovery, but RAG destroys the causal, chronological flow of reasoning. Agents need a linear chat history to understand *why* a peer rejected their code.
- **Slack/Discord Threads**: Slack's threading model proved too complex for standard LLM ingestion contexts, and Discord's API rate limits were even harsher than Zulip's. 

By building Ephemeral Zulip Spaces, we successfully walled off agent context windows, drastically lowering our LLM overhead and ensuring that when an agent writes code, it is focused purely on the task at hand.
