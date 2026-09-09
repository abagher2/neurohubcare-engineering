'use client';

import React, { useEffect, useState } from 'react';
// @ts-ignore
import mermaid from 'mermaid';

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'var(--font-inter)',
        primaryColor: '#f1f5f9',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#cbd5e1',
        lineColor: '#64748b',
        secondaryColor: '#e0e7ff',
        tertiaryColor: '#f8fafc'
      }
    });

    mermaid.render(id, chart).then((result: any) => {
      setSvg(result.svg);
    }).catch((e: any) => {
      console.error('Mermaid render error:', e);
    });
  }, [chart, id]);

  if (!svg) {
    return <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>Rendering diagram...</div>;
  }

  return (
    <div 
      className="mermaid-container" 
      style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}
