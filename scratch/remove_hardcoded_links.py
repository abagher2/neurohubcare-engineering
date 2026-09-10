import os
import re

POSTS_DIR = "content/posts"

for filename in os.listdir(POSTS_DIR):
    if not filename.endswith(".md"):
        continue
    
    filepath = os.path.join(POSTS_DIR, filename)
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove the hardcoded line
    new_content = re.sub(r'\*Previously in this series:.*?\*\n+', '', content)
    
    # Remove the extra '---' that was injected right after it.
    # The pattern we injected was: *Previously...* \n\n---\n
    # Let's just remove any standalone '---' that appears right before a header,
    # or we can just be careful. Actually, since the original didn't have an extra ---, 
    # let's remove exactly the sequence we added.
    
    # Let's use a simpler approach: just find lines containing "Previously in this series"
    # and the --- line after it if it exists.
    lines = content.split('\n')
    cleaned_lines = []
    skip_next_dashes = False
    
    for line in lines:
        if "*Previously in this series:" in line:
            skip_next_dashes = True
            continue
        if skip_next_dashes and line.strip() == '---':
            skip_next_dashes = False
            continue
        if skip_next_dashes and line.strip() == '':
            # skip empty lines immediately following the previously link
            continue
            
        skip_next_dashes = False
        cleaned_lines.append(line)
        
    final_content = '\n'.join(cleaned_lines)
    
    if final_content != content:
        with open(filepath, 'w') as f:
            f.write(final_content)

print("Removed hardcoded links from markdown files.")
