---
title: "Migrating Policy Engines Autonomously"
date: "2026-09-11"
slug: "migrating-policy-engines"
summary: "Using /teamwork to successfully refactor scattered SDP and SAR rules into a unified Compliance Engine."
tags: ["Refactoring", "Compliance", "Antigravity"]
---
# Migrating Policy Engines Autonomously

Our legal compliance logic had become a tangled mess across our entire codebase. Whenever a regional center changed a simple policy rule, our developers had to hunt down hardcoded checks across a dozen different AWS AppSync resolvers, Next.js React components, and DynamoDB queries. Inevitably, they would miss one, causing a compliance violation in production that could jeopardize a family's funding. This scattered approach made the system rigid, unmaintainable, and incredibly risky. We needed to consolidate this chaos into a unified engine, but we couldn't afford to stop feature development for a month to do it.

At NeuroHub, our business logic for Service Delivery Policies (SDP) and State Activity Rules (SAR) was the beating heart of the platform. However, rapid growth led to architectural drift. This post details how we leveraged our autonomous AI workforce to execute a massive, system-wide refactoring effort without dropping a single human-written line of code.

## The Problem: Fragmented Logic

In our legacy architecture, business rules were evaluated at the point of action. If a user tried to submit a reimbursement via the UI, a React component checked if the date was valid. When the GraphQL mutation hit AppSync, a VTL (Velocity Template Language) resolver checked if the budget was exceeded. Finally, a DynamoDB Stream might trigger a Lambda function to check if the provider's tax ID was compliant. 

This meant that the "Truth" of a single policy (e.g., "A participant cannot exceed $5,000 in respite care per quarter") was scattered across three different languages (TypeScript, VTL, Python) and three different infrastructure layers. We needed to consolidate this logic into the centralized Unified Compliance Engine, utilizing the pure TypeScript hierarchy detailed in [Building the Compliance Engine](/2026-09-02-building-the-compliance-engine).

## Autonomous Orchestration with Antigravity

To execute this massive refactoring effort, we turned to our agentic workforce. We utilized our internal autonomous agent framework, Antigravity, specifically leaning on the `/teamwork` protocol. This protocol allows multiple specialized AI agents to collaborate on a single overarching goal.

We instantiated a swarm of three specialized agents:
1. **The Scout**: Tasked with crawling the Next.js and AWS CDK codebase to identify every single instance of scattered business logic using regex and AST parsing.
2. **The Architect**: Tasked with taking the Scout's findings and writing pure TypeScript `PolicyRule` classes that adhered to the new Compliance Engine hierarchy.
3. **The Refactorer**: Tasked with ripping out the old fragmented logic from the AppSync resolvers and React components, replacing them with clean API calls to the new centralized engine.

We relied heavily on our `AGENTS.md` guidelines to set strict boundaries for the swarm. We explicitly banned the agents from changing the *outcome* of any rule; their only mandate was structural migration.

## Building the Engine: TypeScript Deep Dive

The agents systematically extracted the fragmented logic into explicit `PolicyRule` implementations. They converted chaotic AppSync resolvers into clean, testable domain logic.

```typescript
// The new unified interface mandated by the Architect Agent
export interface PolicyRule {
  evaluate(context: EvaluationContext): Promise<RuleResult>;
}

// An extracted rule, previously buried in a Lambda function
export class CaliforniaTelehealthConsentRule implements PolicyRule {
  async evaluate(context: EvaluationContext): Promise<RuleResult> { 
    if (!context.provider.hasTelehealthCertification) {
      return { isValid: false, reason: "Missing telehealth cert" };
    }
    return { isValid: true };
  }
}
```

The unified engine orchestrates these rules asynchronously, processing the complex permutations of federal and state laws. The Refactorer agent successfully updated our backend to route all checks through this central orchestrator:

```typescript
export class ComplianceEngine {
  constructor(private rules: PolicyRule[]) {}

  async evaluateTransition(context: EvaluationContext) {
    // Evaluate all applicable rules concurrently
    const results = await Promise.all(this.rules.map(r => r.evaluate(context)));
    const failures = results.filter(r => !r.isValid);
    
    if (failures.length > 0) {
      throw new ComplianceViolationError(failures);
    }
    return true;
  }
}
```

## The Ultimate Validation: The Auditor Suite

The most terrifying part of an automated migration is the fear of silent regressions. If an AI agent accidentally flips a `<` to a `<=` during a refactor, it could authorize thousands of dollars in illegal payments. 

The ultimate validation of this automated migration was running it against our rigorous [Compliance Auditor Suite](/2026-08-26-compliance-auditor-testing). We ran the Auditor Suite against the old fragmented system to generate a baseline of thousands of test cases. After the Antigravity swarm completed its refactoring PR, we ran the exact same Auditor Suite against the new Unified Compliance Engine. 

The agents failed the suite 14 times. Each time, the CI pipeline fed the exact failure logs back into the `/teamwork` protocol. The AI agents autonomously analyzed the stack traces, realized where they had misunderstood the legacy VTL logic, corrected the TypeScript rules, and pushed new commits. 

On the 15th attempt, the test suite passed perfectly. The agents had correctly preserved the exact legal logic down to the penny, while completely transforming the underlying architecture of the entire platform. 

By trusting our AI swarm and heavily enforcing test-driven validation, we achieved a massive architectural migration in days that would have taken human engineers months of painful, error-prone manual labor.
