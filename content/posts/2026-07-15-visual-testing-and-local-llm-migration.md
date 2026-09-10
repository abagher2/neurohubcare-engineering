---
title: "The $100/Day CI Bill: Migrating Visual Testing to Local LLMs (And Why We Didn't Crop)"
date: "2026-07-15"
slug: "visual-testing-and-local-llm-migration"
summary: "How our multimodal testing suite cost us $100 a day in Gemini API fees, and how we built a serialized LLM queue to run full-page inference locally."
tags: ["Testing", "Local LLMs", "Cost Optimization", "Playwright", "LLM-as-a-Judge"]
---
# The $100/Day CI Bill: Migrating Visual Testing to Local LLMs (And Why We Didn't Crop)

> **The Motivation:** Our agents were writing code, but we couldn't blindly trust them. We built visual regression testing using Gemini to act as an LLM Judge. But running Gemini Vision on every CI pipeline was costing over $100 a day. We had to pivot to local quantized LLMs, which meant solving massive VRAM bottlenecks.

It started with a simple, almost innocent problem: as we accelerated our development velocity with agentic coding assistants, the number of visual regressions in our user interface spiked dramatically. Our automation was generating robust, logically sound code, but UI engineering involves a level of spatial reasoning that pure logic often misses. While our exhaustive suite of unit tests successfully validated the business logic inside our Next.js Static Export applications, they were fundamentally blind to visual catastrophes. They couldn't catch when a seemingly harmless CSS update inadvertently hid a critical submit button on a specialized modal, or when a seemingly unrelated z-index issue caused a dropdown menu to render entirely underneath an active AppSync data table.

Our initial solution to this visibility gap was robust, cutting-edge, and undeniably exciting. As detailed extensively in our previous post on [Visual Regression with Gemini](/2026-07-09-visual-regression-with-gemini), we configured our Playwright test suite to aggressively capture screenshots on every single UI interaction. We then passed these captures directly to the Gemini API for multimodal evaluation. The "LLM-as-a-Judge" pipeline was a massive, unqualified success in catching regressions. It caught overlapping text, broken responsive layouts, and missing focus states with astonishing accuracy. 

But it came at a staggering, ultimately unsustainable price. 

With 40 concurrent E2E test workers running on every commit across dozens of active developers, our CI pipeline was performing thousands of complex multimodal inferences a day. By the time our monthly cloud billing statement arrived and we investigated the invoice, our multimodal testing suite was silently burning over $100 a day in API fees—amounting to nearly $3,000 a month. This kind of runaway operational cost is exactly the sort of dangerous overhead we successfully avoided when we transitioned off our legacy BotHuddle architecture, as discussed in [The Pivot](/2026-07-10-the-pivot) to local Antigravity `/teamwork` commands. 

This aggressive cost optimization directly mirrors our recent data layer migration, where we abandoned Postgres `pgvector` in favor of `Orama` (an in-memory vector engine) combined with Gemini embeddings. Just as pgvector became prohibitively expensive to operate at our scale, forcing us to rethink our vector search architecture, the cloud-based visual inference pipeline forced us to confront the realities of scale. Both migrations underscore a core NeuroHub engineering philosophy: architectural elegance means building for sustainability, not just capability. We realized we needed to aggressively apply that same local-first, cost-conscious mentality to our continuous integration testing suite. We had to migrate to a local LLM runner for our visual testing, and crucially, we had to do it without losing the high fidelity and strict visual standards of our existing cloud-based setup.

## The Cropping Myth and Its Inevitable Failure

The immediate, almost reflexive suggestion from the engineering team was an intuitive one: just crop the screenshots. By drastically reducing the image footprint sent to a local LLM, we reasoned we could drastically reduce the number of tokens processed. This would ostensibly save both inference time and, more importantly, precious VRAM usage on our constrained CI runners. The prevailing idea was to programmatically calculate a bounding box around the specific active widget being tested—say, a specific form input or a localized component—and pass only that narrow sliver of the UI to the vision model.

We confidently prototyped this approach, but the harsh reality of modern, dynamic UI frameworks quickly and thoroughly dismantled our hypothesis. Cropping images to save VRAM tokens fails catastrophically in practice because critical, user-blocking errors frequently occur entirely outside the active widget canvas. 

Consider a common, high-stakes interaction in our Action Center where a user is updating a Reimbursement Request. The user action—typing, selecting, confirming—might happen deep inside a specialized, deeply nested form component. However, if the form submission triggers a global error banner that renders at the absolute top of the viewport—or if a fixed-position navigation element inadvertently slips down and obscures the confirmation dialog—a cropped screenshot centered only on the form would report a perfectly successful UI state. The local LLM would see the form working perfectly, completely oblivious to the fact that the actual user experience is entirely broken because the overarching layout has collapsed.

We encountered numerous edge cases during our cropping experiment. Modal overlays with transparent backdrops would often hide underlying layout shifts that were critical to the overall page context. Floating action buttons would disappear off-screen, and toast notifications would render outside the cropped bounding box. 

To maintain genuine, trustworthy E2E test integrity, we realized that we absolutely had to retain `fullPage: true` in our Playwright captures. We needed the local LLM to judge the complete, unadulterated context of the page, seeing exactly what a human user would see when interacting with the application.

## The VRAM Bottleneck: A Lesson in Hardware Constraints

Running uncropped, full-page screenshots through a local vision model introduces a severe, unavoidable hardware constraint. Unlike the cloud environment, where massive elasticity effectively hides the consequences of high concurrency, a local CI runner only has so much Video RAM. 

When our Playwright suite aggressively spun up 40 concurrent test workers, each worker simultaneously attempting to load a local LLM inference session into memory to process a heavy multimodal payload, the result was immediate and violent. We experienced catastrophic Out-Of-Memory (OOM) crashes across our CI infrastructure. Our runners would simply collapse under the weight of 40 full-resolution, `fullPage: true` screenshots attempting to be vectorized and processed simultaneously. 

The failure mode was particularly painful. Playwright workers would hang indefinitely waiting for a response from the crushed local model. The CI pipeline would freeze, ultimately timing out after an hour, blocking developer deployments and destroying our velocity. We initially tried down-sizing the model, utilizing heavily quantized, extremely small parameter models to fit everything into VRAM. However, these smaller models immediately began hallucinating, missing obvious layout breakages or flagging perfectly fine UI as broken. We needed the reasoning capability of a mid-sized multimodal model, which meant we could only realistically fit one, perhaps two, inference sessions in memory at any given time.

## Engineering the Serialized LLM Queue

To prevent concurrent Playwright tests from OOM-killing our limited VRAM, we had to fundamentally rethink our concurrency model. The standard approach of isolated, parallel test execution was completely incompatible with our hardware constraints.

Our ultimate solution was a lightweight, highly resilient HTTP-based Mutex (mutually exclusive) queue. We deployed a tiny Node.js service running on port `8002` of the CI instance, specifically built to serialize incoming LLM inference requests without blocking the rest of the Playwright execution.

Instead of tests executing the massive visual inference inline, they now act as polite clients, placing a request to the local Mutex service and waiting their turn.

```typescript
// Inside our Playwright test harness
const evaluateVisuals = async (fullScreenshot) => {
  await acquireMutex('http://localhost:8002/acquire');
  
  try {
    return await runLocalInference(fullScreenshot);
  } finally {
    await releaseMutex('http://localhost:8002/release');
  }
};
```

This architecture is elegantly simple, yet profoundly effective. The Playwright tests run as fast as possible for all traditional, non-visual assertions—clicking elements, waiting for complex AppSync GraphQL mutations to settle, verifying standard DOM state, and validating DynamoDB state changes. But when it's time for the heavy LLM visual assertion, the specific test worker pauses and waits in line. 

Because we extensively use DynamoDB streams and EventBridge for asynchronous background processing in our core NeuroHub application architecture, we are deeply accustomed to eventual consistency and background queues. Applying this architectural mindset to our continuous integration pipeline felt natural. The local LLM acts as a single, constrained, but highly focused worker. It sequentially chews through the visual evaluations one by one, protected entirely from the chaotic concurrency of the test runners.

We also had to build significant resilience into this queue. If a Playwright test crashed or timed out while holding the mutex lock, the entire pipeline would deadlock. We implemented strict lease expirations and heartbeat mechanisms on port `8002` to ensure that abandoned locks were automatically reaped, allowing the queue to continually process visual tests even in the face of individual test failures.

## The Results: Zero Cost, Uncompromised Fidelity

The implementation of this serialized Mutex queue approach yielded dramatic results. It completely eliminated our Gemini API costs for visual testing, bringing the bill down from $3,000 a month to absolute zero (barring the fixed, predictable cost of the CI runner hardware itself). 

More importantly, this architectural shift allowed us to unyieldingly maintain the `fullPage: true` captures. By consciously accepting a slightly longer overall CI execution time—tests inevitably wait in line for the single Local LLM to free up—we successfully preserved the strict visual regression standards we absolutely required to trust our agentic coding tools. The tradeoff was fundamentally sound: we traded raw speed for massive cost savings and uncompromised testing fidelity.

This migration taught our engineering team a valuable, lasting lesson. Integrating advanced AI into your everyday development stack isn't merely a matter of prompt engineering or API integration; it is, at its core, a complex exercise in deep systems engineering. The real challenge wasn't writing the prompt to evaluate the UI; the real challenge was taking an incredible, magically elastic cloud capability and architecting a rigid, highly constrained local pipeline that didn't explode when subjected to the relentless concurrency of a real-world engineering team moving at maximum velocity.
