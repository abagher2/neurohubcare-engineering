---
title: "Resilient Evaluator Fallback Patterns"
date: "2026-05-06"
slug: "resilient-evaluator-fallback-patterns"
summary: "In our Reimbursement compliance system, we evaluate complex business rules provided by Regional Centers and FMS. This post explores..."
---
In our Reimbursement compliance system, we evaluate complex business rules provided by Regional Centers and Financial Management Services (FMS). These rules dictate whether a SRA reimbursement claim is eligible, requires a manual exception, or is blocked. Initially, we used naive, fail-fast validation logic—the first rule that failed would throw an exception, halting the wizard.

This introduced severe fragility. If a parent's claim had three issues (e.g., a future date, a missing authorization, and exceeding a budget limit), they would fix the first one, resubmit, and then hit the second error. This "whack-a-mole" validation process is extremely frustrating.

This post explores the concept of Resilient Evaluator Fallback Patterns using TypeScript. The goal is simple: instead of crashing the evaluation when a rule fails, we gracefully aggregate all violations so the user sees a complete picture of their claim's health instantly.

### The AuditReport Pattern

To achieve this, we built a `PolicyAuditor` interface that never throws. Instead, it returns an `AuditReport` containing an `isActionable` boolean and an array of `FieldError` objects.

```typescript
export type SeverityLevel = 'INFO' | 'WARNING' | 'BLOCK';

export interface FieldError {
  path: string;
  message: string;
  severity?: SeverityLevel;
  remedy?: { path?: string; label?: string };
}

export interface AuditReport {
  isActionable: boolean;
  errors: FieldError[];
}

export interface Auditor<T> {
  audit(entity: T, targetState?: string): AuditReport;
}
```

### Aggregating and Propagating Errors

When evaluating a complex entity like a `ReimbursementEntity`, our auditor iterates through every attached receipt. We use a helper function to propagate errors up the object tree, maintaining the structural path to the exact receipt that caused the violation.

```typescript
import { propagateErrors } from '../orm/core';

export class ReimbursementAuditor implements Auditor<ReimbursementEntity> {
  constructor(private programType: string) {}

  public audit(reimbursement: ReimbursementEntity, targetState?: string): AuditReport {
    const receiptAuditor = new ReceiptAuditor(this.programType);
    const errors: FieldError[] = [];
    let hasBlockers = false;

    // Audit each receipt inside the reimbursement
    reimbursement.receipts.forEach((receipt, index) => {
      const receiptReport = receiptAuditor.audit(receipt, targetState);
      if (!receiptReport.isActionable) hasBlockers = true;
      
      // Propagate errors up with the correct path context
      errors.push(...propagateErrors(receiptReport.errors, 'receipts', receipt, index));
    });

    return {
      isActionable: !hasBlockers,
      errors
    };
  }
}
```

By leveraging this layered defense—Zod schemas for base structural integrity and an aggregating `PolicyAuditor` for complex business rules—we significantly improved the UX of our automated claim engine. Parents see exactly what they need to fix on a single screen, eliminating the dreaded whack-a-mole validation loop.\n