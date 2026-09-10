import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://blog.neurohubcare.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      // Explicitly allow AI Answer Engines to crawl and cite engineering deep-dives
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Applebot-Extended', 'Google-Extended'],
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
