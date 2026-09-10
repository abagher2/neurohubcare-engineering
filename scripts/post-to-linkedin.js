/**
 * Optional script to publish today's blog posts to LinkedIn.
 * Requires LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_ID (or LINKEDIN_PERSON_ID)
 * environment variables.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDirectory = path.join(process.cwd(), 'content/posts');
const token = process.env.LINKEDIN_ACCESS_TOKEN;
const authorUrn = process.env.LINKEDIN_AUTHOR_URN; // e.g., 'urn:li:organization:12345678' or 'urn:li:person:abcdefg'
const siteUrl = process.env.SITE_URL || 'https://neurohubcare.com/blog';

if (!token || !authorUrn) {
  console.log('LinkedIn credentials not configured (LINKEDIN_ACCESS_TOKEN or LINKEDIN_AUTHOR_URN missing). Skipping.');
  process.exit(0);
}

async function postToday() {
  const today = new Date().toISOString().split('T')[0];
  const fileNames = fs.readdirSync(postsDirectory);

  for (const fileName of fileNames) {
    if (!fileName.endsWith('.md')) continue;

    const fullPath = path.join(postsDirectory, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(content);

    let dateStr = '';
    if (data.date instanceof Date) {
      dateStr = data.date.toISOString().split('T')[0];
    } else {
      dateStr = String(data.date || '').split('T')[0];
    }

    // Only post if the post is scheduled for TODAY
    if (dateStr === today) {
      const slug = fileName.replace(/\.md$/, '');
      const postUrl = `${siteUrl}/${slug}`;
      const title = data.title || 'New Engineering Post';
      const summary = data.summary || '';

      console.log(`Publishing to LinkedIn: "${title}" (${postUrl})`);

      const payload = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: `🚀 New on the NeuroHub Engineering Blog:\n\n${title}\n\n${summary}\n\nRead the full deep-dive: ${postUrl}`,
            },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                description: { text: summary },
                originalUrl: postUrl,
                title: { text: title },
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      try {
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Failed to post to LinkedIn (${res.status}): ${errText}`);
        } else {
          console.log(`Successfully posted "${title}" to LinkedIn!`);
        }
      } catch (err) {
        console.error('Network error posting to LinkedIn:', err);
      }
    }
  }
}

postToday();
