---
title: "The Telemetry Judge: Hooking Local LLMs to AppSync GraphQL"
date: "2026-08-12"
slug: "telemetry-judge-and-appsync"
summary: "How we wired our LLM Judge directly into AWS AppSync to autonomously monitor and diagnose real-time UI crash events."
tags: ["Testing", "Telemetry", "GraphQL", "AWS"]
---
# The Telemetry Judge: Hooking Local LLMs to AppSync GraphQL

Evaluating UI tests with an LLM was proving to be a revolutionary step for our QA processes, but it was fundamentally too slow and reactive for real-time diagnostics. We needed a way for the LLM Judge to instantly know when a React component crashed in our staging or CI environments without having to wait for the Playwright timeout to occur minutes later. Relying solely on end-of-run log analysis or traditional monitoring tools like DataDog or Sentry meant we lacked the immediate, domain-specific context required for rapid debugging. Traditional tools give you a stack trace, but they don't understand that a crash on the "Reimbursement Allocation" screen is inherently more critical than a glitch in a user profile avatar upload. We needed a real-time, event-driven architecture that understood our domain. 

To solve this, we wired up an AWS AppSync GraphQL subscription to pipe rich, localized telemetry directly into the LLM Judge's context the exact moment an anomaly occurred.

## The Architectural Challenge of Real-Time Diagnostics

Our frontend architecture relies on a Next.js static export application communicating with a robust AWS AppSync GraphQL backend, supported by DynamoDB for persistent storage. When a complex UI component crashes—perhaps due to an unhandled exception during a complicated, multi-step authorization workflow—the standard approach is to log the error to a centralized service and investigate it asynchronously. However, in our high-compliance environment, a UI crash might represent a critical failure in data validation, a breach of state management integrity, or a misalignment with a newly deployed backend schema.

We needed our LLM Judge to actively monitor the application state in real-time during our automated E2E test runs, and eventually, to provide real-time diagnostics for our staging environments. The solution was to treat the LLM Judge not just as a post-mortem analyzer that reviews transcripts, but as an active, listening subscriber to application telemetry. This builds heavily on the concepts we explored during our initial telemetry overhauls, detailed in [Multi-Modal Telemetry](/2026-07-07-multi-modal-telemetry).

The challenge was bridging the gap between a stateless, static Next.js frontend and a local Node.js daemon running the LLM Judge, without introducing heavy polling mechanisms that would exhaust rate limits or degrade performance.

## Wiring the AppSync Subscription

We built the `llm-judge-telemetry.js` script to act as a lightweight, resilient daemon. Its sole purpose is to monitor real-time telemetry and diagnose edge cases. We hooked this script directly into our AppSync GraphQL API. To ensure it always pointed to the correct environment (staging vs. local CI), we engineered it to parse the deployment outputs dynamically.

```javascript
// Dynamically resolve the AppSync endpoint from our Amplify configuration outputs
const { aws_appsync_graphqlEndpoint: ENDPOINT } = require('../amplify_outputs.json').data;

// Establish a GraphQL subscription for critical telemetry events
const subscriptionQuery = `
  subscription OnTelemetryEvent {
    onTelemetryEvent(severity: "CRITICAL") {
      id
      eventType
      componentStack
      stateSnapshot
      userActionHistory
    }
  }
`;
```

By leveraging AppSync subscriptions (which utilize WebSockets under the hood), the telemetry script establishes a continuous, low-latency connection. Whenever the Next.js frontend encounters an error boundary, a failed API mutation, or a critical state violation, it securely mutates a `TelemetryEvent` record in DynamoDB via a standard AppSync mutation. This mutation immediately triggers the subscription resolver, pushing the rich payload directly to our listening Node.js daemon.

## The Autonomous Diagnosis Loop

The daemon script polls for specific events, primarily focusing on `UI_CRASH` and `DATA_DESYNC` telemetry. When an event is detected, the real magic happens. The script doesn't just log the error and page a developer; it synthesizes a comprehensive context payload. 

This payload includes the standard React component stack trace, but more importantly, it includes a sanitized, localized snapshot of the application state at the exact moment of the crash. It also includes the `userActionHistory`—a rolling buffer of the last ten actions the user took before the failure, captured via a custom Redux middleware.

This incredibly rich, contextual payload is instantly passed to the Local LLM Judge. The LLM is initialized with a system prompt instructing it to act as a Senior Debugging Engineer familiar with our specific Next.js and AppSync architecture. It analyzes the stack trace against the state snapshot and the action history to determine the root cause of the crash.

For example, the LLM might detect that a crash occurred because a specific field, `allocatedBudget`, was returned as `null` from a DynamoDB Global Secondary Index projection, causing a downstream mathematical operation in a React component to throw an exception. The LLM Judge automatically drafts a detailed incident report, identifies the specific AppSync resolver or Next.js component at fault, and even generates a suggested code patch. It then tags the `@developer` agent in our internal communication tools, alerting the team with a fully diagnosed issue rather than just a vague error ping. This is a massive leap forward from the early, primitive days detailed in [LLM as a Judge in CI](/2026-06-24-llm-as-a-judge-in-ci).

## Engineering Considerations and Hard-Won Lessons

Building this real-time pipeline required careful handling of several specific edge cases and architectural constraints:

1.  **Payload Size Limits:** GraphQL subscriptions and WebSockets have practical payload limits. A full Redux state tree for our application can easily exceed several megabytes, which would choke the connection. We had to implement aggressive truncation algorithms on the frontend. When a crash occurs, we serialize only the state slice relevant to the crashed component tree, discarding unrelated data before transmitting the payload to AppSync.
2.  **Connection Resiliency:** WebSocket connections drop constantly in real-world network conditions. Our `llm-judge-telemetry.js` script implements robust, custom reconnection logic with exponential backoff and jitter to ensure we never miss a critical `UI_CRASH` event, even during long-running, overnight test suites where network blips are common.
3.  **Noise Reduction and Alert Fatigue:** If every minor console warning triggered an LLM evaluation, our CI pipeline would grind to a halt, and developers would quickly ignore the output. We heavily filter the events at the Next.js boundary and again at the AppSync resolver level, ensuring only strictly defined `CRITICAL` severity events trigger the LLM evaluation.
4.  **Security and Sanitization:** Passing application state to a local LLM requires rigorous sanitization. Before any state snapshot is sent to AppSync, a specialized utility strips all Personally Identifiable Information (PII) and Protected Health Information (PHI), ensuring that our debugging tools never inadvertently leak sensitive user data into the telemetry stream.

## Conclusion

By directly integrating our LLM Judge with AWS AppSync GraphQL subscriptions, we transformed our debugging process from a reactive, manual chore into a proactive, automated diagnostic system. This architecture ensures that the moment a UI crash occurs—whether in CI or staging—an AI agent is already analyzing the exact state, action history, and stack trace. This drastically reduces our mean time to resolution, minimizes developer toil, and ensures the absolute stability of our critical NeuroHub workflows. We moved from merely knowing *that* something broke, to immediately knowing *why* it broke and *how* to fix it.
