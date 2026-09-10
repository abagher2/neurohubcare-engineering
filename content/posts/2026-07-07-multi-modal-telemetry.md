---
title: "Multi-Modal Telemetry: Giving Agents Eyes in CI"
date: "2026-07-07"
slug: "multi-modal-telemetry-for-ai-debugging"
summary: "Serializing the DOM and capturing raw video streams via Chrome DevTools Protocol (CDP) so AI agents can 'watch' failing tests."
tags: ["Testing", "Telemetry", "Playwright", "Debugging"]
---
# Multi-Modal Telemetry: Giving Agents Eyes in CI

When you're running a Next.js Static Export frontend backed by AppSync GraphQL and DynamoDB, your architecture is inherently decoupled. This decoupling is fantastic for scaling development across large teams, but it introduces subtle complexities in end-to-end testing, especially when autonomous agents are committing code. Text-based logs were no longer enough to debug UI failures introduced by our agents. The agents were missing crucial visual layout bugs that made our React components unusable for our users. We needed a way for the system to "see" what the user sees to catch UI/UX regressions early. 

When a Playwright test failed, agents struggled to fix UI race conditions using only `stdout`, stack traces, and test error messages. They would blindly attempt to patch layout shifts or z-index collisions based on raw DOM dumps, often creating more problems than they solved. [Why Playwright flaked](/2026-06-30-why-playwright-flaked) became a constant question we asked ourselves. Textual representation alone was simply insufficient to convey the reality of a visual interface. They needed visual telemetry.

## The Breaking Point: Blind Agents in a Visual World

The catalyst for this entire architectural shift was a series of cascading failures in our core `ReceiptUpload` and `Reimbursement` workflows. Autonomous agents were successfully updating the business logic and React state for AppSync data hydration, but in doing so, they inadvertently introduced visual regressions. We saw instances where loading spinners were absolutely positioned off-screen, error toasts were hidden behind sticky navigation headers due to z-index overlaps, and critical submit buttons were rendered just outside the viewport on mobile resolutions.

Because the DOM elements technically existed in the document, Playwright would sometimes pass basic `toBeInDocument()` assertions. When tests did fail—for instance, if Playwright timed out waiting for an element to be visible—the agents received a generic timeout error. Their typical response was to arbitrarily bump the timeout limits or pepper the code with `await new Promise(r => setTimeout(r, 1000))`, completely misunderstanding that the element was actually obscured by a translucent backdrop-filter overlay. 

We realized that our testing infrastructure was essentially treating the browser like a headless API. To truly test a user interface, the testing agent must consume it visually.

## The Engineering Challenge: Capturing the Exact Moment

We initially experimented with basic screenshots, but timing issues made them fundamentally unreliable. By the time a test failed and the screenshot command executed, the DOM state might have already settled into a different error state, or worse, a fallback UI that masked the actual transition that caused the failure. 

To solve this, we built a comprehensive multi-modal telemetry pipeline leveraging the deep capabilities of the Chrome DevTools Protocol (CDP):

1. **DOM Serialization:** At the exact moment a Playwright assertion fails, we dump the entire CDP DOM tree. However, a raw DOM dump from a modern React application is incredibly bloated. To keep this token-efficient for LLM context windows, we run a swift parsing pass to strip out noisy tags like `<svg>`, `<style>`, `<script>`, and deeply nested unstyled `<div>` wrappers. We map computed styles only for layout-critical properties (like flexbox, grid, and absolute positioning), distilling the document into a clean, semantic skeleton that an LLM can easily digest.
2. **Video Frame Extraction:** Rather than relying on point-in-time screenshots that might miss the critical frame, we configure Playwright to record the entire test run as a video. When a failure occurs, we calculate the exact timestamp of the failed assertion and use FFMPEG to extract the precise MP4 video frame corresponding to that microsecond. 

This dual-pronged approach gives the debugging agent both the structural DOM state (to understand the hierarchy and attributes) and the raw visual output (to see exactly how the browser's rendering engine painted that structure).

## Architecture: Processing Modalities Safely and Cost-Effectively

Sending these massive DOM payloads and high-resolution, uncropped images to cloud-based multimodal models for inference simply wasn't financially feasible at our scale. We were already migrating our semantic discovery architecture from Postgres `pgvector` to an in-memory `Orama` index combined with Gemini embeddings precisely to avoid skyrocketing cloud infrastructure costs. We needed a cost-effective, entirely local way to process visual test telemetry without bogging down our CI runners.

For visual processing, we opted for local multimodal LLMs. However, we quickly ran into a major edge case that threatened to derail the entire initiative: VRAM Out-Of-Memory (OOM) crashes. Our visual regression testing required `fullPage: true` screenshots to ensure no layout shifts happened below the fold. We also strictly enforce a "no cropping" policy to maintain aspect ratio, context, and accurate pixel density mapping. Sending concurrent full-page, high-resolution images to a local LLM running on standard CI hardware would instantly exhaust the VRAM and crash the GPU, bringing the entire pipeline down with it.

To mediate this hardware limitation, we engineered a dedicated HTTP Mutex Queue running locally on port 8002.

```typescript
// Local HTTP Mutex Queue for Vision Tasks
const visionQueue = new PQueue({ concurrency: 1 });

app.post('/analyze-frame', async (req, res) => {
  const result = await visionQueue.add(() => 
    localVisionModel.generateContent({
      prompt: req.body.prompt,
      image: req.body.fullPageScreenshot // uncropped, fullPage: true
    })
  );
  res.json(result);
});
```

By forcing all visual diagnostic requests through this strict concurrency limit of 1, we entirely eliminated VRAM OOM crashes while maintaining the high fidelity of full-page, uncropped screenshots. The Queue acts as a traffic cop for our local LLM infrastructure. When multiple tests fail concurrently across parallel Playwright shards, the requests safely queue up. It might take an extra 30 seconds to process the batch of failures, but the CI environment remains rock-solid and stable.

## Replacing the Orchestrator: The Death of BotHuddle

Initially, we orchestrated this entire pipeline using a heavy, centralized cloud agent service we built internally called BotHuddle. It managed the routing of test failures, parsed the logs, and coordinated the cloud-based vision models. But much like our pgvector pivot, BotHuddle was killing our budget due to excessive orchestration token costs, network egress fees, and the sheer overhead of maintaining a distributed orchestration layer just for testing.

We made a critical, controversial decision, detailing our rationale in [The Pivot](/2026-07-10-the-pivot). We killed BotHuddle entirely. 

In its place, we adopted the Antigravity framework and its `/teamwork` local commands. This shifted the compute paradigm from a centralized cloud orchestrator to localized edge execution. Now, when a test fails, the CI runner directly triggers a local Antigravity subagent through the CLI right on the machine where the test failed.

```bash
# CI Runner triggers local teamwork command
agy /teamwork \
  --goal "Diagnose UI failure in ReceiptUpload" \
  --context ./dom_skeleton.html \
  --image ./failure_frame.png
```

This local execution model passes the distilled DOM skeleton and the extracted high-resolution video frame directly to a localized agent swarm. Because the data never leaves the CI runner, we eliminated network latency and egress costs. The agents use the local HTTP Mutex Queue to analyze the imagery and instantly diagnose visual bugs like z-index overlaps, off-screen absolute positioning errors, and subtle layout shifts caused by asynchronous AppSync data hydration.

## Looking Forward: The Future of Autonomous Debugging

By giving our agents eyes in CI using full-page visual frames and clean DOM serialization, we completely transformed our automated debugging capabilities. The HTTP Mutex Queue allowed us to leverage powerful local models without infrastructure instability, while moving away from BotHuddle drastically reduced our cloud spend. The agents are now capable of opening targeted, highly accurate Pull Requests that fix visual bugs on the first try, rather than engaging in endless trial-and-error loops based on confusing DOM outputs.

This multimodal approach is just the beginning of our journey into visual AI. The foundational pipeline we built here paved the way for even more advanced UI verification techniques, which we explore further in our comprehensive deep dive on [Visual Testing and Local LLM Migration](/2026-07-15-visual-testing-and-local-llm-migration). As our agents become increasingly autonomous and begin making broader architectural decisions, ensuring they "see" the exact same NeuroHub experience as our end users remains our highest priority. The days of blind agents are over; the era of multimodal CI is here.
