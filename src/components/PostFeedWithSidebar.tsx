'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { TagList } from './TagList';
import { formatDate, getIsoDateString } from '../lib/utils';
import { BlogSidebar, MonthFacet, TagFacet } from './BlogSidebar';
import { Calendar, ArrowRight, X } from 'lucide-react';

export interface FeedPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags?: string[];
}

interface PostFeedProps {
  initialPosts: FeedPost[];
}

const MONTH_NAMES: { [key: string]: string } = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

export function PostFeedWithSidebar({ initialPosts }: PostFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Sync with URL query parameters (?tag=... or ?month=...) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagParam = params.get('tag');
      const monthParam = params.get('month');
      if (tagParam) setSelectedTag(tagParam);
      if (monthParam) setSelectedMonth(monthParam);
    }
  }, []);

  // Compute month facets cleanly using getIsoDateString
  const monthFacets: MonthFacet[] = useMemo(() => {
    const counts: { [key: string]: number } = {};
    initialPosts.forEach((post) => {
      const iso = getIsoDateString(post.date);
      const d = iso.slice(0, 7); // YYYY-MM
      if (d && d.length === 7) {
        counts[d] = (counts[d] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        const label = `${MONTH_NAMES[month] || month} ${year}`;
        return { key, label, count };
      });
  }, [initialPosts]);

  // Compute tag facets with normalized casing
  const tagFacets: TagFacet[] = useMemo(() => {
    const counts: { [normalized: string]: { display: string; count: number } } = {};
    initialPosts.forEach((post) => {
      (post.tags || []).forEach((tag) => {
        const key = tag.trim().toLowerCase();
        if (!counts[key]) {
          counts[key] = { display: tag.trim(), count: 0 };
        }
        counts[key].count += 1;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [initialPosts]);

  // Filter posts based on active facets
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      const iso = getIsoDateString(post.date);

      // 1. Month filter
      if (selectedMonth) {
        const postMonth = iso.slice(0, 7);
        if (postMonth !== selectedMonth) return false;
      }

      // 2. Tag filter
      if (selectedTag) {
        const hasTag = (post.tags || []).some(
          (t) => t.trim().toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = post.title.toLowerCase().includes(query);
        const inSummary = (post.summary || '').toLowerCase().includes(query);
        const inTags = (post.tags || []).some((t) => t.toLowerCase().includes(query));
        if (!inTitle && !inSummary && !inTags) return false;
      }

      return true;
    });
  }, [initialPosts, selectedMonth, selectedTag, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery || selectedTag || selectedMonth);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setSelectedMonth(null);
  };

  return (
    <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <BlogSidebar
        monthFacets={monthFacets}
        tagFacets={tagFacets}
        selectedMonth={selectedMonth}
        selectedTag={selectedTag}
        onSelectMonth={setSelectedMonth}
        onSelectTag={setSelectedTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isArticlePage={false}
      />

      {/* Main Content: Post List */}
      <div style={{ flex: '1 1 500px', minWidth: 0 }}>
        {/* Results Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-500, #64748b)', margin: 0 }}>
            Showing <strong>{filteredPosts.length}</strong> of {initialPosts.length} articles
            {selectedMonth && ` in ${monthFacets.find(m => m.key === selectedMonth)?.label}`}
            {selectedTag && ` tagged with "${selectedTag}"`}
          </p>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                background: 'var(--slate-100, #eaeff4)',
                border: '1px solid var(--surface-border, #e2e8f0)',
                color: 'var(--slate-700, #334155)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
              }}
              className="hover:bg-slate-200"
            >
              <span>Reset Filters</span>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Post Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '16px', border: '1px dashed var(--surface-border, #e2e8f0)' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-800, #1e293b)', marginBottom: '0.5rem' }}>
                No articles found
              </p>
              <p style={{ color: 'var(--slate-500, #64748b)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                No posts match your current search and filter criteria.
              </p>
              <button
                onClick={clearAllFilters}
                style={{
                  background: 'var(--primary, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Link key={post.slug} href={`/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '2rem',
                    border: '1px solid var(--surface-border, #e2e8f0)',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary, #6366f1)', fontWeight: 600, fontSize: '0.8rem' }}>
                      <Calendar size={13} />
                      <time>{formatDate(post.date)}</time>
                    </div>
                    <TagList tags={post.tags} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900, #0f172a)', margin: '0 0 0.85rem 0', lineHeight: 1.3 }}>
                    {post.title}
                  </h2>
                  <p style={{ color: 'var(--slate-600, #475569)', lineHeight: 1.6, margin: '0 0 1.25rem 0', fontSize: '1rem' }}>
                    {post.summary}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary, #6366f1)', fontSize: '0.875rem', fontWeight: 600 }}>
                    <span>Read deep dive</span>
                    <ArrowRight size={14} />
                  </div>
                </article>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
