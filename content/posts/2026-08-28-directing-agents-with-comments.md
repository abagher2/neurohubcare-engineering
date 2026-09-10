---
title: "Taming the Machine: Directing Autonomous Agents with Inline Comments"
date: "2026-08-28"
author: "NeuroHub Engineering"
description: "How we stopped our AI coding agents from over-engineering our codebase by implementing strict, inline @AGENT_DIRECTIVE comments, turning the codebase itself into a dynamic prompt."
tags: ["AI", "LLMs", "Developer Experience", "Code Architecture", "Prompt Engineering"]
---

# Taming the Machine: Directing Autonomous Agents with Inline Comments

As NeuroHub's engineering team integrated autonomous AI coding agents (like Antigravity and various LLM-powered IDE extensions) into our daily workflows, we encountered a fascinating new class of technical debt: **AI Over-Engineering**. 

An agent tasked with "adding a retry mechanism to the S3 upload utility" wouldn't just add a simple `for` loop. Left to its own devices, it would often import a massive resilience library, define abstract base classes for backoff strategies, and wrap the entire module in complex Generics. The AI was trying to be *too* helpful, applying enterprise design patterns to functional utility scripts.

We needed a way to constrain the AI's creativity without stripping away its autonomy. Our solution was to embed instructions directly into the codebase using a standard we developed called `@AGENT_DIRECTIVE`.

## The Concept: Code as Prompt

AI agents read the files they are editing. Therefore, the most effective place to put instructions for an AI is adjacent to the code itself, not in a distant `CONTRIBUTING.md` file or an external Wiki.

By defining a formal syntax for inline directives, we turn our source code into a dynamic, context-aware prompt that guides the AI's decision-making process at the exact moment of execution.

### The Syntax of an `@AGENT_DIRECTIVE`

We standardized the format so that both human reviewers and AI parsers could easily identify and adhere to the rules.

```typescript
// @AGENT_DIRECTIVE: [Rule Name]
// DO: [Explicit action or pattern to follow]
// DO_NOT: [Explicit anti-pattern to avoid]
// CONTEXT: [Brief explanation of why this rule exists]
```

## Real-World Examples in the NeuroHub Codebase

### 1. Stopping the UI Catchall Menace

Early on, agents loved creating generic UI components and dumping them into `src/components`. We explicitly forbid this in our rules, but global rules are sometimes forgotten during long context windows. Inline directives act as localized guardrails.

```tsx
// src/app/care-plan/_components/GoalTracker.tsx

// @AGENT_DIRECTIVE: Route-first Component Placement
// DO: Keep all child components related to Goal Tracking in this directory (`_components`).
// DO_NOT: Extract internal sub-components (like GoalProgressBar) to `src/components` unless they are explicitly requested by another route family.
// CONTEXT: We prefer shallow, route-private packages to prevent generic capability catchalls.

export const GoalTracker = ({ goals }: GoalTrackerProps) => { ... }
```

### 2. Enforcing the Builder Pattern

As discussed in previous posts, we require the Builder pattern for complex entities. Agents often try to bypass this by instantiating classes directly with large JSON payloads.

```typescript
// src/lib/orm/entities/Workflow.ts

// @AGENT_DIRECTIVE: Entity Construction
// DO: Use `WorkflowBuilder.build()` to create new instances of this class.
// DO_NOT: Instantiate `new Workflow()` directly in API routes, React components, or event handlers.
// CONTEXT: Central ORM hydration must schema-decode into a Builder to guarantee domain integrity.

export class Workflow {
  // ... private constructor ...
}
```

### 3. Restricting Direct SDK Usage

A common issue was agents importing AWS or Google GenAI SDKs directly into UI components or random utility files, bypassing our centralized adapters.

```typescript
// src/lib/ai/ai-core.ts

// @AGENT_DIRECTIVE: AI Integration Centralization
// DO: Route all AI model inferences and document parsing through the functions exported here.
// DO_NOT: Import `@google/genai` or `@aws-sdk/client-bedrock` anywhere else in the application.
// CONTEXT: We must maintain a single choke point for telemetry, token counting, and safety enforcement.
```

## How It Works Under the Hood

Why does this work so well? Modern Large Language Models (LLMs) used for coding (like GPT-4, Claude 3.5 Sonnet, or Gemini 1.5 Pro) operate with a sophisticated attention mechanism. 

When the agent loads `Workflow.ts` into its context window to make a modification, the `@AGENT_DIRECTIVE` comment is immediately placed into the model's active memory, spatially adjacent to the code it needs to modify. The explicit `DO_NOT` keyword creates a strong negative constraint in the model's token prediction probabilities, drastically reducing the chance it will generate the forbidden pattern.

## Alternative Approaches Considered

### System Prompt Bloat
Initially, we tried putting all these rules into the agent's global system prompt (e.g., `AGENTS.md`). 
*Why it failed:* The global prompt became thousands of lines long. The model suffered from "lost in the middle" syndrome, forgetting specific rules about the `Workflow` class while editing a file 20 steps deep into a task.

### Post-Generation Linting
We considered writing custom ESLint rules to catch AI mistakes *after* they were generated.
*Why it failed:* Writing AST-based lint rules for high-level architectural concepts (like "Don't over-engineer this utility") is nearly impossible. Furthermore, it creates a frustrating developer experience where the AI writes code, the linter rejects it, and the AI spends 5 loops trying to fix it. Preventing the bad code at the point of generation is much more efficient.

## Conclusion

The transition to AI-assisted engineering requires a fundamental shift in how we think about code documentation. Comments are no longer just for the junior developer joining the team next week; they are real-time control mechanisms for the autonomous agents working alongside you right now. 

By strategically deploying `@AGENT_DIRECTIVE` comments, we've successfully curtailed AI bloat, ensuring that our silicon pair-programmers adhere strictly to NeuroHub's architectural vision.
