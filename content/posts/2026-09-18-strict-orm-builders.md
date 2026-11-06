---
title: "Banning JSON.parse(): How Strict ORM Builders Stopped Hallucinated DB Mutations"
date: "2026-09-18"
slug: "2026-09-18-strict-orm-builders"
summary: "Preventing AI agents from injecting generic SaaS terminology or bypassing compliance checks using strict ORM Builder lifecycles and Zod boundary decoding."
tags: ["TypeScript", "Domain Driven Design", "ORM", "Architecture", "Agentic Systems"]
---

# Banning JSON.parse(): How Strict ORM Builders Stopped Hallucinated DB Mutations

> **The Motivation:** AI agents love to bypass constructors and mutate objects directly using `JSON.parse()` plus a type assertion. Left unchecked, this creates invalid database states that bypass domain invariants entirely. We locked down our data layer using strict ORM Builders (`Builder.build()`) and named Zod boundary decoders, treating unvalidated JSON as a first-class architectural threat.

Autonomous AI coding agents are remarkably fast, but they share a dangerous habit: when faced with a strict type error, they reach for `JSON.parse(raw) as SomeType` or invent generic SaaS field names (`userId`, `tenantId`, `subscriptionPlan`) instead of respecting healthcare domain models (`clientId`, `coordinatorId`, `program`).

To prevent silent data corruption, we banned raw `JSON.parse()` type assertions across the entire repository and enforced a single rule in `@data-model-group`: **the only way to construct an immutable domain Entity is `Builder.build()`.**

---

## Domain-Driven Design in Healthcare: Why Precision Matters

In a generic web app, a mismatched field name might cause a minor UI glitch. In Regional Center and Self-Determination Program (SDP) workflows, confusing a **User** (the parent or Independent Facilitator) with a **Client** (the child or participant receiving services), or dropping a receipt's IPP goal linkage, breaks authorization boundaries and audit provenance.

When data arrives from AWS AppSync, S3 document extraction, or an external webhook, the payload is untyped at the boundary. If code casts that payload with `as ReceiptEntity`, any missing or malformed fields slip past TypeScript compilation undetected:

```typescript
// THE DANGEROUS AI ANTI-PATTERN (Rejected by architecture/no-unvalidated-json)
const rawPayload = JSON.parse(untrustedJson) as ReceiptRecord;
```

To eliminate this class of bugs, every boundary adapter—ORM transport, API route, or AI extraction pipeline—must decode untrusted inputs once through a named Zod schema before hydrating a canonical Entity Builder.

---

## Enforcing `Builder.build()` Lifecycles and Audited Persistence

In our `@data-model-group` architecture:

1. **Entities Are Immutable:** Domain entities expose model queries, relationship readers, and domain calculations, but cannot be mutated in place or instantiated directly inside React components or event handlers.
2. **Controllers Own Draft Lifecycles:** Interactive wizards and server operations own canonical `Builder` instances. Missing records or failed reads never synthesize fallback empty drafts.
3. **Audited Mutation Boundary:** Persisting a Builder commits the entity revision, redacted audit evidence, and durable domain-event intent atomically through the generic ORM transport.

And to make sure neither humans nor autonomous agents regress on this contract, our custom ESLint rules (`architecture/no-unvalidated-json`, `architecture/entity-construction`, and `architecture/builder-ownership`) verify every AST node before a commit is accepted.
