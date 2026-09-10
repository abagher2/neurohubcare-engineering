---
title: "Solving State Resumption: Deep Links in the Compliance UI"
date: "2026-08-21"
author: "NeuroHub Engineering"
description: "A comprehensive look at how we engineered a bulletproof deep-linking and state resumption architecture for our multi-step compliance wizards using URL-driven state machines."
tags: ["Frontend", "React", "State Management", "Deep Linking", "UX"]
---

# Solving State Resumption: Deep Links in the Compliance UI

In complex SaaS applications, user workflows are rarely linear and rarely completed in a single session. In NeuroHub, a parent filling out a massive reimbursement request (which includes uploading receipts, mapping to service codes, and digitally signing) might be interrupted, switch devices, or need to email a link to a co-parent for review. 

Historically, our application heavily relied on React state (`useState`, `useContext`) to power these multi-step wizards. If a user refreshed the page, or tried to share a URL mid-workflow, they were unceremoniously dumped back to step one. This was unacceptable for a platform dealing with high-friction bureaucratic processes. We needed a robust way to resume state via Deep Links.

## The Problem with Component State

The fundamental flaw in our original design was coupling workflow progression to component memory. 

```tsx
// The Old Way: Fragile and ephemeral
const ReimbursementWizard = () => {
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);

  // If the user hits refresh here, draftId is lost, step resets to 1.
  return (
    <div>
      {step === 1 && <UploadReceipt onComplete={(id) => { setDraftId(id); setStep(2); }} />}
      {step === 2 && <CategorizeReceipt draftId={draftId} />}
    </div>
  );
};
```

To solve this, we had to elevate the "truth" of the workflow out of React's memory and into the two most durable storage mechanisms available to the browser: the URL and the Server Database.

## The URL-Driven State Machine

We adopted a strict architectural rule: **All interactive multi-step flows must be fundamentally addressable via dynamic server-rendered routes.**

We moved away from modals and single-page hidden-state wizards, transitioning to a URL-driven State Machine. Every discrete step of a compliance workflow became its own distinct route segment in our Next.js App Router.

### Architectural Diagram: URL State Resumption

```mermaid
graph TD
    A[User clicks 'Resume' link in Email] -->|GET /requests/reimbursements/123/categorize| B(Next.js Server Component)
    B --> C{Verify Draft Exists?}
    C -->|No| D[Redirect to 404 or Error]
    C -->|Yes| E{Is Step Valid for Draft State?}
    E -->|No, needs upload| F[Redirect to /requests/reimbursements/123/upload]
    E -->|Yes| G[Fetch Draft Data]
    G --> H[Render 'Categorize' Client Component with Hydrated Data]
    H --> I[User Completes Step]
    I -->|Server Action: updateDraft()| J[Database Updated]
    J -->|Redirect| K[Next Step URL: /requests/reimbursements/123/sign]
```

### Implementation in Next.js

By leaning on dynamic routing and Server Components, we ensure that the state is fetched securely on the backend before the UI even renders.

```tsx
// app/requests/reimbursements/[id]/categorize/page.tsx
import { getReimbursementDraft } from '@/lib/orm/reimbursement';
import { redirect } from 'next/navigation';
import { CategorizeView } from './_components/CategorizeView';

export default async function CategorizePage({ params }: { params: { id: string } }) {
  // 1. Authenticate and Fetch
  const draft = await getReimbursementDraft(params.id);

  if (!draft) {
    redirect('/requests/reimbursements');
  }

  // 2. State Machine Enforcement (Guard Clauses)
  // Ensure the user hasn't skipped a mandatory previous step via URL hacking
  if (draft.status === 'PENDING_UPLOAD') {
    redirect(`/requests/reimbursements/${draft.id}/upload`);
  }

  if (draft.status === 'COMPLETED') {
    redirect(`/requests/reimbursements/${draft.id}/receipt`);
  }

  // 3. Render the specific step with fully hydrated server data
  return <CategorizeView draft={draft} />;
}
```

## Abstracting the Workflow Engine

To prevent writing bespoke guard clauses for every single workflow (Reimbursements, Care Plans, IPP Signatures), we abstracted this logic into a centralized `WorkflowEngine` running on the server.

The engine relies on persisted `Workflow` records. The database defines a typed plan, a task list, and available actions. 

```typescript
export interface WorkflowDefinition {
  type: string;
  steps: ReadonlyArray<string>;
  canTransition: (currentStatus: string, nextStep: string, data: any) => boolean;
}

// Reusable middleware for resolving canonical paths
export const resolveWorkflowPath = (workflow: PersistedWorkflow): string => {
  const definition = WorkflowRegistry.get(workflow.type);
  const currentStep = workflow.currentStep;
  return `/requests/workflows/${workflow.id}/${currentStep}`;
};
```

When a user clicks a deep link from an email (e.g., `neurohub.app/action/resume/wf_999`), a central router intercepts the request, loads the `Workflow` entity, resolves the canonical path based on the current persisted state, and redirects the user seamlessly.

## Alternative Approaches Considered

### Client-Side LocalStorage Hydration
We briefly experimented with persisting wizard state to `localStorage` and hydrating it on initial render.
*Why we abandoned it:* `localStorage` is tightly bound to a specific device and browser. It fails the "email a link to a co-parent" test. It also introduces nasty hydration mismatches between Server Components and Client Components in Next.js.

### Massive Query Parameters
Encoding the entire state object as a Base64 string in the URL (e.g., `?state=eyJmb28...`).
*Why we abandoned it:* URLs have length limits, and passing sensitive compliance data (like medical diagnosis codes) in the URL, even if encoded, is a massive security and privacy risk. URL parameters should be identifiers (`id=123`), not the data payload itself.

## Conclusion

By treating URLs not just as addresses, but as pointers to durable server-side state machines, we completely eliminated the "refresh anxiety" from our user experience. Users can now share links, switch from desktop to mobile mid-task, and rely on the UI to always put them exactly where they left off, securely and reliably.
