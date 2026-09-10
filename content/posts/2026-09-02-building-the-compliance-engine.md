---
title: "No Database Rules, No ASTs: Why We Version Healthcare Law in Pure TypeScript"
date: "2026-09-02"
slug: "building-the-compliance-engine"
summary: "How we translated California Regional Center regulations into a strictly versioned, hierarchical, pure TypeScript rules engine."
tags: ["Architecture", "Compliance", "TypeScript", "Domain Driven Design"]
---
# No Database Rules, No ASTs: Why We Version Healthcare Law in Pure TypeScript

> **The Motivation:** In healthcare compliance, particularly within the fragmented ecosystem of California's Regional Centers, writing loose `if/else` statements sprinkled throughout React components or GraphQL resolvers is a recipe for catastrophic legal liability. We needed a strict, pure-TypeScript compliance engine that isolated federal, state, and regional laws into immutable, mathematically verifiable, and versioned objects for historical auditing.

In NeuroHub, the core question our software must answer every single day is: "Is this specific service authorized for this specific participant on this specific date?" The answer depends on a massively complex, constantly shifting intersection of Federal Medicaid laws, State mandates (like California's Lanterman Act), and the highly localized micro-policies of 21 independent Regional Centers. To manage this chaos without turning our codebase into spaghetti, we architected the **Compliance Engine**—a strictly versioned, pure TypeScript rule evaluator that treats the law as code.

## The Inheritance Hierarchy: Modeling the Law

Early iterations of our platform attempted to handle compliance via a massive AWS DynamoDB table of configuration toggles. This failed spectacularly. A boolean toggle cannot capture the nuance that "Respite care is capped at 90 hours per quarter, *unless* there is a documented medical emergency, *except* in Regional Center X which caps it at 60 hours." 

We realized that business rules are fundamentally hierarchical, much like object-oriented programming. We structured our business rules using strict TS inheritance to mirror the legal hierarchy, preventing lower tiers from overriding base constraints illegally. This strict hierarchy means rules evaluate deterministically in memory without relying on slow database queries or fragile dynamic interpreters.

1. **Federal (Base Class)** - The absolute foundation (e.g., Medicaid/Medicare caps). These rules are immutable base methods.
2. **State (Derived Class)** - Overrides allowed by federal waivers. California can restrict federal funds further, but cannot authorize what the federal government explicitly bans. 
3. **Regional (Leaf Class)** - Micro-policies enacted by specific Regional Centers.

If a Regional Center tries to override a rule to authorize a service that violates federal law, the TypeScript compiler prevents it, because the base class method is marked `final` or throws an explicit domain error. This approach was heavily validated by our aggressive QA strategies, detailed in [The Compliance Auditor Suite](/2026-08-26-compliance-auditor-testing).

## Immutable Versioning for Historical Audits

Regulations change constantly. A new fiscal year brings new rate tables; a lawsuit might force a temporary injunction on a specific policy. When a policy updates, we cannot simply overwrite the old code. 

If a caregiver submits an invoice in November 2026 for a service rendered in December 2024, that invoice must be evaluated against the exact legal rules that existed in December 2024, down to the penny. If we just mutated a database row, we would lose that historical context.

When a policy updates, our agents must version the rule class instead of mutating it, guaranteeing mathematical auditability for historical claims. If an invoice is queried via our AppSync GraphQL API, the backend resolves the correct engine version based on the `serviceDate`.

```typescript
// The law as it stood in Q1
class CaliforniaStateRules_2026_Q1 extends FederalRules_2026 {
  public validateRespiteCap(context: ComplianceContext): AuditTrace { 
    return applyStandardCap(context, 90);
  }
}

// A new legislative change in Q3 modifies the cap
class CaliforniaStateRules_2026_Q3 extends CaliforniaStateRules_2026_Q1 {
  // Overrides previous rule without destroying historical context
  public validateRespiteCap(context: ComplianceContext): AuditTrace { 
    // The cap was temporarily raised due to a state of emergency
    return applyStandardCap(context, 120); 
  }
}
```

This strict versioning model proved invaluable during major overhauls, such as when we undertook the massive, automated effort of [Migrating Policy Engines Autonomously](/2026-09-11-migrating-policy-engines), ensuring we never lost a single byte of historical legal context.

## Why We Banned ASTs and Database-Driven Rules

The most controversial decision in building the Compliance Engine was our absolute refusal to use Abstract Syntax Trees (ASTs), rule engines like Drools, or JSON-logic strings stored in DynamoDB. Many enterprise architectures favor putting business rules in a database so that "non-technical business analysts can update them without a code deployment."

In our domain, this is a dangerous anti-pattern. When rules live in a database, they are untyped strings. They bypass the compiler, they bypass the CI/CD pipeline, and they bypass unit tests until runtime. A typo in a JSON-logic string stored in DynamoDB could instantly bring down the entire production system or silently approve millions of dollars in fraudulent claims.

By keeping the law strictly in pure TypeScript, the rules are statically analyzable and 100% type-safe. 

## Accountability to the Compiler

This purity is especially crucial in the era of AI. When an autonomous AI agent is tasked with updating a compliance rule, we want the tightest possible feedback loop. 

When an agent modifies a TypeScript rule class, the TS compiler instantly flags every single compliance rule, test file, and API resolver that breaks across the entire Next.js monorepo. Keeping the rules in code instead of a database keeps agents accountable to the compiler. A hallucination or a misunderstood legal nuance is instantly caught at build time in CI, not at runtime in production. 

Furthermore, our pure TS engine evaluates in milliseconds. Instead of making dozens of slow AppSync queries to resolve nested JSON rules from a database, the entire engine is instantiated in memory in our Node.js environment. It can evaluate a complex, multi-year budget plan spanning hundreds of services almost instantaneously.

By refusing to compromise on type safety and embracing the code as the ultimate source of truth, we built a Compliance Engine that is not just fast and auditable, but mathematically proven to be correct before it ever reaches a patient's care plan.
