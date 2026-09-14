---
title: "Breaking the Wizards: The UX Crawler and Fuzzing Engine"
date: "2026-08-23"
slug: "ux-crawler-and-fuzzing"
summary: "How we barraged our FocusedWizardLayout with an automated UX Crawler to expose brittle state transitions and combinatorial explosions."
tags: ["Testing", "Fuzzing", "React", "State Management", "Playwright", "Architecture", "Typescript"]
---
# Breaking the Wizards: The UX Crawler and Fuzzing Engine

**Motivation:** Our frontend was becoming a minefield of broken links and unhandled exceptions caused by aggressive agent refactoring. Relying on manual QA for every release was completely unscalable and delaying our launch dates. We needed an autonomous system to relentlessly crawl and stress-test the UI just like a frustrated user would.

In `red-tape-ninja`, our architecture is fundamentally different from traditional CRUD apps. Our `FocusedWizardLayout` routes dynamically based on the intermediate state of an ORM `Builder` and the complex, constantly shifting rules returned by the `ComplianceEngine`. A single change in a Regional Center's policy could introduce a new required field, completely branching the wizard into untested territory. To ensure our users never hit a dead end, we needed to go beyond testing the paths we knew. We built a custom UX Crawler paired with a deeply integrated Fuzzing Engine to systematically destroy our own application in CI.

## The Limits of Deterministic E2E Testing

When building software that dictates whether a family receives funding for crucial healthcare services, "mostly working" is unacceptable. Traditionally, we relied on Playwright E2E tests to validate our workflows. A standard test looked like this:

```typescript
test('user can upload a receipt with an IPP date mismatch', async ({ page }) => {
  await page.fill('#date', '2025-01-01'); // Intentionally out of bounds
  await expect(page.locator('text="IPP Date Exception"')).toBeVisible();
});
```

This approach handles "known unknowns". It confirms that when a user makes a specific, predictable mistake, the application responds correctly. However, it completely misses the combinatorial explosion of async events, AppSync GraphQL latency, and concurrent state mutations within DynamoDB records. What happens if a user submits a form exactly as their authentication token expires while an AI agent is simultaneously updating the underlying DynamoDB draft record? A standard E2E test will never catch this. A single missing field could branch a wizard into an untested fallback view, leaving the user stranded on a blank page with no way forward and no way back. 

We needed an autonomous system that didn't just follow happy paths, but intentionally wreaked havoc. We needed a system that thought like a chaotic user.

## Architecture of the UX Crawler & Fuzzing Engine

Our solution involves three main components working in tandem during our CI pipeline to continuously bombard the staging environment:

1. **The State Fuzzer**: Corrupts and mutates the strict `Builder` state before it ever syncs to DynamoDB, injecting mathematically impossible values and malformed JSON.
2. **The UX Crawler**: Explores the DOM heuristically via Playwright, prioritizing inputs and aggressively clicking buttons to find unhandled promise rejections.
3. **The Invariant Validator**: Checks core architectural rules (like [Deep Links UI Resumption](/2026-08-21-deep-links-resumption-ui)) at every single step, ensuring the application always degrades gracefully.

## Deep Dive: The Fuzzing Engine

The Fuzzer is designed to break the fundamental assumptions of our backend. It injects mutated, highly randomized payloads directly into the AWS AppSync mutations that instantiate the wizards. We purposely violate our strict entity builder constraints on the backend to see how the frontend handles malformed data.

```typescript
export class BuilderMutator {
  public generate(): BuilderPayload {
    const fuzzed = mutate(this.baseState);
    fuzzed.amount = -9999; // impossible financial state
    fuzzed.date = "NOT_A_DATE"; // Type corruption
    return fuzzed;
  }
}
```

In our Playwright tests, we don't just run one test; we bombard the application with thousands of malformed states in a tight loop.

```typescript
test('Fuzz the Reimbursement Wizard', async ({ page }) => {
  for (let i = 0; i < 1000; i++) {
    const badState = new BuilderMutator(basePayload).generate();
    await seedDynamoDB(badState); // Load fuzzed state into the test DB
    await runCrawlerOnCurrentPage(page);
  }
});
```

This process simulates database corruption, incomplete migrations, and malicious API usage. If the React frontend crashes with a white screen of death, the test fails. The UI must always handle the corrupted state by redirecting to a safe fallback or displaying a human-readable error boundary.

## Deep Dive: The UX Crawler

The Crawler is the front-end counterpart to the Fuzzer. It treats the Next.js UI as an unexplored, hostile graph. It prioritizes primary actions over secondary ones based on semantic HTML attributes, but it will click indiscriminately to find unhandled promise rejections or missing suspense boundaries.

```typescript
export class UxCrawler {
  public async explore(maxDepth: number = 5): Promise<void> {
    const nodes = extractActionableNodes();
    // Intentionally mash buttons randomly and aggressively
    await nodes[Math.floor(Math.random() * nodes.length)].click({ force: true });
  }
}
```

The crawler doesn't know what the buttons do. It just knows they exist. It will attempt to submit forms without filling out required fields, it will rapidly double-click submit buttons to trigger race conditions, and it will aggressively navigate backward and forward using the browser history API to break our optimistic UI cache.

## The Golden Rule Validation: Asserting UI Resilience

Finding errors is only half the battle. The true value of the Crawler lies in enforcing our strict architectural invariants. In `red-tape-ninja`, we have a strict invariant derived directly from our compliance needs: **"If there's an error, there must be a field and a wizard step for it."** 

This is our Golden Rule. A user must never be told "An error occurred" without being given a direct, actionable path to fix it. The crawler asserts this invariant after every single action it takes. If a user hits a global error banner that isn't addressable via a deep link to a specific wizard step, we fail the build.

```typescript
export async function validateGoldenRule(page: Page) {
  const banners = page.locator('[data-role="global-compliance-error"]');
  // Ensure every error banner has a resolution link back to a specific wizard step
  expect(await banners.locator('a[href^="#step-"]').count()).toBeGreaterThan(0);
}
```

## Failure Modes and Triumphs

When we first turned the Crawler on, it failed 95% of our test suite. It uncovered a massive vulnerability where double-clicking a submit button on a slow AppSync connection would generate duplicate DynamoDB records, entirely bypassing our regional budget caps. It found edge cases where navigating backwards after a successful upload would trap the user in an infinite redirect loop.

By marrying a rigorous Fuzzer that corrupts our DynamoDB payloads with an autonomous Playwright crawler that abuses the DOM, we successfully uncovered dozens of dead ends before our users ever saw them. We moved from a reactive QA model to a proactive, autonomous testing culture. This infrastructure gives us the confidence to deploy massive AI-generated refactors to production daily. For more details on how we enforce these rules at the domain layer, see our post on [Building the Compliance Engine](/2026-09-02-building-the-compliance-engine).
