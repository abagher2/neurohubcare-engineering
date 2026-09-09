import React from 'react';
import { Logo } from './Logo';
import styles from './SiteNavigation.module.css';

export function SiteHeader() {
  const mainSiteUrl = 'https://neurohub.app';

  return (
    <header 
      className={`${styles.header} app-header glass-header`}
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        padding: '1rem 2rem', 
        background: 'color-mix(in srgb, var(--surface, rgba(255, 255, 255, 0.85)) 95%, transparent)', 
        backdropFilter: 'blur(32px)', 
        WebkitBackdropFilter: 'blur(32px)',
        marginBottom: '0',
        borderBottom: '1px solid var(--surface-border)'
      }}
    >
      <div className={styles.logo}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Logo size="lg" withText={true} />
        </a>
      </div>
      
      <nav className={`${styles.nav} nav-links`} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <a href="/architecture" className={styles.navLink} style={{ textDecoration: 'none' }}>
          Architecture
        </a>
        <a 
          href={mainSiteUrl} 
          className={styles.navLink}
          style={{ 
            textDecoration: 'none', 
            fontWeight: 700, 
            color: 'var(--primary)',
            marginLeft: '1rem'
          }}
        >
          NeuroHub App →
        </a>
      </nav>
    </header>
  );
}
