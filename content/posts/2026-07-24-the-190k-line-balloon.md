---
title: "The 190,000-Line Balloon: The Terrifying Velocity of Autonomous Code Generation"
date: "2026-07-24"
slug: "the-190k-line-balloon"
summary: "How unconstrained autonomous agents ballooned our Next.js codebase to 190,000 lines of code in just three weeks."
tags: ["Technical Debt", "Code Bloat", "Next.js", "Agents"]
---

# The 190,000-Line Balloon: The Terrifying Velocity of Autonomous Code Generation

Our deployment pipelines suddenly started failing with obscure out-of-memory errors that brought our entire continuous integration system to a halt. When we dug into the logs and investigated the root cause, we discovered a terrifying reality: our Next.js codebase had quadrupled in size over the course of just three weeks. Unconstrained autonomous AI agents, eager to please and endlessly energetic, were writing thousands of lines of boilerplate and redundant logic for every minor feature request. In their attempt to solve localized problems, they were creating a massive, systemic maintenance burden that human developers could no longer navigate or review effectively.

We first noticed the issue when we hit GitHub Actions' hard memory limits during the `next build` phase. The V8 JavaScript engine was running out of heap space while attempting to parse and bundle the application. We ran `cloc` (Count Lines of Code) across our repository and found a staggering 194,321 lines of TypeScript—up from a highly optimized 45,000 lines just a month prior. 

At NeuroHub, our entire architecture relies on Next.js Static Export hosted via AWS Amplify. This architectural decision is incredibly deliberate: it ensures lightning-fast load times for end-users and provides an immense surface area for edge caching. However, it also means that any bloat in the application payload or the build process has a direct and immediate impact on our deployment stability. Because there is no Node.js server to dynamically render pages or offset the processing load, the entire application must be bundled into static assets. We couldn't just throw more server resources at the problem; we had to understand why the agents were generating so much code in the first place, and fundamentally alter their behavior.

Through extensive auditing, we identified three distinct, destructive anti-patterns the agents weaponized to generate this massive volume of code.

### 1. Defensive Programming on Steroids

Because agents lacked deep, contextual understanding of our global validation layers and our strict ORM patterns, they consistently overcompensated by adding redundant checks everywhere they could. In our carefully designed architecture, the `Builder.build()` pattern serves as the absolute gatekeeper for data integrity. It ensures that all entities mapped to DynamoDB are meticulously validated, transformed, and secured before they ever reach the AppSync GraphQL mutations. 

Agents completely ignored this architectural boundary. Instead of trusting the existing infrastructure, they added exhaustive, defensive checks into every single React component:

```typescript
function processUserData(data: any) {
    if (!data || typeof data !== 'object' || !('id' in data)) throw new Error("Invalid");
}
```

Instead of using the established `Builder.build()` pattern, they reinvented runtime type checking inline. They hallucinated complex Zod schemas and embedded them directly into the UI layer. They wrote custom parsing logic to verify that strings were not empty, numbers were positive, and nested objects existed, completely unaware that AppSync's GraphQL schema enforces these constraints natively at the network boundary. This not only bloated the codebase immensely but bypassed the centralized compliance rules entirely. For a deep dive into how we reigned this specific behavior in and enforced the correct architectural patterns, read about our [Strict ORM Builders](/2026-09-18-strict-orm-builders).

### 2. The "Copy-Paste-Mutate" Pattern

Agents severely struggled with abstracting reusable logic, consistently favoring brute-force duplication to solve immediate tasks. When tasked with building a new view for the Action Center, a human engineer would look for an existing generic container or an abstract base class. An agent, however, optimized for local certainty over global elegance. Instead of importing a shared component, it would copy-paste entire 800-line files and simply mutate the specific variables needed for the new feature.

This behavior reached comical proportions when we discovered 14 different variations of a generic `FormWizard` component spread across the repository. Every time an agent needed to query AppSync, it would duplicate the entire GraphQL selection set, the error handling logic, the loading state management, and the generic UI wrappers, rather than utilizing the centralized data access layer we had provided.

This sheer duplication caused our client-side bundles to explode in size. It also meant that a single bug in the original `FormWizard` was now replicated 14 times, requiring 14 separate PRs to fix. This massive failure in abstraction is what eventually led to the catastrophic over-correction we detailed in [The Return of the God Components](/2026-07-31-god-components-return).

### 3. Hallucinated Edge Cases

Agents draw upon vast, generalized training data to solve problems. While this makes them highly capable, it also means they will often attempt to solve problems we don't actually have, building out complex solutions for non-existent requirements. 

For instance, they hallucinated requirements based on generic SaaS applications they had seen in their training corpus. They built elaborate password strength meters, custom forgot-password flows, and bespoke multi-factor authentication UI components, completely bloating the system with unnecessary infrastructure. In reality, our AWS Amplify setup relies entirely on AWS Cognito for authentication. All of this custom UI was fundamentally dead code that could never be reached by a user, but it still had to be parsed, bundled, and maintained.

Furthermore, they wrote extensive, highly complex retry logic for DynamoDB network timeouts directly into React components. They implemented custom exponential backoff algorithms and complex polling mechanisms, completely ignoring the fact that our configured AWS AppSync client already handles network resilience, offline caching, and exponential backoff automatically at the provider level. 

### The Cleanup and Remediation Strategy

The codebase rapidly became hostile to human developers. The signal-to-noise ratio was completely destroyed, and onboarding new engineers became impossible. We needed to reign the agents in before the sheer weight of the codebase crushed the project entirely. 

We quickly realized we couldn't rely on simple linting rules or post-commit hooks to fix this. We had to modify the core system prompts driving the agents, actively injecting architectural constraints directly into their context windows. We created a strict "Negative Prompt" registry that explicitly forbade them from bypassing the `Builder.build()` boundaries, outlawed the creation of custom authentication flows, and enforced the reuse of our AppSync schema types. 

By enforcing these rigid architectural constraints at the agent's conception phase, we managed to systematically delete over 100,000 lines of hallucinated defensive programming and redundant boilerplate. We restored sanity to our Next.js static exports, dramatically reduced our client-side bundle sizes, and brought our GitHub Actions CI pipelines back from the brink of absolute failure. The lesson was clear: autonomous agents without strict architectural guardrails will optimize for output, not maintainability.
