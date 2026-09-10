const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDirectory = path.join(process.cwd(), 'content/posts');
const publicDirectory = path.join(process.cwd(), 'public');

function generateRSS() {
  if (!fs.existsSync(postsDirectory)) return;

  const today = new Date().toISOString().split('T')[0];
  const fileNames = fs.readdirSync(postsDirectory);
  
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);
      
      let dateStr = '';
      const rawDate = matterResult.data.date;
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().split('T')[0];
      } else {
        dateStr = String(rawDate || '2026-01-01').split('T')[0];
      }
      
      return {
        slug,
        title: matterResult.data.title || 'Untitled',
        date: dateStr,
        summary: matterResult.data.summary || '',
      };
    })
    .filter(post => post.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const siteUrl = 'https://blog.neurohubcare.com';

  const itemsXml = posts
    .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.summary}]]></description>
    </item>`)
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NeuroHub Engineering Blog</title>
    <link>${siteUrl}</link>
    <description>Chronicles of building the AI-native operating system for neurodiversity care.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

  if (!fs.existsSync(publicDirectory)) {
    fs.mkdirSync(publicDirectory, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDirectory, 'rss.xml'), rssXml.trim());
  console.log(`Generated RSS feed with ${posts.length} published posts at public/rss.xml`);
}

generateRSS();
