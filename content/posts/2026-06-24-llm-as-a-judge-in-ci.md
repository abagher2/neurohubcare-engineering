---
title: "Beyond String Assertions: Running an LLM-as-a-Judge Directly in CI"
date: "2026-06-24"
slug: "llm-as-a-judge-in-ci"
tags: ["Testing", "LLM", "Playwright", "CI/CD"]
summary: "Our CI pipeline was failing over 40% of the time, not because of bugs, but because our autonomous UI agents were constantly tweaking layouts and copy. Traditional E2E tests rely on brittle, exact-match DOM assertions. When an agent changed a button from \"Submit Form\" to \"Complete Workflow\", our tests would break, requiring hours of manual fixing by engineers and stalling our deployments."
---
# Beyond String Assertions: Running an LLM-as-a-Judge Directly in CI

In our journey to fully autonomous UI generation, we hit a massive, unexpected bottleneck: our Continuous Integration (CI) pipeline was failing over 40% of the time. The deeply frustrating part? These weren't actual functional bugs. The applications worked perfectly. The failures were entirely due to our autonomous agents aggressively tweaking layouts, updating copy, and refactoring DOM structures in their pursuit of the optimal user experience. 

Traditional End-to-End (E2E) testing with frameworks like Playwright relies heavily on deterministic, exact-match DOM assertions. When an autonomous agent in our fleet decided that a primary action button should say "Complete Workflow" instead of "Submit Form," our tests would instantly shatter. Engineers were spending hours every single week manually repairing brittle `expect(locator).toHaveText()` assertions, completely stalling our Next.js Static Export deployments and creating massive friction in our delivery pipeline.

## The Flaw of Deterministic UI Testing

Our tech stack at NeuroHub—a statically exported Next.js frontend communicating with AWS AppSync and DynamoDB—allows us to iterate incredibly fast on the presentation layer. The backend data structures are rigidly enforced (as detailed in our [Strict ORM Builders](/2026-09-18-strict-orm-builders) post), but the frontend UI is highly fluid.

As we accelerated the deployment of our autonomous agents, the speed of UI iteration skyrocketed. Agents were constantly A/B testing copy, improving accessibility labels, and optimizing complex user flows based on feedback loops. 

Deterministic E2E tests are fundamentally incompatible with this level of flux. Image snapshot testing (visual regression testing) was even worse; a single pixel shift in margin or a font anti-aliasing change would cause a catastrophic build failure. We needed a way to verify that a feature worked *conceptually*, without tying the test to a specific DOM node, a literal string of text, or a specific visual layout. We needed semantic verification.

## Pioneering LLM-as-a-Judge

To decouple our testing infrastructure from exact pixel and text matches, we pioneered the **LLM-as-a-Judge** pattern in our CI pipeline. 

Instead of asserting on exact DOM states, we extract a sanitized, semantic representation of the current page and pass it to a highly quantized, local LLM running directly inside our CI environment. This local LLM acts as an impartial adjudicator, evaluating the semantic intent of the page rather than its literal HTML representation. It understands context, synonyms, and logical flow, allowing it to accurately determine if the application is in the correct state regardless of superficial UI changes.

### The Semantic Assertion Fixture

We built a custom Playwright fixture that abstracts this complexity away from the test author. The resulting tests are incredibly terse and almost entirely resistant to copy changes or structural refactoring.

```typescript
// Traditional Brittle Test
// await expect(page.locator('.submit-btn')).toHaveText('Submit Form');

// Semantic Assertion
await expectSemanticState(page, "The workflow is complete and blocked from further editing.");
```

Under the hood, the `expectSemanticState` function performs a complex transformation. It captures the current DOM and generates a "sanitized accessibility tree." We aggressively strip out noisy attributes like random styled-components hashes, base64 embedded images, arbitrary `div` wrappers, and highly specific `data-testid` attributes that tightly couple the test to the implementation. 

We feed a clean, Markdown-like representation of the interactive elements (buttons, inputs, headings, and ARIA labels) to the local LLM along with the developer's assertion string. The LLM evaluates the state and returns a structured JSON response indicating whether the semantic intent is met, along with a brief reasoning trace.

## Hardware, Quantization, and CI Integration

Implementing this locally wasn't as simple as just firing off API calls to a hosted frontier model. Relying on cloud-based LLMs for every assertion in a massive E2E suite would have added hours to our CI times, incurred massive usage costs, and introduced unacceptable external network dependencies. 

To solve this, we rely on a highly quantized local model running efficiently on our CI runners. Specifically, we utilize an 8B parameter model quantized to 4-bit precision, executing on AWS EC2 instances equipped with T4 GPUs. This allows the LLM to run entirely within our isolated VPC. Inference takes milliseconds, and because the model is only evaluating small snippets of sanitized DOM against narrow semantic claims, the 8B parameter scale is more than sufficient for high accuracy. (We're exploring extending this local model approach further for true multimodal visual evaluation, which you can read about in [Visual Testing](/2026-07-15-visual-testing-and-local-llm-migration)).

## Engineering Challenges and Edge Cases

Deploying LLM-as-a-Judge uncovered several fascinating edge cases that required architectural refinement.

First, we had to prevent the Judge from hallucinating success. Early iterations of our system prompt allowed the LLM to be entirely too forgiving. If a button was technically present in the DOM but hidden beneath an opaque modal overlay or placed entirely off-screen via CSS, the LLM would occasionally read the raw text and mark the test as passed. We solved this by strictly feeding the LLM only the *visible, interactive* accessibility tree. Playwright's native visibility checks filter the DOM before it ever reaches the LLM, effectively blinding the Judge to hidden nodes.

Second, dealing with dynamic, non-deterministic data was a major hurdle. Because our Next.js frontend is fully statically exported, all dynamic data comes from AppSync at runtime. Timestamps, DynamoDB auto-generated UUIDs, and complex financial calculations fluctuate between test runs. Traditional regex assertions are notoriously bad at handling this. The LLM, however, excels at it. It can easily verify that a table contains "a recently dated receipt for roughly $50" without needing to know the exact nanosecond timestamp or the precise decimal floating point value.

Finally, we had to ensure the LLM didn't misinterpret backend infrastructure failures as frontend UI changes. If AppSync returned a GraphQL timeout error, the Next.js UI might correctly render a generic "An error occurred while fetching your data" boundary. The LLM would sometimes interpret this as a valid semantic state if the test assertion was too vaguely worded (e.g., "The page finished loading"). 

We tightened our prompt engineering significantly to address this. All prompts used for the Judge are strictly versioned using our `AiPromptVersion` records, adhering to NeuroHub's core AI integration policies. We explicitly require the LLM to look for positive confirmation of the requested domain state. This is almost always verified through the presence of specific data structures successfully parsed by our `Builder.build()` pipelines. If the Builder fails to hydrate an entity because AppSync returned an error, the specific domain data won't exist in the accessibility tree, and the LLM will correctly fail the test.

## The Results

Deploying LLM-as-a-Judge fundamentally transformed our CI pipeline and our relationship with autonomous agents. Our flake rate plummeted from an abysmal 40% to near zero. 

Our Antigravity agents can now freely optimize the UI. They can change button colors, rewrite verbose copy into concise instructions, restructure complex forms into multi-step wizards, and improve accessibility layouts without breaking the build. As long as the underlying semantic requirements of the application remain intact and the AppSync data is correctly hydrated via the `Builder.build()` pattern, the CI pipeline remains green. We stopped fighting the agents' optimizations and finally embraced the true speed of autonomous development.
