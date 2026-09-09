---
title: "Phase 16 Wizard Reliability Track"
date: "2026-05-04"
slug: "phase-16-wizard-reliability-track"
summary: "When building complex multi-step wizards for our Service Request Authorization (SRA) pipelines, we ran into significant reliability issues..."
---
When building complex multi-step wizards for our Service Request Authorization (SRA) pipelines, we ran into significant reliability issues. Users would refresh the page halfway through a 16-step form, losing state and abandoning their applications. Our React state was tightly coupled to the component tree, leading to unmanageable side effects.

### Decoupling State from UI with State Machines

To fix this, we embarked on the "Phase 16 Wizard Reliability Track." The goal was to completely decouple the business logic from the React components. We implemented a strict finite state machine using XState. The UI became a pure function of the state machine's context, rather than the source of truth.

### Strongly Typed Transitions

We ensured that every transition in our claim wizard was validated against a Zod schema. If the payload for a transition (e.g., submitting income details) didn't match the schema, the state machine would reject the event entirely, preventing invalid state from propagating.

```typescript
import { createMachine, assign } from 'xstate';
import { z } from 'zod';

const IncomeDetailsSchema = z.object({
  annualSalary: z.number().min(10000),
  employerName: z.string().min(2),
});

export const claimWizardMachine = createMachine({
  id: 'claimWizard',
  initial: 'personalInfo',
  context: {
    salary: 0,
    employer: '',
  },
  states: {
    personalInfo: {
      on: { NEXT: 'incomeDetails' }
    },
    incomeDetails: {
      on: {
        SUBMIT: {
          target: 'review',
          guard: ({ event }) => {
            // Guarantee payload validity before transition
            return IncomeDetailsSchema.safeParse(event.payload).success;
          },
          actions: assign({
            salary: ({ event }) => event.payload.annualSalary,
            employer: ({ event }) => event.payload.employerName,
          })
        }
      }
    },
    review: {
      type: 'final'
    }
  }
});
```

By treating the wizard as a formal state machine and enforcing strict Zod validations at every transition, we eliminated the "lost state" bugs, allowing us to focus on the core business logic of the SRA origination process.