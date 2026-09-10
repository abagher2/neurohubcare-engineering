import os
import re

files = [
    "2026-05-15-auto-generated-mcp-layer.md",
    "2026-06-12-semantic-identity-gaid.md",
    "2026-06-26-semantic-discovery-engine.md",
    "2026-07-03-unified-ui-dashboard.md",
    "2026-07-15-visual-testing-and-local-llm-migration.md",
    "2026-07-31-god-components-return.md",
    "2026-08-12-telemetry-judge-and-appsync.md",
    "2026-08-21-deep-links-resumption-ui.md",
    "2026-09-02-building-the-compliance-engine.md",
    "2026-09-18-strict-orm-builders.md"
]

contexts = {
    "2026-05-15-auto-generated-mcp-layer.md": "As we scaled BotHuddle, our agents were spending way too much context-window memory trying to understand the API surfaces of our internal tools. We needed a way to auto-generate the Model Context Protocol (MCP) layer so the agents could instantly discover and call functions without hallucinating endpoints.",
    "2026-06-12-semantic-identity-gaid.md": "Traditional UUIDs are meaningless to an LLM. When an agent saw `user_123`, it had no idea if that was a Coordinator, a Client, or a dependent. We were wasting tokens explicitly explaining role constraints. We needed a Global AI Identifier (GAID) that embedded semantic identity directly into the primary key.",
    "2026-06-26-semantic-discovery-engine.md": "Our early attempts at RAG used Vertex AI and Postgres `pgvector`. It worked, but it was costing us hundreds of dollars a month just to run basic test suites. We needed a way to run a semantic discovery engine locally during CI/CD to save costs without sacrificing search quality.",
    "2026-07-03-unified-ui-dashboard.md": "Regional Centers in California have completely different terminology. Some use 'Invoices', others use 'Receipts'. Building separate UI dashboards for each region was unmaintainable. We needed a unified dashboard that dynamically adapted terminology without creating spaghetti code.",
    "2026-07-15-visual-testing-and-local-llm-migration.md": "Our agents were writing code, but we couldn't blindly trust them. We built visual regression testing using Gemini to act as an LLM Judge. But running Gemini Vision on every CI pipeline was costing over $100 a day. We had to pivot to local quantized LLMs, which meant solving massive VRAM bottlenecks.",
    "2026-07-31-god-components-return.md": "One of the most terrifying side-effects of letting autonomous agents write React is their tendency to create 'God Components'. If an agent couldn't figure out where a piece of state belonged, it would just hoist it to the top level, creating massive, 5000-line monolithic files that destroyed performance.",
    "2026-08-12-telemetry-judge-and-appsync.md": "Evaluating UI tests with an LLM was too slow. We needed a way for the LLM Judge to instantly know when a React component crashed without having to wait for the Playwright timeout. We wired up an AppSync GraphQL subscription to pipe Redux telemetry directly into the Judge's context.",
    "2026-08-21-deep-links-resumption-ui.md": "When an agent-driven workflow encountered a missing piece of data (like a missing provider tax ID), it would just fail. We needed a resumption UI where the agent could pause, send a deep link to the user, and immediately resume execution once the user filled out the form.",
    "2026-09-02-building-the-compliance-engine.md": "In healthcare compliance, writing `if/else` statements sprinkled throughout React components is a recipe for legal liability. We needed a strict, pure-TypeScript compliance engine that isolated federal, state, and regional laws into immutable, versioned objects for historical auditing.",
    "2026-09-18-strict-orm-builders.md": "AI agents love to bypass constructors and mutate objects directly using `JSON.parse()`. This led to invalid database states that bypassed our compliance checks entirely. We had to lock down the entire architecture using strict ORM Builders that enforced schema validation at compile time."
}

POSTS_DIR = "content/posts"

for file in files:
    filepath = os.path.join(POSTS_DIR, file)
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Inject context after frontmatter
    if "*Previously in this series:" in content:
        # Inject after the previously line
        parts = content.split("---", 3) # could be multiple
        
        # Safer regex replacement: find first # Heading and inject before it
        new_content = re.sub(r'(#\s+.*?\n)', r'\1\n> **The Motivation:** ' + contexts[file] + r'\n\n', content, count=1)
        
        with open(filepath, 'w') as f:
            f.write(new_content)

print("Injected motivation into remaining 10 files.")
