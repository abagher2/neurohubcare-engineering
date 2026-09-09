import { TagList } from "../components/TagList";
import { formatDate } from "../lib/utils";
import Link from 'next/link';
import { getPaginatedPosts, getTotalPages } from '../lib/markdown';
import { Pagination } from '../components/Pagination';

export default function Home() {
  const posts = getPaginatedPosts(1);
  const totalPages = getTotalPages();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--slate-900, #0f172a)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
          NeuroHub Engineering
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--slate-600, #475569)', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto' }}>
          Building the first true AI-native operating system for neurodiversity care. Here we share our cutting-edge research in agentic workflows, deterministic LLM evaluation, and digital-native enterprise architecture.
        </p>
      </header>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--slate-500)' }}>No posts published yet.</p>
        ) : (
          posts.map(post => (
            <Link key={post.slug} href={`/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ 
                background: 'var(--surface, #ffffff)', 
                borderRadius: '16px', 
                padding: '2rem', 
                border: '1px solid var(--surface-border, #e2e8f0)',
                boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
                transition: 'all 0.2s'
              }}
              className="hover:shadow-md hover:border-slate-300"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <time style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {formatDate(post.date)}
                  </time>
                  <TagList tags={post.tags} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 1rem 0' }}>
                  {post.title}
                </h2>
                <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, margin: 0 }}>
                  {post.summary}
                </p>
              </article>
            </Link>
          ))
        )}
      </div>

      <Pagination currentPage={1} totalPages={totalPages} />
    </div>
  );
}
