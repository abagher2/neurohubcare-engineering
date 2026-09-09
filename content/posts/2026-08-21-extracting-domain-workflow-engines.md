---
title: "Extracting Domain Workflow Engines"
date: "2026-08-21"
slug: "extracting-domain-workflow-engines"
summary: "Following our harrowing escape from the God Component, we realized a critical truth: UI frameworks are e..."
---
# Extracting Domain Workflow Engines

Following our harrowing escape from the God Component, we realized a critical truth: UI frameworks are exceptional at rendering views, but they are terrible at managing complex, long-running business processes. This realization led to our most ambitious architectural shift yet: extracting our core business logic into dedicated Domain Workflow Engines.

In our logistics routing product, a single "Delivery Run" involves dozens of async steps: validating driver availability, calculating optimal routes via third-party APIs, securing warehouse docks, and dispatching notifications. Historically, this flow was orchestrated by a monolithic Express controller that relied on nested callbacks and database flags to track progress.

We opted to build a centralized, typed State Machine that orchestrates the Directed Acyclic Graph (DAG) of the delivery run. We used an Event Sourcing pattern, where the workflow engine emits domain events, and pure reducer functions compute the current state.

```typescript
import { z } from 'zod';

export const DomainEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('RUN_STARTED'), runId: z.string() }),
  z.object({ type: z.literal('DRIVER_ASSIGNED'), driverId: z.string() }),
  z.object({ type: z.literal('ROUTE_CALCULATED'), waypoints: z.array(z.string()) })
]);

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export interface WorkflowState {
  status: 'PENDING' | 'ROUTING' | 'DISPATCHED' | 'FAILED';
  assignedDriver: string | null;
  routeCalculated: boolean;
}

export function workflowReducer(state: WorkflowState, event: DomainEvent): WorkflowState {
  switch (event.type) {
    case 'RUN_STARTED':
      return { ...state, status: 'PENDING' };
    case 'DRIVER_ASSIGNED':
      return { ...state, assignedDriver: event.driverId };
    case 'ROUTE_CALCULATED':
      return { ...state, routeCalculated: true, status: 'ROUTING' };
    default:
      return state;
  }
}
```

The workflow engine itself is a generic orchestrator that reads step configurations and handles retries, timeouts, and dead-letter queues. We utilized Zod extensively to validate incoming event payloads before they reach the reducers, ensuring that poison pills can't corrupt the workflow state.

```typescript
export class DomainWorkflowEngine<TState, TEvent> {
  private state: TState;
  
  constructor(
    initialState: TState,
    private reducer: (state: TState, event: TEvent) => TState
  ) {
    this.state = initialState;
  }

  public dispatch(rawEvent: unknown): void {
    // Validate schema at the boundary
    const validatedEvent = DomainEventSchema.parse(rawEvent) as unknown as TEvent;
    
    // Compute new state
    this.state = this.reducer(this.state, validatedEvent);
    
    // Trigger side-effects based on new state DAG
    this.evaluateNextSteps();
  }

  private evaluateNextSteps() {
    // Logic to transition the state machine and invoke external services
  }
}
```

The AI agent proved invaluable in writing the exhaustive unit tests for the `workflowReducer`. By isolating the state transitions from the execution of side effects, we achieved a 100% test coverage on our core business logic without mocking a single API. Extracting the Domain Workflow Engine didn't just clean up our codebase; it gave product managers an auditable, deterministic map of our most critical business processes.