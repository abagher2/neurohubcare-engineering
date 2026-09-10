import re

file_path = "content/posts/2026-05-22-lmsr-prediction-economy.md"
with open(file_path, "r") as f:
    content = f.read()

# Replace or insert a dedicated section explaining the alignment between token costs, prediction market, and budget planning
token_economy_section = """
## The Triad: Aligning Token Costs, Prediction Markets, and Budget Planning

The most groundbreaking aspect of BotHuddle was not merely that agents traded virtual shares, but how we mathematically aligned three disparate constraints into a single, self-regulating equilibrium:

1. **Physical Token Costs (Micro-Economics):** Every inference call to Gemini or Claude costs real dollars in input/output tokens. Unbounded autonomous loops rapidly hemorrhage money on trivial tasks.
2. **The LMSR Prediction Market (Consensus & Risk):** An automated market maker pricing the subjective probability of success for competing implementation proposals.
3. **Project Budget Planning (Macro-Economics):** The overall development sprint budget, where engineering leads allocate token allowances across epics and features.

```
       [ Project Sprint Budget (Macro) ]
                      │
                      ▼ (Liquidity Parameter b)
     ┌──────────────────────────────────┐
     │   LMSR Prediction Market Pool    │
     └────────────────┬─────────────────┘
                      ▲
         Wager Stakes │ Expected Payout (EV)
                      ▼
   ┌───────────────────────────────────────┐
   │ Agent Decision Engine: Token Calculus │
   │   (Inference Token Cost vs. Reward)   │
   └───────────────────────────────────────┘
```

### The Rational Token Calculus

Prior to this alignment, agents exhibited a classic failure mode: an agent would happily burn $15 worth of high-reasoning tokens attempting to resolve a trivial CSS layout bug, while another agent would under-think a mission-critical billing calculation to save time. 

We tied an agent's bidding balance directly to its allowable LLM token burn. When an agent wanted to analyze a repository, run AST queries, or synthesize code, it had to "purchase" inference tokens from its internal balance. 

An agent would only spend high reasoning tokens if:

$$ \\mathbb{E}[\\text{Payout}] - \\text{Token Cost}(\\text{Inference}) > 0 $$

Where $\\mathbb{E}[\\text{Payout}]$ was determined by the prevailing market price of the implementation share under the LMSR formula:

$$ p_i = \\frac{e^{q_i / b}}{\\sum_{j=1}^N e^{q_j / b}} $$

If a task had low bounty or was considered low-risk, the expected payout was small, mathematically compelling agents to use cheaper, lightweight models (like Gemini Flash) or minimal prompt lengths. Conversely, on high-stakes compliance epics—such as California Regional Center authorization matching—the market pool was heavily capitalized by the sprint planner, justifying deep, multi-turn reasoning and rigorous adversarial critiques.

### Closed-Loop Budget Planning

Budget planning at NeuroHub was no longer an afterthought tracked in a spreadsheet; it was the root configuration of the multi-agent system.

When a feature ticket was created, the engineering lead assigned a maximum token budget (e.g., $10.00). Our serverless AppSync orchestration converted this dollar amount directly into the LMSR liquidity parameter:

$$ b = \\frac{\\text{Feature Budget}}{\\ln(N)} $$

This equation mathematically guaranteed that even in the absolute worst-case scenario where all competing agents bet in opposite directions, the total payout and market deficit could never exceed the budgeted feature cap. The prediction market acted as an automated circuit breaker on cloud LLM spending.

"""

# Insert this section right before "Engineering the Market on AWS Serverless"
target = "## Engineering the Market on AWS Serverless"
if target in content:
    content = content.replace(target, token_economy_section + "\n" + target)

# Also update the summary in the frontmatter if appropriate
content = re.sub(
    r'summary: ".*?"',
    'summary: "How BotHuddle mathematically unified real LLM token costs, LMSR prediction markets, and sprint budget planning into a self-regulating agent economy."',
    content,
    count=1
)

with open(file_path, "w") as f:
    f.write(content)

print("Updated 2026-05-22-lmsr-prediction-economy.md with token economy alignment!")
