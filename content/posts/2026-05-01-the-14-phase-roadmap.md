---
title: "The 14-Phase Roadmap for BotHuddle: Orchestrating AI Agents across Forgejo and Zulip"
date: 2026-05-01
author: NeuroHub Engineering
tags: [BotHuddle, AI, Orchestration, Forgejo, Zulip, Roadmap]
summary: "Before BotHuddle, our autonomous agents were siloed, disjointed scripts that couldn't collaborate. The engineering team faced massive pain points: context was lost between tools, agents couldn't communicate with human reviewers, and manual intervention was required for every handoff. We needed a unified orchestration layer to bring order to the chaos."
---

# The 14-Phase Roadmap for BotHuddle

Before BotHuddle, our autonomous agents were siloed, disjointed scripts that couldn't collaborate. The engineering team faced massive pain points: context was lost between tools, agents couldn't communicate with human reviewers, and manual intervention was required for every handoff. We needed a unified orchestration layer to bring order to the chaos.

BotHuddle acts as the connective tissue that allows autonomous agents to listen, reason, and act across our infrastructure, bridging our Forgejo Git Ledger with our Zulip communications bus. Here is the unvarnished 14-phase roadmap of how we are building, scaling, and operationalizing BotHuddle across our engineering fleet.

## Phase 1: Inception and Theoretical Underpinnings

We needed a rigorous mathematical foundation to ensure state consistency before writing any code. An AI agent is fundamentally a stateful entity observing state from its environment (Forgejo and Zulip) and emitting actions against our AWS Amplify backend. We mapped out a Directed Acyclic Graph (DAG) of potential agent actions to ensure that agents could not get stuck in infinite feedback loops. 

Since our tech stack relies heavily on Next.js Static Export, AppSync GraphQL, and DynamoDB, our agents needed to understand that they couldn't just spin up arbitrary Docker containers or write Python background workers. All orchestration had to be handled via AWS native serverless primitives, which severely constrained how the agents could persist their own memory and state.

## Phase 2: Evaluating Alternatives

To avoid reinventing the wheel, we thoroughly vetted existing CI/CD solutions first. We evaluated off-the-shelf CI/CD pipelines like GitHub Actions and GitLab CI, but they were far too rigid for non-deterministic AI workflows. We also looked at heavy orchestration engines like Temporal, but our strict rule is "No Kubernetes, No Docker." We refused to introduce container orchestration just to run our AI agents. We needed something that ran natively on AWS serverless infrastructure like EventBridge and SQS, seamlessly integrating with our existing AppSync models and allowing for indefinite, event-driven pauses while agents waited for human feedback.

## Phase 3: The MVP - Serverless Webhook Ingestion

We started with a minimal viable product to quickly validate the core webhook integration from Forgejo. Instead of a long-running Express or Python server that would cost money while idle, we used AWS API Gateway routing directly to an Amplify Lambda function. This function was responsible purely for validating the webhook signature, parsing the JSON payload, and dropping it onto an SQS queue for asynchronous processing.

```typescript
// Lambda handler for Forgejo webhooks
export const handler = async (event: APIGatewayProxyEvent) => {
  const payload = JSON.parse(event.body || '{}');
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: process.env.AGENT_QUEUE_URL,
    MessageBody: JSON.stringify({ type: 'forgejo_event', data: payload })
  }));
  return { statusCode: 200, body: 'OK' };
};
```

## Phase 4: Connecting the Zulip Communications Bus

Human-in-the-loop communication was essential for agent debugging and approvals. Initially, we considered WebSockets, but managing connection state for AI agents over Lambda is notoriously brittle. Instead, we leveraged Zulip's outgoing webhooks and routed them through EventBridge. This ensured our agents were invoked only when explicitly pinged in a Zulip stream. We had to build strict deduplication logic to prevent two agents from triggering off each other's messages, which in early testing resulted in an infinite loop of polite agreements that burned $40 in LLM tokens in five minutes.

## Phase 5: The Agent State Machine in DynamoDB

We needed a standardized way to track what each agent was currently doing across distributed Lambdas. Because we use a strict DynamoDB single-table design, we modeled the agent states as distinct entities. We created Global Secondary Indexes (GSIs) to allow us to quickly query for all agents currently in the `AWAITING_REVIEW` state.

```typescript
export type AgentState = 'IDLE' | 'ANALYZING' | 'CODING' | 'AWAITING_REVIEW' | 'ERROR';

// Tracking state via strict ORM Builders
const agentRecord = new AgentStateBuilder()
  .withAgentId(event.agentId)
  .withStatus('CODING')
  .build();
  
await dynamoDb.put({ TableName, Item: agentRecord.toItem() });
```

## Phase 6: Orchestration and AppSync Routing

Intelligent routing was required to direct tasks to the most capable specialized agent. We built a custom AppSync GraphQL API that allowed human developers to query agent states and send direct directives from a custom dashboard. When a user submitted a prompt, AppSync would trigger a Lambda resolver that dynamically instantiated the correct worker agent based on the requested domain context. This kept all manual interventions firmly within our strict GraphQL schema.

## Phase 7: Bridging Forgejo and Zulip

The true value was unlocked by giving conversational agents direct access to code repositories. Agents could read PRs in Forgejo, ask for clarification in Zulip, and push commits. If an agent encountered an undocumented AppSync resolver pattern or a merge conflict it couldn't resolve, it would pause its state, ping the assigned developer in Zulip, and wait for clarification before writing to the ledger. This bridged the gap between asynchronous code generation and real-time chat.

## Phase 8: Handling Next.js Static Export Constraints

One of our biggest hurdles was ensuring agents didn't break our Next.js Static Export build. Agents trained on standard Next.js tutorials frequently tried to inject `getServerSideProps` or Node.js native modules into React components, completely misunderstanding our deployment model. We had to implement strict AST scanning in our CI pipeline to block these commits outright, teaching the agents to rely strictly on client-side Amplify queries and static generation. For more on how we solved UI verification under these constraints, see [Visual Testing](/2026-07-15-visual-testing-and-local-llm-migration).

## Phase 9: Memory and Context Injection

Agents were hallucinating due to a lack of historical project context. We couldn't just deploy Redis or a heavy Vector DB cluster—again, no Docker allowed. We solved this by serializing architecture context directly into DynamoDB items and using AppSync pipelines to fetch relevant context windows prior to invoking the LLM. We implemented aggressive token eviction strategies to ensure we didn't exceed the context window limits of our models, prioritizing recent code changes over older design documents.

## Phase 10: Security Protocols & Guardrails

We had to implement strict safeguards to prevent autonomous agents from destroying production data or exposing sensitive PHI (Protected Health Information).
- Agents were restricted by IAM roles to push only to `bothuddle/*` branches in Forgejo.
- We used AST Whitelisting to protect sensitive core configuration files and enforce our `Builder.build()` strictness (see [Strict ORM Builders](/2026-09-18-strict-orm-builders) for details on why this was non-negotiable).
- Human-in-the-loop (HITL) approvals were hardcoded for any database schema modifications or DynamoDB index updates.

## Phase 11: Multi-Agent Collaboration

Complex tasks proved too difficult for a single agent, requiring specialized roles. We instantiated `CoderBot`, `ReviewerBot`, and `QA_Bot`, each running as an independent Lambda function. They communicated asynchronously via SQS dead-letter queues to handle retries gracefully. Early on, `CoderBot` and `ReviewerBot` would often get into pedantic arguments about TypeScript interfaces, requiring us to implement a hard limit on back-and-forth iterations before escalating to a human in Zulip.

## Phase 12: Telemetry and Observability

We needed deep visibility into agent reasoning and failure states. We pushed structured JSON logs from our Lambda functions directly into CloudWatch. From there, we built custom dashboards to parse out LLM token usage, duration metrics, and reasoning chains. This allowed us to optimize our system prompts and identify exactly which phases of code generation were causing the agents to stumble.

## Phase 13: Continuous Verification and Autonomous Rollbacks

A multi-agent swarm is only as trustworthy as its worst hallucination. Phase 13 introduces an automated verification circuit breaker: whenever an agent merges code to a staging branch, our headless CI runner spins up synthetic user personas to validate the changes in a production-like staging environment. If runtime telemetry detects a regression or a failed policy assertion, EventBridge immediately dispatches an autonomous rollback event to Forgejo, reverting the commit and opening an investigative thread in Zulip.

## Phase 14: The Unified Fleet Dashboard

The final phase of our roadmap brings full operational transparency: a single pane of glass for human operators. By piping AppSync subscriptions, DynamoDB state machines, and real-time prediction market telemetry into a centralized React canvas, engineers can visually monitor agent deliberations, track token burn rates, and intervene with a single keystroke.

Building out these 14 phases represents our commitment to solving software engineering's hardest coordination problems. Over the coming weeks, we will dive deep into each architectural pillar—starting next with our Unified Domain API and auto-generated MCP layer.
