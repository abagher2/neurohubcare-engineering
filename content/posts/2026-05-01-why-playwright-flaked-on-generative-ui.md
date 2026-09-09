---
title: "Autonomous Testing Part 1: Why Playwright Fails on Generative UI"
date: "2026-05-01"
slug: "2026-05-01-why-playwright-flaked-on-generative-ui"
summary: "How traditional Playwright assertions break on non-deterministic AI interfaces, and the custom fixtures we built to solve it."
tags: ["Testing", "Playwright", "Architecture"]
---

From day one, NeuroHub was built on a Generative UI foundation. However, testing this architecture fundamentally broke our CI pipeline. Our initial Playwright test suite focused on deterministic component structures, but once our AI Assistant began dynamically generating React widgets based on conversational context, the tests immediately flaked.

The real issue was not just non-deterministic text output. It was that our AI Assistant was bypassing the UI entirely and making changes directly to our underlying data models. Because the UI and the Assistant were modifying two different views of the data, our traditional end-to-end tests—which only checked the DOM—were fundamentally blind to the actual state mutations.

### Building Semantic Fixtures

We realized that to test AI effectively, we had to stop testing exact strings and start testing semantic outcomes. We leveraged Playwright's `test.extend` API to create custom semantic fixtures oriented around goals rather than specific text.

```typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  goalValidator: async ({ page }, use) => {
    await use(async (expectedGoal: string) => {
      // Instead of brittle string matching, we assert the semantic outcome
      const dataLayer = await page.evaluate(() => window.getUniversalState());
      expect(dataLayer.currentGoal).toEqual(expectedGoal);
    });
  }
});
```

### Rethinking the Assertion Model

To resolve this, we needed to move away from string matching and instead assert on the abstract syntax tree (AST) of the rendered intent. Our solution was to extend the base Playwright `test` object with custom fixtures that extract the page's semantic state—mapping the dynamic DOM back into an abstract JSON representation that we could reliably assert against.

We accomplished this by leveraging a custom data attribute (`data-semantic-id`) on our generative components, and a specialized Playwright fixture that evaluates the state within the browser context.

Here is the deep dive into the TypeScript implementation of our `semanticTest` extension:

```typescript
import { test as base, expect, Page } from '@playwright/test';

type SemanticNode = {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
};

type SemanticFixtures = {
  semanticState: (selector: string) => Promise<SemanticNode>;
  authenticateAsRole: (role: string) => Promise<void>;
};

export const test = base.extend<SemanticFixtures>({
  authenticateAsRole: async ({ page }, use) => {
    // ... implementation details
  },

  semanticState: async ({ page }, use) => {
    // ... implementation details
  },
});

export { expect };
```

### Implementing the Semantic Assertions

With our `test.extend` setup, we completely eliminated the brittle string assertions. Instead of checking if the onboarding wizard said "Welcome", we assert that the generative layer correctly resolved the user's intent to "onboarding_welcome" with the correct extracted entities.

Here is what the refactored, flake-free test looks like:

```typescript
import { test, expect } from './fixtures/semanticTest';

test.describe('provider onboarding Wizard - Generative Flow', () => {
  test('should generate the correct onboarding context for a software engineer', async ({ page, authenticateAsRole, semanticState }) => {
    await authenticateAsRole('software_engineer');
    await page.goto('/onboarding/start');
    
    // ... implementation details
    
    const headerState = await semanticState('[data-semantic-id="onboarding-header"]');
    expect(headerState.intent).toBe('onboarding_greeting');
    // ... implementation details
  });
});
```

### Conclusion

By shifting our testing strategy from presentation-layer string matching to semantic state verification, we completely eliminated the 40% flake rate introduced by our generative UI components. The Antigravity agent pairing session was the catalyst we needed to realize that AI-driven interfaces require an entirely new testing vocabulary. 

In Part 2 of this series, we will explore how we built a deterministic prompt-replay proxy to ensure our E2E tests can run offline without hitting the live LLM API, saving thousands of dollars in CI compute costs.
