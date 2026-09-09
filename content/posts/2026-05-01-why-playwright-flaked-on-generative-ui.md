---
title: "Autonomous Testing Part 1: Why Playwright Fails on Generative UI"
date: "2026-05-01"
slug: "2026-05-01-why-playwright-flaked-on-generative-ui"
summary: "How traditional Playwright assertions break on non-deterministic AI interfaces, and the custom fixtures we built to solve it."
tags: ["Testing", "Playwright", "Architecture"]
---

Testing non-deterministic user interfaces fundamentally breaks the assumptions of modern end-to-end testing frameworks. At NeuroHub, we discovered this the hard way when we integrated our generative UI layer. Our standard Playwright suites, which had reliably guarded our deployments for years, suddenly began flaking at an unacceptable 40% rate in CI. 

The tipping point occurred during a pairing session with our Antigravity AI coding agent. We tasked the agent with generating a new E2E test suite for an automated provider onboarding wizard—a dynamic workflow that leverages an LLM to generate contextual guidance, custom forms, and dynamic action buttons based on a new hire's role and location. 

The AI agent did exactly what it was trained to do on traditional web applications: it bypassed the actual auth flow by injecting hardcoded `localStorage` tokens, and it wrote assertions based on expected string matches. For example:

```typescript
await expect(page.locator('.onboarding-step-title')).toContainText('Welcome to the Engineering Team!');
```

The problem? The generative UI layer is non-deterministic. In one test run, the LLM might render "Welcome to the Engineering Team!". In the next, it might output "Greetings, new Engineer!" or "Let's get your Engineering environment set up." The underlying semantic meaning remained identical, but the brittle `.toContainText()` asserts failed instantly. Furthermore, by mocking the auth state via `localStorage`, the agent inadvertently bypassed the very initialization hooks required to bootstrap the generative context, leading to subtle race conditions.

Traditional E2E testing relies on static DOM trees and predictable content. Generative UI requires a paradigm shift: we must test the *semantic state* and the *structured data payload* backing the UI, rather than the raw text pixels rendered to the user.

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
