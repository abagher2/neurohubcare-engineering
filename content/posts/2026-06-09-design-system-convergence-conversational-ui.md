---
title: "Design System Convergence: Unifying Conversational and Wizard Runtimes"
date: "2026-06-09"
slug: "2026-06-09-design-system-convergence-conversational-ui"
summary: "We recognized that our Playbook Interview wizard and Assistant sidebar looked like two different apps, prompting a major design token unification."
tags: ["UI", "Frontend"]
---

By late August, our core operational plumbing was functioning reliably. However, comprehensive user experience reviews revealed a glaring visual and architectural inconsistency: our guided intake wizard and our conversational assistant sidebar felt like two entirely separate software products forced onto the same screen.

The intake wizard, originally architected as a standalone full-page questionnaire for document intake wizard flows and provider onboarding, retained legacy layout structures characterized by disparate border treatments, mismatched typography scales, and idiosyncratic action buttons. In contrast, the sliding assistant sidebar featured our modern design language: clean slate neutrals, subtle elevations, and cohesive brand accents. When power users transitioned from querying the assistant to advancing through structured intake steps, the jarring aesthetic contrast created cognitive fatigue and undermined the feeling of a polished, desktop-class platform.

### Standardizing Design Tokens

In mission-critical enterprise applications, design inconsistency is more than aesthetic—it creates usability friction and degrades user trust. We launched a focused architectural initiative to achieve complete design system convergence across both runtimes. 

### Decomposing Compound Primitives

We decomposed our interface patterns into domain-neutral compound primitives: shared message threads, responsive choice selectors, standardized typing indicators, and drawer containers. We stripped these components of local, hardcoded styles and bound them strictly to centralized design tokens managed via CSS variables. 

```typescript
import React from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

// 1. Zod Enums for Strict Variant Validation
import { z } from 'zod';
export const ButtonVariantSchema = z.enum(['primary', 'secondary', 'ghost', 'danger']);
export type ButtonVariant = z.infer<typeof ButtonVariantSchema>;

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

// 2. Converged Component sharing CSS Custom Properties
export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={clsx(
        styles.base,
        styles[variant],
        { [styles.loading]: isLoading },
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : null}
      <span className={styles.content}>{children}</span>
    </button>
  );
};
```

```css
/* global.css - CSS Custom Properties replacing CSS-in-JS */
:root {
  --color-primary-500: #4f46e5;
  --color-surface-elevated: rgba(255, 255, 255, 0.8);
  --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --radius-md: 0.375rem;
  --spring-duration: 300ms;
  --spring-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.base {
  border-radius: var(--radius-md);
  transition: all var(--spring-duration) var(--spring-easing);
  /* other base styles */
}
```

We synchronized interactive states—aligning micro-interactions, spring physics, and focus rings—while locking typography hierarchies to unified scale constants. Consolidating these disparate implementations eliminated over 1,200 lines of fragmented CSS and established behavioral continuity across all user touchpoints, ensuring that exploratory chat and structured workflow execution share a seamless visual grammar.
