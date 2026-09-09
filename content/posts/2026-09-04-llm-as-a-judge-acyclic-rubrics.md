---
title: "Autonomous Testing Part 4: LLM-as-a-Judge and Acyclic Rubrics"
date: "2026-09-04"
slug: "2026-09-04-llm-as-a-judge-acyclic-rubrics"
summary: "Eliminating hallucinated test verdicts by forcing LLM Judges to evaluate DOM traces through strict Directed Acyclic Graph (DAG) rubrics."
tags: ["Testing", "LLM", "Evaluation"]
---

Welcome to Part 4 of our deep dive into Autonomous Testing at NeuroHub. Over the past three installments, we've explored how we generate test scenarios, synthesize realistic test data, and orchestrate headless browser fleets at scale. Today, we tackle the final and most critical challenge: determining if a test actually passed. Specifically, how we transitioned from a naive "LLM-as-a-Judge" model to a mathematically strict evaluation engine using Directed Acyclic Graph (DAG) rubrics.

### The Naive Prompt and the Hallucination Problem

It worked brilliantly in our initial prototypes. But as we scaled to thousands of edge cases, the false positive rate skyrocketed. We started seeing tests pass when they absolutely shouldn't have. 

After digging into the logs, we found the culprit: the LLM was hallucinating passes. In one glaring example, a test designed to verify that a refund was explicitly denied somehow passed. Why? Because the DOM contained a hidden `div` with the class `hidden-success-toast` containing the word "Success"—a vestige of a previous state. The LLM, lacking visual context and structural constraints, seized upon the word "Success" and confidently output `true`. 

We realized that asking an LLM to render a binary verdict on a massive, complex DOM trace was inherently flawed. The search space was too large, and the criteria were too ambiguous. We needed mathematically strict evaluation constraints. We needed a rubric.

### Structuring Evaluation: The DAG Rubric

To eliminate hallucinations and enforce deterministic grading, we designed the **Acyclic Rubric Evaluation Engine**. Instead of a single binary question, we decompose the evaluation of a test into a Directed Acyclic Graph (DAG) of hyper-localized assertions. 

The nodes in our DAG represent specific, independent checks against the DOM trace. The edges represent dependencies (e.g., we only check the contents of the error modal if we first assert that the modal is visible).

Crucially, the LLM is no longer asked if the test passed. It is asked to extract structured data fulfilling the requirements of the DAG nodes. We then evaluate this structured data programmatically using Zod schemas.

#### Defining the Rubric

Here is an example of how we define a DAG rubric for a "Refund Denial" scenario:

```typescript
import { z } from 'zod';

// ... schemas for Node 1, Node 2, Node 3
const checkChatResponseSchema = z.object({ /* ... */ });
const checkButtonStateSchema = z.object({ /* ... */ });
const checkErrorModalSchema = z.object({ /* ... */ });
```

#### The Evaluation Engine

The `EvaluationEngine` takes the DOM trace and the requested nodes, and prompts the LLM to output a JSON array of these localized assertions. 

```typescript
type DagNode = {
  id: string;
  schema: z.ZodTypeAny;
  dependencies: string[];
};

class EvaluationEngine {
  async evaluateDAG(domTrace: string, rubric: DagNode[]): Promise<boolean> {
    const results = new Map<string, any>();
    const sortedNodes = topologicalSort(rubric);
    
    // ... evaluate nodes sequentially
    // ... prompt LLM for JSON extraction
    // ... validate with Zod schemas
    
    return true; // All nodes passed
  }
}
```

### The Result: Deterministic LLM Judges

By forcing the LLM to traverse a strict DAG and return strongly typed JSON objects via Zod, we effectively stripped the AI of its agency to "decide" if a test passed. The LLM is now relegated to a highly capable data extraction engine, while the `EvaluationEngine` executes the deterministic logic.

The JSON output from the LLM looks like this:

```json
[
  {
    "node_id": "node_1_chat_response",
    "found": true,
    "message_text": "I'm sorry, but this item is outside our 30-day return window."
  },
  {
    "node_id": "node_2_button_state",
    "is_disabled": true
  }
]
```

Since rolling out Acyclic Rubrics, our false positive rate has dropped to zero. Hallucinations are caught immediately because the LLM cannot satisfy the strict Zod schema constraints without factual grounding in the DOM trace. A hidden "Success" div no longer matters, because the DAG specifically demands the state of the "Initiate Refund" button.

In conclusion, "LLM-as-a-Judge" is a powerful paradigm, but it is inherently fragile when left unconstrained. By mathematically structuring the evaluation process as a Directed Acyclic Graph, we harnessed the perception capabilities of the LLM while maintaining the rigorous determinism required for enterprise software testing.
