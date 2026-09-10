import os

filepath = "content/posts/2026-07-10-the-pivot.md"
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace("running EKS, MSK, and heavy EC2 nodes", "running heavy RDS clusters and VertexAI instances")

with open(filepath, 'w') as f:
    f.write(content)
