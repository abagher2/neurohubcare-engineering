---
title: "Taming the Machine: Directing Autonomous Agents with Inline Comments"
date: "2026-08-28"
author: "NeuroHub Engineering"
description: "How we stopped our AI coding agents from over-engineering our codebase by implementing strict, inline @AGENT_DIRECTIVE comments, turning the codebase itself into a dynamic prompt."
tags: ["AI", "LLMs", "Developer Experience", "Code Architecture", "Prompt Engineering"]
summary: "We discovered that our AI coding agents were frequently ignoring our global system prompts, especially when working deep within complex files. They would eagerly reinvent patterns or violate architectural boundaries because the global instructions were pushed out of their immediate context window. This resulted in a growing mountain of technical debt and endless refactoring cycles just to undo the AI's 'help.'"
---
# Taming the Machine: Directing Autonomous Agents with Inline Comments

We discovered that our AI coding agents were frequently ignoring our global system prompts, especially when working deep within complex files. They would eagerly reinvent patterns or violate architectural boundaries because the global instructions were pushed out of their immediate context window. This resulted in a growing mountain of technical debt and endless refactoring cycles just to undo the AI's "help."

As NeuroHub's engineering team integrated autonomous AI coding agents deeply into our daily workflow using our Antigravity framework, we encountered a fascinating and entirely new class of technical debt: **AI Over-Engineering**. We needed a way to constrain the AI's boundless creativity without stripping away its autonomy or forcing human reviewers to constantly play "bad cop" on Pull Requests. Our solution was to embed instructions directly into the codebase using `@AGENT_DIRECTIVE`, effectively turning the source code itself into a highly contextual, dynamic prompt.

## The Limits of Global System Prompts

When we first deployed our agentic workforce, we relied heavily on macroscopic instructions. We created a massive `AGENTS.md` file at the root of our Next.js monorepo that detailed every architectural rule, naming convention, and AWS AppSync integration pattern. (You can read more about this overarching philosophy in [Code Documentation as System Prompt](/2026-09-04-code-documentation-as-system-prompt)).

In theory, this was perfect. In practice, it broke down when the agents actually got to work. 

Large Language Models (LLMs) suffer from context decay. When an agent is tasked with adding a new field to a 500-line React component deep inside `src/app/requests/reimbursements/_components/`, the `AGENTS.md` file is sitting at the very beginning of its context window. By the time the LLM starts generating code to modify the specific AppSync mutation, the global rule that says "Never import AWS SDKs directly into UI components" has been overshadowed by the immediate context of the React file. The agent, trying to be "helpful," would often hallucinate a direct DynamoDB call right in the middle of a Next.js Client Component.

This led to frustrating cycles. The agent would write code, the CI pipeline would catch the architectural violation, the agent would try to fix it, and it would often just hallucinate a different, equally wrong solution. 

## The Concept: Code as Prompt

To guarantee the AI always had the most relevant rules at the exact moment of generation, we moved the instructions into the code itself. 

AI agents fundamentally read the files they are editing. When an agent opens `ReimbursementWizard.tsx`, the contents of that specific file are the most salient tokens in its context window. By defining a formal syntax for inline directives, we force compliance precisely at the line of invocation. This is the microscopic counterpart to our macroscopic `AGENTS.md` file.

We settled on a strict syntax: `// @AGENT_DIRECTIVE: [Rule Name]`. When our Antigravity orchestration layer parses the workspace, it specifically highlights these comments in the payload it sends to the LLM, giving them artificially high attention weights.

## Real-World Examples of Taming the Machine

Here is how we applied these directives to solve our most common AI-generated anti-patterns, specifically interacting with our AWS AppSync and DynamoDB backends.

### 1. Stopping the UI Catchall Menace

In Next.js App Router, we enforce a strict route-based component architecture. We want components that belong to a specific route to live in that route's private `_components` folder, not in a generic, global `src/components/ui` folder. Agents naturally want to abstract everything into a global UI library because that's what their training data (mostly older React codebases) taught them to do.

Global rules are sometimes forgotten during long context windows. Inline directives act as localized guardrails, screaming at the agent right when it is deciding where to place a new file.

```tsx
// @AGENT_DIRECTIVE: Route-first Component Placement
// DO: Keep child components in this directory (`_components`).
// DO_NOT: Extract to `src/components`.
// RATIONALE: This component relies on specific AppSync queries unique to this route.
export const GoalTracker = () => { /* ... */ }
```

### 2. Enforcing the Builder Pattern

One of the most dangerous hallucinations occurred around data instantiation. When fetching complex payloads from DynamoDB via AppSync, agents repeatedly tried to bypass our validation layers by directly casting JSON with `as PatientRecord` or directly instantiating raw objects. 

This hallucination is fatal to data integrity in healthcare. If an agent hallucinates a field, it silently poisons the domain logic.

We placed directives directly on the class definitions to stop this behavior at the source.

```typescript
// @AGENT_DIRECTIVE: Entity Construction
// DO: Use `WorkflowBuilder.build()` to parse AppSync GraphQL payloads.
// DO_NOT: Instantiate `new Workflow()` directly or cast raw JSON.
// RATIONALE: Builder enforces Zod schema validation and prevents terminology leakage.
export class Workflow { /* ... */ }
```

Whenever an agent tried to read the `Workflow` class to understand how to use it, the very first thing it read was the directive telling it exactly what *not* to do. The success rate of agents using the Builder pattern skyrocketed from 40% to 99%.

### 3. Restricting Direct SDK Usage

We had a persistent issue with agents trying to be "efficient" by importing cloud SDKs or third-party libraries directly into front-end components. Instead of using our carefully crafted AppSync GraphQL hooks, an agent would try to import `@aws-sdk/client-dynamodb` directly into a Next.js Client Component, instantly breaking the build.

```typescript
// @AGENT_DIRECTIVE: AI Integration Centralization
// DO: Route all data fetching through generated AppSync hooks (e.g. `useGetPatientQuery`).
// DO_NOT: Import AWS SDKs directly into UI components.
export function useAIAnalysis() { /* ... */ }
```

## The Human Impact: Better Developer Experience

Implementing `@AGENT_DIRECTIVE` profoundly changed the human developer experience at NeuroHub. Before this, senior engineers felt like they were constantly babysitting junior developers who refused to learn. PR reviews were exhausting, filled with the same repetitive comments: "Use the builder", "Move this to the local folder", "Don't use raw fetch".

By embedding the knowledge directly into the codebase, we created a self-documenting system that trains the AI agents autonomously. When an agent violates a rule now, the engineer simply adds a new `@AGENT_DIRECTIVE` to the file, and the agent never makes that mistake again. The codebase itself has become a living, breathing teacher.

By strategically deploying `@AGENT_DIRECTIVE` comments, we've successfully curtailed AI bloat, ensuring that our silicon pair-programmers adhere strictly to NeuroHub's architectural vision. We've transformed our autonomous agents from chaotic, over-eager generators into disciplined, rule-abiding members of the engineering team.
