---
title: "The 1-Second Context Boundary: Turbocharging Local Tool Discovery for LLMs"
date: 2026-05-29T09:00:00-07:00
draft: false
tags: ["AI", "Agents", "BotHuddle", "Architecture", "Performance", "MCP"]
author: "NeuroHub Engineering"
summary: "As our agent pool scaled, the latency of context loading became a crippling bottleneck. Agents were stalling for over 8 seconds per task just to assemble necessary context from Forgejo and Zulip, leading to timeouts and a terrible developer experience. We had to drastically rethink our data retrieval architecture to achieve sub-second latency."
---
# The 1-Second Context Boundary: Turbocharging Local Tool Discovery for LLMs

In the early, ambitious days of NeuroHub's agentic infrastructure, we relied heavily on **BotHuddle**—a distributed, heavily-networked multi-agent system wired together through Zulip for threaded messaging and Forgejo for source control. As our agent pool scaled to handle more complex engineering tasks, a severe and insidious architectural flaw reared its head: the latency of context loading became a crippling system-wide bottleneck. 

When a standard Model Context Protocol (MCP) tool was invoked by an agent to pull the latest state of a ticket, that agent was forced to stall for over 8 seconds. It had to wait idly while the system reactively fetched the latest chat threads from Zulip, queried Forgejo for code diffs, compiled the massive system prompt, and formatted it all into a dense, nested JSON payload. This reactive pulling strategy led to relentless LLM API timeouts. We were using models that aggressively dropped HTTP connections if the first byte of the prompt wasn't received within 10 seconds. The cascading failures this caused resulted in wasted token generation, corrupted agent states, and a frankly terrible developer experience for the engineers monitoring the system. We had to drastically rethink our entire data retrieval architecture to achieve sub-second latency.

## The Anatomy of the Context Payload

To understand why this was taking 8 seconds, you have to look at what was actually inside our MCP context payload. We weren't just passing a few lines of chat history. A single context window for a BotHuddle agent included:

1. **The Zulip Thread History**: A deeply nested markdown representation of the last 50 messages, including threaded replies and agent critiques.
2. **Forgejo Git Diffs**: The unified diff of the current working branch against `main`, which could easily span hundreds of lines.
3. **ORM Schemas**: The exact TypeScript types and database schema definitions relevant to the current task.
4. **Business Logic Rules**: Extracts from our compliance engine detailing specific state-level healthcare regulations.

Aggregating this dynamically involved making four to five sequential REST API calls, paginating through responses, parsing JSON, and performing heavy string concatenation on a serverless worker. It was fundamentally unscalable.

## The Architectural Shift: Proactive Eager Resolution

To hit our strict sub-second latency goals, we realized we had to completely invert the data flow. We shifted away from a lazy, reactive pull model to a proactive, eager context resolution strategy. Furthermore, we had to accomplish this entirely within our strict serverless engineering mandates: we exclusively use AWS Amplify, AppSync GraphQL, DynamoDB, and Next.js. 

The architecture we settled on relied on three core pillars:

1. **Eager Context Resolution via SQS**: Instead of waiting for an agent to explicitly ask for context, we processed the context ahead of time. Every single webhook from Zulip (on message sent) and Forgejo (on commit pushed) was immediately ingested via API Gateway and pushed directly onto an Amazon SQS queue. SQS was critical here to buffer massive traffic spikes during busy development hours, ensuring we didn't exhaust our Lambda concurrency limits.
2. **Distributed Delta Caching in DynamoDB**: A fleet of background workers (AWS Lambda functions written entirely in TypeScript) consumed these SQS events, computed the exact text deltas, and stored them as immutable, pre-rendered string chunks in DynamoDB. 
3. **AppSync GraphQL Subscriptions**: Instead of relying on slow HTTP GET polling or trying to maintain heavy gRPC layers, we utilized AppSync's native GraphQL subscriptions to stream context chunks to the agents in real-time over WebSockets.

### Enforcing Strict Entities in the Eager Resolver

In earlier prototypes at other companies, teams often default to using Python scripts and Redis clusters for this kind of background string concatenation and caching. However, our engineering mandates strictly prohibit Python backends and Redis. We do not want to manage VPCs, subnets, or containerized state. Everything had to be strongly typed TypeScript running serverless.

When an SQS worker processed a webhook, it didn't just dump a raw string into DynamoDB. It instantiated a strictly typed context entity. Following our core domain rules, these entities could not be haphazardly assembled. We heavily enforced the `Builder.build()` pattern to ensure the context delta was schema-valid, correctly time-stamped, and cryptographically hashed before persistence. 

For a deeper dive into why we rigorously enforce this instantiation pattern across the entire company to prevent malformed data, refer to our foundational post on [Strict ORM Builders](/2026-09-18-strict-orm-builders).

```typescript
// src/lib/mcp/eager-resolver.ts
export async function processWebhookEvent(eventData: WebhookEvent) {
    // 1. Compute the exact markdown delta from the event
    const deltaStr = computeTextDelta(eventData);
    
    // 2. Enforce strict entity construction before saving to DynamoDB
    // This builder validates length, prevents XSS, and signs the payload
    const contextDelta = new ContextDeltaBuilder()
        .setAgentId(eventData.targetAgentId)
        .setPayload(deltaStr)
        .setTimestamp(Date.now())
        .build();

    // 3. Persist the immutable chunk to our Single-Table design
    await dynamoDbClient.put({
        TableName: 'AgentContexts',
        Item: contextDelta.serialize()
    });
}
```

### Real-Time Delivery via AppSync Clients

By pre-computing the context on the backend, the actual "Pull" operation requested by the agent was no longer a heavy, multi-API computation—it was a simple, lightning-fast DynamoDB point read. 

Even better, by leveraging AWS AppSync, agents could subscribe to updates and receive context seamlessly as it was being built in the background. 

```typescript
// src/lib/mcp/context-client.ts
const subscription = API.graphql({
    query: OnContextUpdated,
    variables: { agentId: 'agent-123' }
}).subscribe({
    next: ({ provider, value }) => {
        const chunk = value.data.onContextUpdated;
        appendToLocalLLMContext(chunk.payload);
    }
});
```

This streaming WebSocket approach allowed the LLM to immediately begin parsing static system rules and prior context, while the dynamic, fast-moving chat messages arrived seamlessly over the subscription. This completely eliminated API timeouts and plummeted our p99 context loading latency to well under 800 milliseconds.

## Alternatives Rejected

We documented our failed experiments rigorously to prevent future teams from repeating our historical mistakes. When evaluating how to solve the context bottleneck, we discarded several competing approaches:

- **Naive REST Polling**: Having the agents blindly poll or recompute context on every `GET` request was our original sin. It was far too slow, wasted massive amounts of compute, and eventually caused our internal Forgejo instance to aggressively rate-limit and IP-ban our own agent IP addresses.
- **Custom WebSocket Firehose**: We attempted building a custom WebSocket server on top of API Gateway to blast raw events directly at the LLMs. This forced the stateless agents to manage complex internal state machines and manually reconstruct the chat history. This defeated the entire standardized purpose of the Model Context Protocol. AppSync gave us the structured, typed streaming we needed without the custom boilerplate.
- **Containerized Redis Caching**: We briefly flirted with spinning up Dockerized Redis clusters to hold the pre-computed context strings in memory for faster reads. However, this blatantly violated our strict serverless AWS Amplify mandates, introduced unacceptable operational overhead, and required managing VPC peering which we explicitly avoid.

## Unlocking Sub-Second Agent Coordination

Achieving sub-second context injection was a monumental engineering milestone for BotHuddle. By shifting from naive REST polling to WebSocket streaming over AppSync, our agents could begin reasoning almost instantly upon receiving a task.

This speed unlocked entirely new possibilities for real-time peer review and collaborative multi-agent problem-solving. As we scale the BotHuddle fleet into more complex multi-step workflows, maintaining this 1-second context boundary ensures our agents spend their time reasoning, not waiting.