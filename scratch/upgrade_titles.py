import os
import re

title_upgrades = {
    "content/posts/2026-05-08-unified-domain-api.md": "Bridging Git and Chat: Building a Unified Domain API for AI Swarms",
    "content/posts/2026-05-15-auto-generated-mcp-layer.md": "Auto-Generating Model Context Protocol (MCP) Surfaces from Live Schemas",
    "content/posts/2026-05-22-lmsr-prediction-economy.md": "Silicon Units & Prediction Markets: How We Forced AI Agents to Pay for Compute",
    "content/posts/2026-05-29-1-second-mcp-pull.md": "The 1-Second Context Boundary: Turbocharging Local Tool Discovery for LLMs",
    "content/posts/2026-06-05-the-planning-matrix.md": "The Planning Matrix: How We Stopped 50 Autonomous Agents From Colliding in Git",
    "content/posts/2026-06-12-semantic-identity-gaid.md": "Why UUIDs Break AI Agents: Designing the Global Agent ID (GAID)",
    "content/posts/2026-06-19-ephemeral-zulip-spaces.md": "Ephemeral Workspaces: Why We Give AI Agents 7-Day Disposable Chat Streams",
    "content/posts/2026-06-24-llm-as-a-judge-in-ci.md": "Beyond String Assertions: Running an LLM-as-a-Judge Directly in CI",
    "content/posts/2026-06-26-semantic-discovery-engine.md": "Killing pgvector: Why We Built an In-Memory Semantic Engine with Orama",
    "content/posts/2026-06-28-autonomous-rollbacks.md": "Zero-Human Rollbacks: When the LLM Judge Flags a Critical UI Regression",
    "content/posts/2026-07-24-the-190k-line-balloon.md": "The 190,000-Line Balloon: The Terrifying Velocity of Autonomous Code Generation",
    "content/posts/2026-07-31-god-components-return.md": "The Return of the God Component: What Happens When AI Agents Write 190k Lines of React",
    "content/posts/2026-09-02-building-the-compliance-engine.md": "No Database Rules, No ASTs: Why We Version Healthcare Law in Pure TypeScript",
    "content/posts/2026-09-04-code-documentation-as-system-prompt.md": "Executable Documentation: Turning AGENTS.md Into the Ultimate System Prompt",
    "content/posts/2026-09-18-strict-orm-builders.md": "Banning JSON.parse(): How Strict ORM Builders Stopped Hallucinated DB Mutations"
}

for filepath, new_title in title_upgrades.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()
    
    # Replace title in frontmatter
    content = re.sub(r'^title:\s*".*?"', f'title: "{new_title}"', content, flags=re.MULTILINE)
    # Replace first H1 if present
    content = re.sub(r'^#\s+.*?\n', f'# {new_title}\n', content, count=1, flags=re.MULTILINE)
    
    with open(filepath, "w") as f:
        f.write(content)

print(f"Upgraded {len(title_upgrades)} titles for maximum engineering punch and authority.")
