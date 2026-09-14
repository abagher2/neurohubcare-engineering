---
title: "Banning JSON.parse(): How Strict ORM Builders Stopped Hallucinated DB Mutations"
date: "2026-09-18"
slug: "strict-orm-builders"
summary: "Preventing AI agents from injecting generic terminology using strict Builder lifecycles."
tags: ["TypeScript", "Domain Driven Design", "ORM"]
---
# Banning JSON.parse(): How Strict ORM Builders Stopped Hallucinated DB Mutations

> **The Motivation:** AI agents love to bypass constructors and mutate objects directly using `JSON.parse()`. This led to invalid database states that bypassed our compliance checks entirely. We had to lock down the entire architecture using strict ORM Builders that enforced schema validation at compile time, treating AI hallucinations as a fundamental architectural threat.

Autonomous AI agents are incredibly powerful, but they share a dangerous flaw with junior developers: they often think they know better than the architecture. One of the most persistent issues we faced when deploying coding agents across NeuroHub was their tendency to hallucinate generic SaaS terminology (like `userId`, `subscriptionPlan`, or `tenantId`) instead of utilizing our highly specialized healthcare domain terms (like `ClientId`, `FMS_ID`, or `RegionalCenterCode`). 

To prevent this data corruption, we had to eliminate generic object construction entirely, enforcing strict, compile-time ORM `Builder.build()` boundaries across our Next.js and AWS AppSync infrastructure.

## Domain-Driven Design in Healthcare: Why Precision Matters

In a standard web application, if a field is named `userId` instead of `accountId`, it might cause a minor UI bug. In healthcare compliance, if an agent assigns a generic string to a field that requires a mathematically validated National Provider Identifier (NPI), the resulting DynamoDB record is legally invalid.

When fetching data from DynamoDB via AppSync, the raw JSON payload is inherently untyped at the network boundary. If an AI agent simply casts this with `as PatientRecord`, any hallucinated field names pass silently into the domain logic. The TypeScript compiler is satisfied because the type assertion lies to it.

```typescript
// THE DANGEROUS AI ANTI-PATTERN
// The AI assumes the payload has standard SaaS fields
const rawPayload = await fetchFromAppSync();
const patient = rawPayload as PatientEntity; 
// TS compiles, but `patient.clientId` might be undefined at runtime!
```

To combat this, we employ Zod schemas to ensure strict validation of primitives. Zod acts as the absolute first line of defense before the ORM Builder even begins its work, validating strings, numbers, and dates against strict regex and bounds.

```typescript
// Defining the absolute primitive types with Zod
const ClientIdSchema = z.string().uuid().brand('ClientId');
type ClientId = z.infer<typeof ClientIdSchema>;

const NpiSchema = z.string().length(10).regex(/^\d+$/).brand('NPI');
```

## The Strict ORM Builder Pattern

To enforce compile-time safety and prevent AI agents (and humans) from bypassing state machines, we implemented the Staged Builder Pattern. This pattern enforces that a domain object can only be built in a specific, immutable sequence. This sequencing is vital when navigating the complex rules discussed in [Building the Compliance Engine](/2026-09-02-building-the-compliance-engine).

First, we lock down the domain entity itself. The constructor is made `private`, meaning no agent can simply call `new PatientEntity({...})`.

```typescript
export class PatientEntity {
  // Private constructor prevents direct instantiation
  private constructor(
    public readonly mrn: ClientId,
    public readonly npi: string
  ) {}
  
  // The ONLY way to create a PatientEntity is through the builder
  public static builder(): IRequireMRN { 
    return new PatientBuilder(); 
  }
}
```

Next, we define the Staged Builder interfaces. The magic here is that each method returns a *new* interface that only exposes the *next* valid step. The `.build()` method doesn't even exist on the object until all required fields have been provided.

```typescript
interface IRequireMRN {
  withMRN(mrn: ClientId): IRequireNPI;
}

interface IRequireNPI {
  withNPI(npi: string): IBuildPatient;
}

interface IBuildPatient {
  build(): PatientEntity;
}

class PatientBuilder implements IRequireMRN, IRequireNPI, IBuildPatient {
  private mrn?: ClientId;
  private npi?: string;

  public withMRN(mrn: ClientId): IRequireNPI {
    this.mrn = mrn; 
    return this;
  }
  
  public withNPI(npi: string): IBuildPatient {
    this.npi = npi;
    return this;
  }

  public build(): PatientEntity {
    // Final internal validation before releasing the object
    if (!this.mrn || !this.npi) throw new Error("Invalid State");
    return new PatientEntity(this.mrn, this.npi);
  }
}
```

## Confining the AI to a Corridor

Because the interfaces strictly define allowable methods and parameters, agents are confined to a tight, compiler-enforced corridor. If an agent tries to hallucinate a method like `.withUserId("123")`, the TypeScript compiler instantly fails the build. If the agent tries to skip the NPI step and immediately call `.build()`, the compiler fails the build because `.build()` does not exist on the `IRequireNPI` interface.

We use [Inline Agent Directives](/2026-08-28-directing-agents-with-comments) to explicitly instruct the LLMs to use these Builders rather than attempting raw object instantiation or unsafe casting. 

By leveraging TypeScript's compiler and the Staged Builder pattern, we transformed our type system into an impenetrable fortress against AI hallucination. We removed the need for humans to constantly review PRs for generic terminology slip-ups, guaranteeing that only perfectly formed, legally compliant domain entities ever reach our business logic or our DynamoDB persistence layer.
