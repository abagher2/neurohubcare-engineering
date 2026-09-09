---
title: "Entity Graph Queries and Relational Context for LLM Agents"
date: "2026-07-06"
slug: "entity-graph-queries-relational-context-llm-agents"
summary: "When building autonomous agents for complex domain workflows, providing the LLM with accurate, relational context is the hardest e..."
---
When building autonomous agents for complex domain workflows, providing the LLM with accurate, relational context is the hardest engineering challenge. In our B2B procurement platform, our AI agent needed to analyze purchase orders, evaluate vendor compliance, and negotiate terms. Feeding it flat JSON files or disjointed database rows proved disastrous. The LLM couldn't understand the relational cardinality between a `PurchaseOrder`, a `VendorMasterAgreement`, and an `ApprovalWorkflow`.

### The Flat Data Fallacy

Our AI coding assistant's first draft relied on massive SQL `JOIN` statements that flattened the relational data into denormalized, wide tables. The AI assumed that feeding the LLM a massive CSV-like structure would allow it to infer relationships. Instead, the agent suffered from severe hallucination, frequently attributing approval requirements from one vendor to another because the flattened data lacked clear hierarchical boundaries.

### Constructing the Entity Graph

To resolve this, we shifted to an Entity Graph Query architecture. We implemented a GraphQL-inspired layer that constructs highly specific, nested object graphs representing exact domain entities. 

```typescript
import { z } from 'zod';

// 1. Define strict Zod schemas for our graph nodes
const VendorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  complianceStatus: z.enum(['Active', 'UnderReview', 'Suspended']),
});

const LineItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
});

const PurchaseOrderGraphSchema = z.object({
  id: z.string().uuid(),
  totalAmount: z.number(),
  vendor: VendorSchema,
  items: z.array(LineItemSchema),
  // Directed Acyclic Graph (DAG) representation of workflow
  approvalChain: z.array(z.object({
    role: z.string(),
    status: z.enum(['Pending', 'Approved']),
    timestamp: z.string().datetime().optional()
  }))
});

type PurchaseOrderGraph = z.infer<typeof PurchaseOrderGraphSchema>;

export class GraphQueryEngine {
  
  // Resolves the deep entity graph required for LLM reasoning
  public async resolvePurchaseOrderContext(poId: string): Promise<PurchaseOrderGraph> {
    const rawData = await this.fetchFromDataStore(poId);
    
    // Strict runtime validation ensures the LLM receives perfectly formed graphs
    return PurchaseOrderGraphSchema.parse(rawData);
  }

  private async fetchFromDataStore(id: string): Promise<unknown> {
    // Implementation details: orchestrating multiple data sources
    return {}; 
  }
}
```

### State Machines and AI Pairing

We enforce strict validation of this graph using Zod before it ever reaches the prompt template. Furthermore, the approval workflows are modeled as strict State Machines. When the LLM recommends an action (e.g., "Approve PO"), we don't just execute it; we validate the proposed transition against the State Machine defining the `PurchaseOrderGraph`.

When we paired with the AI to implement the transition guards, it initially tried to let the LLM define the next state dynamically. We quickly corrected this: the LLM suggests an *intent*, but the State Machine dictates the *allowed transitions*. By feeding the LLM structured, validated Entity Graphs rather than flat tables, we transformed an erratic, hallucinating chatbot into a deterministic, highly reliable procurement agent.