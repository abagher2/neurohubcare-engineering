---
title: "Goal-Based Agent Testing"
date: "2026-07-02"
slug: "goal-based-agent-testing"
summary: "Testing the AI itself: How we evaluate agent reasoning using isolated, simulated environments."
tags: ["Testing", "Agents", "Evaluation"]
---

# Goal-Based Agent Testing

Every time we updated our system prompts to fix one agent behavior, we inadvertently broke another. We were flying blind, discovering regressions in agent reasoning only after they had generated bad code or made incorrect decisions in production. We needed a way to deterministically test the cognitive capabilities of our agents before deploying prompt changes.

To ensure updates to our system prompts (`AGENTS.md`) don't degrade agent reasoning, we built a Goal-Based Evaluation Suite. Instead of testing the code they produce in a vacuum, we test the agents themselves in isolated, ephemeral sandboxes.

## The Prompt Regression Problem

In traditional software engineering, a test suite gives you confidence that changing a function won't break upstream dependencies. In Agentic Engineering, your code is non-deterministic. A subtle tweak to the `AGENTS.md` file to encourage better error handling in our AppSync GraphQL resolvers might inadvertently cause the agent to start hallucinating Postgres dependencies instead of using our actual DynamoDB stack. 

When you change the temperature or adjust the context window, you might inadvertently induce a catastrophic failure mode where an agent decides that writing a custom state management library is better than utilizing our predefined universal state taxonomy. It's not just about syntax; it's about architectural philosophy. A single prompt change designed to improve test coverage could suddenly cause agents to generate thousands of lines of boilerplate that we don't need.

We would occasionally see agents attempt to write complex, legacy VTL (Velocity Template Language) for AppSync resolvers instead of sticking to our modern JavaScript resolver standard. In other catastrophic runs, they would attempt to install Prisma and spin up Docker containers, completely ignoring our strict serverless mandate. The blast radius of these hallucinations wasn't just bad code—it was hours of wasted debugging time for our human engineers who had to untangle the mess.

We realized that evaluating an AI agent requires more than just linting the output. We need to evaluate the *journey* the agent takes to solve a problem. Does it get stuck in loops? Does it understand our architecture (Next.js Static Export, AWS Amplify)? Does it respect our strict rules? 

## Architecting the Sandbox

Our stack at NeuroHub relies heavily on AWS managed services: Amplify, DynamoDB, and AppSync GraphQL. Spinning up full AWS environments for every agent test was out of the question due to latency and cost. Furthermore, since we strictly avoid Kubernetes and Docker in our local development flow, we needed a lightweight, serverless-compatible local mock that could run purely as Node.js processes.

For each test, we provision a completely isolated workspace. The environment setup takes less than four seconds and contains:
1. A fresh, shallow clone of the codebase.
2. A seeded local instance of DynamoDB, populated with deterministic partition keys and sort keys representing our test scenarios.
3. A custom routing layer that acts as a mock AppSync endpoint, directly resolving GraphQL queries against the local DynamoDB tables.
4. A pre-built Next.js static export of the frontend. Because we use static exports, there is no Node server running at runtime for the frontend, so testing it meant serving static files and routing API calls directly to our local mock layer.

Every millisecond matters when you are running hundreds of goal-based tests sequentially. By removing the overhead of Docker daemons and container orchestration, our node-based sandbox architecture allows us to run these evaluations continuously on standard CI runners without requiring expensive GPU instances or massive memory footprints. The local DynamoDB instance is ephemeral, dropping its tables the moment the test concludes, guaranteeing zero state leakage between evaluation runs.

We initialize the agent inside this sandbox and provide it with a high-level goal, rather than step-by-step instructions:

> "Fix the ServiceWizard bug where Goal ID linking fails for SDP programs."

If the goal involves asynchronous workflows—for example, testing our receipt processing pipeline—the agent must prove it can correctly wire up Amazon EventBridge rules and SQS queues using our infrastructure-as-code patterns, entirely within the sandbox constraints. 

## Evaluating the Agent's Journey

We don't script their paths. The agent is free to use its tools—reading files, searching the codebase, editing components, and running local builds. While the agent works, our evaluation harness monitors the environment, collecting deep telemetry on the agent's behavior. 

We track several key metrics:
- **Time to Resolution (TTR):** How long does the agent take to declare the goal complete? A good run takes minutes; a bad run might stretch into hours if unchecked.
- **Token Burn Rate:** How many tokens were consumed in the process? In early iterations, a runaway agent might enter an infinite loop of reading our massive `globals.css` file and rewriting it, burning $5 of tokens in a few minutes. We implemented a strict circuit breaker: if the Token Burn Rate exceeds a set threshold, the sandbox terminates the run and marks the evaluation as a catastrophic failure.
- **Tool Selection Efficiency:** Does the agent use semantic search effectively, or does it try to read 5,000-line files line-by-line? Does it rely on `grep_search` to surgically find references, or does it blind-guess file paths?

If an agent encounters a TypeScript error, does it blindly run `npm install` for random unapproved packages, or does it correctly identify that it missed an interface export in a local module? This behavioral tracking has allowed us to refine our base instructions, effectively teaching our agents to behave more like seasoned Principal Engineers and less like junior developers guessing at stack traces.

## Rethinking Search and Memory

One of the fascinating discoveries we made during early sandbox testing was how our agents handled contextual memory. Initially, we used `pgvector` for semantic code search. However, the agents struggled with the latency, and the infrastructure costs of keeping Postgres running solely for vector search were ballooning. Moreover, it forced a Docker dependency that we explicitly wanted to avoid.

We pivoted to an entirely in-memory solution using Orama coupled with Gemini embeddings. This change drastically reduced the Time to Resolution in our sandboxes. When an agent is initialized in the sandbox, we generate embeddings for the Next.js components and the AWS Amplify configuration files on the fly. Orama runs natively in-memory within the V8 isolate. 

When an agent needs to find where our Amplify auth guards are defined, the Orama search returns the precise `src/lib` paths in roughly 150 milliseconds, compared to the 3-second latency we experienced with `pgvector`. This keeps the token burn low and ensures the agent's reasoning remains highly focused without losing train of thought while waiting for a database round-trip.

## Deterministic Verification

Once the agent announces it has completed the goal, we must verify the outcome. We cannot simply diff the code, because there are multiple valid ways to fix a bug, and LLMs rarely write the exact same syntax twice. 

Instead, we run a suite of E2E Playwright tests against the agent's modified codebase. As we discussed in [Why Playwright Flaked](/2026-06-30-why-playwright-flaked), traditional DOM-based assertions can be brittle, especially when an agent might add a wrapper `<div>` that breaks a rigid CSS selector. To combat this, our tests focus on critical user flows and API mutations using resilient locators. We ensure that the AppSync mutations are correctly fired and that the data in our local DynamoDB matches the expected schema.

When visual verification of the UI is required, we augment Playwright with our localized visual testing infrastructure. As detailed in [Visual Regression with Gemini](/2026-07-09-visual-regression-with-gemini), we use local LLMs to analyze layout changes. 

However, running this concurrently introduced massive stability issues. When Playwright spawned multiple worker instances, the local LLMs would try to analyze all the screenshots simultaneously. The GPU would hard fault with a VRAM OOM (Out of Memory) crash, bringing the entire CI node down. To solve this without compromising on test speed, we built a dedicated HTTP Mutex Queue running on port 8002. It accepts a screenshot payload, locks the processing thread, runs the Gemini inference, and then releases the lock for the next Playwright worker. 

We explicitly enforce `fullPage: true` so the LLM gets the entire context of the page, completely sidestepping the need to crop images—a practice that historically confused the AI about layout geometry and nested component hierarchies. If the UI requires an element to be sticky, the visual AI must recognize it in its scrolled state. By processing these `fullPage: true` captures sequentially through the port 8002 Mutex Queue, we maintain high throughput without risking the hardware limits. The Mutex Queue essentially acts as a traffic cop for our VRAM, ensuring that no matter how aggressively Playwright scales its workers, the LLM inferences remain stable and deterministic.

## Orchestrating Multi-Agent Swarms for Collaborative Goals

Testing a single agent is challenging; testing collaborative swarms across BotHuddle is an order of magnitude more complex. In our architecture, complex objectives often require multiple specialized agents working in concert. We spin up specialized personas within the BotHuddle matrix: a 'Planner' agent evaluates the goal and proposes DynamoDB schema updates, while a 'Frontend' agent updates the Next.js components to consume the GraphQL queries.

To keep these multi-agent interactions deterministic, our test harness intercepts inter-agent messaging:
- **State Auditing**: Every proposal emitted by an agent is captured in our DynamoDB test table and verified against our strict `Builder.build()` schemas.
- **Cycle Detection**: If the Planner and Coder agents enter a circular revision loop without progressing toward the goal criteria, the test runner trips a circuit breaker and marks the test as a goal failure.
- **Token Efficiency Bounds**: Each goal evaluation has a strict ceiling on token consumption and tool invocations.

This gives our engineering team quantitative visibility into whether multi-agent collaboration actually improves problem-solving speed or simply burns tokens in circular debates—a critical metric as we monitor the operational overhead of our fleet.

## Conclusion

Goal-Based Agent Testing has fundamentally changed how we iterate on our AI engineering practices at NeuroHub. By placing our agents in realistic, sandboxed environments with high-level objectives, we evaluate their actual cognitive capabilities and problem-solving strategies, not just their syntax generation. 

We can now confidently tweak our system prompts, knowing that our automated suite will catch regressions in reasoning, token efficiency, and architectural compliance before they ever reach production. The journey from unpredictable prompt tweaking to deterministic agent validation hasn't been easy, but it has paved the way for a significantly more resilient engineering culture.
