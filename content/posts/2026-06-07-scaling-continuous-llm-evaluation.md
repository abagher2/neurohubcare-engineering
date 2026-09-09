---
title: "Scaling Continuous LLM Evaluation: Distributed Concurrency and Rate Allocation"
date: "2026-06-07"
slug: "2026-06-07-scaling-continuous-llm-evaluation"
summary: "Connecting domain models to automated LLM judge pipelines triggered severe upstream throttling, forcing us to architect multi-dimensional rate limiters."
tags: ["Infrastructure", "LLM"]
---

Following our late July milestone establishing compiled domain predicates and reactive entity workflows, we turned toward establishing automated quality gates. In complex domain spaces—such as evaluating synthetic service marketplace product descriptions or auto-generated compliance candidate summaries—human evaluation of generated text cannot scale to meet continuous integration needs. 

We integrated an automated LLM-as-a-judge harness to grade synthetic generation batches against multi-tiered qualitative rubrics. However, orchestrating parallel evaluation suites across distributed test workers immediately triggered severe upstream quota exhaustion, manifesting as cascading HTTP 429 Too Many Requests exceptions.

### The Thundering Herd Problem

Through deep empirical analysis, we realized that LLM inference endpoints possess a multi-dimensional constraint space that traditional request-rate algorithms ignore. Providers enforce simultaneous caps on Requests Per Minute (RPM) and Tokens Per Minute (TPM). Because document evaluation payloads vary dramatically in token density, metering raw request volume alone provides zero protection against token exhaustion.

### Multi-Dimensional Token Bucket Architecture

We redesigned our evaluation pipeline around an asynchronous, two-dimensional token bucket scheduler. Before any inference request is dispatched, an edge tokenizer pre-calculates the projected token payload and secures reservations against both the active RPM and TPM budgets. 

```typescript
import { PriorityQueue } from './utils/PriorityQueue';

class MultiDimensionalRateLimiter {
  private rpmBucket: TokenBucket;
  private tpmBucket: TokenBucket;
  private queue = new PriorityQueue<InferenceTask>();

  constructor(config: RateLimitConfig) {
    this.rpmBucket = new TokenBucket(config.maxRpm, 1000 * 60);
    this.tpmBucket = new TokenBucket(config.maxTpm, 1000 * 60);
  }

  async schedule(prompt: string, priority: number): Promise<string> {
    // ... implementation details
  }

  private async drain() {
    // ... implementation details
  }
}
```

If instantaneous capacity is depleted, requests are staged in prioritized memory heaps rather than dropped. Combined with full decorrelated jitter on all retry timers, this traffic-shaping architecture eradicated 429 exceptions, increased continuous test throughput by 3.4x, and established a dependable foundation for our automated testing harness. We now process thousands of evaluation steps in our CI/CD pipelines without overwhelming upstream providers.
