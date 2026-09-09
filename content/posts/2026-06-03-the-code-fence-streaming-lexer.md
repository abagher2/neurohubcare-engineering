---
title: "The Code Fence Streaming Lexer"
date: "2026-06-03"
slug: "the-code-fence-streaming-lexer"
summary: "When building an AI-powered code review tool for enterprise service marketplace platforms, presenting generated code in real-time..."
---
When building an AI-powered code review tool for enterprise service marketplace platforms, presenting generated code in real-time is crucial for user experience. Standard markdown parsers require the entire document to be present before they can generate an Abstract Syntax Tree (AST) and render the output. This creates a jarring, blocky experience when streaming large language model (LLM) responses. To solve this, we built a Code Fence Streaming Lexer.

### The Streaming Challenge

### State Machines to the Rescue

We needed a custom lexer capable of operating on partial streams. By modeling the parser as a finite state machine, we could process incoming text chunk-by-chunk, maintaining our position in the document and emitting tokens as they became available. 

The most complex state is the `CODE_FENCE`. The lexer needs to identify the opening backticks, extract the language identifier, and then immediately start streaming the inner content to our syntax highlighter, even though the closing fence hasn't arrived.

### TypeScript Implementation

Here is a simplified version of our streaming lexer's core state machine:

```typescript
enum LexerState {
  TEXT, FENCE_START, CODE_BLOCK
}

interface LexerContext {
  state: LexerState;
  buffer: string;
  currentLanguage: string | null;
}

class StreamingLexer {
  private context: LexerContext = { /* ... */ };

  public processChunk(chunk: string, onToken: (type: string, content: string) => void) {
    // ... state machine logic
  }
}
```

### Rendering and UX

By emitting `CODE_CHUNK` tokens as the LLM generated the code, we were able to pass the partial strings to a React-based syntax highlighter. We had to ensure the highlighter could handle unclosed AST nodes, allowing it to colorize keywords and strings in real-time.

The AI pairing experience was fascinating here. Once I corrected the AI's naive DOM replacement approach and established the state machine pattern, the AI was incredibly fast at writing the regex logic for the state transitions and handling edge cases like escaped backticks. This combination of human architectural guidance and AI implementation speed resulted in a buttery-smooth streaming experience that our enterprise users love.