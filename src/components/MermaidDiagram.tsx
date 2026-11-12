'use client';

import React, { useEffect, useId, useState } from 'react';
// @ts-ignore
import mermaid from 'mermaid';

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const reactId = useId();
  const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'var(--font-inter, -apple-system, BlinkMacSystemFont, sans-serif)',
        primaryColor: '#eef2ff',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#818cf8',
        lineColor: '#6366f1',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#f8fafc',
      },
    });

    const normalizedChart = chart.replace(/\\n/g, '<br/>').trim();

    mermaid
      .render(id, normalizedChart)
      .then((result: any) => {
        if (!cancelled) {
          setSvg(result.svg);
        }
      })
      .catch((e: any) => {
        console.error('Mermaid render error:', e);
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (!svg) {
    return (
      <div
        style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--slate-500, #64748b)',
          background: '#ffffff',
          border: '1px solid var(--surface-border, #e2e8f0)',
          borderRadius: '12px',
          margin: '2rem 0',
        }}
      >
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="mermaid-container"
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '2rem 0',
        padding: '1.5rem',
        background: '#ffffff',
        border: '1px solid var(--surface-border, #e2e8f0)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
