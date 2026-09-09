import { TagList } from "../../components/TagList";
import { formatDate } from "../../lib/utils";
import { getAllPosts, getPostBySlug } from '../../lib/markdown';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import './markdown.css';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }

  return (
    <article style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-inter, sans-serif)' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginBottom: '2rem', fontWeight: 500 }}>
        &larr; Back to all posts
      </Link>
      
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '1rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          {post.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <time style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {formatDate(post.date)}
          </time>
          <TagList tags={post.tags} />
        </div>
      </header>
      
      <div className="markdown-body">
        <ReactMarkdown
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
    </article>
  );
}
