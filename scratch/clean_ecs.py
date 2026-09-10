import os

filepath = "content/posts/2026-06-28-autonomous-rollbacks.md"
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace("ECS task definitions", "Git commits")
content = content.replace("AWS ECS", "Git")
content = content.replace("# Autonomous ECS rollback", "# Autonomous Git rollback")
content = content.replace("aws ecs update-service --service bothuddle-backend-prod --task-definition [PREV]", "git revert HEAD --no-edit && git push origin main")

with open(filepath, 'w') as f:
    f.write(content)
