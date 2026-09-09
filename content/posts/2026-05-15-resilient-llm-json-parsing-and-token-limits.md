---
title: "Hardening LLM Outputs: JSON Parsing, Markdown Fences, and Token Limits"
date: "2026-05-15"
slug: "2026-05-15-resilient-llm-json-parsing-and-token-limits"
summary: "How we made our LLM-as-a-Judge pipeline robust against hallucinated markdown fences, malformed JSON, and strict context window limits."
tags: ["LLM", "Data Parsing", "Gemini"]
---

### The Reality of Structured Output

When building our automated document intake pipeline, we relied heavily on LLMs to extract structured data from raw PDFs. We prompted frontier models (like Gemini 1.5 Pro and later Gemini 2.5 Flash) to return strict JSON matching our Zod schemas. 

However, in production, "strict JSON" is a myth. Models frequently hallucinate markdown code fences (`` `json ... ` ``), insert conversational preambles ("Here is the JSON you requested:"), or silently truncate outputs when they hit their max token limits.

### Resilient JSON Fallbacks

To solve this, we couldn't just use `JSON.parse()`. We built a resilient parsing pipeline that aggressively sanitizes LLM outputs before attempting to decode them. If the standard parse fails, the system cascades through a series of regex fallbacks to strip conversational fluff and extract the core JSON object.

```typescript
import { z } from 'zod';

export function parseLlmResponse<T>(
  rawText: string, 
  schema: z.ZodSchema<T>
): T {
  let cleanedText = rawText.trim();

  // 1. Strip Markdown Code Fences
  if (cleanedText.startsWith('```')) {
    const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleanedText = match[1].trim();
    }
  }

  // 2. Strip Conversational Preambles via Regex extraction
  if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
    const jsonMatch = cleanedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[1]) {
      cleanedText = jsonMatch[1].trim();
    }
  }

  // 3. Attempt Parse and Schema Validation
  try {
    const parsed = JSON.parse(cleanedText);
    return schema.parse(parsed);
  } catch (error) {
    throw new Error(`LLM Output failed JSON/Schema validation: ${error.message}`);
  }
}
```

### Managing Token Limits

During early benchmarking, we noticed intermittent pipeline failures on massive documents. The models were silently hitting the 4,096 output token limit, returning syntactically invalid, truncated JSON strings. 

When pairing with our AI coding agent, we engineered a proactive **Context Window Optimizer**. Before passing a document to the LLM, the system dynamically checks the token count of the input. If the document is too large, the agent automatically maps over the document in chunks, invoking Gemini 2.5 Flash in parallel, and then runs a fast MapReduce function to merge the JSON responses.

By combining aggressive sanitization regex with chunked map-reduce execution, our LLM-as-a-judge origination system achieved 99.9% parse reliability in production.
