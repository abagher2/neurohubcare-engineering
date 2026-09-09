---
title: "Ensemble Judges and Multi-Turn Eval Telemetry"
date: "2026-07-07"
slug: "ensemble-judges-and-multi-turn-eval-telemetry"
summary: "Evaluating generative AI models in a production environment is a notoriously difficult challenge. In our work building advanced co..."
---
# Ensemble Judges and Multi-Turn Eval Telemetry

Evaluating generative AI models in a production environment is a notoriously difficult challenge. In our work building advanced conversational interfaces for a service marketplace platform, we quickly realized that single-turn assertions are woefully inadequate. We needed a way to evaluate the entire state machine of a conversation. That's where ensemble judges and multi-turn evaluation telemetry come into play.

Our solution was an **Ensemble Judge Architecture**. Instead of one model grading the output, we route the telemetry data to a panel of three distinct smaller models, each with a specialized Zod schema evaluating a different dimension (e.g., tone, factual accuracy, safety).

```typescript
import { z } from 'zod';

export const ToneEvaluationSchema = z.object({
  isProfessional: z.boolean(),
  empathyScore: z.number().min(1).max(5),
  reasoning: z.string()
});

export const FactualEvaluationSchema = z.object({
  hallucinationsPresent: z.boolean(),
  contradictsProductCatalog: z.boolean(),
  confidenceInterval: z.number()
});

export type ToneEvaluation = z.infer<typeof ToneEvaluationSchema>;
export type FactualEvaluation = z.infer<typeof FactualEvaluationSchema>;

export async function ensembleEvaluateTurn(
  interactionTelemetry: InteractionTelemetry
): Promise<EvaluationResult> {
  const [toneEval, factEval] = await Promise.all([
    runJudge(Models.SmallFast1, interactionTelemetry, ToneEvaluationSchema),
    runJudge(Models.SmallFast2, interactionTelemetry, FactualEvaluationSchema)
  ]);
  
  return aggregateScores([toneEval, factEval]);
}
```

Multi-turn telemetry requires capturing the context at every node in the Directed Acyclic Graph (DAG) of the conversation. If a user asks for a refund, the system transitions to a `RefundIntent` state. The evaluation must capture not just the final response, but the state transitions and context retrieved at each turn. 

Our AI pairing agent helped us instrument our middleware to emit this telemetry. It initially forgot to serialize the trace IDs across distributed boundaries, which we caught during a code review. By injecting a correlation ID into every turn's metadata, our evaluation pipeline can now reconstruct the entire session DAG. 

```typescript
import { test as base } from '@playwright/test';

type AiTestingFixtures = {
  evalTelemetry: TelemetryCollector;
  ensembleJudge: EnsembleJudgeRunner;
};

export const test = base.extend<AiTestingFixtures>({
  evalTelemetry: async ({ page }, use) => {
    const collector = new TelemetryCollector();
    await collector.startNetworkInterception(page);
    await use(collector);
    await collector.flushAndAnalyze();
  },
  // ...
});
```

Using these fixtures, we run thousands of multi-turn simulated conversations every night. The ensemble judges score the trajectories, and any regressions are automatically flagged before they reach our users. This infrastructure has been pivotal in scaling our AI-native service marketplace workflows reliably.