---
title: "Encoding Domain Law: Strict Rubrics for the LLM Judge"
date: "2026-08-10"
slug: "llm-judge-rubrics-for-sdp"
summary: "How we encode real-world California Regional Center laws into the LLM Judge's grading rubric for autonomous validation."
tags: ["Testing", "LLM-as-a-Judge", "Compliance"]
---
# Encoding Domain Law: Strict Rubrics for the LLM Judge

Validating software against complex, localized California Regional Center laws has historically been a manual, error-prone nightmare. Our Quality Assurance team spent countless hours reading through dense PDF regulations, comparing them against our staging environments, and manually verifying that every single edge case in our Next.js UI complied with the latest legal requirements. This manual verification created a massive bottleneck in our release cycle and left us vulnerable to critical compliance failures in production. It quickly became apparent that traditional assertion-based testing—simply checking if a DOM element exists or if an AppSync mutation succeeds—was wholly inadequate for evaluating contextual compliance issues within a dynamic application handling highly sensitive financial and healthcare workflows. 

We needed a system that could "understand" the law and apply it to the software, evaluating our application's behavior against a strict set of domain-specific criteria. This led us to pioneer an LLM-as-a-Judge architecture running directly in our Continuous Integration pipeline. However, we learned very early on that an LLM-as-a-Judge is only as good as the rubric it uses to evaluate the UI. Generic prompts produced flaky results, and without strict boundaries, the LLM would occasionally hallucinate interpretations of the law, passing builds that should have failed and failing builds that were perfectly legal. To solve our QA bottleneck and guarantee compliance, we had to encode literal California Regional Center laws directly into our testing scripts, providing our LLM Judge with the explicit, unambiguous legal framework necessary to evaluate our frontend application automatically.

## The Staggering Complexity of Regional Center Law

The core challenge lay in the sheer variability of state and regional regulations. The Self-Determination Program (SDP) in California is governed by Title 17, but each of the 21 regional centers interprets and enforces these guidelines slightly differently. A parent seeking a reimbursement for physical therapy under the SDP in the San Diego Regional Center might face completely different documentation requirements, authorization caps, and service codes than a parent in the Golden Gate Regional Center. 

Capturing these myriad rules in standard conditional logic (e.g., `if (regionalCenter === 'SDRC' && serviceType === 'PT') { ... }`) was a recipe for unmaintainable spaghetti code that would inevitably drift from actual policy. The combinatorial explosion of test cases was unmanageable. We needed a system capable of semantic reasoning to evaluate the user's intent and the system's response, but that reasoning had to be bounded strictly by documented law. This approach is a core pillar of our broader strategy, which we detail extensively in [Building the Compliance Engine](/2026-09-02-building-the-compliance-engine).

We chose to leverage a localized LLM-as-a-Judge. The breakthrough came when we stopped asking the LLM to simply "check for errors in the reimbursement flow" and instead provided it with a meticulously structured rubric derived directly from legislative text, program guidelines, and internal policy documents.

## Constructing the "Zero Balance" Rubric

To illustrate this, consider the "Zero Balance" requirement. For the Traditional Reimbursement model, a parent must provide strict proof of a zero balance out-of-pocket before funds can be disbursed. It is absolutely not enough to just upload an invoice showing the cost of the service; there must be definitive proof that the vendor has been paid in full by the family. This could be a cleared check, a stamped receipt indicating "Paid in Full," or a screenshot of a digital transaction matched to the invoice.

Our CI pipeline uses Playwright to navigate the Next.js static export frontend. For this specific test, Playwright simulates a user uploading various forms of documentation. Before the final submission is allowed, Playwright takes a `fullPage: true` screenshot of the review step. This screenshot, along with the simulated DynamoDB state and the user's uploaded document, is passed to the LLM Judge. But the critical component is the prompt, which is an explicit, law-encoded rubric:

> *Evaluate proof of zero balance enforcement per CA Title 17, Section 54326. The user is attempting to submit a Traditional Reimbursement. Verify the system dynamically adds steps to guide the user on how to obtain and upload this legally required "Proof of Zero Balance". Reject the submission if the uploaded document does not unambiguously indicate a zero remaining balance. Acceptable forms of proof include: a receipt explicitly stating "Paid in Full", a receipt showing a $0.00 balance due, or a matched financial ledger entry (e.g., Venmo screenshot, bank statement) that corresponds exactly to the invoice total and date. Do not accept an invoice alone. Do not infer payment without explicit documentation.*

By framing the prompt around the literal legal requirement and providing exhaustive, explicit examples of what constitutes valid proof, we drastically reduced hallucinations and false positives. If the generated UI state doesn't append the required proof, or if the user uploaded a document that the LLM correctly identifies as an unpaid invoice, the LLM Judge fails the build, outputting a structured JSON response detailing exactly which clause of the rubric was violated.

## Handling Edge Cases and Ambiguity deterministically

The real world is messy, and user-uploaded documents are often imperfect. Users upload blurry photos, receipts with missing dates, hand-written notes from independent facilitators, or invoices that only show a partial payment. The LLM Judge must navigate these edge cases reliably without requiring a human to intervene on every CI run.

We refined our rubrics to instruct the LLM on exactly how to handle ambiguity, turning subjective human judgment into deterministic automated rules. 

If a date on a receipt is completely unreadable due to blurriness, the rubric dictates a failure with a specific error code mapping to a user-facing tooltip ("Document date illegible"). If the total amount paid matches the invoice total, but the explicit words "Zero Balance" are absent (a common occurrence with independent therapists using custom billing software), the rubric allows the LLM to use semantic reasoning to infer compliance, provided the arithmetic checks out perfectly. 

```javascript
// A snippet of our Judge configuration payload passed to the evaluator
const evaluationRequest = {
  task: "Verify Zero Balance Compliance",
  context: {
    serviceCode: "048",
    regionalCenter: "SDRC",
    amountClaimed: 150.00
  },
  screenshot_base64: pageImage,
  document_base64: uploadedReceiptImage,
  rubric: Title17_ZeroBalanceRubric,
  strictMode: true 
};
```

This strict rubric approach transformed our QA pipeline into an automated compliance auditor. We are no longer just testing if the JavaScript code executes without throwing an exception; we are continuously validating that our software operates legally within the complex landscape of California's developmental services system. 

## The Architectural Integration

To make this work seamlessly, the integration between the testing framework, the LLM, and our AWS infrastructure had to be flawless. Playwright drives the Next.js application, which communicates with our staging AWS AppSync endpoints. When the LLM Judge evaluates a state, it isn't just looking at the UI; it cross-references the intended action with the resulting DynamoDB state. 

If the LLM determines that a receipt is valid according to the rubric, it then asserts that the corresponding AppSync mutation (`createReimbursementClaim`) was executed with the correct payload and that the resulting DynamoDB record reflects the "PENDING_APPROVAL" status, rather than "DRAFT" or "REJECTED". This dual-layer verification—visual compliance plus data integrity—ensures that our backend and frontend remain perfectly synchronized with the law.

This level of automated rigor has allowed us to ship features faster and with significantly higher confidence. We can refactor complex reimbursement wizards or update policy logic without the fear of accidentally violating a regional center mandate. We continue to explore the limits of this methodology in [Compliance Auditor Testing](/2026-08-26-compliance-auditor-testing), pushing the boundaries of what autonomous QA can achieve.

## Conclusion

Encoding domain law into LLM rubrics is not merely a novel testing strategy; it represents a fundamental shift in how we guarantee regulatory compliance in software engineering. By bridging the gap between dense legal text and automated UI assertions, we've built a robust, scalable system that protects both our users and our platform. The key to this success is not the underlying LLM itself, but the strict, unambiguous prompts and rubrics that leave no room for creative interpretation of the law. This ensures that our Next.js UI and AppSync backend remain perfectly, demonstrably aligned with regional center mandates at all times.
