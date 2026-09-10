---
title: "The Unified UI Dashboard: A Single Pane of Glass for Autonomous Fleets"
date: "2026-07-03"
slug: "unified-ui-dashboard"
summary: "Providing human operators a single pane of glass into the autonomous fleet with React, WebSockets, and LMSR visualization."
tags: ["UI", "Dashboard", "BotHuddle", "React", "WebSockets"]
---

To monitor our autonomous fleet's active LMSR (Logarithmic Market Scoring Rule) predictions and execution states, we needed significantly more than just a standard CRUD interface. We built the Unified UI Dashboard—a real-time, highly responsive single pane of glass designed to visualize agent wagers, streamline human-in-the-loop overrides, and adapt dynamically to the localized domain languages of various Regional Centers. 

The core engineering challenge was not merely rendering static data, but handling high-frequency telemetry streams from hundreds of active tasks simultaneously, all while maintaining our strictly serverless AWS architecture based on Amplify, AppSync GraphQL, and a Next.js Static Export frontend. 

## The Problem: Domain Language Fragmentation

Regional Centers in California are notoriously fragmented in their terminology. Depending on the district, an agent processing a client's expenses might be handling "Invoices", "Receipts", or "Disbursements". The clients they serve might be referred to as "Consumers", "Participants", or "Individuals". Initially, our UI layer was riddled with conditional logic checking the user's `programType` and region to swap out labels. This quickly devolved into unmaintainable spaghetti code, making the dashboard exceptionally fragile, difficult to test, and highly prone to localization bugs that would confuse operators.

To solve this systematically, we abstracted all terminology into a strict Strategy Pattern injected directly at the React Context level. The frontend remains entirely agnostic, rendering generic `FinancialDocument` or `ClientProfile` components, while the injected dictionary translates the domain layer at runtime. This cleanly decoupled our business logic from presentation, ensuring our [Multi-Modal Telemetry](/2026-07-07-multi-modal-telemetry) streams could remain uniform and standardized across the entire fleet, while the human operators saw their familiar regional terms on screen. We strictly enforce this separation at the CI level—absolutely no regional string literals are permitted to exist in the core components.

## High-Frequency Telemetry with AppSync Subscriptions

Monitoring an autonomous fleet requires millisecond precision. Agents continuously broadcast state transitions, confidence scores, and proposed workflow mutations as they evaluate user tasks. Initially, we considered unidirectional Server-Sent Events (SSE), but they inherently lacked the robust bidirectional capability required for immediate human intervention when an agent gets stuck in a loop or makes a dubious wager. 

Instead of deploying a custom WebSocket server—which would explicitly violate our serverless, Kubernetes-free operational constraints—we leaned heavily into AWS AppSync GraphQL Subscriptions. 

Our data layer is built entirely on a DynamoDB single-table design. Agent telemetry and LMSR wagers are written continuously with carefully constructed sort keys such as `SK=AGENT#<id>#TIME#<timestamp>`. To prevent our DynamoDB storage costs from ballooning infinitely due to the sheer volume of telemetry, we heavily utilize Time-To-Live (TTL) attributes. Raw micro-state telemetry is automatically expired after 7 days, while critical milestone transitions are aggregated and persisted long-term. For querying historical data, we leverage Global Secondary Indexes (GSIs) heavily, allowing operators to instantly pull up the complete timeline of a finalized workflow without scanning the entire table.

To achieve real-time broadcasting, we leveraged DynamoDB Streams hooked into EventBridge and an intermediate AWS Lambda function. Every agent state mutation triggers an AppSync mutation using a `None` data source (a Local Resolver) that subsequently broadcasts to all subscribed operator dashboards. 

```graphql
type Subscription {
  onAgentStateChange(fleetId: ID!): AgentState
    @aws_subscribe(mutations: ["broadcastAgentState"])
}
```

However, the sheer volume of agent chatter threatened to completely overwhelm both the browser's main thread and AppSync's hard connection limits. A single complex workflow evaluation could easily emit hundreds of micro-state changes per second. If we bound these directly to React state, the application would grind to a halt in an endless loop of garbage collection and DOM reconciliation.

We introduced a sophisticated RxJS multiplexing layer on the client. Instead of opening hundreds of discrete subscriptions for individual agents, the client opens a single multiplexed AppSync subscription for the entire fleet context. We then heavily utilize RxJS operators (`bufferTime`, `distinctUntilChanged`, `scan`) to throttle, batch, and deduplicate the incoming updates before they ever hit the React rendering cycle. This architecture dropped our React re-render rate by over 90% while still maintaining a perceptually real-time, buttery smooth dashboard. 

## Handling Reconnection Edge Cases and Optimistic Updates

One major edge case with AppSync Subscriptions is robustly handling network jitter. If an operator's laptop drops its Wi-Fi connection for even 5 seconds, they miss critical agent transitions. Because AppSync Subscriptions are fire-and-forget and do not replay missed messages upon reconnection, we had to build a custom synchronization mechanism.

When RxJS detects an AppSync reconnection event, it doesn't just blindly resume listening. It automatically fires a REST-like GraphQL query to fetch the absolute latest authoritative state from DynamoDB, calculates the delta against the stale local state, and reconciles the local state tree. Only after this rigorous reconciliation does it resume applying the real-time subscription patches. This guarantees the dashboard never displays stale agent states or missed human-in-the-loop approval requests.

Furthermore, when operators inject an override, we have to provide immediate optimistic feedback. Given the latency of a full DynamoDB roundtrip, waiting for the subscription to reflect an operator's manual action felt sluggish. The RxJS layer intercepts outgoing mutations, optimistically patches the local stream, and only reverts if the AppSync mutation explicitly fails or times out. This rollback mechanism is implemented via an RxJS `scan` operator that maintains a history of pending optimistic patches alongside the confirmed server state. If a rollback is triggered, the pending patch is discarded, and the UI flawlessly snaps back to the authoritative DynamoDB state, surfacing a non-intrusive error toast to the operator.

## In-Memory Semantic Search on the Edge

With hundreds of concurrent agent workflows, operators needed a way to instantly find specific tasks based on abstract concepts, not just exact IDs. For example, a supervisor might want to "Find the invoice where the agent was uncertain about the tax code." 

Initially, we built this capability using a PostgreSQL database with the `pgvector` extension. However, maintaining a highly available Postgres cluster just for semantic search directly violated our core serverless ethos and rapidly drove up our monthly AWS bill. The continuous connection pooling issues with Next.js Serverless Functions only compounded the pain.

To resolve this, we completely ripped out Postgres and pivoted to an entirely in-memory architecture using Orama combined with Gemini embeddings. When the Next.js Static Export dashboard loads, it hydrates a localized Orama search index directly in the browser's memory. As the AppSync multiplexed subscription receives new agent telemetry, it dynamically updates this local Orama index on the fly. 

When an operator types a query, we perform a lightning-fast vector search against the browser's memory. This eliminated the need for a dedicated vector database, cut our search latency to near zero, and saved thousands of dollars a month, proving that powerful semantic discovery doesn't strictly require heavy backend infrastructure.

## Visualizing Logarithmic Market Scoring Rules (LMSR)

Our agents don't just execute static, predefined workflows; they dynamically place wagers on the success probability of different resolution paths using an LMSR model. Rendering these continuous probability distributions in real-time required specialized, high-performance visualization. 

Standard DOM-based charting libraries like Recharts or Chart.js suffered from severe performance jank when updating thousands of data points at 60 frames per second. The browser's garbage collection pauses alone made the UI feel remarkably sluggish, completely ruining the "single pane of glass" illusion. 

To overcome this fundamental limitation, we built a custom WebGL-accelerated React component. We bypassed the DOM entirely for the market curves. We feed the RxJS telemetry stream directly into WebGL buffer attributes, fully offloading the intense market curve calculations and the rendering pipeline to the GPU. 

```tsx
// Reactive WebGL Market Visualization
const MarketView = ({ marketId }) => {
    // Throttled stream of LMSR market state piped to GPU
    const data = useObservable(() => marketStream$(marketId).pipe(throttleTime(16)));
    return <canvas ref={canvasRef} />;
};
```

Early iterations of our WebGL component suffered from visual tearing because the RxJS telemetry stream was updating the GPU buffer attributes faster than the monitor's refresh rate. We had to implement a strict double-buffering system within the React component, ensuring that the canvas only swaps buffers on the `requestAnimationFrame` boundary, regardless of how aggressively the RxJS stream pumps new coordinates. 

By leaving the JavaScript main thread free to handle the AppSync WebSockets and Next.js UI interactions, the dashboard remains perfectly fluid, even when monitoring highly volatile market states as multiple agents rapidly adjust their wagers based on influxes of new environmental data. 

## Quality Assurance at Scale: Solving the VRAM Crisis

With such a complex, real-time interface heavily reliant on Canvas elements, ensuring visual consistency across daily releases became our next massive hurdle. Standard Playwright assertions couldn't effectively validate the WebGL-rendered market curves, nor could they easily confirm the dynamic terminology shifts without fragile DOM querying. 

We eventually solved this by routing `fullPage: true` Playwright screenshots directly through a local Gemini model for deep semantic validation. The AI could 'look' at the canvas and verify that the probability curves looked correct, rather than relying on brittle pixel-matching.

However, this introduced a severe architectural bottleneck. We were running our E2E suites in heavily parallelized CI runners. Sending multiple uncropped, 4K `fullPage: true` screenshots to a local LLM simultaneously resulted in catastrophic VRAM Out-Of-Memory (OOM) crashes on our 16GB GPUs. 

We explicitly refused to crop the images, as the spatial relationship between the agent wager logs and the WebGL canvas was critical for the LLM to understand the context. Instead, we introduced a lightweight HTTP Mutex Queue running on port 8002. This queue serialized the massive visual inferences, ensuring only one 4K image was processed by the local Gemini instance at any given time. You can read an incredibly detailed deep dive on this specific architecture in our post on [Visual Testing and Local LLM Migration](/2026-07-15-visual-testing-and-local-llm-migration). 

## The Operational Reality of Continuous Fleet Awareness

The Unified UI Dashboard represents the operational pinnacle of our BotHuddle vision—a true single pane of glass giving human operators complete visibility into the autonomous fleet. The real-time AppSync infrastructure, DynamoDB single-table design, and custom WebGL visualizers demonstrated that complex, high-frequency multi-agent telemetry could be brought into a crisp, responsive interface without sacrificing our serverless philosophy.

Yet, running this level of continuous fleet awareness brought its own sobering operational lessons. Having dozens of agents constantly evaluating and re-evaluating their wagers against an ever-shifting LMSR market generated an unrelenting torrent of token usage and AppSync mutations. The AWS telemetry and database read capacity costs were steadily climbing, and the LLM inference fees required to keep autonomous agents continuously deliberating around the clock began putting a noticeable strain on our infrastructure budget.

As we watch the real-time probability curves dance across the WebGL canvas, the engineering triumph is undeniable—the architecture works. But as our feature backlog expands and testing demands grow, our team is increasingly forced to confront the hard economic trade-offs of continuous cloud-based autonomy versus on-demand developer execution.
