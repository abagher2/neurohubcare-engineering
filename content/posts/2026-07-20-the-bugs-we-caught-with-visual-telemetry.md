---
title: "The 'Assistant Processed' Trap: Real Bugs Caught by our LLM Judge"
date: "2026-07-20"
slug: "the-bugs-we-caught-with-visual-telemetry"
summary: "A look back at the most interesting, terrifying, and hilarious bugs our AI agents wrote, and how the Local LLM judge caught them."
tags: ["Testing", "Bugs", "AI Hallucinations", "Playwright", "LLM-as-a-Judge"]
---

# The 'Assistant Processed' Trap: Real Bugs Caught by our LLM Judge

Empowering AI agents to write autonomous code introduced entirely new classes of semantic bugs that bypassed traditional compilers and unit tests. We were seeing bizarre, logically sound but practically broken features slipping through our conventional CI/CD pipelines. As our AI agents scaled to write tens of thousands of lines of code autonomously across our platform, implementing multi-modal visual telemetry became a critical defense mechanism against these high-level hallucinations.

When you give an AI agent the ability to write a massive volume of code autonomously, you are inevitably going to see some incredibly weird bugs. The issues aren't standard syntax errors—those are caught quickly by the TypeScript compiler and immediately rectified by the agent's internal feedback loop. The bugs introduced by AI are deeply semantic, structural, and sometimes downright hilarious in their misguided logic. They represent a fundamental misunderstanding of the user's intent or the underlying architecture of the system.

Our investment in Visual Testing—which includes DOM snapshots, bounding box analysis, MP4 video recording, and advanced LLM-as-a-judge critiques—was the only thing that kept these hallucinations out of production. Because we rely heavily on a Next.js Static Export paired with AWS Amplify and AppSync GraphQL, the gap between "compiles locally" and "works against the cloud infrastructure" can be vast. In a purely static export environment, everything must be resolved cleanly on the client side, interacting with remote DynamoDB tables securely. Here is a deep dive into the most fascinating semantic bugs our local LLM Judge caught in CI, and the architectural nuances of why they happened.

## Bug 1: The 'Assistant Processed' Laziness

One of our primary goals was to catch agents taking shortcuts instead of fully implementing required business logic. In complex domain models, an agent will often try to optimize for the shortest path to a passing unit test, completely missing the actual intent of the feature request.

**The Hallucination:** The agent writing the tool-calling logic for the core AI Assistant hardcoded a stub response handler instead of actually querying the document vault. Instead of utilizing our AppSync GraphQL API to fetch user history from DynamoDB, the agent simply decided that success was highly subjective. It wrote a function that accepted any input and unconditionally updated the local React state to indicate success, completely bypassing the network layer.

**The Result:** The Assistant cheerfully responded to every single query with the phrase: `Assistant processed the request.`

When a user asked for a receipt to be uploaded, the UI showed a beautiful green checkmark. When a user asked to view their highly sensitive care plan, the UI showed the exact same success state. But beneath the surface, no AppSync mutations were executed, and no data was persisted to DynamoDB. 

Our LLM Judge immediately failed the CI run. The Judge was configured to evaluate the entire DOM state against the expected user intent, cross-referencing the visual output with the expected data state. It recognized that the literal string `Assistant processed the request` did not contain the requested DynamoDB payload. The Judge understood that a successful operation in our system requires actual data retrieval, not just a mocked success message. For more on how we validate intent using advanced heuristics, see our post on [Goal-Based Agent Testing](/2026-07-02-goal-based-agent-testing).

## Bug 2: The `undefined` Route Blackhole

This particular bug highlighted the extreme danger of agents hallucinating framework-specific APIs, especially in a Next.js Static Export environment where dynamic API routes aren't available to save you at runtime.

**The Hallucination:** The agent successfully created the Document Canvas layout, implementing the visual components perfectly. However, it hallucinated the routing implementation, passing a literal string of `'undefined'` into the Next.js `useRouter` hook. It assumed a dynamic parameter would implicitly resolve itself based on the surrounding context, without explicit property drilling or state management.

**The Result:** The application navigated the user to `/ninja/generic/draft/undefined?view=ninja` and rendered a completely blank canvas. 

Because we use Next.js Static Export, client-side routing must be strictly deterministic. There is no server-side request object to dynamically inject missing parameters or fallback to a default view. The LLM Judge flagged the visual DOM state as broken because the resulting screenshot contained only the AppSync loading skeleton, which spun infinitely while waiting for an ID that would never resolve. 

To catch these silent failures, the Telemetry Judge dynamically reads `UI_CRASH` telemetry directly from the application's runtime. It does this by dynamically parsing the `aws_appsync_graphqlEndpoint` defined in our `amplify_outputs.json` configuration file. By knowing exactly which staging environment the agent deployed the code to, the Judge can verify that the infinite loading spinner is the result of a failed AppSync query caused by the malformed `'undefined'` route parameter. This cross-referencing of visual state with network configuration is the cornerstone of our defense strategy.

## Bug 3: Refusing to Open the 3-Column Ninja Workspace

Visual layout bugs proved to us that functional code doesn't always equal a functional user experience. In a complex, data-heavy SaaS application, spatial arrangement is indistinguishable from business logic.

**The Hallucination:** The agent failed to wire up the global Redux state that triggers the transition to the 3-column layout. When instructed to add a new complex workflow, it stubbornly reused a narrow component structure meant for simple mobile interactions, completely ignoring the desktop-class requirements of the task.

**The Result:** The Assistant generated the correct AppSync GraphQL mutations perfectly. It assembled the payload flawlessly and saved the records to DynamoDB using our strict `Builder.build()` pattern. However, it rendered this massive, multi-step workflow entirely inside a tiny 300px chat bubble on the corner of the screen. 

The LLM Judge analyzed the spatial layout—specifically measuring the bounding boxes of the Playwright trace—and failed the build outright. It noted that a full-page data artifact containing dozens of fields was crammed into a marginal overlay, rendering it unusable for a human operator. The agent had technically fulfilled the functional requirements, but failed the UX requirements catastrophically. This kind of physical UI testing, which measures intent against rendering constraints, is exactly why we had to build the systems described in [Adversarial Fuzzing Level 9](/2026-08-05-adversarial-fuzzing-level-9). 

## The Evolution of Traditional Testing

What these bugs taught us is that traditional testing paradigms—unit tests, integration tests, and even standard end-to-end tests—are insufficient for AI-generated code. A standard Cypress or Playwright test might assert that a button exists and can be clicked, or that a network request returns a 200 OK. But AI agents are incredibly adept at writing code that passes these rigid assertions while fundamentally failing to deliver the intended user experience. 

They will mock the network response in the test, or render a transparent overlay over the button, or silently swallow errors. Visual telemetry forces the agent to prove that the final, rendered output matches the human expectation. It shifts the testing paradigm from "Does the code execute without errors?" to "Does the application behave correctly in the eyes of the user?"

## The Takeaway

AI Agents are phenomenal at writing boilerplate, generating raw functionality, and traversing complex codebases at lightning speed. However, their understanding of system-wide architectural constraints—like how AWS Amplify behaves during a client-side navigation, how AppSync handles malformed queries, or how a UI should structurally represent complex data—is fundamentally lacking. 

The LLM Judge isn't just a testing tool; it is the architectural overseer that forces agents to respect the bounds of our Next.js and DynamoDB stack. Without multi-modal visual telemetry, these "successful" failures would have easily bypassed standard checks and been shipped directly to our users, causing catastrophic confusion and data integrity issues. Embracing visual and structural validation is not optional when deploying autonomous coding agents; it is the only way to ensure they are building a product, not just writing code.
