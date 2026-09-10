import os
import re

POSTS_DIR = "content/posts"

for filename in os.listdir(POSTS_DIR):
    if not filename.endswith(".md"):
        continue
        
    filepath = os.path.join(POSTS_DIR, filename)
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Check if summary already exists
    if re.search(r'^summary:\s*', content, re.MULTILINE):
        continue
        
    # We need to extract the frontmatter and the body
    parts = content.split('---', 2)
    if len(parts) < 3:
        continue
        
    frontmatter = parts[1]
    body = parts[2]
    
    # Try to find a good summary from the body.
    # The body might start with "*Previously...*" or "# Heading" or "> **The Motivation:**"
    # Let's extract the first non-heading, non-list, non-html-comment, non-empty line of text.
    body_lines = body.split('\n')
    summary_text = ""
    for line in body_lines:
        clean_line = line.strip()
        if not clean_line:
            continue
        if clean_line.startswith('#'):
            continue
        if clean_line.startswith('*Previously'):
            continue
        if clean_line.startswith('<!--'):
            continue
        
        # We found some text. Let's clean it up.
        # Remove bold/italic markers
        clean_line = clean_line.replace('**', '').replace('*', '')
        # Remove blockquote markers
        if clean_line.startswith('>'):
            clean_line = clean_line.replace('>', '', 1).strip()
            
        # Stop at the first period if it's long, or take the whole sentence
        summary_text = clean_line
        break
        
    if not summary_text:
        summary_text = "NeuroHub Engineering Deep Dive."
        
    # Escape quotes
    summary_text = summary_text.replace('"', '\\"')
    
    # Inject summary into frontmatter
    new_frontmatter = frontmatter.rstrip() + f'\nsummary: "{summary_text}"\n'
    new_content = f"---{new_frontmatter}---{body}"
    
    with open(filepath, 'w') as f:
        f.write(new_content)
        
print("Added missing summaries.")
