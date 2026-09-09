---
title: "Agentic CI/CD: Self-Healing E2E Tests via Narrative Feedback"
date: "2026-08-30"
slug: "2026-08-30-self-healing-e2e-tests-narrative-feedback"
summary: "How we eliminated Playwright maintenance overhead by building an agent fleet that updates broken tests using plain-English narrative feedback."
tags: ["Testing", "Agents", "Playwright", "CI/CD"]
---

### The Burden of E2E Maintenance

Our application relies heavily on dynamic, polymorphic React UIs and complex state transitions. While Playwright is incredible for automating our reimbursement and compliance workflows, the maintenance cost is traditionally massive. Whenever our design system converges or we refactor a Document Intake Wizard, DOM structures change, locators break, and the CI pipeline turns red. 

For most teams, fixing E2E tests is a manual, tedious chore. For an AI-native engineering team, it’s a process meant to be automated.

### The Agent Fleet and Narrative Feedback

Instead of manually digging into the DOM to update broken `page.locator()` calls, we integrated our testing pipeline directly with our internal **Agent Fleet**.

When a developer refactors a component and breaks a test, they don't rewrite the test. Instead, they provide **Narrative Feedback**—a plain-English description of the architectural or visual change. For example: *"We moved the receipt upload dropzone inside the new Glassmorphism sidebar, and the submit button now requires the 'terms accepted' checkbox to be checked first."*

The Agent Fleet takes over from there:

1. **Ingestion**: The agent reads the Playwright trace, the failing test execution log, and the developer's Narrative Feedback.
2. **Contextual Reasoning**: Powered entirely by Gemini Flash, the agent understands that the previous `.toContainText()` assertion failed because the DOM hierarchy was restructured.
3. **Autonomous Refactoring**: The agent rewrites the Playwright test file to match the new user journey (e.g., adding the `page.check('#terms')` step).

```typescript
// Example: How our Agent Fleet interprets Narrative Feedback
export async function healBrokenTest(
  testFileContent: string, 
  errorLog: string, 
  narrativeFeedback: string
) {
  const prompt = `
    You are an expert SDET Agent. A Playwright test has failed.
    
    [NARRATIVE FEEDBACK FROM DEVELOPER]
    ${narrativeFeedback}
    
    [ERROR LOG]
    ${errorLog}
    
    [CURRENT TEST FILE]
    ${testFileContent}
    
    Rewrite the test file to align with the narrative feedback and resolve the error. 
    Ensure you rely on robust semantic locators (e.g., getByRole) rather than brittle CSS paths.
  `;

  // We rely entirely on Gemini Flash for this due to its ultra-fast 
  // execution and massive context window, perfect for ingesting raw code.
  const response = await generateText({
    model: 'gemini-1.5-flash',
    prompt,
  });

  return extractCodeFences(response.text);
}
```

### The Power of Gemini Flash

A key architectural decision was standardizing on **Gemini Flash** for all agentic workflows, including this self-healing test loop. 

While speculative routing to heavier models (like Gemini Pro) makes sense in some ecosystems, we found that Flash is remarkably capable of handling both our production document ingestion and our internal CI/CD agents. By using Flash for everything, we keep execution speeds blindingly fast and infrastructure costs incredibly low, allowing our Agent Fleet to run continuously across dozens of PRs simultaneously without hitting budget constraints.
