---
title: "The Return of the God Component: What Happens When AI Agents Write 190k Lines of React"
date: "2026-07-31"
slug: "god-components-return"
summary: "In a desperate attempt to consolidate the 190k lines of agent-generated code, we accidentally resurrected the ultimate anti-pattern: brittle God Components."
tags: ["Refactoring", "God Components", "React", "Architecture"]
---

# The Return of the God Component: What Happens When AI Agents Write 190k Lines of React

We needed a massive intervention to clean up the 190k lines of bloated, agent-generated code that was suffocating our infrastructure. As we thoroughly documented in [The 190k Line Balloon](/2026-07-24-the-190k-line-balloon), unconstrained autonomous agents had copy-pasted their way to an unmaintainable disaster, duplicating logic across dozens of identical files. In our panic to restore order, we firmly instructed the agents to merge similar components, extract common business logic, and abstract all remaining differences via React props. We thought we were strictly enforcing DRY (Don't Repeat Yourself) principles. Instead, we accidentally commanded them to build God Components, resurrecting an anti-pattern so severe it nearly brought our Next.js application to a grinding halt.

## The Birth of `UniversalActionWizardManager`

One of the most terrifying, yet predictable, side-effects of letting autonomous agents write React code in a complex Next.js environment is their overwhelming tendency to create 'God Components'. When an agent is faced with a limited context window, it struggles to comprehend the broader, multi-file architecture of an application. If it cannot easily figure out where a specific piece of state logically belongs, or how it relates to our underlying DynamoDB single-table schema, it defaults to the path of least resistance: hoisting the state to the absolute highest level possible. 

This behavior led to the creation of massive, sprawling, 5000-line monolithic files that completely destroyed runtime performance and shattered the delicate boundaries we rely on for Next.js Static Export optimization. 

The prime example was the `UniversalActionWizardManager`. The agents diligently followed our instructions to consolidate, merging 14 distinct, specialized form wizards into a single, terrifyingly large 3,500-line file:

```typescript
interface UniversalWizardProps {
    type: 'RECEIPT' | 'MILEAGE' | 'TIMESHEET'; // plus 84 optional boolean flags...
    appSyncClient: any; // injected directly...
}

function UniversalActionWizardManager(props: UniversalWizardProps) {
    // A fractal of conditional logic mapping to DynamoDB...
    return <div />;
}
```

### Why God Components Destroyed Our Next.js App

When you architect a Next.js Static Export application, you are fundamentally relying on granular component updates, strict memoization, and highly efficient client-side hydration. The `UniversalActionWizardManager` broke every single rule of modern React development, and its existence caused compounding failures across our stack.

1. **Cascading Renders:** Because all state was hoisted to the top level of the wizard, any irrelevant state change triggered massively expensive re-renders of the entire DOM tree. A user typing a single character into a date field on a receipt would immediately force the React engine to re-render the highly complex, totally unrelated timesheet validation logic. In a browser environment, this led to extreme input lag, rendering the application entirely unusable on lower-end devices. Furthermore, these cascading renders began interfering with our AppSync subscription websockets, causing unnecessary disconnections and aggressive polling behavior that strained our backend.

2. **Un-testable Combinatorics:** The component signature demanded over 84 optional props, designed to map to wildly different AppSync GraphQL mutations depending on the context. Testing this monolith became an absolute impossibility. The combinatorial explosion of states meant we could never confidently guarantee that a change designed to fix an AWS Amplify upload wouldn't accidentally trigger a deeply buried state machine transition meant for an entirely different workflow. The abstraction had completely failed, replacing readable duplication with incomprehensible complexity.

3. **Bypassing the Builder Pattern:** Because the God Component was forced to handle literally everything, it became too unwieldy to integrate with our domain models. It began manually assembling raw JSON objects to send directly to AppSync, entirely bypassing our strict `Builder.build()` pattern. By dropping the ORM layer, the component stripped away all the type safety, authorization checks, and business logic encapsulation we had fought so hard to establish, leaving our DynamoDB tables vulnerable to malformed data.

### The Breaking Point: Telemetry Collapse

The true, critical breaking point arrived when the telemetry engine collapsed under the immense weight of these overloaded components. As detailed in our deep dive into [Cross-Cutting Concerns](/2026-08-07-cross-cutting-concerns), the God Component was firing off hundreds of overlapping, deeply nested telemetry events every time a user interacted with the UI. 

Because the component was rendering logic for every possible state simultaneously, our local LLM Judge began failing builds simply because the Next.js runtime was timing out trying to parse the massive JavaScript bundles. Furthermore, the Telemetry Judge, which monitors the `aws_appsync_graphqlEndpoint` for `UI_CRASH` anomalies, was completely overwhelmed by the sheer volume of spurious tracking data emitted by the cascading renders.

### Architectural Guardrails: Directory-Based Constraints

To fundamentally fix this, we realized we couldn't just tell the agents to "write better code." We had to introduce strict, directory-based architectural boundaries that actively prevented God Components from forming. We explicitly banned the use of generic, catch-all UI components for core business logic. 

Features were forcefully evicted from the God Component and placed beneath their canonical route representations in the file system. We updated the system prompts to enforce that UI shared by related routes belongs *only* at their nearest common route ancestor, preventing unrelated route families from importing massive, generalized managers. We relentlessly reinforced that all database entities must only be constructed via `Builder.build()`, ensuring that form wizards remained completely isolated from each other and strongly typed against our DynamoDB schema.

We learned an incredibly painful but vital lesson: when directing AI agents, "make it DRY" is arguably the most dangerous prompt you can write. Without rigid, structural guidelines and strict architectural boundaries, agents will optimize entirely for the fewest number of files rather than the best architecture, leaving you with an unmaintainable monolith that destroys performance and developer sanity.
