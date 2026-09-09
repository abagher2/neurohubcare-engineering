import React from 'react';
import Link from 'next/link';
import { MermaidDiagram } from '../../components/MermaidDiagram';

export const metadata = {
  title: 'Architecture | NeuroHub Engineering',
  description: 'High-level overview of the digital-native architecture behind NeuroHub.',
};

const diagram1 = `
flowchart TD
  UI[Polymorphic RSC UI] --> |Dispatches Intent| WE[Headless Workflow Engine]
  WE --> |Mutates| OG[Directed Acyclic Observer Graph]
  OG --> |Topological Sort| N1[Node Evaluation]
  N1 --> |Dirty Checks| N2[State Propagation]
  N2 --> |Reactive Update| UI
`;

const diagram2 = `
flowchart LR
  User((User Context)) --> Router[Intent Router]
  Router --> |Routes| SA1[Intake Sub-Agent]
  Router --> |Routes| SA2[Clinical Sub-Agent]
  SA1 --> K[Context Window Manager]
  SA2 --> K
  K --> |Optimized Prompt| LLM((Frontier LLM))
  LLM --> |JSON Stream| AST[Stack-Automaton Repair]
  AST --> |Valid AST| UI[Client Hydration]
`;

const diagram3 = `
sequenceDiagram
  participant Ext as External System
  participant SES as Edge Node
  participant SNS as Event Bus
  participant SQS as Worker Queue
  participant Engine as Domain Engine

  Ext->>SES: Raw Data Payload
  SES->>SNS: Broadcast Event
  SNS->>SQS: Enqueue Task (FIFO)
  SQS->>Engine: Asynchronous Pull
  Engine-->>Engine: Idempotent Validation
  Engine->>Ext: Acknowledge/Sync
`;

export default function ArchitecturePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--slate-900, #0f172a)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
          Architecture
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--slate-600, #475569)', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto' }}>
          A visual overview of how we orchestrate AI, manage distributed state, and build robust workflows for enterprise healthcare.
        </p>
      </header>
      
      <article className="markdown-body" style={{ background: 'var(--surface, #ffffff)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--surface-border, #e2e8f0)', boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))' }}>
        
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            1. State Management: Domain-Driven Workflow Engines
          </h2>
          <p style={{ color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1rem' }}>
            To prevent monolithic bottlenecks, all business logic is strictly decoupled from the UI. Runtimes are driven by pure, headless state machines connected to an in-memory dependency graph. This eliminates cascading side-effects by forcing updates through a deterministic topological sort.
          </p>
          <MermaidDiagram chart={diagram1} />
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            2. AI Infrastructure: Deterministic Agent Orchestration
          </h2>
          <p style={{ color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1rem' }}>
            We bound probabilistic LLM execution within strict operational structures. Rather than a monolithic assistant, intents route to specialized sub-agents. Deep contextual data is carefully prioritized by our Context Window Manager to avoid token exhaustion and attention degradation before interacting with the frontier model. Broken or incomplete JSON streams are repaired mid-flight by stack-automaton lexers.
          </p>
          <MermaidDiagram chart={diagram2} />
        </section>

        <section>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            3. Asynchronous Ingestion Pipeline
          </h2>
          <p style={{ color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1rem' }}>
            Our enterprise backend is fully event-driven, favoring eventual consistency and high-throughput reliability over synchronous blocking requests. External triggers funnel through a robust Serverless fabric, ensuring safe, idempotent validation inside the domain engine.
          </p>
          <MermaidDiagram chart={diagram3} />
        </section>

      </article>

      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Link href="/" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}>
          Read the Engineering Blog &rarr;
        </Link>
      </div>
    </div>
  );
}
