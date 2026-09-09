---
title: "Architecting Agentic Workflows: Server-Side Multi-Agent Orchestration"
date: "2026-09-03"
slug: "2026-09-03-architecting-agentic-workflows-and-the-assistant"
summary: "Moving beyond naive chatbots: How we built a secure, server-side Intent Router to orchestrate specialized Sub-Agents for our generative AI Assistant."
tags: ["Agents", "Architecture", "Backend"]
---

### The Naive Chatbot Trap

When engineering teams first integrate Generative AI, they often fall into the monolithic chatbot trap: piping every user input into a single prompt with a massive list of available tools. As our application scaled, this approach failed. The LLM became overwhelmed by tool selection, causing severe latency and hallucinations.

To put our platform at the absolute forefront of AI-native architecture, we completely re-engineered our Assistant. Instead of a single model, the Assistant is a highly structured **Server-Side Multi-Agent Orchestration Engine**.

### Building Server-Side Agentic Workflows

We structured our agentic workflows around a central backend `IntentRouter`. When a user types a command, the frontend simply dispatches a secure API payload. On the server side, the Router uses a highly optimized cloud model to classify the intent and delegate the task to a specialized **Sub-Agent** (e.g., the `ClinicalAgent`, `FinancialAgent`, or `IntakeAgent`). 

Running this orchestrator strictly on the server provides two critical benefits:
1. **Security**: Proprietary prompt templates, system instructions, and external API keys never touch the client browser.
2. **Deterministic Context**: The server has direct, low-latency access to our database, allowing it to efficiently hydrate the required context windows (like fetching a user's IPP plan) before invoking the frontier model.

Each Sub-Agent possesses a strictly isolated prompt and a narrow set of JSON-schema tool declarations. 

```typescript
import { z } from 'zod';
import { generateText } from 'ai';

interface OrchestratorContext {
  userId: string;
  sessionContext: Record<string, any>;
}

export class IntentRouter {
  private agents = new Map<string, SubAgent>();

  constructor() {
    this.agents.set('FINANCIAL', new FinancialAgent());
    this.agents.set('CLINICAL', new ClinicalAgent());
  }

  async process(input: string, ctx: OrchestratorContext) {
    // 1. Fast Server-Side Intent Classification
    const intent = await this.classifyIntent(input);
    
    // 2. Specialized Delegation
    const agent = this.agents.get(intent) || this.agents.get('DEFAULT')!;
    
    // 3. Autonomous Execution Loop
    return await agent.executeWorkflow(input, ctx);
  }
}
```

### The AI Co-Pilot Factor

Building an AI Assistant *using* an AI coding agent (like Antigravity) was an incredible meta-experience. Our coding agent initially tried to write the Assistant as a massive 1,500-line switch statement inside a single React client component! 

We pair-programmed with the AI to refactor this into the clean, scalable `IntentRouter` pattern on the backend. Teaching the coding agent to build autonomous sub-agents required strict adherence to our `AGENTS.md` rules, ensuring the AI respected domain-driven design rather than dumping everything into client-side controllers.


