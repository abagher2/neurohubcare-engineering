---
title: "Taming Server-Sent Events: ReadableStreams and Backpressure in Next.js"
date: "2026-06-04"
slug: "2026-06-04-streaming-sse-nextjs-route-handlers"
summary: "A technical deep-dive into implementing Web Streams API in Next.js App Router, handling TCP backpressure, and preventing memory leaks."
tags: ["Nextjs", "Streaming", "SSE", "Performance"]
---

### The Challenge of Streaming Over HTTP

Delivering real-time generative output via Server-Sent Events (SSE) sounds straightforward. However, deploying streaming endpoints through standard cloud infrastructure (like AWS Application Load Balancers or Vercel Edge Networks) introduces significant networking obstacles.

When we initially implemented streaming in our Next.js App Router, we encountered three specific issues:
1. **Proxy Buffering**: Ingress proxies naturally aggregate incoming TCP chunks into 4KB buffers before forwarding them to the client, which destroys the real-time "typing" experience of an SSE stream.
2. **Memory Leaks via Orphaned Streams**: When users closed their browser tabs mid-generation, the Node.js backend continued executing the LLM inference. Because the underlying socket was closed but the stream wasn't properly cancelled, Node.js held the buffers in memory, leading to V8 garbage collection stalls.
3. **TCP Backpressure**: If the LLM generates tokens faster than the client can download them (e.g., on a 3G mobile connection), the server's internal stream buffers overflow.

### Implementing Native Web Streams

To solve this, we moved away from legacy Node.js `EventEmitter` patterns and strictly adopted the standard **Web Streams API** (`ReadableStream`). This allows us to handle backpressure and abort signals natively.

Here is the exact architectural pattern we use for our SSE Route Handlers:

```typescript
// src/app/api/stream/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // 1. Capture the native AbortSignal from the incoming HTTP request
  const clientSignal = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      try {
  // ... implementation details
      'X-Accel-Buffering': 'no', 
    },
  });
}
```

### Technical Breakdown

1. **Explicit Ingress Directives**: By setting `X-Accel-Buffering: no` and `Cache-Control: no-transform`, we instruct intermediate Nginx proxies and CDNs to flush TCP packets immediately upon receipt, guaranteeing sub-100ms Time-to-First-Token (TTFT).
2. **Bidirectional Abort Propagation**: We hook the `NextRequest.signal` directly into our LLM invocation. When the TCP connection drops, the standard `AbortError` is thrown, instantly halting the expensive backend compute process and allowing the V8 garbage collector to free the memory.
3. **Standardizing on Web APIs**: Relying strictly on the `ReadableStream` standard (rather than Node-specific streams) ensures our code is perfectly portable between Node.js and Edge runtimes.
