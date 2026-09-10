import { getAllPosts } from '../lib/markdown';
import { PostFeedWithSidebar, FeedPost } from '../components/PostFeedWithSidebar';

export default function Home() {
  const rawPosts = getAllPosts();
  
  const posts: FeedPost[] = rawPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: String(p.date),
    summary: p.summary,
    tags: p.tags,
  }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)', padding: '0 1rem' }}>
      <header style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--slate-900, #0f172a)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
          NeuroHub Engineering
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--slate-600, #475569)', lineHeight: 1.6, maxWidth: '750px', margin: '0 auto' }}>
          Building the first true AI-native operating system for neurodiversity care. Here we share our cutting-edge research in agentic workflows, deterministic LLM evaluation, and digital-native enterprise architecture.
        </p>
      </header>

      <PostFeedWithSidebar initialPosts={posts} />
    </div>
  );
}
