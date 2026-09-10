---
title: "The 190K Bloat: When Cross-Cutting Concerns Break Down"
date: "2026-08-07"
author: "NeuroHub Engineering"
description: "A deep dive into how our codebase reached 190K lines of code, the subsequent breakdown of cross-cutting concerns like authentication and telemetry, and the architectural overhauls required to fix them."
tags: ["Architecture", "Refactoring", "Authentication", "Telemetry"]
summary: "As our codebase ballooned to 190,000 lines, the tight coupling of cross-cutting concerns like authentication and telemetry created a maintenance nightmare. Memory leaks from massive span generation and broken authorization boundaries were causing production incidents. We had to step back and completely overhaul our architectural approach to state management."
---

# The 190K Bloat: When Cross-Cutting Concerns Break Down

As our repository wildly ballooned to nearly 190,000 lines of code, the tight coupling of cross-cutting concerns—specifically user authentication and system telemetry—created an absolute maintenance nightmare. Memory leaks caused by massive, runaway span generation and fundamentally broken authorization boundaries were causing active production incidents. We realized that AI agents were inherently bad at managing global state, and we had to step back and completely overhaul our architectural approach to state management before the system collapsed entirely.

At 190K LoC, the sheer volume of code fundamentally broke our cross-cutting concerns. As detailed in our extensive post-mortem, [The 190k Line Balloon](/2026-07-24-the-190k-line-balloon), when AI agents are allowed to generate massive amounts of boilerplate code unconstrained, they inherently tend to duplicate critical infrastructure. This rampant duplication specifically wreaked havoc on our highly sensitive AWS Amplify authentication flows and our AppSync telemetry monitoring layers.

## The Symptoms of Rapid Entropy

We first needed to properly diagnose the root causes of our severe system degradation. The autonomous agents had been indiscriminately injecting telemetry tracking and authentication validation checks into every possible UI component they touched. They completely misunderstood the core architecture of a Next.js Static Export application, treating client-side renders as if they were secure, server-side environments.

### The Authentication Fracture

In our AWS Amplify architecture, authentication is handled securely by AWS Cognito, governing access to sensitive healthcare records: the child's Care Plan (`/care-plan`), legal IPP documents in the Vault (`/vault`), and banking/FMS reimbursement details in the Action Center (`/requests`). The resulting JWT tokens must be rigorously validated and attached to every request interacting with our DynamoDB tables via AppSync GraphQL. However, the AI agents had completely fractured this authentication layer through sheer duplication and misunderstanding of boundary contexts.

Instead of relying on a centralized, secure provider at the root of the application, the agents were repeatedly instantiating custom validation hooks inside deeply nested, leaf-node components. Our old, edge-based authentication wrapper failed catastrophically as we introduced more complex data fetching requirements. The agents were trying to enforce authorization boundaries at an imaginary HTTP network edge, entirely missing the point that in our static export, client-side hydration connects directly from the browser to AppSync. Worse, they repeatedly blurred the boundary between the User (the parent or caregiver) and the Client (the neurodivergent dependent), risking cross-pollination of confidential medical records.

```typescript
// Legacy agent-generated approach
export const withAuth = (handler) => async (req, res) => {
  req.user = await verifyToken(req.cookies.auth_token);
  return handler(req, res);
};
```

This legacy, agent-generated approach completely bypassed our strict `Builder.build()` ORM patterns. The agents were attempting to validate requests at an imaginary HTTP server layer, completely oblivious to the fact that Next.js Static Exports rely entirely on client-side fetching against an external AppSync GraphQL endpoint, not traditional Node.js server routes! This meant that UI components were rendering sensitive layouts before the AppSync authorization headers were even fully resolved, causing jarring layout shifts and potential data exposure.

### The Telemetry Avalanche

At the same time, runaway span generation was suffocating our infrastructure and needed immediate, drastic containment. The agents had inexplicably decided that absolutely *everything* needed to be aggressively logged and traced.

Tracing tightly coupled to dependency injection caused severe memory leaks in the browser due to massive, recursive span generation. Every time an AppSync query was executed, the agents were logging the entire, unredacted DynamoDB response payload as a telemetry event. The Telemetry Judge, which is specifically designed to dynamically read and evaluate `UI_CRASH` events from the `aws_appsync_graphqlEndpoint` specified in `amplify_outputs.json`, was completely overwhelmed. It was being bombarded by gigabytes of useless, highly repetitive spans every minute, obscuring the actual critical failures it was meant to detect.

## Architectural Overhaul: The Universal Execution Context

To solve this, we adopted a centralized context approach to completely decouple these cross-cutting concerns from our domain logic. We had to violently stop the agents from manually threading authentication tokens and telemetry clients through the application via prop drilling—a problem severely exacerbated by the issues outlined in [The Return of the God Components](/2026-07-31-god-components-return).

We fundamentally decoupled cross-cutting concerns and embedded them into a Universal Execution Context (UEC) using strict React Context providers on the client side, and `AsyncLocalStorage` for any background synchronization routines.

With this powerful, centralized context securely in place, our ORM entities could finally enforce strict authorization and logging silently, without requiring the UI layer to even be aware they existed:

```typescript
export class CarePlanBuilder {
  public withStatus(status: PlanStatus): this {
    // Context is inferred automatically, no prop drilling required
    Telemetry.track('status_change', { actor: getContext().userId });
    this._plan.status = status;
    return this;
  }
}
```

By heavily leveraging centralized execution contexts and rigorously enforcing the `Builder.build()` pattern as the sole method of entity mutation, we restored stability to our AWS Amplify environment. We successfully tamed the telemetry avalanche, ensuring that only actual `UI_CRASH` events and valid, authorized mutations were tracked. We forced the agents to rely on the global context rather than reinventing it, saving our infrastructure, reducing our bundle sizes, and securing our data. For more on unifying these internal APIs to prevent agent confusion, see our detailed post on the [Unified Domain API](/2026-05-08-unified-domain-api).
