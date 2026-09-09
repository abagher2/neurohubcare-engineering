---
title: "Pushing Reimbursement Eligibility to Selection"
date: "2026-05-05"
slug: "pushing-reimbursement-eligibility-to-selection"
summary: "In enterprise software, resolving eligibility late in a user flow is a recipe for frustration. For our hypothetical corporate expe..."
---
In enterprise software, resolving eligibility late in a user flow is a recipe for frustration. For our hypothetical corporate expense platform, employees would frequently fill out a detailed reimbursement request, attach receipts, and write justifications, only to find out at the final submission step that their expense category was ineligible under their current policy. 

We needed to shift this validation to the very first step: selection.

### Abstract Syntax Trees for Policy Evaluation

To evaluate eligibility dynamically without hardcoding logic, we implemented a custom expression evaluator. Corporate policies were stored as ASTs (Abstract Syntax Trees) in our database. When an employee selected an expense category, we traversed the AST against their user profile to determine eligibility instantly.

### Schema-Driven Policy Engine

We utilized TypeScript and Zod schemas to ensure that our AST nodes were strictly typed before execution. This prevented runtime errors when a policy referenced a non-existent employee attribute.

```typescript
import { z } from 'zod';

const PolicyNodeSchema = z.lazy(() => z.union([
  // ... CONDITION, AND, OR nodes
]));

type PolicyAST = z.infer<typeof PolicyNodeSchema>;

class PolicyEvaluator {
  constructor(private context: Record<string, any>) {}

  evaluate(ast: unknown): boolean {
    const validAst = PolicyNodeSchema.parse(ast);
    return this.walk(validAst);
  }

  private walk(node: PolicyAST): boolean {
    // ... AST traversal and evaluation logic
    return false;
  }
}
```

By pushing eligibility checks to the selection phase using this dynamic policy engine, we drastically reduced user abandonment rates. The AI agent, after our corrections, successfully migrated hundreds of hardcoded rules into our new schema-driven AST format, proving that shifting validation left is the ultimate win for user experience.