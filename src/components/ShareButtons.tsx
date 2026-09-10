'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

function TwitterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.5a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6z" />
    </svg>
  );
}

export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!url) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div style={{ 
      display: 'flex', 
      gap: '0.75rem', 
      alignItems: 'center', 
      marginTop: '3.5rem', 
      paddingTop: '2rem', 
      borderTop: '1px solid var(--surface-border, #e2e8f0)',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-700, #334155)', fontWeight: 600, fontSize: '0.875rem', marginRight: '0.5rem' }}>
        <Share2 size={16} />
        <span>Share article:</span>
      </div>
      
      <a 
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.85rem', 
          background: 'var(--slate-100, #eaeff4)', 
          color: 'var(--slate-700, #334155)', 
          borderRadius: '8px', 
          textDecoration: 'none', 
          fontSize: '0.825rem', 
          fontWeight: 600,
          border: '1px solid var(--surface-border, #e2e8f0)',
          transition: 'all 0.15s ease'
        }}
        className="hover:bg-slate-200"
      >
        <TwitterIcon size={13} />
        <span>X (Twitter)</span>
      </a>
      
      <a 
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.85rem', 
          background: 'rgba(10, 102, 194, 0.08)', 
          color: '#0a66c2', 
          borderRadius: '8px', 
          textDecoration: 'none', 
          fontSize: '0.825rem', 
          fontWeight: 600,
          border: '1px solid rgba(10, 102, 194, 0.2)',
          transition: 'all 0.15s ease'
        }}
        className="hover:bg-blue-100"
      >
        <LinkedInIcon size={14} />
        <span>LinkedIn</span>
      </a>
      
      <button 
        onClick={handleCopy}
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.85rem', 
          background: copied ? 'var(--success-bg, rgba(16, 185, 129, 0.1))' : 'var(--slate-100, #eaeff4)', 
          color: copied ? 'var(--success, #10b981)' : 'var(--slate-700, #334155)', 
          borderRadius: '8px', 
          border: copied ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--surface-border, #e2e8f0)', 
          cursor: 'pointer', 
          fontSize: '0.825rem', 
          fontWeight: 600,
          transition: 'all 0.15s ease'
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
      </button>
    </div>
  );
}
