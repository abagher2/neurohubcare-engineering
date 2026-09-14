import os
import re

POSTS_DIR = "content/posts"

def truncate_code(match):
    full_block = match.group(0)
    lines = full_block.split('\n')
    
    # Don't truncate if it's already short enough (e.g., < 25 lines)
    if len(lines) <= 25:
        return full_block
        
    # It's a long block. We need to keep the opening and closing ticks
    # and truncate the middle.
    opening = lines[0]
    closing = lines[-1]
    
    # Keep first 10 lines of code, and last 5 lines
    top_lines = lines[1:11]
    bottom_lines = lines[-6:-1]
    
    # Determine the comment style based on the language
    lang = opening.replace('```', '').strip().lower()
    comment = "// ... remaining code truncated for brevity ..."
    if lang in ['python', 'py', 'sh', 'bash', 'yaml', 'yml']:
        comment = "# ... remaining code truncated for brevity ..."
    elif lang in ['html', 'xml']:
        comment = "<!-- ... remaining code truncated for brevity ... -->"
        
    truncated_block = [opening] + top_lines + ["", f"    {comment}", ""] + bottom_lines + [closing]
    return '\n'.join(truncated_block)

count = 0
for filename in os.listdir(POSTS_DIR):
    if not filename.endswith(".md"):
        continue
        
    filepath = os.path.join(POSTS_DIR, filename)
    with open(filepath, 'r') as f:
        content = f.write = f.read()
        
    # Regex to find fenced code blocks
    # Pattern: ```(language)\n(code)\n```
    pattern = re.compile(r'```[a-zA-Z0-9_-]*\n.*?```', re.DOTALL)
    
    new_content = pattern.sub(truncate_code, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        count += 1

print(f"Truncated long code blocks in {count} posts.")
