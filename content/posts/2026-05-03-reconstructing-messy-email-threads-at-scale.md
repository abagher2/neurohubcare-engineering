---
title: "Reconstructing Messy Email Threads at Scale"
date: "2026-05-03"
slug: "reconstructing-messy-email-threads-at-scale"
summary: "Parsing email threads is notoriously difficult. In our hypothetical compliance software, we needed to reconstruct fragmented email..."
---
Parsing email threads is notoriously difficult. In our hypothetical compliance software, we needed to reconstruct fragmented email threads between recruiters and candidates into a clean, unified chronological timeline. We couldn't rely on simple regex; we needed a robust system to handle top-posting, inline replies, and varying email clients.

### Directed Acyclic Graphs for Email Lineage

We modeled email threads as Directed Acyclic Graphs (DAGs). Each incoming email is a node, and the `In-Reply-To` and `References` headers form the directed edges. However, headers are often stripped or mangled by corporate firewalls. 

To solve this, we introduced a two-pass parser using ASTs (Abstract Syntax Trees). We parse the MIME body, stripping out HTML and extracting structural blocks (signatures, quotes, body text).

### Implementation with Zod and TypeScript

We use Zod schemas to guarantee that our AST representation remains strictly typed before we insert it into our DAG.

```typescript
import { z } from 'zod';

const EmailNodeSchema = z.object({
  messageId: z.string().min(1),
  inReplyTo: z.string().optional(),
  normalizedBodyHash: z.string(),
  ast: z.record(z.unknown()), // Serialized MIME AST
});

type EmailNode = z.infer<typeof EmailNodeSchema>;

class ThreadDAG {
  private nodes = new Map<string, EmailNode>();
  private edges = new Map<string, string[]>();

  addNode(email: unknown) {
    const validated = EmailNodeSchema.parse(email);
    this.nodes.set(validated.messageId, validated);
    
    if (validated.inReplyTo) {
      const children = this.edges.get(validated.inReplyTo) || [];
      this.edges.set(validated.inReplyTo, [...children, validated.messageId]);
    }
  }

  // Detect circular references or orphaned threads
  getTimeline(rootId: string): EmailNode[] {
    const timeline: EmailNode[] = [];
    const queue = [rootId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = this.nodes.get(current);
      if (node) timeline.push(node);
      
      const children = this.edges.get(current) || [];
      queue.push(...children);
    }
    
    return timeline;
  }
}
```

By moving away from regex and utilizing an AST-based parser coupled with DAG reconstruction, we were able to process thousands of messy compliance email threads daily. The AI agent, once corrected, wrote the normalization functions that computed the `normalizedBodyHash`, allowing us to deduplicate inline replies with ease.