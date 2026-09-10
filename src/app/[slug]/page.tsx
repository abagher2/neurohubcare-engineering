import { Metadata } from 'next';
import { TagList } from "../../components/TagList";
import { formatDate, getIsoDateString } from "../../lib/utils";
import { getAllPosts, getPostBySlug, getAdjacentPosts } from '../../lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShareButtons } from '../../components/ShareButtons';
import { BlogSidebar, MonthFacet, TagFacet } from '../../components/BlogSidebar';
import { Layers, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import './markdown.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const MONTH_NAMES: { [key: string]: string } = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const postUrl = `https://blog.neurohubcare.com/${post.slug}`;

  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    authors: [{ name: 'NeuroHub Engineering Team', url: 'https://blog.neurohubcare.com' }],
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: postUrl,
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: ['NeuroHub Engineering Team'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage(props: PageProps) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }

  const allPosts = getAllPosts();
  const { prev, next } = getAdjacentPosts(params.slug);

  // Compute month facets for sidebar
  const monthCounts: { [key: string]: number } = {};
  allPosts.forEach((p) => {
    const iso = getIsoDateString(p.date);
    const m = iso.slice(0, 7);
    if (m && m.length === 7) {
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }
  });

  const monthFacets: MonthFacet[] = Object.entries(monthCounts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, count]) => {
      const [year, month] = key.split('-');
      return {
        key,
        label: `${MONTH_NAMES[month] || month} ${year}`,
        count,
      };
    });

  // Compute tag facets for sidebar
  const tagCounts: { [key: string]: { display: string; count: number } } = {};
  allPosts.forEach((p) => {
    (p.tags || []).forEach((tag) => {
      const key = tag.trim().toLowerCase();
      if (!tagCounts[key]) {
        tagCounts[key] = { display: tag.trim(), count: 0 };
      }
      tagCounts[key].count += 1;
    });
  });

  const tagFacets: TagFacet[] = Object.values(tagCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Schema.org JSON-LD for Answer Engine Optimization (AEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.summary,
    datePublished: new Date(post.date).toISOString(),
    author: {
      '@type': 'Organization',
      name: 'NeuroHub Engineering',
      url: 'https://blog.neurohubcare.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NeuroHub',
      url: 'https://blog.neurohubcare.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://blog.neurohubcare.com/next.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://blog.neurohubcare.com/${post.slug}`,
    },
    keywords: post.tags ? post.tags.join(', ') : '',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)', padding: '0 1rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Sticky Navigation on Individual Article Pages */}
        <BlogSidebar
          monthFacets={monthFacets}
          tagFacets={tagFacets}
          prevPost={prev}
          nextPost={next}
          isArticlePage={true}
        />

        {/* Article Content Column */}
        <article style={{ flex: '1 1 650px', minWidth: 0, maxWidth: '820px' }}>
          <header style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--slate-900, #0f172a)', marginBottom: '1.25rem', letterSpacing: '-0.025em', lineHeight: 1.25 }}>
              {post.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary, #6366f1)', fontWeight: 600, fontSize: '0.875rem' }}>
                <Calendar size={15} />
                <time>{formatDate(post.date)}</time>
              </div>
              <TagList tags={post.tags} />
            </div>
          </header>

          {/* Series Context Card */}
          <div style={{ 
            background: 'rgba(99, 102, 241, 0.04)', 
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderLeft: '4px solid var(--primary, #6366f1)', 
            padding: '1.25rem 1.5rem', 
            borderRadius: '0 12px 12px 0',
            marginBottom: '2.5rem',
            color: 'var(--slate-700, #334155)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'flex-start'
          }}>
            <Layers size={20} style={{ color: 'var(--primary, #6366f1)', flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <strong style={{ color: 'var(--slate-900, #0f172a)' }}>Series Context:</strong> NeuroHub Engineering chronicles our journey building the first AI-native operating system for neurodiversity care. This post is part of a deep-dive series exploring our technical challenges scaling an autonomous multi-agent orchestration framework (BotHuddle) to write and test production React code.
            </div>
          </div>
          
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Bottom Previous / Next Card Navigation */}
          <div style={{ marginTop: '4rem', paddingTop: '2.5rem', borderTop: '1px solid var(--surface-border, #e2e8f0)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {prev ? (
                <Link href={`/${prev.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    background: '#ffffff', 
                    border: '1px solid var(--surface-border, #e2e8f0)',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
                    height: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-indigo-200 hover:shadow-md"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--primary, #6366f1)', fontWeight: 600, marginBottom: '0.4rem' }}>
                      <ArrowLeft size={13} />
                      <span>PREVIOUS ARTICLE</span>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900, #0f172a)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                      {prev.title}
                    </div>
                  </div>
                </Link>
              ) : <div />}
              
              {next ? (
                <Link href={`/${next.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    background: '#ffffff', 
                    border: '1px solid var(--surface-border, #e2e8f0)',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
                    height: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:border-indigo-200 hover:shadow-md"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--primary, #6366f1)', fontWeight: 600, marginBottom: '0.4rem' }}>
                      <span>NEXT ARTICLE</span>
                      <ArrowRight size={13} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900, #0f172a)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                      {next.title}
                    </div>
                  </div>
                </Link>
              ) : <div />}
            </div>
          </div>

          <ShareButtons title={post.title} />
        </article>
      </div>
    </div>
  );
}
