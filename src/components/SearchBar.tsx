'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export function SearchBar({ allPosts }: { allPosts: any[] }) {
  const [query, setQuery] = useState('');

  const filteredPosts = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return allPosts.filter(post => 
      post.title.toLowerCase().includes(lowerQuery) || 
      post.summary.toLowerCase().includes(lowerQuery) ||
      (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery)))
    );
  }, [query, allPosts]);

  return (
    <div style={{ position: 'relative', marginBottom: '2rem', zIndex: 10 }}>
      <input
        type="text"
        placeholder="Search engineering posts..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          fontSize: '1.1rem',
          borderRadius: '12px',
          border: '1px solid var(--surface-border, #e2e8f0)',
          boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'all 0.2s'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary, #3b82f6)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--surface-border, #e2e8f0)'}
      />
      
      {query && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.5rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid var(--surface-border, #e2e8f0)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {filteredPosts.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--slate-500)', textAlign: 'center' }}>
              No posts found for "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredPosts.map(post => (
                <Link 
                  key={post.slug} 
                  href={`/${post.slug}`}
                  onClick={() => setQuery('')}
                  style={{
                    padding: '1rem 1.5rem',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--surface-border, #e2e8f0)',
                    color: 'inherit'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--slate-900)', marginBottom: '0.25rem' }}>{post.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>{post.summary.substring(0, 100)}...</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
