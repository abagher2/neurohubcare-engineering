---
title: "Solving State Resumption: Deep Links in the Compliance UI"
date: "2026-08-21"
author: "NeuroHub Engineering"
description: "A comprehensive look at how we engineered a bulletproof deep-linking and state resumption architecture for our multi-step compliance wizards using URL-driven state machines."
tags: ["Frontend", "React", "State Management", "Deep Linking", "UX"]
summary: "The Motivation: When an agent-driven workflow encountered a missing piece of data (like a missing provider tax ID), it would just fail. We needed a resumption UI where the agent could pause, send a deep link to the user, and immediately resume execution once the user filled out the form."
---
# Solving State Resumption: Deep Links in the Compliance UI

> **The Motivation:** When an agent-driven workflow encountered a missing piece of data (like a missing provider tax ID), it would just fail. We needed a resumption UI where the agent could pause, send a deep link to the user, and immediately resume execution once the user filled out the form.

In complex SaaS applications, particularly those navigating the labyrinthine regulations of healthcare and regional center compliance, user workflows are rarely linear and almost never completed in a single uninterrupted session. Historically, our application heavily relied on React state to power these multi-step wizards. If a user refreshed the page, or tried to share a URL mid-workflow, they were unceremoniously dumped back to step one. This post explores the systemic failure of our initial architecture, the painful lessons we learned about state management, and the robust URL-driven state machine we ultimately built on top of AWS Amplify, DynamoDB, and Next.js Static Export.

## The Problem with Component State in Healthcare UX

The fundamental flaw in our original design was coupling workflow progression to volatile component memory. As our platform scaled to support neurodiverse families and complex Regional Center compliances, we found that caregivers often needed to switch devices or delegate tasks halfway through. A parent might start a reimbursement request on their laptop, realize they need a photo of a receipt, and try to switch to their mobile phone to complete the upload. In our legacy system, an un-resumable state meant lost data and sheer frustration.

When the state lived purely in `useState` or a Context provider, the application had amnesia every time the browser tab closed. The DOM was the sole source of truth, and it was ephemeral.

```tsx
const ReimbursementWizard = () => {
  const [step, setStep] = useState(1);
  // If the user hits refresh here, step resets to 1.
  return <Wizard step={step} />;
};
```

This fragile pattern wasn't just a UX failure for humans—it also completely blocked our autonomous agents. An AI agent processing a backlog of invoices can't pause and hand over a React state to a human via email. If the agent encountered a missing piece of data, the entire workflow would crash, requiring manual intervention from our operations team. We needed a system where the "truth" of the workflow was elevated out of the browser and into a durable, addressable medium. For more on how we ruthlessly test these UI limits and edge cases, see our post on the [UX Crawler and Fuzzing](/2026-08-23-ux-crawler-and-fuzzing).

## The URL-Driven State Machine

To solve this, we adopted a strict, non-negotiable architectural rule: **All interactive multi-step flows must be fundamentally addressable via dynamic server-rendered routes.** Every discrete step of a compliance workflow became its own distinct route segment in our Next.js App Router.

Instead of passing state down a React tree, we persisted partial workflows as `Draft` records in AWS DynamoDB. When a user or agent creates a new workflow, a unique ID is generated and saved via AppSync GraphQL. The step progression is then mapped directly to the URL structure (e.g., `/requests/workflows/[id]/[step]`). The URL became the remote control for the database.

### Implementation in Next.js Static Export

By leaning on dynamic routing and strict data fetching patterns in Next.js, we ensure that the state is retrieved securely from AppSync before the UI becomes interactive. This means a user can copy a URL at step 4 of a complex 10-step wizard, text it to their spouse, and the spouse can open it and see exactly what is missing.

```tsx
export default function CategorizePage({ params }: { params: { id: string } }) {
  // Fetched via AppSync GraphQL on mount or during SSG build
  const { data: draft } = useGetReimbursementDraftQuery(params.id);
  
  if (!draft) return <LoadingSpinner />;
  return <CategorizeView draft={draft} />;
}
```

This approach significantly reduced our support tickets related to "lost work." It also forced our engineers to think of UI not as a sequence of modal popups, but as a series of addressable documents.

## Abstracting the Workflow Engine

Of course, moving state to the URL introduced a new problem: users could manually manipulate the URL to skip critical compliance steps. A malicious or confused user might change `/step-1` to `/step-5` without uploading the required legal documents. 

To prevent writing bespoke guard clauses for every single workflow, we abstracted this logic into a centralized `WorkflowEngine` running on the client, backed by strict server-side validation. It evaluates the current DynamoDB record state and calculates the next valid URL. We enforce strict data integrity through domain entity builders, ensuring no workflow step can be visited if its prerequisite data is missing.

```typescript
export const resolveWorkflowPath = (workflow: PersistedWorkflow): string => {
  if (!workflow.isEligibilityComplete) {
    return `/requests/workflows/${workflow.id}/eligibility`;
  }
  return `/requests/workflows/${workflow.id}/${workflow.currentStep}`;
};
```

If a user tries to jump ahead, the routing middleware intercepts the request, checks the DynamoDB record, and automatically redirects them back to the earliest incomplete step. This self-healing navigation guarantees that our data pipeline remains pristine.

## Bridging the Gap: Agents and Humans

The true power of this architecture was realized when we integrated our AI agents. With durable, URL-driven state, when an AI agent encounters a missing piece of data (like an un-uploaded receipt or an invalid tax ID), it doesn't crash. Instead, it gracefully suspends its execution. 

The agent updates the DynamoDB record to a `PENDING_USER_INPUT` status and dispatches an Amazon SQS message. Our notification microservice, listening to the SQS queue, generates a customized email explaining exactly what is missing, and includes a deep link directly to the specific wizard step required to fix it.

Because the state is fully defined by the URL and the backend database, the caregiver receives the email on their phone, clicks the link, and is instantly dropped into the exact context they need. They don't have to navigate a dashboard or remember where they left off. They simply upload the receipt and click "Submit". 

The UI updates the DynamoDB record via an AppSync mutation, which triggers an EventBridge event. This event wakes the AI agent back up, allowing it to seamlessly resume processing the workflow as if it had never been interrupted. 

## The Tradeoffs and Lessons Learned

While this architecture is robust, it did come with tradeoffs. Moving all state to DynamoDB via AppSync introduced network latency into every step transition. In the old React state model, clicking "Next" was instantaneous. Now, clicking "Next" requires a network round trip to update the draft record before the Next.js router transitions to the new URL.

To mitigate this, we heavily utilized Apollo Client's optimistic UI updates. When a user clicks "Next", we optimistically write the next state to the local Apollo cache and immediately trigger the route transition, masking the network latency. If the AppSync mutation fails, we roll back the cache and display an error toast, keeping the user on the current step.

Furthermore, managing the lifecycle of these `Draft` records became a challenge. We had to implement DynamoDB TTL (Time to Live) to automatically purge abandoned workflows after 30 days to keep our storage costs down and our tables clean. 

## Conclusion

By treating URLs not just as addresses, but as pointers to durable DynamoDB-backed state machines, we completely eliminated the "refresh anxiety" from our user experience. Users can now share links, switch from desktop to mobile mid-task, and rely on the UI to always put them exactly where they left off. More importantly, we created a seamless bridge between autonomous AI agents and human caregivers, allowing them to collaborate asynchronously on complex compliance tasks without missing a beat. This architecture has become the bedrock of the NeuroHub platform, proving that in enterprise software, the URL is still one of the most powerful tools at our disposal.
