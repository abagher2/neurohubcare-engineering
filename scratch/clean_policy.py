import re

filepath = "content/posts/2026-09-11-migrating-policy-engines.md"
with open(filepath, 'r') as f:
    content = f.read()

# Remove the Python/Rust section
pattern = r"## Backend Enforcement: Python Deep Dive.*?By utilizing the `/teamwork` protocol"
cleaned = re.sub(pattern, "By utilizing the `/teamwork` protocol", content, flags=re.DOTALL)

with open(filepath, 'w') as f:
    f.write(cleaned)
