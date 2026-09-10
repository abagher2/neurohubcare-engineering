import os
import re

POSTS_DIR = "content/posts"

# 1. Gather all posts and their metadata
posts = []
for filename in os.listdir(POSTS_DIR):
    if not filename.endswith(".md"):
        continue
    
    filepath = os.path.join(POSTS_DIR, filename)
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Extract date and title from frontmatter
    date_match = re.search(r'^date:\s*"?([^"\n]+)"?', content, re.MULTILINE)
    title_match = re.search(r'^title:\s*"?([^"\n]+)"?', content, re.MULTILINE)
    slug_match = re.search(r'^slug:\s*"?([^"\n]+)"?', content, re.MULTILINE)
    
    slug = slug_match.group(1) if slug_match else filename.replace('.md', '')
    
    if date_match and title_match:
        posts.append({
            'filename': filename,
            'filepath': filepath,
            'date': date_match.group(1),
            'title': title_match.group(1),
            'slug': slug,
            'content': content
        })

# 2. Sort posts chronologically
posts.sort(key=lambda x: x['date'])

# 3. Inject "Previously in this series" links
for i in range(1, len(posts)):
    current_post = posts[i]
    prev_post = posts[i-1]
    
    content = current_post['content']
    
    # Check if a link already exists to avoid duplication
    if "*Previously in this series:*" in content:
        continue
        
    # Find the end of the frontmatter
    # Frontmatter is between the first two '---' lines
    parts = content.split('---', 2)
    if len(parts) >= 3:
        frontmatter = parts[1]
        body = parts[2]
        
        # Create the link text
        link_text = f"\n*Previously in this series: [{prev_post['title']}](/{prev_post['slug']})*\n\n---\n"
        
        # Reconstruct the file
        new_content = f"---{frontmatter}---{link_text}{body.lstrip()}"
        
        with open(current_post['filepath'], 'w') as f:
            f.write(new_content)

print(f"Total posts processed: {len(posts)}")
