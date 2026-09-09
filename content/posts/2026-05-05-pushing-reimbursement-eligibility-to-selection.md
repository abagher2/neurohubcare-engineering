---
title: "Pushing Reimbursement Eligibility to Selection"
date: "2026-05-05"
slug: "pushing-reimbursement-eligibility-to-selection"
summary: "In compliance software, resolving eligibility late in a user flow is a recipe for frustration. For parents navigating the Regional Center..."
---
In compliance software, resolving eligibility late in a user flow is a recipe for frustration. For parents navigating the Regional Center system, they would frequently fill out a detailed Service Request Authorization (SRA) claim, attach receipts, and write justifications, only to find out at the final submission step that their claim was ineligible because the dates fell outside the authorization window or exceeded the budget.

We needed to shift this validation to the very first step of our document intake wizard.

### Strategy Pattern for Policy Evaluation

Instead of relying on fragile backend-only validation checks, we implemented a robust `PolicyAuditor` using the Strategy pattern. This allows us to evaluate domain entities (like Receipts and Reimbursements) instantly on the frontend before the user invests time filling out a long form.

### The ReceiptAuditor Implementation

We structured our policies into distinct, evaluatable rules (e.g., `require_active_authorization`, `enforce_budget_limits`). When a parent selects a receipt, the `ReceiptAuditor` runs it against these rules based on their specific program type (SDP vs. SAR).

```typescript
  private evaluateReceiptRule(rule: PolicyRule, receipt: ReceiptEntity): { severity: SeverityLevel; message: string } | null {
    if (!receipt.service) return null; // Structural error, should be caught by Builder
    const authorization = receipt.service.authorization;

    switch (rule.id) {
      case 'require_active_authorization':
        if (!authorization) {
          return { severity: rule.severity, message: 'This receipt is valid for your records, but the service is not authorized for reimbursement. Keep it as private pay or add the authorization first.' };
        }
        if (authorization.status && authorization.status !== 'ACTIVE') {
          return { severity: rule.severity, message: `The linked service authorization is ${authorization.status.toLowerCase()}. Update it before requesting reimbursement.` };
        }
        break;

      case 'enforce_budget_limits':
        const budget = receipt.service.getRemainingBudget(receipt.serviceDate, receipt.id || undefined);
        if (budget != null && receipt.totalAmount > budget) {
          return { severity: rule.severity, message: `Amount exceeds the remaining authorized budget of $${Math.max(0, budget).toFixed(2)}` };
        }
        break;
        
      // ... additional rules
    }
    return null;
  }
```

By pushing these eligibility checks to the selection phase using this synchronous policy auditor, we drastically reduced user abandonment and frustration. Parents know instantly if a receipt is eligible for reimbursement or if it requires a manual exception, proving that shifting validation left is the ultimate win for empathetic design.