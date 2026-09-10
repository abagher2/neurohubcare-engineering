---
title: "The Unified UI Dashboard: A Single Pane of Glass for Autonomous Fleets"
date: "2026-07-03"
slug: "unified-ui-dashboard"
summary: "Providing human operators a single pane of glass into the autonomous fleet with React, WebSockets, and LMSR visualization."
tags: ["UI", "Dashboard", "BotHuddle", "React", "WebSockets"]
---

As we closed out Phase 10 of BotHuddle, we finalized the Unified UI Dashboard. This provided human operators a single pane of glass, combining Zulip chat, Forgejo wikis, and active LMSR (Logarithmic Market Scoring Rule) market probabilities. For the first time, we could visibly monitor the entire autonomous fleet predicting, planning, and executing across the matrix.

## The Architectural Challenge

The core challenge in building the Unified UI Dashboard was not just displaying data, but orchestrating real-time streams from a highly decoupled, asynchronous multi-agent system. BotHuddle operates on a series of independent event loops, where agents broadcast intents, bids, and execution states via an event bus (backed by Kafka).

Our frontend architecture needed to aggregate these streams without overwhelming the client's browser or introducing massive latency. We considered several approaches:

### Alternative 1: Polling REST APIs (Rejected)
Initially, we explored a standard React SPA polling a unified GraphQL endpoint every 5 seconds. This was quickly rejected because the LMSR prediction markets require millisecond precision. When agents rapidly adjust their probabilities on a planning matrix, the UI must reflect those volatile swings instantly to allow human operator intervention.

### Alternative 2: Server-Sent Events (SSE) (Rejected)
SSE provided the unidirectional flow we needed from the fleet to the dashboard, but lacked the bidirectional capability required for human operators to inject direct commands or override agent bids without opening separate HTTP connections.

### Chosen Approach: WebSocket Multiplexing with RxJS
We settled on a persistent WebSocket connection multiplexed through an RxJS observable layer in the frontend. This allowed us to treat the entire BotHuddle fleet as a single, reactive data stream.

```mermaid
architecture-beta
    group client(Client)[Human Operator Dashboard]
    group gateway(API Gateway)[WebSocket Gateway]
    group fleet(BotHuddle Fleet)[Autonomous Agents]

    service dashboard(React SPA)[Zulip / Forgejo / LMSR Views] in client
    service ws(WebSocket Server)[Node.js / Socket.io] in gateway
    service kafka(Kafka Event Bus)[Event Streaming] in gateway
    service agents(Agent Nodes)[Python / LangChain] in fleet

    dashboard:R -- L:ws
    ws:R -- L:kafka
    kafka:R -- L:agents
```

## Deep Dive: The LMSR Visualization Component

Visualizing a Logarithmic Market Scoring Rule (LMSR) requires rendering continuous probability distributions that shift based on agent wagers. The state of the market is defined by the cost function:

$C(q) = b \cdot \ln\left(\sum_{i} e^{q_i / b}ight)$

Where $q_i$ is the number of shares for outcome $i$, and $b$ is the liquidity parameter. The marginal price (probability) of outcome $i$ is the derivative:

$p_i = rac{e^{q_i / b}}{\sum_{j} e^{q_j / b}}$

To render this without jank, we built a custom WebGL-accelerated React component.

```tsx
import React, { useEffect, useRef } from 'react';
import { useObservable } from 'rxjs-hooks';
import { marketStream$ } from '@/lib/streams/market';
import * as THREE from 'three';

interface MarketData {
    timestamp: number;
    probabilities: Record<string, number>;
    liquidityParam: number;
}

export const LMSRVisualizer: React.FC<{ marketId: string }> = ({ marketId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const data = useObservable(() => marketStream$(marketId));

    useEffect(() => {
        if (!canvasRef.current || !data) return;
        // WebGL initialization and rendering logic
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
        
        // Render probabilities as a dynamic topological surface
        // ... (complex WebGL rendering logic omitted for brevity)
        
        renderer.render(scene, camera);
    }, [data]);

    return (
        <div className="lmsr-container bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="text-slate-200 font-semibold mb-2">Market {marketId} Probabilities</h3>
            <canvas ref={canvasRef} width={400} height={300} className="w-full h-full" />
        </div>
    );
};
```

This Unified UI was a triumph. We felt like we finally had our arms around the complexity of a 50+ agent fleet. But as we would soon discover, the cost of running this massive infrastructure was quietly draining our runway.
