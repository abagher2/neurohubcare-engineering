---
title: "Immutable State Machines for Stateful Domain Entities"
date: "2026-05-09"
slug: "immutable-state-machines-stateful-domain-entities"
summary: "Managing the lifecycle of complex domain entities is a notorious challenge. In our claim processing system, an application moves t..."
---
Managing the lifecycle of complex domain entities is a notorious challenge. In our claim processing system, an application moves through numerous states: Draft, Submitted, Under Review, Approved, and Funded. Each transition has strict business rules, side effects, and authorization checks. 

Historically, teams manage this with a scattering of boolean flags (`isSubmitted`, `isApproved`) and imperative logic. This quickly degenerates into an unmaintainable state explosion. The solution is explicit State Machines. 

When we brought our AI agent into the refactoring process, it heavily pushed for a class-based approach where the entity mutated its internal state (e.g., `claim.approve()`). The AI's initial code violated our core architectural principle of immutability. Mutating domain entities directly in memory breaks React's change detection, complicates time-travel debugging, and makes it harder to serialize state for our event-sourced backend.

We guided the AI to adopt Immutable State Machines, heavily inspired by libraries like XState, but tailored for pure domain models. We coupled this with Zod schemas to guarantee that an entity cannot even be constructed in an invalid state.

```typescript
import { z } from "zod";

// Define the discrete states
const ClaimStateSchema = z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "FUNDED"]);
type ClaimState = z.infer<typeof ClaimStateSchema>;

interface ClaimApplication {
  id: string;
  state: ClaimState;
  amount: number;
  applicantId: string;
}

// Define the valid transitions as a Directed Acyclic Graph (DAG)
const transitions: Record<ClaimState, ClaimState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "DRAFT"], // Can be sent back for info
  APPROVED: ["FUNDED"],
  FUNDED: [],
};

export class ClaimStateMachine {
  static transition(claim: ClaimApplication, targetState: ClaimState): ClaimApplication {
    const allowed = transitions[claim.state];
    
    if (!allowed.includes(targetState)) {
      throw new Error(`Invalid transition from ${claim.state} to ${targetState}`);
    }

    // Enforce business rules before transition
    if (targetState === "SUBMITTED" && claim.amount <= 0) {
        throw new Error("Cannot submit claim with zero amount.");
    }

    // Return a NEW immutable object
    return {
      ...claim,
      state: targetState,
    };
  }
}

// Usage:
// const updatedClaim = ClaimStateMachine.transition(currentClaim, "SUBMITTED");
```

By enforcing immutability, our domain functions remain pure. Testing becomes trivial: given a claim in state A and an event B, assert the resulting claim is in state C. We even use Playwright to automate end-to-end flows, verifying that the UI correctly locks down action buttons based on the immutable state machine's constraints. The AI agent eventually understood that coupling Zod for structural integrity with pure functions for state transitions results in a domain layer that is predictable, testable, and fundamentally resilient.\n