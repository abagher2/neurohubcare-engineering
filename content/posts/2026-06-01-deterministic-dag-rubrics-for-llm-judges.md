---
title: "Deterministic DAG Rubrics for LLM Judges"
date: "2026-06-01"
slug: "deterministic-dag-rubrics-for-llm-judges"
summary: "When building an automated claim approval pipeline, evaluating applicant data strictly via simple regex patterns is bound to fail...."
---
When building an automated claim approval pipeline, evaluating applicant data strictly via simple regex patterns is bound to fail. As our team at the service marketplace lending platform began evaluating applications, we initially leaned on large language models (LLMs) to simply read application documents and provide a "yes" or "no" decision. However, LLMs are inherently stochastic. We found ourselves battling non-deterministic evaluation criteria and opaque reasoning. Our solution? A Deterministic Directed Acyclic Graph (DAG) rubric for LLM Judges.

### The Stochastic Trap

### Enter the DAG Rubric

Instead of one monolithic prompt, we modeled the evaluation process as a Directed Acyclic Graph. Each node represents a distinct, mathematically or logically verifiable rubric item. The LLM acts merely as an extractor or a boolean evaluator for leaf nodes (e.g., "Extract the applicant's stated monthly income from document A"). The edges of the DAG represent dependencies.

By forcing the LLM to output structured JSON matching a strictly typed Zod schema for each node, we could programmatically evaluate the parent nodes using deterministic TypeScript code.

### Technical Implementation

Here is a simplified look at how we implemented the node execution engine using TypeScript and Zod:

```typescript
import { z } from 'zod';

// Define our node types
type RubricNode = {
  id: string;
  dependencies: string[];
  execute: (inputs: Record<string, any>) => Promise<any>;
};

// Zod schema for LLM extraction
  // ... implementation details
      isEligible: dti < 0.43 
    };
  }
};
```

### The AI Pair Programming Experience

Our AI assistant initially suggested a recursive execution model for the DAG. While elegant, it struggled with cycle detection and parallel execution. After a quick refactor, we pivoted to a topological sort approach, grouping independent nodes into execution batches. This drastically reduced the total evaluation time by running LLM extractions concurrently via `Promise.all()`. 

The key takeaway is that you should never trust an LLM to evaluate complex workflows in a single bound. By breaking the rubric into a deterministic DAG, we isolated the non-deterministic components, enforced strict Zod schema validations at the boundaries, and regained complete control over our claim approval pipeline.