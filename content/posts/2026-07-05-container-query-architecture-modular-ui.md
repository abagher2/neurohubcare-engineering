---
title: "Container Query Architecture for Modular UI"
date: "2026-07-05"
slug: "container-query-architecture-modular-ui"
summary: "The promise of reusable UI components has always been hindered by their reliance on global viewport dimensions. In our latest clai..."
---
The promise of reusable UI components has always been hindered by their reliance on global viewport dimensions. In our latest claim origination system, we faced a scenario where a complex "Applicant Summary" component needed to render correctly in a massive fullscreen dashboard, a narrow sidebar, and a constrained modal dialog. Relying on standard CSS media queries (`@media`) resulted in a tangled mess of context-specific overrides.

### Escaping the Viewport Trap

Our AI coding assistant initially tried to solve this by passing explicit `layoutContext` props down the React tree (e.g., `<ApplicantSummary context="sidebar" />`). While this technically worked, it tightly coupled the component's internal rendering logic to its environment, destroying its true modularity. The AI failed to recognize that modern CSS capabilities had rendered this prop-drilling anti-pattern obsolete.

We pivoted entirely to a Container Query (`@container`) architecture. By defining structural containers, components can query their allocated real estate rather than the viewport.

### TypeScript and Tailwind Container Queries

To enforce this architecture at the type level, we built a custom wrapper around our components. We use React in conjunction with standard Zod schemas to validate the data, while the styling is strictly governed by container boundaries.

```typescript
import React from 'react';
import { z } from 'zod';
import clsx from 'clsx';

const ApplicantSchema = z.object({
  id: z.string(),
  creditScore: z.number(),
  debtToIncomeRatio: z.number(),
  status: z.enum(['Pending', 'Approved', 'Rejected'])
});
  // ... implementation details
      </div>
    </div>
  );
};
```

### Playwright Fixtures for Layout Testing

Testing these modular components requires verifying them across multiple container dimensions. When pairing with the AI agent to write tests, it initially wrote standard viewport resizing tests. We had to correct it, as viewport size doesn't guarantee container size.

We engineered custom Playwright fixtures that inject the component into dynamically resizing HTML wrappers. This ensures that the `@container` rules trigger correctly in isolation. By moving away from JS-based layout calculations and viewport queries, we achieved true "write once, place anywhere" modularity, significantly accelerating the delivery of our complex claim processing interfaces.