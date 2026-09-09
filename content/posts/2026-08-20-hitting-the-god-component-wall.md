---
title: "Hitting the God Component Wall"
date: "2026-08-20"
slug: "hitting-the-god-component-wall"
summary: "Every fast-moving engineering team eventually hits the \"God Component\" wall. In our case, it was the ClaimApplicationWizard compon..."
---
# Hitting the God Component Wall

Every fast-moving engineering team eventually hits the "God Component" wall. In our case, it was the `ClaimApplicationWizard` component in our claim processing platform. What started as a simple multi-step React form had ballooned into a 4,000-line behemoth. It handled data fetching, complex branching logic based on the applicant's credit score, UI rendering, error handling, and telemetry all in one file.

The breaking point came when we tried to introduce a new workflow for commercial claims. The component became so brittle that changing the validation logic for a residential claim inadvertently broke the commercial claim submission. 

We used an AI coding agent to help us analyze and refactor the file. The AI's first attempt was to extract smaller UI components (e.g., `AddressForm`, `IncomeForm`), but it left all the state and business logic trapped in the parent `ClaimApplicationWizard`. This is a classic mistake: chopping up the render function doesn't fix a God Component if the state management remains monolithic. 

We guided the AI to shift its focus from UI extraction to state decoupling. We decided to model the reimbursement claim process as a robust State Machine and abstract the business rules into a Directed Acyclic Graph (DAG) of steps.

First, we extracted the data fetching and mutation logic into custom hooks using a repository pattern. 

```typescript
// Separating data access from UI
export function useClaimApplication(applicationId: string) {
  const { data, error } = useQuery(['claim', applicationId], () => 
    ClaimRepository.fetchApplication(applicationId)
  );

  const mutation = useMutation((updates: Partial<ClaimApplication>) =>
    ClaimRepository.updateApplication(applicationId, updates)
  );

  return { application: data, updateApplication: mutation.mutateAsync, error };
}
```

Next, we tackled the branching logic. Instead of massive `if/else` blocks inside `useEffect`, we built a lightweight workflow engine based on AST parsing of our business rules. We defined the claim steps in a JSON configuration, which a deterministic state machine evaluates at runtime.

```typescript
import { z } from 'zod';

const StepDefinitionSchema = z.object({
  id: z.string(),
  dependencies: z.array(z.string()),
  evaluationRule: z.string(), // e.g., "creditScore > 700"
  componentName: z.string()
});

export class WorkflowEngine {
  private dag: Map<string, z.infer<typeof StepDefinitionSchema>>;

  constructor(config: unknown) {
    const parsedConfig = z.array(StepDefinitionSchema).parse(config);
    this.dag = new Map(parsedConfig.map(step => [step.id, step]));
  }

  public getNextStep(currentState: ClaimApplicationState): string | null {
    // AST parsing logic evaluates the rules against current state
    for (const [id, step] of this.dag) {
      if (this.evaluateRule(step.evaluationRule, currentState)) {
        return id;
      }
    }
    return null;
  }
}
```

Our AI paired perfectly with us during this phase, rapidly generating the Zod schemas and the graph traversal algorithms. By pulling the control flow out of React and into a pure TypeScript state machine, `ClaimApplicationWizard` was reduced from 4,000 lines of spaghetti code to a 150-line presentation component that simply listens to the state machine and renders the active step. 

Hitting the God Component wall forces you to reckon with your architecture. The solution isn't just making smaller components; it's extracting the domain logic into testable, UI-agnostic modules.