# NeuroHub Engineering

Welcome to the public repository for the **NeuroHub Engineering Blog** ([blog.neurohubcare.com](https://blog.neurohubcare.com)).

---

## About NeuroHub

**NeuroHub** is building the first AI-native operating system designed specifically for neurodiversity care.

Navigating special education, regional center services, and state healthcare programs—such as California's Self-Determination Program (SDP)—is often an overwhelming administrative burden for families and caregivers. Our mission is to dismantle this bureaucratic friction. We empower individuals, families, independent facilitators, and service providers with modern, intelligent tooling that automates compliance, streamlines spending plans, and turns months of paperwork into seamless digital workflows.

### Our Vision

We believe that artificial intelligence should be empathetic, transparent, and bound by rigorous engineering invariants. Rather than treating LLMs as probabilistic black boxes, NeuroHub enforces deterministic domain boundaries, compile-time schema validation, and strict state machines. We aim to deliver a desktop-class platform where technology quietly absorbs bureaucratic complexity so families can focus on what truly matters: care and community.

---

## Purpose of This Repository

This repository is public and is **primarily dedicated to our engineering blog and public technical discussions**.

- **Engineering Blog Source:** Houses the Next.js static application, article markdown files, RSS feeds, and visual architecture diagrams published to [blog.neurohubcare.com](https://blog.neurohubcare.com).
- **Technical Case Studies:** Chronicles our engineering lessons, failures, and breakthroughs—covering agent orchestration matrices, deterministic LLM evaluation, local model inference, visual regression testing, and domain-driven design in healthcare compliance.
- **Public Issue Tracking:** We use GitHub Issues in this repository for open discussions, feedback on our published architecture articles, technical questions, and suggestions for future topics.

*(Note: Core proprietary platform code and HIPAA/FERPA-sensitive service integrations reside in separate, secure private repositories.)*

---

## Architecture Topics Explored

Our blog posts cover deep technical implementation details from our production engineering journey:

1. **Autonomous Agent Governance:** Transitioning from heavy multi-agent coordination ledgers to fast, on-demand local agent swarms with strict token economies.
2. **Deterministic LLM-as-a-Judge Evaluation:** Creating directed acyclic graph (DAG) rubrics and multi-turn telemetry checks to evaluate AI outputs without brittle pixel or string matching.
3. **Zero-Overhead Healthcare Compliance:** Compiling complex regional and federal rules directly into pure TypeScript class hierarchies instead of slow runtime AST interpreters or unversioned database entries.
4. **Strict ORM Builders & Immutability:** Banning untyped JSON casting (`JSON.parse()`) and enforcing `Builder.build()` lifecycles to prevent hallucinations from mutating database records.
5. **Local Vision Inference & Test Mutexes:** Throttling full-page Playwright screenshot evaluations through dedicated local LLM queues to prevent GPU VRAM exhaustion during parallelized CI runs.

---

## Local Development

The blog is built using Next.js (Static Export), React 19, TypeScript, and Tailwind CSS.

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Clone the repository
git clone https://github.com/abagher2/neurohubcare-engineering.git
cd neurohubcare-engineering

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building & Validating

```bash
# Generate RSS feed and build static HTML export into out/
npm run build

# Preview the static production build locally
npm run preview
```

### Git Hooks & Deployment

The repository uses local Git hooks located in `.githooks/` for automated quality checks and deployment:

- **`pre-commit`:** Automatically runs `npm run build` to verify that all TypeScript types, static pages, and `public/rss.xml` compile without errors before any commit is accepted.
- **`pre-push`:** When pushing to `main`, automatically triggers `npm run gh-deploy` to publish the static site to the `gh-pages` branch for GitHub Pages hosting on `blog.neurohubcare.com`.

To ensure hooks are active in your local clone:
```bash
npm run prepare
```

---

## Feedback & Contributions

We welcome questions, typo fixes, and discussions! Feel free to:
- Open an [Issue](https://github.com/abagher2/neurohubcare-engineering/issues) to discuss any architectural pattern or request a deep dive.
- Submit a Pull Request for article errata or improvements.

For questions about NeuroHub or our parent platform, visit [neurohubcare.com](https://neurohubcare.com).
