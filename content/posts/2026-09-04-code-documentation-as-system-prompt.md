---
title: "Executable Documentation: Turning AGENTS.md Into the Ultimate System Prompt"
date: "2026-09-04"
slug: "code-documentation-as-system-prompt"
summary: "How NeuroHub uses root-level AGENTS.md files to inject deterministic architectural boundaries into autonomous AI coding agents."
tags: ["Documentation", "Architecture", "Antigravity", "Best Practices"]
---

# Executable Documentation: Turning AGENTS.md Into the Ultimate System Prompt

**Motivation:** As we scaled our use of autonomous AI coding agents with Google Antigravity, we hit a wall. Agents were constantly re-inventing the wheel, ignoring established folder conventions, or blatantly violating our strict architectural rules. Why? Because context was scattered across disparate wiki pages, Jira tickets, and Slack threads. We were burning hours explaining the exact same NeuroHub standards over and over, reverting Pull Requests that were functional on the surface but architecturally disastrous. We needed a way to bind our core architectural laws directly into the agent's operational execution loop.

Today, documentation in our repository is no longer just static text for human onboarding; it is executable. It is the literal system prompt that dictates the constraints, contracts, and worldview of autonomous developers. At NeuroHub, root-level markdown files like `AGENTS.md` and `.agents/AGENTS.md` are not polite suggestions—they are deterministic laws.

## The Paradigm Shift: From Passive Wiki to Active System Directive

In traditional engineering, an architecture document lives on a Confluence or Notion page. An engineer reads it during onboarding, forgets half of it a month later, and relies on PR review to catch deviations.

AI agents operate in a stateless paradigm. They do not possess "intuition" or "muscle memory." If an architectural constraint is not present in their prompt context at the moment they predict the next token, that constraint simply does not exist for them. By treating `AGENTS.md` as an executable rulebook, the Antigravity framework automatically injects these scoped rules directly into the agent's system instructions before it plans or writes a single line of code.

These global, repository-wide boundaries are complemented at the file level by our [Inline Agent Directives](/2026-08-28-directing-agents-with-comments), which enforce microscopic invariants directly above complex functions.

## Structuring Repository Laws in `AGENTS.md`

Our `AGENTS.md` file does not explain how to write standard TypeScript; it explains how *NeuroHub* writes software. It explicitly outlaws common open-source patterns that are forbidden in our high-compliance California Regional Center environment.

### 1. Route-First Component Placement
Left unprompted, LLMs aggressively extract every button, card, and form step into a generic `src/components/ui` directory, creating a tangled, un-splittable bundle. In `AGENTS.md`, we explicitly outlaw this:

*Rule: Do not create a root `src/app/_components` catchall. Next-specific application wiring must use purpose-named private folders such as `_authentication` or `_navigationBar`. Code used by one route belongs in that route's private `_components` folder. `src/components` is limited strictly to domain-neutral primitives.*

### 2. Client vs. User Boundaries
In California Regional Center programs (Self-Determination Program and Traditional Services), conflating the child/dependent with the parent account holder corrupts state reporting. Our `AGENTS.md` enforces:

*Rule: The "Care Plan" (`/care-plan`) and "Vault" (`/vault`) belong to the Client (the dependent). "Settings" or "Profile" (`/settings`) belongs to the User (the parent or professional). Do not mix child management tasks into the parent's account settings.*

### 3. Entity Construction via Builders
When an agent handles data returned from AWS AppSync, its natural instinct is to cast the untyped JSON payload: `const receipt = response.data as Receipt`. This breaks type safety and bypasses regulatory validation.

`AGENTS.md` establishes a strict persistence rule:
*Rule: The only way to construct an immutable Entity is `Builder.build()`. Never use `JSON.parse()` plus a type assertion as a domain parser. Entity constructors remain private or protected.*

```typescript
// Enforced by AGENTS.md and STATE_MANAGEMENT_DIRECTIVES.md
export class ReceiptEntity {
  private constructor(private readonly data: ValidatedReceiptData) {}

  public static Builder = class {
    private data: Partial<ValidatedReceiptData> = {};
    
    public setTotal(amount: number) { this.data.total = amount; return this; }
    public build(): ReceiptEntity {
      if (!this.data.total || this.data.total <= 0) {
        throw new Error("Invalid receipt total");
      }
      return new ReceiptEntity(this.data as ValidatedReceiptData);
    }
  };
}
```

For an exhaustive examination of why this pattern is essential for eliminating agent hallucinations, see our dedicated guide on [Strict ORM Builders](/2026-09-18-strict-orm-builders).

## Scoped Context Injection via Rule Directives

Injecting an entire ten-thousand-word architecture manual into every trivial prompt would saturate the context window and dilute the model's attention.

The Antigravity engine solves this by scoping rule evaluation to active file paths and workspaces. When an agent touches files inside `src/app/requests/reimbursements/`, rules governing Action Center conventions, pill filters, and receipt builders are dynamically prioritized. If an agent is working in `src/lib/compliance-engine/`, it receives the strict directives defined in [`AGENT_DIRECTIVES.md`](file:///Users/abagher/Documents/GitHub/red-tape-ninja/src/lib/compliance-engine/AGENT_DIRECTIVES.md), prohibiting runtime AST parsing in favor of pure TypeScript inheritance.

## The Result: Autonomous Agents That Respect Invariants

By transforming passive documentation into executable system prompts, we stopped playing "whack-a-mole" with agentic PRs. 

When an agent proposes changes to a reimbursement flow or updates an authorized service calculation, it does so within the explicit architectural boundaries of our application. `AGENTS.md` turned our codebase from a blank slate into a structured arena where autonomous agents can execute at full velocity without breaking the core system invariants.
