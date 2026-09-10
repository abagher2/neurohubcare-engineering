import React from 'react';
import { Logo } from './Logo';
import { ExternalLink } from 'lucide-react';
import styles from './SiteNavigation.module.css';

export function SiteHeader() {
  const mainSiteUrl = 'https://neurohubcare.com';

  return (
    <header 
      className={`${styles.header} app-header glass-header`}
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        padding: '0.875rem 2rem', 
        background: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        marginBottom: '0',
        borderBottom: '1px solid var(--surface-border, #e2e8f0)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
      }}
    >
      <div className={styles.logo}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Logo size="lg" withText={true} />
        </a>
      </div>
      
      <nav className={`${styles.nav} nav-links`} style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
        <a 
          href="/architecture" 
          className={styles.navLink} 
          style={{ 
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'var(--slate-600, #475569)'
          }}
        >
          Architecture
        </a>
        <a 
          href={mainSiteUrl} 
          className={styles.navLink}
          style={{ 
            textDecoration: 'none', 
            fontSize: '0.9rem',
            fontWeight: 600, 
            color: 'var(--primary, #6366f1)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            background: 'var(--primary-bg, rgba(99, 102, 241, 0.08))',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            transition: 'all 0.15s ease'
          }}
        >
          <span>NeuroHub App</span>
          <ExternalLink size={14} />
        </a>
      </nav>
    </header>
  );
}
