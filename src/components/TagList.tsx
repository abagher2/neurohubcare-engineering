import React from 'react';

export function TagList({ tags }: { tags?: string[] | string }) {
  if (!tags) return null;
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {tagArray.map(tag => (
        <span key={tag} style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500 }}>
          {tag}
        </span>
      ))}
    </div>
  );
}
