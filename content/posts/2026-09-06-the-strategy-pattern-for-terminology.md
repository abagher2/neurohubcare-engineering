---
title: "Combating Terminology Leakage with the Strategy Pattern"
date: "2026-09-06"
slug: "the-strategy-pattern-for-terminology"
summary: "How we prevent regional healthcare jargon from infecting our UI components by strictly enforcing the Strategy pattern."
tags: ["Architecture", "React", "Design Patterns"]
---
# Combating Terminology Leakage with the Strategy Pattern

Our UI components were becoming bloated, unreadable, and fundamentally unmaintainable as we tried to support highly divergent terminology across different California healthcare programs (e.g., SDP vs SAR). Worse, our AI coding agents were hardcoding these localized terms directly into JSX, causing massive terminology leakage and breaking our component purity. We implemented the Strategy Pattern to abstract this complexity out of the UI layer completely, treating terminology not as static text, but as injected configuration.

## The Disease: Terminology Leakage

One of the most subtle, insidious ways an application's architecture degrades is through **Terminology Leakage**. In the California developmental disability space, the vocabulary changes entirely depending on the specific legal framework a family operates within. 

If a family is in the Self-Determination Program (SDP), the person receiving services is a "Participant." The core planning document is a "Person-Centered Plan" (PCP). The person managing the funds is an "FMS" (Financial Management Service).

If a family is in the traditional Service Authorization Requests (SAR) program, the exact same person is a "Consumer." The exact same planning document is an "Individual Program Plan" (IPP). The exact same funding manager is simply the "Regional Center."

When building a Next.js React UI that serves both populations, the naive instinct is to add boolean toggles everywhere. 

```tsx
// The Anti-Pattern: Terminology Leakage in JSX
const DocumentUploadModal = ({ isSDP, documentType }) => {
  return (
    <div>
      <h1>Upload {isSDP ? 'Participant' : 'Consumer'} Document</h1>
      <p>Please attach the approved {isSDP ? 'PCP' : 'IPP'} to proceed.</p>
    </div>
  );
};
```

This creates an unmaintainable combinatorial explosion of ternary operators. It breaks localization. It breaks testing. And crucially, it breaks AI agents. When an AI agent was tasked with adding a new feature, it would often "hallucinate" the wrong term or forget the ternary operator entirely, hardcoding "Participant" into a component that was also used by SAR families. This is precisely the kind of brittle UI that we aim to destroy with our autonomous [UX Crawler and Fuzzing](/2026-08-23-ux-crawler-and-fuzzing) tools, which constantly test our UI against divergent user profiles.

## The Cure: The Strategy Pattern Abstraction

We needed to force agents and human engineers alike to rely on abstract dictionaries rather than hardcoded strings. We needed to ensure that if an agent tried to hardcode a string like "Participant" directly into a JSX file, the PR would be instantly rejected by our CI pipeline.

To solve this, we instituted a strict implementation of the **Strategy Pattern**. We completely removed program-specific logic from the React component tree. 

During the initial Next.js routing hydration, NeuroHub fetches the user's profile and program enrollment from AWS AppSync. Based on this profile, a heavily typed `Strategy` object is instantiated on the server. This object contains a `terminology` dictionary, which is then injected into a global React context tree.

```typescript
// The Strategy Interface
export interface ProgramStrategy {
  terminology: {
    clientNoun: string;
    coreDocumentName: string;
    fmsProvider: string;
    // ... dozens of other terms
  };
  // Strategy also dictates feature flags
  features: ProgramFeatures; 
}
```

Now, the UI component knows nothing about SDP or SAR. It only knows about the Strategy.

```tsx
// The Right Way: Terminology via Strategy Context
const DocumentUploadModal = () => {
  const strategy = useProgramStrategy();
  
  return (
    <div>
      <h1>Upload {strategy.terminology.clientNoun} Document</h1>
      <p>Please attach the approved {strategy.terminology.coreDocumentName} to proceed.</p>
    </div>
  );
};
```

This strict abstraction prevents AI agents from hardcoding document nouns, localizing complexity to our core domain layer. We explicitly document this pattern in our `AGENTS.md` file so that AI agents inherently understand the abstraction before writing code. 

## Enforcing Purity at the ORM Layer

This strategy extends far beyond just React components. It goes all the way down to our DynamoDB models and our AWS AppSync schemas. As detailed in our post on [Strict ORM Builders](/2026-09-18-strict-orm-builders), we don't allow the database layer to care about terminology either. 

The backend stores generic entities. The DynamoDB table is called `CarePlans`, not `IPPs` or `PCPs`. The AppSync GraphQL API returns a `CarePlan` object. The backend operates entirely on abstract domain primitives. It is only at the very final layer—the Strategy hydration layer—that these abstract primitives are translated into the region-specific UI terms that the user actually sees.

## The Impact on AI and Maintenance

By abstracting terminology entirely, we achieved multiple massive wins:

1. **Mathematical Purity in UI**: Our React components are now completely deterministic. They render what the Strategy tells them to render. Adding a new Regional Center to our platform requires exactly zero changes to our React component library.
2. **AI Agent Constraints**: AI agents are no longer trusted to remember the nuances of California healthcare law. They are simply instructed to use the `strategy.terminology` object. This completely eliminated a whole class of AI hallucinations where agents would invent new terminology.
3. **White-Labeling Potential**: Because the entire application is driven by the Strategy pattern, we can easily white-label the software for other states (like New York or Texas) simply by creating a new `Strategy` implementation. The core UI and backend logic remains untouched.

Combatting terminology leakage is not just about keeping code clean; it's about respecting the highly sensitive domain of our users. By enforcing the Strategy pattern, we guarantee that every family experiences NeuroHub in the exact legal and programmatic language they are comfortable with, while keeping our codebase pristine.
