---
title: "The Email Polling Trap: SES and SNS Pivot"
date: "2026-06-02"
slug: "the-email-polling-trap-ses-sns-pivot"
summary: "In modern compliance tech platforms, processing inbound emails—such as candidate resumes or signed offer letters—is a foundational..."
---
In modern compliance tech platforms, processing inbound emails—such as candidate resumes or signed offer letters—is a foundational requirement. Early in our startup journey, we relied on a simple polling mechanism to check an inbox via IMAP. As candidate volume scaled, this email polling trap severely degraded our system's performance and led to unacceptable latencies. This post covers our pivot to an event-driven architecture using Amazon Simple Email Service (SES) and Simple Notification Service (SNS).

### The Polling Anti-Pattern

### The Event-Driven Pivot

To achieve sub-second latency and infinitely scalable processing, we pivoted to AWS SES for inbound email routing. We configured an SES Receipt Rule Set to publish raw email payloads directly to an SNS topic. From there, an HTTP webhook subscribes to the topic, feeding the messages directly to our backend endpoints.

This architecture decouples the ingestion of emails from their processing. It acts as an instant push mechanism, ensuring our system only uses compute resources when an event actually occurs.

### Implementation Details

Processing the raw MIME payload from SES requires careful parsing. Here is a simplified TypeScript snippet demonstrating how we handle the SNS event in our backend, using a robust parsing library and Zod for validation:

```typescript
import { z } from 'zod';
import { simpleParser } from 'mailparser';

// Schema for the incoming SNS event payload
const SNSEventSchema = z.object({
  Records: z.array(
    z.object({
      Sns: z.object({
        Message: z.string(), // The JSON stringified SES message
      }),
    })
  ),
});

const SESMessageSchema = z.object({
  content: z.string(), // Base64 encoded raw email
});

export const handler = async (event: unknown) => {
  // Validate the incoming event
  const parsedEvent = SNSEventSchema.parse(event);
  
  for (const record of parsedEvent.Records) {
    const snsMessage = JSON.parse(record.Sns.Message);
    const sesPayload = SESMessageSchema.parse(snsMessage);
    
    // Decode the raw MIME email
    const rawEmailBuffer = Buffer.from(sesPayload.content, 'base64');
    
    // Parse the MIME payload into a structured object
    const parsedEmail = await simpleParser(rawEmailBuffer);
    
    console.log(`Processing email from: ${parsedEmail.from?.text}`);
    
    // Extract attachments (e.g., candidate resumes)
    const attachments = parsedEmail.attachments.map(att => ({
      filename: att.filename,
      contentType: att.contentType,
      content: att.content,
    }));
    
    // Persist to our compliance document vault (pseudo-code)
    await documentVault.storeAttachments(attachments);
  }
};
```

### Lessons Learned

Transitioning from IMAP polling to SES/SNS push notifications was a game-changer. While the AI agent helped us rapidly prototype the initial IMAP solution, relying on it for system design without human oversight led us into the polling trap. The event-driven pivot eliminated our compute waste, drastically reduced time-to-process for candidate documents, and provided a robust, scalable foundation for our compliance platform's communication layer.