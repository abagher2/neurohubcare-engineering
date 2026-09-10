import React from 'react';

export function TagList({ tags }: { tags?: string[] | string }) {
  if (!tags) return null;
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {tagArray.map(tag => (
        <span 
          key={tag} 
          style={{ 
            background: 'var(--primary-bg, rgba(99, 102, 241, 0.08))', 
            color: 'var(--primary, #6366f1)', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '999px', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            letterSpacing: '0.01em',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
