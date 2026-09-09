---
title: "Multi-Modal S3 Document Ingestion with Gemini"
date: "2026-07-15"
slug: "2026-07-15-multi-modal-s3-document-ingestion-gemini"
summary: "Architecting a multi-modal document ingestion pipeline to extract structured goals directly from raw PDFs."
tags: ["Architecture", "Gemini", "S3"]
---

### The Document Intake Problem

In our domain, processing massive, unstructured PDFs (like Individual Program Plans or complex medical addendums) is a core requirement. Originally, human operators had to manually read 40-page documents to extract specific care goals and copy them into our database. 

To automate this, we built a highly concurrent **S3-to-LLM Document Ingestion Pipeline**. 

### The Multi-Modal Gemini Pipeline

When designing the automation pipeline, we wanted to avoid legacy approaches that rely on an intermediate OCR step (which often strips crucial spatial and tabular context from documents before the LLM ever sees them). 

Instead, we leveraged **Google Gemini** natively. Because Gemini is multi-modal, we could eliminate the OCR step entirely and pass the raw PDF directly into the model's context window.

When a user uploads a PDF, the client uploads the file directly to S3 using an ephemeral pre-signed URL. A backend process then generates a temporary read URL and streams the file directly into the `generateObject` API alongside our Zod schemas.

```typescript
import { generateObject } from 'ai';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// The centralized AI Core routing method
export async function extractGoalsFromPdf(s3ObjectKey: string) {
  // 1. Generate a temporary read URL for the LLM
  const pdfUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: s3ObjectKey
  }), { expiresIn: 300 });

  // 2. Direct Multi-Modal Inference
  const { object } = await generateObject({
    model: 'gemini-1.5-pro',
    schema: z.object({
      extractedGoals: z.array(z.object({
        title: z.string(),
        description: z.string(),
        targetDate: z.string().optional()
      }))
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all formalized care goals from this document.' },
          { type: 'file', mimeType: 'application/pdf', data: pdfUrl } // Direct ingestion
        ]
      }
    ]
  });

  // 3. Persist to Database (DynamoDB/Postgres)
  await persistGoalsToDatabase(object.extractedGoals);
  
  return object.extractedGoals;
}
```

### The AI Co-Pilot Factor

When architecting this pipeline, our AI coding agent was instrumental in generating the extensive E2E document test fixtures. The agent systematically updated dozens of Playwright tests to securely stub the Gemini API routes and mock S3 upload payloads, ensuring our automated verification suite seamlessly handled multi-modal document assertions. 

By strictly adhering to our architectural guidelines, the agent ensured all AI model inferences were centralized through our `src/lib/ai/ai-core.ts` abstraction layer, keeping the underlying React UI components perfectly decoupled from the ingestion logic.
