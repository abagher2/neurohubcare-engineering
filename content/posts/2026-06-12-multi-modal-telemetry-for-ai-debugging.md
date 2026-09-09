---
title: "Autonomous Testing Part 2: Building a Multi-Modal Telemetry Pipeline"
date: "2026-06-12"
slug: "2026-06-12-multi-modal-telemetry-for-ai-debugging"
summary: "Serializing the DOM and capturing raw video streams via Chrome DevTools Protocol (CDP) so AI agents can 'watch' failing tests."
tags: ["Testing", "Telemetry", "Playwright"]
---

In the first part of this series, we covered how we transitioned our test suites from brittle assertions to goal-based evaluations. But as we scaled our autonomous AI testing agents to tackle increasingly complex end-to-end user journeys, we hit a wall. When tests failed—particularly those involving subtle race conditions or complex UI state changes—our agents were as lost as a junior engineer trying to debug a minified production bundle with `console.log`.

This post dives deep into how we rebuilt our telemetry pipeline to bridge the sensory gap for our AI agents, utilizing Playwright's Chrome DevTools Protocol (CDP) capabilities and multi-modal context windows to give our agents "eyes."

### The Gemini Session Context: Flying Blind in the submission Flow

The logs showed the network requests completing successfully, but the UI state remained intractable. Finally, the agent output a remarkably human complaint in its reasoning trace: *"I cannot see what is happening during the transition. If we capture the execution context, I can debug this visually."*

The agent was right. We were expecting it to debug complex UI transitions using only abstract text representations (logs and network events). We needed to serialize the visual and structural state of the application in a way that fit within the context window limits of an LLM, while also providing raw video for multi-modal analysis.

### The Technical Solution: Serializing State and Streaming Video

To solve this, we built a two-pronged telemetry pipeline: 
1. **Token-Efficient DOM Serialization:** A CDP-driven DOM snapshotter that strips visual noise (SVGs, massive inline scripts) and outputs a highly compressed JSON representation of the accessibility tree and key DOM nodes.
2. **Synchronized Video Capture:** Configuring Playwright to record MP4 videos, strictly mapped to test steps, allowing the AI to ingest specific video frames during failures.

#### Building the Token-Efficient DOM Serializer

Dumping `document.documentElement.innerHTML` into an LLM context window is a recipe for instant token exhaustion. We needed a representation that maintained structural and state fidelity without the markup bloat. We leveraged Playwright's `CDPSession` to communicate directly with the browser's rendering engine.

Here is the core TypeScript implementation of our DOM serializer:

```typescript
import { Page, CDPSession } from '@playwright/test';

interface SerializedNode {
  nodeId: number;
  nodeName: string;
  // ... implementation details
}

export async function captureTokenEfficientDOM(page: Page): Promise<string> {
  const client: CDPSession = await page.context().newCDPSession(page);
  // ... implementation details
  
  function serializeNode(node: any): SerializedNode | null {
    // ... implementation details
  }

  return JSON.stringify(/* cleanTree */);
}
```

This approach reduces a typical React application's DOM from ~150k tokens down to a dense, semantic JSON structure of roughly 3k tokens. When the test fails, this JSON payload is attached to the failure report, allowing the agent to instantly "read" the exact state of the UI elements.

#### Synchronized Video Capture for Multi-Modal Ingestion

While the JSON tree provides immediate structural state, debugging race conditions (like a loader spinning infinitely over the submission button) requires temporal awareness. We configured Playwright to capture video and, crucially, chunk it around logical test steps.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Record video for every test to enable post-mortem AI analysis
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 }
    },
    trace: 'on', // We also capture traces for network/console context
  },
  reporter: [
    ['json', { outputFile: 'test-results/report.json' }],
    ['./src/reporters/ai-telemetry-reporter.ts'] // Custom reporter for AI ingestion
  ],
});
```

Our custom `ai-telemetry-reporter.ts` orchestrates the handoff. When a test fails, it extracts the timestamp of the failing step, slices the MP4 video utilizing `ffmpeg`, and uploads the critical 5-second window to an S3 bucket. The agent is then invoked with a prompt containing the compressed DOM JSON, the network trace logs, and a signed URL to the video snippet.

Because models like Gemini are inherently multi-modal, the agent can watch the video, correlate the visual spinning loader with the un-resolved API promise in the network logs, and cross-reference the `aria-disabled="true"` attribute in the DOM JSON.

By bridging the gap between text logs and visual execution context, our autonomous agents evolved from blind guessers into surgical debuggers. In Part 3, we will explore how we utilize these agents to automatically generate and apply PRs for the bugs they uncover.
