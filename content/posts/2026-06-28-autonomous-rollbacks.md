---
title: "Zero-Human Rollbacks: When the LLM Judge Flags a Critical UI Regression"
date: "2026-06-28"
slug: "autonomous-rollbacks"
summary: "How our CI pipeline autonomously reverts Git commits when the LLM Judge detects a severe AI hallucination."
tags: ["DevOps", "CI/CD", "Git", "Testing"]
---
# Zero-Human Rollbacks: When the LLM Judge Flags a Critical UI Regression

**Motivation:** Our CI was green, but our production environment was intermittently breaking. In high-stakes healthcare and financial software—where families depend on NeuroHub to submit accurate expense reimbursements to California Regional Centers and FMS agencies—a single bad commit can delay payments to specialized caregivers and therapists. Autonomous agents were confidently merging code that passed unit tests but violated California Title 17 compliance rules or corrupted financial calculations. We couldn't afford manual engineering hours to constantly revert bad AI commits.

As we accelerated our AI-driven development lifecycle at NeuroHub, we encountered a fundamental truth: AI agents are incredible at localized problem solving, but they can be spectacularly bad at maintaining global system invariants. A unit test might pass because an agent correctly parsed an invoice number, but that same agent might have subtly broken a Title 17 spending plan calculation, corrupted an Individual Program Plan (IPP) goal mapping, or sidestepped our strict Next.js Static Export requirements.

This discrepancy between local correctness and global stability became an existential threat to our engineering velocity. Initially, we leaned heavily on human code review. We assumed that experienced Principal Engineers could catch these subtle architectural violations before they reached the `main` branch. However, the sheer volume of agent-generated pull requests quickly overwhelmed our team. Reviewing code written by an AI requires an intense cognitive load; you aren't just looking for typos, you are verifying that a probabilistic engine hasn't subtly compromised a family's state-authorized funding allocations.

We realized we needed a systemic solution. We needed a pipeline that could not only detect these systemic failures but also take immediate, autonomous action to protect the main branch and force the AI workforce to self-correct.

## The Problem: Confident Hallucinations in the CI Pipeline

The core issue was what we internally refer to as "confident hallucinations." An agent would generate code that looked perfectly correct. It would pass all standard linters, compile without issues, and breeze through our basic unit tests. However, it would violate our core architecture in ways that only a seasoned NeuroHub engineer would recognize.

For example, in the NeuroHub stack, we enforce a strict entity lifecycle. The only way to construct an immutable Entity is via our rigorous `Builder.build()` method, which guarantees that all schema validations and compliance rules are checked before the entity is used. We noticed instances where an agent, attempting to optimize a data fetch or simplify a component, would bypass the AppSync GraphQL layer entirely. Instead, it would attempt to instantiate a Builder inline within a React component or, even worse, try to write directly to a DynamoDB table using the AWS SDK from the frontend.

Another common failure mode involved our Next.js architecture. Because we rely exclusively on Next.js Static Exports hosted on AWS Amplify, our routing and data fetching patterns must adhere to strict constraints. An overly eager agent might introduce server-side rendering logic or dynamic API routes that would completely break our static export build process. 

These architectural violations would easily slip past basic static analysis. It wasn't until the application was built and deployed to our AWS Amplify hosting environment that the failure would manifest. By that point, the bad code was already in `main`, often resulting in a degraded user experience, corrupted state, or failed deployments that halted all other work.

## Enter the LLM Judge

To combat these confident hallucinations, we introduced the LLM Judge—a specialized, highly-contextualized AI agent integrated directly into our CI pipeline. The LLM Judge acts as a semantic gatekeeper. After standard unit tests and linters pass, the Judge reviews the Pull Request diff and the resulting execution traces against our explicit, documented architectural directives. 

We feed the Judge a comprehensive payload: the Git diff, the AppSync schema changes, and execution traces from our [Goal-Based Agent Testing](/2026-07-02-goal-based-agent-testing) framework. We also include excerpts from our internal design documents. The Judge isn't looking for missing semicolons or syntax errors; it is hunting for violations of our foundational business logic. 

For instance, the Judge ensures that a component isn't improperly bypassing our generic ORM transports. It verifies that we aren't misusing our strategy pattern for regional program terms. It also cross-references our frontend code to ensure that no AWS SDK calls are being made directly to DynamoDB, guaranteeing that all mutations flow properly through our AppSync GraphQL API. 

The LLM Judge queries our semantic discovery engine to instantly retrieve relevant architectural constraints and Title 17 regulations based on the code being reviewed, without adding massive latency to the CI pipeline.

## The Feedback Loop and Autonomous Action

Detection is only half the battle. When the LLM Judge detects a severe hallucination, waiting for a human engineer to intervene completely defeats the purpose of an autonomous pipeline. If an agent merges code that breaks the main branch, and a human has to manually click "Revert," we have failed to build a truly autonomous system.

We architected our CI/CD flow using AWS Step Functions integrated tightly with AWS EventBridge to orchestrate the entire validation and remediation process. If the LLM Judge returns a `SEVERITY_HIGH` violation—such as a direct DynamoDB mutation bypassing AppSync, or an unauthorized schema change—an EventBridge rule instantly triggers a Lambda function that initiates an autonomous rollback.

```javascript
// Step Function Task: Evaluate LLM Judge Response
if (judgeResponse.severity === 'SEVERITY_HIGH') {
  await eventBridge.putEvents({
    Entries: [{ 
      Source: 'ci.llm-judge', 
      DetailType: 'RollbackInitiated', 
      Detail: JSON.stringify(judgeResponse) 
    }]
  });
}
```

The rollback mechanism itself is technically straightforward but organizationally profound. The pipeline executes a secure `git revert` on the offending commit and forcefully pushes it back to the origin, ensuring that the main branch remains pristine and deployable at all times.

```bash
# Autonomous Git rollback executed by the CI worker
git revert HEAD --no-edit && git push origin main
```

By removing the human from the critical path of reverting bad code, we drastically reduced our Time to Recovery (TTR) and ensured that subsequent agent PRs wouldn't be based on a broken `main` branch.

### Visual Validation and Local LLMs

A significant part of our verification process involves ensuring that the UI remains pixel-perfect and functionally correct, even when the underlying logic changes. As we outlined in [Visual Testing and Local LLM Migration](/2026-07-15-visual-testing-and-local-llm-migration), we leverage local LLMs to evaluate UI changes. 

When the LLM Judge assesses a frontend change, it relies heavily on our visual regression suite. We take `fullPage: true` screenshots of the application state. Initially, analyzing these massive images with local LLMs caused severe memory issues. The models would frequently crash with VRAM Out-Of-Memory (OOM) errors, bringing the entire CI pipeline to a grinding halt.

To solve this without resorting to cropping images—which would sacrifice crucial context—we implemented an HTTP Mutex Queue running on port 8002. This queue serializes the visual analysis requests, ensuring that only one massive `fullPage` screenshot is processed by the local LLM at any given time. This architectural tweak completely eliminated our VRAM OOM crashes, providing the LLM Judge with reliable, uncropped visual context to verify that an agent's changes haven't inadvertently broken the Next.js static export layout.

## Closing the Loop: Agent Self-Correction

A rollback, however, is not the end of the story. Simply reverting the code protects the system, but it doesn't solve the underlying engineering task. This is where the true power of our autonomous loop shines.

Once the rollback is executed, the pipeline aggregates all the available forensic data. It collects the LLM Judge's detailed critique, the specific architectural rules that were violated, and any failed DOM snapshots from our [Visual Regression with Gemini](/2026-07-09-visual-regression-with-gemini) suite. 

It then packages this rich, highly specific failure context into a diagnostic brief and dispatches it directly to the assigned agent and `@orchestrator` in the Zulip task stream. 

The agent wakes up via its mention listener, ingests the failure context, and attempts the task again on its isolated feature branch. This self-correction loop drastically reduces the cognitive load on human engineers. We no longer have to manually explain to an agent why its code was bad, or what specific rule it violated. The pipeline acts as a strict but helpful mentor, automatically providing the agent with exactly the feedback it needs to succeed on the second attempt. 

This mechanism guarantees that our CI pipeline remains completely self-healing. By utilizing event-driven Git rollbacks, we maintain tight control over the execution environment and keep our deployment branch perpetually green.

## Technical Tradeoffs and Future Iterations

Building this system wasn't without its challenges. One major tradeoff was the increased CI execution time. Running an LLM Judge on every PR adds minutes to the pipeline. However, we found that waiting an extra five minutes for a PR to merge is infinitely preferable to spending two hours untangling a corrupted DynamoDB state caused by a hallucinating agent.

Another challenge was tuning the Judge's sensitivity. Initially, the Judge was too aggressive, reverting commits for minor stylistic infractions that didn't actually threaten system stability. We had to carefully prompt the Judge to distinguish between "suboptimal code" (which can be fixed in a follow-up PR) and "architectural violations" (which require an immediate rollback).

As we continue to refine this system, we are integrating more advanced telemetry. For instance, we are exploring how to feed real-time performance metrics back into the LLM Judge, allowing it to detect and revert performance regressions before they ever reach our end users. 

The autonomous rollback loop ensures that our Next.js static exports remain stable and that our DynamoDB data integrity is never compromised by an overly eager AI agent. It is a critical piece of infrastructure that allows us to scale our AI workforce confidently, knowing that our architectural integrity is fiercely guarded by an autonomous, tireless system.
