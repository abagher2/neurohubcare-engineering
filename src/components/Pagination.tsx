import React from 'react';
import Link from 'next/link';

export function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
      {currentPage > 1 ? (
        <Link 
          href={currentPage === 2 ? '/' : `/p/${currentPage - 1}`}
          style={{ padding: '0.5rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '6px', color: 'var(--slate-700)', textDecoration: 'none', fontWeight: 500 }}
          className="hover:bg-slate-50"
        >
          &larr; Previous
        </Link>
      ) : (
        <span style={{ padding: '0.5rem 1rem', border: '1px solid var(--slate-200)', borderRadius: '6px', color: 'var(--slate-400)', fontWeight: 500, cursor: 'not-allowed' }}>
          &larr; Previous
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-600)', fontWeight: 500 }}>
        Page {currentPage} of {totalPages}
      </div>

      {currentPage < totalPages ? (
        <Link 
          href={`/p/${currentPage + 1}`}
          style={{ padding: '0.5rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '6px', color: 'var(--slate-700)', textDecoration: 'none', fontWeight: 500 }}
          className="hover:bg-slate-50"
        >
          Next &rarr;
        </Link>
      ) : (
        <span style={{ padding: '0.5rem 1rem', border: '1px solid var(--slate-200)', borderRadius: '6px', color: 'var(--slate-400)', fontWeight: 500, cursor: 'not-allowed' }}>
          Next &rarr;
        </span>
      )}
    </nav>
  );
}
