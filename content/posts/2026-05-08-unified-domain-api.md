---
title: "Bridging Git and Chat: Building a Unified Domain API for AI Swarms"
date: "2026-05-08"
author: "NeuroHub Engineering Team"
tags: ["Architecture", "BotHuddle", "API", "AI Agents", "Forgejo", "Zulip", "FastAPI"]
summary: "Why we stopped exposing raw Forgejo and Zulip REST endpoints to autonomous agents and built a unified FastAPI domain abstraction layer."
---

# Bridging Git and Chat: Building a Unified Domain API for AI Swarms

**Motivation:** In our initial multi-agent prototypes, we gave agents raw REST access to both our Forgejo Git server and our Zulip chat instance. The result was immediate architectural chaos. Agents would spend half their reasoning tokens wrestling with pagination cursors, OAuth header refreshes, and inconsistent JSON payloads. Worse, when an agent wanted to associate a Git commit with a discussion thread, it had to manually correlate unstructured text with commit hashes, frequently hallucinating nonexistent endpoints and corrupting issue metadata.

To solve this integration bottleneck, we built the **Unified Domain API** in Phase 3 of [The 14-Phase Roadmap](/2026-05-01-the-14-phase-roadmap)—a consolidated FastAPI service that unified the Git ledger and the chat communications bus behind a single, strongly-typed schema.

## The Problem: The Dual-Protocol Spaghetti

An enterprise hybrid workforce operates across two fundamental systems of record:
1. **The Asynchronous Ledger (Git/Forgejo):** Where code, pull requests, issues, architecture decision records, and wiki pages live.
2. **The Synchronous Communications Bus (Zulip):** Where human engineers and agents discuss tradeoffs, stream real-time alerts, and resolve blockers.

When agents interact directly with raw, un-abstracted REST APIs across these heterogeneous platforms, three major failure modes occur:

- **Protocol Impedance Mismatch:** Forgejo uses standard Git REST schemas (repositories, refs, commits, webhooks), while Zulip uses stream-and-topic message schemas. An agent trying to execute a feature had to make multiple interleaved HTTP requests across different ports, leading to partial failures if one call succeeded and the other timed out.
- **Token Inefficiency:** LLMs are penalized for processing verbose, boilerplate HTTP responses. Raw REST endpoints return deep JSON trees filled with metadata an agent never needs (gravatar URLs, internal timestamps, redundant user objects), consuming precious context window space.
- **Contract Drift and Hallucinations:** Small discrepancies in parameter names between endpoints caused LLMs to invent imaginary parameters, leading to 400 Bad Request errors and infinite retry loops.

## The Unified Architecture: FastAPI and Pydantic

Instead of allowing agents to speak raw HTTP to Forgejo and Zulip, BotHuddle introduced a centralized gateway API (`gateway-api/routers/unified.py`) powered by FastAPI and Pydantic:

```mermaid
flowchart LR
    Agent[Autonomous Agent / MCP] -->|Strongly-Typed Domain Calls| Unified[Unified Domain API (FastAPI)]
    Unified -->|REST / Git Hooks| Forgejo[Forgejo Git Ledger]
    Unified -->|Zulip Client API| Zulip[Zulip Communications Bus]
    Unified -->|SQLAlchemy| DB[(PostgreSQL / SQLite Metadata)]
```

Rather than thinking in raw database rows or external HTTP payloads, the Unified Domain API surfaces consolidated domain entities:
- **`UnifiedProject`:** Connects a Forgejo repository to its corresponding Zulip project streams (`proj-[slug]`), tracking active phases and status.
- **`UnifiedArtifact`:** Abstracts commits, PR diffs, and wiki documents into standardized markdown structures.
- **`UnifiedUser`:** Binds an agent's stable Zulip handle (e.g. `@bothuddle.inf.architect`) to its Git committer identity.

```python
# Simplified view from gateway-api/routers/unified.py
@router.post("/parse_tags", response_model=TagResolutionResponse)
def parse_smart_tags(req: TagParseRequest, db: Session = Depends(get_db)):
    """Resolves smart tags (#issue/12, @commit/abc) into concrete Forgejo/Zulip entities."""
    resolved_issues = resolve_forgejo_issues(req.raw_text, req.repo_id)
    resolved_commits = resolve_forgejo_commits(req.raw_text, req.repo_id)
    return TagResolutionResponse(issues=resolved_issues, commits=resolved_commits)
```

## Smart Tags: Turning Unstructured Chat into Concrete Ledger Objects

A major capability enabled by the Unified Domain API was **Smart Tag Parsing** (`/unified/parse_tags`). In multi-agent conversations, agents naturally mention tickets and revisions in plain text. The API parses standard prefixes:
- `#issue/[id]` dynamically resolves to the full Forgejo issue object, including its labels, milestone, and open comments.
- `@commit/[hash]` resolves to the verified Git commit diff, author, and associated tests.
- `@strategy/[slug]` resolves to the high-level roadmap document in `/.bothuddle/strategies/`.

By offloading the regex parsing, validation, and database lookups to the Python API layer, agents receive a clean, pre-hydrated JSON object. They no longer need to spend reasoning cycles querying multiple endpoints to find the context behind a commit hash.

## Idempotency and Dual-Commit Coordination

When an agent finishes a task, it must record evidence in both systems: post a summary message to Zulip and submit a commit or PR to Forgejo. 

The Unified Domain API provides atomic coordination endpoints like `/unified/dual_commit`. If an agent pushes code to an ephemeral branch, the API automatically generates the Zulip notification linking to the exact Forgejo commit URL, ensuring that the ledger and the communication channel never drift out of sync.

## The Foundation for the MCP Layer

The Unified Domain API was an essential prerequisite for our next architectural milestone. Once we had a consolidated, strongly-typed API bridging Git and chat, we didn't have to manually write dozens of custom Model Context Protocol tools. 

Instead, this clean domain surface allowed us to map standard tools directly into the JSON-RPC protocol, as we will explore in our next post on [The BotHuddle MCP Service: Standardized Interaction Primitives for Autonomous Swarms](/2026-05-15-auto-generated-mcp-layer).
