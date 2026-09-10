---
title: "The Engineering Mandate: Why We Need Autonomous AI Agents"
date: "2026-04-28"
slug: "the-engineering-mandate"
summary: "Building NeuroHub manually would take years of navigating complex California regulations. Here is why we decided to automate our engineering team."
tags: ["Architecture", "BotHuddle", "AI", "Motivation"]
---

# The Engineering Mandate: Why We Need Autonomous AI Agents

**Motivation:** Building NeuroHub is a race against time and compliance complexity. We faced a stark business reality: navigating California's 21 Regional Centers manually would burn through our runway before we even launched. We needed a way to accelerate engineering without compromising on the strict rules of the Self-Determination Program (SDP). This is the story of how and why we mandated the creation of autonomous AI agents to build our codebase.

NeuroHub is tackling one of the most bureaucratic, convoluted, and heavily regulated systems in the United States: the California Regional Center disability care network. Families navigating the Self-Determination Program (SDP) or the Traditional Self-Advocacy Route (SAR) are routinely buried under mountains of paperwork, shifting compliance caps, and complex invoicing rules that vary dramatically from one county to the next. The rules are rarely consistent; what gets approved in Los Angeles might be outright rejected in San Diego, leading to delayed payments, interrupted care, and massive stress for families who are already stretched to their limits. 

Our goal is to build the first true AI-native operating system for neurodiversity care. To do this, we need a massive unified dashboard, a deterministic compliance engine that mathematically proves invoices are legal before they are ever submitted, and a highly dynamic wizard system that adapts on the fly to local Regional Center quirks. We cannot afford to write spaghetti code filled with `if (regionalCenter === 'LA')` statements. The domain complexity demands an architectural purity that is incredibly difficult for human engineers to maintain at scale.

## The Architectural Bottleneck

When we first scoped the initial architecture, we realized the sheer volume of code required. Our tech stack is unapologetically modern but extremely strict: **Next.js Static Export** for the frontend, heavily relying on **AWS Amplify**, **AppSync GraphQL**, and **DynamoDB** for the backend. We explicitly rejected Kubernetes, Docker, and relational databases like Prisma. Everything in our system must be modeled into our single-table DynamoDB design and resolved through heavily typed AppSync endpoints.

Building 21 different permutations of compliance engines across this stack would take a traditional engineering team years. Writing the precise GraphQL resolvers, mapping them perfectly to DynamoDB access patterns (carefully balancing Partition Keys and Sort Keys to avoid hot partitions), and wiring them securely to a Next.js frontend is incredibly boilerplate-heavy. We don't have years. Families need this software today.

We realized that to build software this complex, we needed to dramatically scale our engineering throughput. We didn't need just a simple code generator or an autocomplete tool; we needed deep structural refactoring, autonomous domain modeling, and agents that deeply understood our specific, idiosyncratic architecture. We needed machines that could read a 50-page PDF from a Regional Center, map out the data schema, update the DynamoDB access patterns, write the AppSync resolver, and scaffold the Next.js wizard—all while strictly adhering to our internal engineering guidelines.

## The Mandate: Strict Generation

Instead of attempting to hire 50 engineers—a process that would burn our runway on recruiting fees and onboarding alone—we decided to build a platform that could hire 50 *autonomous AI agents*. 

Our mandate: **Build an orchestration framework that allows AI agents to write, test, and deploy NeuroHub's code autonomously, adhering perfectly to our existing paradigms.**

We knew early on that large language models couldn't just be given a terminal and told to "build an app." They need structure. They need oversight. They need deterministic testing. Left to their own devices, LLMs will invent libraries that don't exist, ignore directory structures, and fundamentally misunderstand how a single-table DynamoDB design works. 

One of our strictest internal rules is that entities must be constructed via our `Builder.build()` pattern. We could not let an AI agent hallucinate loose JSON parsing for DynamoDB updates. If it bypassed the builder, it could introduce corrupt states into the database that would break the compliance engine, leading to illegal invoices being generated and our clients being audited by the state.

```typescript
// Agents MUST use the Builder pattern for mutations
const receipt = new ReceiptBuilder()
  .withRegionalCenterId(rcId)
  .withAmount(50.00)
  .build();
  
await AppSyncClient.mutate({
  mutation: CreateReceipt,
  variables: { input: receipt.toDTO() }
});
```

This strict requirement led to the initial creation of **BotHuddle**, our internal, multi-agent orchestration matrix. By connecting a communication bus (Zulip) to our Git Ledger (Forgejo), we created a digital office where AI agents could debate architecture, write pull requests, and review each other's code. We explicitly configured these agents to understand our AppSync schema and strictly enforce the `Builder.build()` rule during code generation. If an agent attempted to use `JSON.parse` or spread operators to build an entity, the Reviewer agent would immediately reject the PR and demand a rewrite using the Builder pattern.

## The Reality of Cloud Orchestration

We architected BotHuddle completely natively on AWS. We used EventBridge to route webhook events from Forgejo, and SQS to queue messages for Amplify Lambda functions acting as our agents. At first, it was magical. Agents were autonomously opening PRs, reviewing GraphQL schemas, and correcting each other's Next.js component structures. We would go to sleep and wake up to find three new compliance wizards fully coded, tested, and waiting for human approval.

But within weeks, we hit a massive snag. The infrastructure to keep these agents idling—polling Zulip threads for new messages, maintaining AppSync subscriptions for state changes, and watching SQS queues for webhook payloads—was costing us $350/mo. And that was just for the orchestration layer, *not* the LLM inference costs. We were burning cash on AWS infrastructure just to have agents sit around waiting for a human to trigger them. 

Furthermore, troubleshooting the agents in the cloud became a nightmare. When an agent got stuck in an infinite loop trying to resolve a GraphQL typing issue, it would burn through Lambda execution minutes and SQS retries before hitting the dead-letter queue. The feedback loop for the human engineers trying to tune the agents was too slow.

## The Pivot to Local Execution

We made the hard call to kill BotHuddle's cloud presence entirely. We pivoted entirely to executing these agents locally on our own machines using Antigravity's `/teamwork` slash commands. This eliminated the idling cloud costs completely while still giving us the multi-agent orchestration we desperately needed. 

By moving orchestration locally, developers could now spin up the agent matrix directly on their MacBooks. The agents still followed the same strict rules—enforcing Next.js Static Export compliance, maintaining DynamoDB single-table integrity, and utilizing the `Builder.build()` pattern—but they did so with zero latency and zero cloud infrastructure costs. For a deep dive into how we enforce data integrity with these local agents, check out our post on [Strict ORM Builders](/2026-09-18-strict-orm-builders). We also recommend reading our piece on [AppSync Codegen Challenges](/2026-06-10-appsync-codegen-challenges) for more context on the GraphQL side of the equation.

## What Lies Ahead

This blog series chronicles our journey over the next five months. It is the raw, unfiltered story of how we initially built BotHuddle, the terrifying edge cases our agents introduced into our DynamoDB tables, and the immense challenge of wiring AI to our Next.js UI components without breaking the Static Export build. You can read more about how we handled the UI verification bottleneck in our piece on [Visual Testing](/2026-07-15-visual-testing-and-local-llm-migration).

We also cover the incredibly sophisticated Adversarial Fuzzing pipelines we had to build to keep the AI in check. When building compliance software for disability care, you cannot rely on unit tests alone. We built a system that actively attempts to trick the generated code into approving illegal invoices, forcing the agents to write increasingly robust validation logic. Building a system that builds itself is fraught with peril, but for the families relying on NeuroHub, it is the only way forward. We invite you to follow along as we document every failure, every pivot, and every architectural victory on the road to an AI-authored codebase.
