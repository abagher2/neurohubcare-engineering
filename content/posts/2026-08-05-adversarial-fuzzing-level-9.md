---
title: "Adversarial Fuzzing Level 9: Detecting DOM Contradictions"
date: "2026-08-05"
slug: "adversarial-fuzzing-level-9"
summary: "How our highest level of adversarial fuzzing catches unstringified objects and template leakage using strict DOM contradiction detection."
tags: ["Testing", "Fuzzing", "Playwright", "Security"]
---

# Adversarial Fuzzing Level 9: Detecting DOM Contradictions

As our autonomous AI agents accelerated their output, we quickly realized that standard unit tests and conventional end-to-end testing frameworks were failing to catch the highly creative, deeply semantic ways the agents could break the application. We were dealing with a new breed of 'smart' bugs—intricate edge cases in the regional center compliance engine that only emerged under complex, multi-step user flows interacting with remote databases. To combat this, we needed a testing mechanism that was as adaptive, relentless, and structurally aware as the agents writing the code.

Because our AI agents were rapidly writing more complex UI layers to interface directly with our AppSync GraphQL endpoints, they occasionally made fundamental assumptions about data shapes that resulted in leaking raw state directly into the browser. Given that our architecture relies entirely on Next.js Static Export, rendering errors directly impact the client experience; there is no server-side Node.js safety net to catch a malformed render or gracefully handle a template error before it hits the user's screen. To address this, we engineered a 9-level Adversarial Fuzzing engine specifically designed to enforce an absolute, non-negotiable UI invariant: **Zero DOM Contradictions**.

## What Exactly is a DOM Contradiction?

A DOM contradiction occurs when the internal application state and the visually rendered output are fundamentally at odds, usually caused by an AI agent hallucinating the exact shape or type of a DynamoDB payload returning from the network. Our Level 9 fuzzing engine ruthlessly hunts for three primary categories of contradictions:

1. **Unstringified Objects**: This is the most common AI-generated hallucination. An agent assumes an AppSync response field is a simple string, but it is actually a deeply nested JSON object. Because React attempts to render what it is given, this results in the literal string `[object Object]` being rendered directly to the user interface. 
2. **Template Leakage**: This occurs when uninterpolated template variables (e.g., `${user.coordinatorName}`) appear raw in the UI. This typically happens because the agent bypassed our standard `Builder.build()` hydration phase, which is responsible for strictly parsing and mapping AppSync responses to our domain models.
3. **Client-Side Crash Overlays**: In a static export environment, a severe React Error Boundary failure will often leak the entire, raw stack trace into the production build's DOM, exposing underlying system architecture and confusing the user.

These categories encompass exactly the kinds of subtle, non-fatal UI failures we previously detailed in our retrospective on [The Bugs We Caught With Visual Telemetry](/2026-07-20-the-bugs-we-caught-with-visual-telemetry). A standard unit test will often pass if the component successfully mounts, completely ignoring the fact that it just rendered an unreadable object reference to the user.

## The Fuzzing Execution Mechanics

This highly advanced fuzzing strategy was chosen specifically to proactively hunt down edge cases before they corrupted our data in AWS Amplify. Level 9 fuzzing doesn't just passively click buttons; it actively attempts to break the Next.js static router by injecting complex XSS payloads, malformed UUIDs, and deeply nested object injections directly into the URL parameters and AppSync mutation variables.

```typescript
// Fuzzing the Next.js routing layer with malformed inputs
await page.goto('/requests/reimbursements/new?docIds=%2C%2C%2Cinvalid-uuid-x');
let contradictions = await detectDomContradictions(page);
```

During execution, the Playwright engine crawls the rendered page tree. If the Fuzzer manages to force an `[object Object]` or a raw template string to render anywhere on the screen, the test fails immediately and permanently. This strict enforcement guarantees that our UI degrades gracefully without ever leaking internal React state, AWS Cognito IDs, or DynamoDB partition keys to the client.

### Dynamic Telemetry Evaluation

To make this testing system truly autonomous and infinitely scalable across our agent fleet, the Telemetry Judge cannot merely look at the raw HTML. It dynamically reads `UI_CRASH` telemetry events directly from the application's runtime to correlate visual anomalies with network failures.

When the CI pipeline boots up the environment, the fuzzer explicitly parses the `aws_appsync_graphqlEndpoint` directly from the `amplify_outputs.json` configuration file. This dynamic configuration allows the LLM Judge to understand exactly which backend staging environment the client application is actively connected to. It can then securely cross-reference the network payloads sent to AppSync with the visual output rendered in the DOM. 

For example, if an AppSync mutation successfully returns a complex object representing a Care Plan, but the UI simply renders `[object Object]`, the Judge records a critical contradiction. It understands that the network layer succeeded, but the UI presentation layer failed fundamentally. 

This level of deep, contextual scrutiny is absolutely critical because standard testing tools do not inherently understand that `[object Object]` is a failure state; to a standard DOM query searching for text content, it's just a valid string of characters. By perfectly combining structural, adversarial fuzzing with visual and telemetry-based judgements, we've practically eliminated data-leakage bugs in our Next.js static exports, forcing our AI agents to respect the strict boundaries of our architecture. For a broader look at how we continuously benchmark these testing tools against agent performance, refer to [Evaluating the AI Assistant](/2026-08-16-evaluating-the-ai-assistant).
