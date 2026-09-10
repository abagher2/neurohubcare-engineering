---
title: "Executable Documentation: Turning AGENTS.md Into the Ultimate System Prompt"
date: "2026-09-04"
slug: "code-documentation-as-system-prompt"
summary: "Maintaining high-level structural markdown files to manage a fleet of autonomous developers."
tags: ["Documentation", "Architecture", "Antigravity"]
---
# Executable Documentation: Turning AGENTS.md Into the Ultimate System Prompt

**Motivation:** As we scaled our use of autonomous AI agents using the Antigravity framework, we hit a wall. Agents were constantly re-inventing the wheel, ignoring established patterns, or blatantly violating our strict architectural guidelines. Why? Because context was scattered across disparate markdown files, Jira tickets, and Slack threads. We were losing hours explaining the exact same NeuroHubCare standards over and over, reverting Pull Requests that were perfectly functional but architecturally disastrous. We needed a way to inextricably link our source code documentation directly into the agents' operational brains.

Today, documentation is no longer just text for humans to read; it is executable. It is the literal system prompt that dictates the behavior, constraints, and worldview of a fleet of autonomous AI developers. At NeuroHub, root-level markdown files like `AGENTS.md` and `ARCHITECTURE.md` are not suggestions—they are the strict, executable laws of our codebase.

## The Theoretical Shift: From Passive Wiki to Active Prompt

In a traditional engineering organization, an architecture document lives on a Confluence page. A new engineer might read it during onboarding, forget most of it a month later, and rely on code review to correct their mistakes. 

AI agents operate in a hyper-literal, stateless paradigm. They do not have "intuition" or "muscle memory." If a rule is not explicitly in their context window at the exact moment they generate a token, that rule does not exist. By elevating `AGENTS.md` to a system prompt, we inject global context directly into the agent's pre-computation context window before they write a single line of code. 

An executable markdown prompt must be distinct from a human wiki. It must be heavily structured, unambiguous, and parsable by both human engineers and language models. This macroscopic approach sets the global boundaries and is perfectly complemented by our microscopic [Inline Agent Directives](/2026-08-28-directing-agents-with-comments), which enforce rules at the file level.

## Architecting the `AGENTS.md` File

Our `AGENTS.md` file is divided into strict domains. It does not explain *how* to write React; it explains how *NeuroHub* writes React. It explicitly outlaws common patterns that the LLMs might have learned from open-source repositories but that are forbidden in our highly-regulated AWS Amplify environment.

### Example: Route-First Component Placement

We introduced the "Route-first Component Placement" law in our `AGENTS.md` to combat component sprawl in our Next.js App Router. Left to their own devices, AI agents will aggressively extract every button and form field into a generic `src/components/ui` folder, creating a tangled web of dependencies that makes code splitting impossible.

In `AGENTS.md`, we explicitly ban this:
*Rule: Do not create a root `src/app/_components` catchall. Next-specific application wiring must use purpose-named private folders such as `_authentication` or `_navigationBar`. Code used by one route belongs in that route's private `_components` folder.*

We back up this prompt with deterministic tooling in our CI pipeline:

```typescript
export class RouteFirstConstraintValidator {
  public validate(ast: Node): string | null {
    if (ast.hasGenericComponentImport && !ast.isCorePrimitive) {
      return "Violation: Must use route-private _components folder. Refer to AGENTS.md.";
    }
    return null;
  }
}
```

By explicitly prompting the agent and then immediately verifying the output, we ensure the agentic workflow is bounded by strict architectural realities.

## Entity Construction via Builders

Another major section of our `AGENTS.md` dictates how data flows from our backend to our frontend. When an agent creates a new entity from an AWS AppSync response, it must adhere to strict validation. 

Left unprompted, an agent will simply take a JSON response from DynamoDB and cast it: `const user = response.data as User`. This destroys type safety. We mandate "Entity Construction via Builders" in our `ARCHITECTURE.md`. As explained deeply in [Building the Compliance Engine](/2026-09-02-building-the-compliance-engine), pure TS rules require pure TS entities, and those entities must be verified at runtime.

The `AGENTS.md` prompt explicitly instructs:
*Rule: The only way to construct an immutable Entity is `Builder.build()`. Never use `JSON.parse()` plus a type assertion as a domain parser.*

```typescript
// This pattern is mandated by AGENTS.md
export class PatientRecordBuilder {
  private data: Partial<PatientRecord> = {};
  
  public build(): PatientRecord {
    // Validates before returning
    if (!this.data.mrn) throw new Error("Missing MRN");
    return new PatientRecord(this.data);
  }
}
```

## The Agentic Workflow: Retrieval-Augmented Prompting (RAP)

Injecting a 5,000-word `AGENTS.md` file into every single API call would quickly exhaust token limits and dilute the agent's focus. To solve this, we implemented Retrieval-Augmented Prompting (RAP) within the Antigravity orchestrator.

When an agent is assigned a task (e.g., "Fix the reimbursement upload UI"), it executes a pre-flight checklist. The orchestrator analyzes the intent of the prompt and the files the agent plans to touch. It then semantically searches `AGENTS.md` and `ARCHITECTURE.md`, extracting only the relevant laws based on the task domain. 

If the agent is touching UI, it gets the React and Route rules. If it's touching the backend, it gets the DynamoDB and Compliance Engine rules. The agent acknowledges these constraints via a "Chain of Thought" before writing any code.

By treating architectural files as executable system prompts, we enforce architectural rigor at the absolute point of generation. When the AI proposes a change to a DynamoDB query or an EventBridge payload, it is instantly evaluated against the canonical architectural intent. This paradigm shift has transformed our ad-hoc agentic swarms from unpredictable code generators into tightly aligned, highly disciplined engineering teams that inherently respect the boundaries of our complex healthcare platform.
