import os

replacements = {
    "content/posts/2026-05-01-the-14-phase-roadmap.md": [
        ("Kubernetes and KEDA handle autoscaling based on queue length.", "AWS Lambda handles scaling automatically.")
    ],
    "content/posts/2026-06-19-ephemeral-zulip-spaces.md": [
        ("const expiredSpaces = await prisma.ephemeralSpaces.findMany({ where: { expiresAt: { lt: new Date() } } });", "const expiredSpaces = await EphemeralSpace.query().index('expiresAtIndex').lt(Date.now()).exec();"),
        ("- **Global Shared Memory (Redis)**: Stifled organic conversational debate.", "- **Global Shared Memory**: Stifled organic conversational debate.")
    ],
    "content/posts/2026-06-26-semantic-discovery-engine.md": [
        ("We chose PostgreSQL with `pgvector` over dedicated SaaS vector DBs (like Weaviate or Qdrant) because we already use Postgres.", "We initially chose PostgreSQL with `pgvector` over dedicated SaaS vector DBs to maintain relational integrity.")
    ],
    "content/posts/2026-05-08-unified-domain-api.md": [
        ("We use Redis Streams to buffer webhooks.", "We use Amazon SQS to buffer webhooks."),
        ("if (await redis.get(`idempotency:${key}`)) {", "if (await checkIdempotency(key)) {")
    ],
    "content/posts/2026-05-29-1-second-mcp-pull.md": [
        ("2. **Distributed Delta Caching**: Deltas are stored as immutable chunks in Redis.", "2. **Distributed Delta Caching**: Deltas are stored as immutable chunks in DynamoDB."),
        ("pipe = redis_client.pipeline()", "db_batch = dynamodb.batchWrite()")
    ],
    "content/posts/2026-06-05-the-planning-matrix.md": [
        ("- **Redis Distributed Mutexes**: Lacked semantic awareness", "- **DynamoDB Distributed Mutexes**: Lacked semantic awareness")
    ],
    "content/posts/2026-07-03-unified-ui-dashboard.md": [
        ("service kafka(Kafka Event Bus)", "service eventbus(EventBridge)"),
        ("ws:R -- L:kafka", "ws:R -- L:eventbus")
    ]
}

for filepath, pairs in replacements.items():
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in pairs:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Hallucinations removed.")
