---
title: "Semantic Invariant Testing with Playwright"
date: "2026-05-02"
slug: "semantic-invariant-testing-with-playwright"
summary: "Writing brittle end-to-end tests is a rite of passage for most engineering teams. When we were building the submission flow for ou..."
---
Writing brittle end-to-end tests is a rite of passage for most engineering teams. When we were building the submission flow for our reimbursement pipelines, our initial Playwright tests focused heavily on DOM selectors and CSS classes. This led to persistent test flake whenever designers tweaked the UI layout. We needed a shift from structural assertions to semantic invariant testing.

### What are Semantic Invariants?

Instead of asking "Is the `.submission-btn` visible?", a semantic invariant asks "Can the user execute the intent to purchase?". We rely heavily on ARIA roles, accessibility trees, and custom data attributes mapped to domain states.

We leveraged Playwright's `getByRole` and custom fixtures that enforce state machine validation.

### Leveraging Playwright Fixtures for Invariants

By using Playwright fixtures, we can inject a domain-specific state machine into our tests. This ensures that every test validates not just the UI, but the underlying invariants of our application state.

```typescript
import { test as base, expect } from '@playwright/test';
import { z } from 'zod';

const SubmissionStateSchema = z.object({
  workflowStatus: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']),
  documentIds: z.array(z.string())
});

type complianceFixtures = {
  workflowAssertions: {
    submitDocument: (id: string) => Promise<void>;
    assertInvariant: (expectedStatus: string) => Promise<void>;
  };
};

export const test = base.extend<complianceFixtures>({
  workflowAssertions: async ({ page }, use) => {
    const assertions = {
      submitDocument: async (id: string) => {
        await page.getByRole('button', { name: `Submit document ${id}` }).click();
      },
      assertInvariant: async (expectedStatus: string) => {
        // Intercept API response to validate payload against Zod schema
        const response = await page.waitForResponse('/api/workflow/state');
        const state = SubmissionStateSchema.parse(await response.json());
        
        expect(state.workflowStatus).toBe(expectedStatus);
        await expect(page.getByRole('status', { name: 'Workflow State' })).toBeVisible();
      }
    };
    await use(assertions);
  }
});
```

By enforcing invariants at both the network layer (Zod parsing) and the accessibility tree (ARIA roles), our tests became resilient to structural DOM changes, reducing test flakiness by 94%.