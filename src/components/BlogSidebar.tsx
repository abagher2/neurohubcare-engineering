'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, X, Calendar, Tag, BookOpen } from 'lucide-react';

export interface MonthFacet {
  key: string;
  label: string;
  count: number;
}

export interface TagFacet {
  display: string;
  count: number;
}

export interface PostNav {
  slug: string;
  title: string;
}

interface BlogSidebarProps {
  monthFacets: MonthFacet[];
  tagFacets: TagFacet[];
  selectedMonth?: string | null;
  selectedTag?: string | null;
  onSelectMonth?: (key: string | null) => void;
  onSelectTag?: (tag: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  prevPost?: PostNav | null;
  nextPost?: PostNav | null;
  isArticlePage?: boolean;
}

export function BlogSidebar({
  monthFacets,
  tagFacets,
  selectedMonth,
  selectedTag,
  onSelectMonth,
  onSelectTag,
  searchQuery,
  onSearchChange,
  prevPost,
  nextPost,
  isArticlePage = false,
}: BlogSidebarProps) {
  return (
    <aside
      style={{
        flex: '0 0 280px',
        width: '100%',
        maxWidth: '280px',
        position: 'sticky',
        top: '5.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
      className="feed-sidebar"
    >
      {/* Return to feed link on article pages */}
      {isArticlePage && (
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--slate-600, #475569)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            padding: '0.25rem 0',
          }}
          className="hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to all posts</span>
        </Link>
      )}

      {/* Search Input (only on feed page or if handler provided) */}
      {onSearchChange !== undefined && (
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--slate-400, #94a3b8)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '10px',
              border: '1px solid var(--surface-border, #e2e8f0)',
              background: 'var(--surface, #ffffff)',
              fontSize: '0.9rem',
              color: 'var(--slate-900, #0f172a)',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Article Page: Dedicated Previous / Next Navigation in Sidebar */}
      {isArticlePage && (prevPost || nextPost) && (
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--surface-border, #e2e8f0)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-500, #64748b)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <BookOpen size={14} />
            <span>Navigation</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {prevPost && (
              <Link href={`/${prevPost.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                  <ArrowLeft size={12} />
                  <span>PREVIOUS</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-800, #1e293b)', fontWeight: 600, lineHeight: 1.35, marginTop: '0.2rem' }}>
                  {prevPost.title}
                </div>
              </Link>
            )}
            {nextPost && (
              <Link href={`/${nextPost.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                  <span>NEXT</span>
                  <ArrowRight size={12} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-800, #1e293b)', fontWeight: 600, lineHeight: 1.35, marginTop: '0.2rem' }}>
                  {nextPost.title}
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Date Facet: Months */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-500, #64748b)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          <Calendar size={14} />
          <span>Archive by Date</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {!isArticlePage && onSelectMonth && (
            <li key="all-months">
              <button
                onClick={() => onSelectMonth(null)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedMonth === null ? 'var(--slate-900, #0f172a)' : 'transparent',
                  color: selectedMonth === null ? '#ffffff' : 'var(--slate-700, #334155)',
                  fontSize: '0.875rem',
                  fontWeight: selectedMonth === null ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>All Months</span>
              </button>
            </li>
          )}

          {monthFacets.map(({ key, label, count }) => {
            const isSelected = selectedMonth === key;

            if (isArticlePage) {
              return (
                <li key={key}>
                  <Link
                    href={`/?month=${key}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'var(--slate-700, #334155)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    className="hover:bg-slate-200 transition-colors"
                  >
                    <span>{label}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.75, color: 'var(--slate-500)' }}>{count}</span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={key}>
                <button
                  onClick={() => onSelectMonth && onSelectMonth(isSelected ? null : key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected ? 'var(--primary, #6366f1)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--slate-700, #334155)',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.75 }}>{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Topic Facet: Tags */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-500, #64748b)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          <Tag size={14} />
          <span>Topics & Tags</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {tagFacets.map(({ display, count }) => {
            const isSelected = selectedTag?.toLowerCase() === display.toLowerCase();

            if (isArticlePage) {
              return (
                <Link
                  key={display}
                  href={`/?tag=${encodeURIComponent(display)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    border: '1px solid var(--surface-border, #e2e8f0)',
                    background: '#ffffff',
                    color: 'var(--slate-700, #334155)',
                  }}
                >
                  <span>{display}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7, color: 'var(--slate-500)' }}>
                    {count}
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={display}
                onClick={() => onSelectTag && onSelectTag(isSelected ? null : display)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 600 : 500,
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--surface-border, #e2e8f0)',
                  background: isSelected ? 'var(--primary-bg, rgba(99, 102, 241, 0.1))' : '#ffffff',
                  color: isSelected ? 'var(--primary, #6366f1)' : 'var(--slate-700, #334155)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{display}</span>
                <span style={{ 
                  fontSize: '0.675rem', 
                  opacity: 0.85, 
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--slate-100, #eaeff4)', 
                  padding: '0.05rem 0.35rem', 
                  borderRadius: '999px' 
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
