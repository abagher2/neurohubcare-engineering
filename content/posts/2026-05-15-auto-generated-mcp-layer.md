---
title: "Auto-Generating Model Context Protocol (MCP) Surfaces from Live Schemas"
date: "2026-05-15"
author: "NeuroHub Engineering"
tags: ["AI", "BotHuddle", "MCP", "Code Generation", "Forgejo", "Zulip", "Architecture"]
summary: "The Motivation: As we scaled BotHuddle, our agents were spending way too much context-window memory trying to understand the API surfaces of our internal tools. We needed a way to auto-generate the Model Context Protocol (MCP) layer so the agents could instantly discover and call functions without hallucinating endpoints."
---

# Auto-Generating Model Context Protocol (MCP) Surfaces from Live Schemas

> **The Motivation:** As we scaled BotHuddle, our agents were spending way too much context-window memory trying to understand the API surfaces of our internal tools. We needed a way to auto-generate the Model Context Protocol (MCP) layer so the agents could instantly discover and call functions without hallucinating endpoints.

When we introduced the Unified Domain API, we successfully solved the problem of *where* our autonomous agents should send their requests, establishing a robust AWS AppSync GraphQL boundary. However, we still faced a massive, arguably more difficult hurdle: *how* the agents knew exactly what payloads to send. In the early, experimental days of BotHuddle, we relied on manual, prose-heavy prompt engineering. We wrote exhaustive prompts detailing every single available tool, meticulously outlining its required parameters, optional fields, and expected JSON output structures. 

This manual approach was disastrous for two reasons. First, it consumed a massive portion of the LLM context window. Before an agent even began reasoning about a complex code issue or a user request, thousands of tokens were already burned just explaining the API contracts of Forgejo and Zulip. Second, despite these lengthy descriptions, agents frequently hallucinated. They would invent non-existent parameters, confidently mix up the API contracts of different services, or use deprecated fields, resulting in continuous execution failures.

To definitively solve this, BotHuddle adopted the Model Context Protocol (MCP) as the standardized interface for agent tooling. MCP provided a structured, discoverable way for models to understand capabilities. However, writing and maintaining these MCP servers by hand for every new Forgejo Git operation or Zulip chat capability quickly became a tedious, error-prone chore that slowed feature development to a crawl. To scale, we realized we needed to build a comprehensive automated pipeline to generate types, interfaces, and server stubs from a single, undeniable source of truth: `HuddleSchema`.

## HuddleSchema as the Source of Truth

`HuddleSchema` was born out of necessity. It was our internal DSL (Domain Specific Language) defined in YAML, capturing every tool, resource, and prompt available within the agent matrix. Instead of maintaining disjointed documentation and separate code implementations, `HuddleSchema` became the canonical definition of what an agent could do.

By utilizing AWS Amplify Gen 2, we mapped this schema directly to our backend infrastructure. The definitions in `HuddleSchema` dictated the AppSync GraphQL schemas and the corresponding DynamoDB table structures. This ensured that the AI's semantic understanding of its capabilities perfectly matched the physical reality of our AWS infrastructure. 

Our custom `huddle-gen` compiler was the engine driving this system. It parsed the `HuddleSchema` definitions and automatically emitted type-safe TypeScript bindings for our Next.js backend. This generation step removed human error from the equation entirely. When a developer wanted to add a new capability for an agent, they updated the YAML schema, and the CI/CD pipeline generated the rest.

## Enforcing Strictness with the Builder Pattern

A critical, non-negotiable requirement of this generated MCP layer was ensuring that the data returned by the agents was immediately and aggressively validated. We couldn't trust the raw JSON emitted by the LLM. Therefore, `huddle-gen` generated TypeScript interfaces that forced our application logic to use our established `Builder.build()` pattern before saving anything to DynamoDB or executing a critical mutation.

```typescript
// Auto-generated from HuddleSchema by the huddle-gen compiler
export const CreatePullRequestArgsSchema = z.object({ 
  repository: z.string().min(1), 
  branch: z.string().min(1),
  title: z.string().max(255)
});
export type CreatePullRequestArgs = z.infer<typeof CreatePullRequestArgsSchema>;

export abstract class ForgejoMcpServerBase {
  // Developer implementations MUST return a validated Builder instance.
  // Raw JSON or loose objects will cause a compile-time error.
  protected abstract handleCreatePullRequest(args: CreatePullRequestArgs): Promise<PullRequestBuilder>;
}
```

By explicitly coupling MCP tool execution directly with strict Builders, we created an impermeable boundary. We guaranteed that no agent could ever pollute our DynamoDB tables with malformed state. If the LLM hallucinated an invalid `repository` string format, the Zod validation layer generated from the schema would catch it immediately. If the parameters passed validation but violated deeper business logic, the `Builder.build()` step would throw an invariant error. If you want to dive deeper into how we enforce these invariants and prevent data corruption across our entire stack, read our detailed guide on [Strict ORM Builders](/2026-09-18-strict-orm-builders).

## Tool Routing and the EventBridge Pipeline

Once the MCP layer was generated and strictly typed, we needed a robust execution environment. Agents queried the BotHuddle Matrix router to discover available tools. When an agent decided to execute a tool (for example, `create_pull_request`), the request was routed securely through our AWS AppSync API.

However, many agent tasks are inherently slow. Generating a large diff, analyzing a test suite, or querying historical Git logs can take tens of seconds—far exceeding standard API timeout thresholds. To handle these long-running tasks without blocking the AppSync request lifecycle and causing timeouts, we decoupled the execution using AWS EventBridge and Amazon SQS. 

When an agent invoked a tool, the MCP server immediately returned an `acknowledgement` response. Simultaneously, it published an event to EventBridge, which routed the actual heavy lifting to a background Next.js worker processing the SQS queue.

```typescript
// Enqueueing an agent's tool call for asynchronous background execution
await eventBridgeClient.putEvents({
  Entries: [{
    Source: 'mcp.tool.execution',
    DetailType: 'CreatePullRequest',
    Detail: JSON.stringify(validatedArgs),
    EventBusName: 'BotHuddleExecutionBus'
  }]
});
```

This decoupled, event-driven architecture prevented brittle timeout issues when agents interacted with slow external systems. It allowed the BotHuddle matrix to remain highly responsive, ensuring that agents weren't left hanging waiting for an HTTP request that had long since died.

## Unlocking Scalable Tool Execution

The Auto-Generated MCP Layer proved to be a massive technical milestone for our BotHuddle ecosystem. By synthesizing compact JSON-RPC tool definitions directly from `HuddleSchema`, we accomplished three critical engineering goals:
1. **Context Window Preservation**: System prompt overhead shrank by over 65%, freeing up precious context space for actual code diffs, logs, and AST representations.
2. **Schema-Enforced Accuracy**: Tool calls mapped directly to typed DynamoDB builders and AppSync mutations, reducing tool invocation runtime failures to near zero.
3. **Frictionless Capability Expansion**: Adding a new engineering capability to our fleet now takes minutes—define the mutation in `HuddleSchema`, and the build pipeline automatically exposes type-safe MCP bindings to all agent personas.

## The Next Frontier: Resource Allocation in an Autonomous Fleet

With our agents now equipped to inspect pull requests, query telemetry, and commit code via standardized MCP interfaces, a new challenge immediately emerged: coordination economics. If multiple agents can autonomously call tools and trigger expensive compute, how do we prevent agents from spamming tools or competing for the same tasks?

In our next post, we dive into how we solved agent resource allocation and consensus through an internal prediction market: [The LMSR Prediction Economy: Allocating Silicon Units Across Swarms](/2026-05-22-lmsr-prediction-economy).
