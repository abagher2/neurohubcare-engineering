import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export const POSTS_PER_PAGE = 10;

export interface PostMeta {
  title: string;
  date: string;
  slug: string;
  summary: string;
  tags?: string[];
}

export interface Post extends PostMeta {
  content: string;
}

export function isPostPublished(dateInput: string | Date | undefined): boolean {
  // Always show future posts on localhost development or if explicitly requested
  if (process.env.NODE_ENV === 'development' || process.env.SHOW_FUTURE_POSTS === 'true') {
    return true;
  }
  if (!dateInput) return true;

  try {
    let dateStr = '';
    if (dateInput instanceof Date) {
      dateStr = dateInput.toISOString().split('T')[0];
    } else {
      dateStr = String(dateInput).split('T')[0];
    }
    const today = new Date().toISOString().split('T')[0];
    return dateStr <= today;
  } catch {
    return true;
  }
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      
      const matterResult = matter(fileContents);
      
      return {
        slug,
        title: matterResult.data.title || 'Untitled',
        date: matterResult.data.date || '2026-01-01',
        summary: matterResult.data.summary || '',
        tags: matterResult.data.tags || [],
      };
    })
    .filter(post => isPostPublished(post.date));
    
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const matterResult = matter(fileContents);
  
  const postDate = matterResult.data.date || '2026-01-01';
  if (!isPostPublished(postDate)) {
    return null;
  }
  
  return {
    slug,
    title: matterResult.data.title || 'Untitled',
    date: postDate,
    summary: matterResult.data.summary || '',
    tags: matterResult.data.tags || [],
    content: matterResult.content,
  };
}

export function getAdjacentPosts(slug: string): { prev: PostMeta | null, next: PostMeta | null } {
  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex(p => p.slug === slug);
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  // allPosts is sorted descending (newest first).
  // So the previous chronological post is at currentIndex + 1.
  // The next chronological post is at currentIndex - 1.
  return {
    prev: currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null,
    next: currentIndex > 0 ? allPosts[currentIndex - 1] : null
  };
}

export function getTotalPages(): number {
  const totalPosts = getAllPosts().length;
  return Math.ceil(totalPosts / POSTS_PER_PAGE);
}

export function getPaginatedPosts(page: number): PostMeta[] {
  const allPosts = getAllPosts();
  const startIndex = (page - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  return allPosts.slice(startIndex, endIndex);
}
