/**
 * Blog Build Script for Saadman.dev
 * This script converts Markdown blog posts to HTML
 */

const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');
const Handlebars = require('handlebars');
const lunr = require('lunr');

// ===== CONFIGURATION =====
const SITE_URL = 'https://saadman.dev';
const SOURCE_DIR = process.cwd();
const OUTPUT_DIR = path.join(SOURCE_DIR, 'dist');

// ===== DIRECTORY STRUCTURE =====
console.log('=== Blog Build Script Starting ===');
console.log(`Source directory: ${SOURCE_DIR}`);
console.log(`Output directory: ${OUTPUT_DIR}`);

// Configure marked for syntax highlighting and other features
marked.setOptions({
  headerIds: true,
  gfm: true,
  breaks: true,
  smartLists: true,
  smartypants: true
});

// Add custom renderer for better code blocks
const renderer = new marked.Renderer();

// Custom heading renderer to add IDs
renderer.heading = function(text, level) {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} id="${escapedText}">${text}</h${level}>`;
};

// Custom code renderer to handle language detection
renderer.code = function(code, lang) {
  const language = lang || 'plaintext';
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<pre><code class="language-${language}">${escaped}</code></pre>`;
};

marked.use({ renderer });

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
});

Handlebars.registerHelper('encodeURIComponent', function(text) {
  return encodeURIComponent(text);
});

Handlebars.registerHelper('concat', function() {
  return Array.prototype.slice.call(arguments, 0, -1).join('');
});

Handlebars.registerHelper('current_year', function() {
  return new Date().getFullYear();
});

Handlebars.registerHelper('join', function(array, separator) {
  return Array.isArray(array) ? array.join(separator) : '';
});

// Helper function to decode URL-encoded content
function decodeContent(text) {
  if (!text) return text;

  // Replace URL-encoded characters
  return text
    .replace(/%20/g, ' ')
    .replace(/%3C/g, '<')
    .replace(/%3E/g, '>')
    .replace(/%22/g, '"')
    .replace(/%27/g, "'")
    .replace(/%60/g, '`')
    .replace(/%5C/g, '\\')
    .replace(/%2F/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

// ===== CREATE DIRECTORY STRUCTURE =====
console.log('1. Setting up directory structure...');
fs.removeSync(OUTPUT_DIR);
fs.ensureDirSync(OUTPUT_DIR);
fs.ensureDirSync(path.join(OUTPUT_DIR, 'blog'));
fs.ensureDirSync(path.join(OUTPUT_DIR, 'search'));
fs.ensureDirSync(path.join(OUTPUT_DIR, 'assets'));
fs.ensureDirSync(path.join(OUTPUT_DIR, 'assets', 'images'));
fs.ensureDirSync(path.join(OUTPUT_DIR, 'assets', 'images', 'blog'));

// ===== COPY STATIC ASSETS =====
console.log('2. Copying static assets and files...');

// Copy assets directory if it exists
if (fs.existsSync(path.join(SOURCE_DIR, 'assets'))) {
  fs.copySync(
    path.join(SOURCE_DIR, 'assets'),
    path.join(OUTPUT_DIR, 'assets')
  );
  console.log('   ✓ Copied assets directory');
} else {
  console.log('   ! Assets directory not found, creating empty one');
}

// Copy static files
const staticFiles = ['index.html', 'robots.txt', 'CNAME', '.nojekyll', 'sitemap.xml'];
staticFiles.forEach(file => {
  if (fs.existsSync(path.join(SOURCE_DIR, file))) {
    fs.copySync(
      path.join(SOURCE_DIR, file),
      path.join(OUTPUT_DIR, file)
    );
    console.log(`   ✓ Copied static file: ${file}`);
  } else if (file === '.nojekyll') {
    // Always create .nojekyll for GitHub Pages
    fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '');
    console.log(`   ✓ Created empty ${file} file`);
  }
});

// ===== LOAD TEMPLATES =====
console.log('3. Loading HTML templates...');
let postTemplate, blogIndexTemplate, searchTemplate;

try {
  // Load post template
  if (fs.existsSync(path.join(SOURCE_DIR, 'templates', 'post.html'))) {
    postTemplate = fs.readFileSync(
      path.join(SOURCE_DIR, 'templates', 'post.html'),
      'utf8'
    );
    console.log('   ✓ Loaded post template');
  } else {
    throw new Error('Post template not found at templates/post.html');
  }

  // Load blog index template
  if (fs.existsSync(path.join(SOURCE_DIR, 'templates', 'blog-index.html'))) {
    blogIndexTemplate = fs.readFileSync(
      path.join(SOURCE_DIR, 'templates', 'blog-index.html'),
      'utf8'
    );
    console.log('   ✓ Loaded blog index template');
  } else {
    throw new Error('Blog index template not found at templates/blog-index.html');
  }

  // Load search template
  if (fs.existsSync(path.join(SOURCE_DIR, 'templates', 'search.html'))) {
    searchTemplate = fs.readFileSync(
      path.join(SOURCE_DIR, 'templates', 'search.html'),
      'utf8'
    );
    console.log('   ✓ Loaded search template');
  } else {
    throw new Error('Search template not found at templates/search.html');
  }
} catch (error) {
  console.error('Error loading templates:', error.message);
  process.exit(1);
}

// Compile templates
const compilePost = Handlebars.compile(postTemplate);
const compileBlogIndex = Handlebars.compile(blogIndexTemplate);
const compileSearch = Handlebars.compile(searchTemplate);

// ===== FIND AND PROCESS BLOG POSTS =====
console.log('4. Finding and processing blog posts...');
const contentDir = path.join(SOURCE_DIR, 'content');
const postsDir = path.join(contentDir, 'blog');
const posts = [];

// Ensure blog directory exists
if (!fs.existsSync(postsDir)) {
  console.error(`   ✖ Blog posts directory not found at ${postsDir}`);
  fs.ensureDirSync(postsDir, { recursive: true });
  console.log(`   ✓ Created blog posts directory at ${postsDir}`);
}

// Read and process all blog posts
const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : [];

if (files.length === 0) {
  console.log('   ! No blog posts found');
}

// Process each markdown file
for (const file of files) {
  if (path.extname(file) !== '.md') continue;

  console.log(`   Processing: ${file}`);
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Parse frontmatter and content
  let data, markdownContent;
  try {
    const result = matter(content);
    data = result.data;
    markdownContent = decodeContent(result.content);
  } catch (error) {
    console.error(`   ✖ Error parsing frontmatter in ${file}:`, error.message);
    continue;
  }

  // Validate required frontmatter
  if (!data.title) {
    console.error(`   ✖ Missing required frontmatter "title" in ${file}`);
    continue;
  }

  if (!data.date) {
    console.error(`   ✖ Missing required frontmatter "date" in ${file}`);
    data.date = new Date().toISOString();
    console.log(`   ! Using current date as fallback: ${data.date}`);
  }

  // Generate HTML from markdown
  let html;
  try {
    html = marked.parse(markdownContent);
  } catch (error) {
    console.error(`   ✖ Error parsing markdown in ${file}:`, error.message);
    continue;
  }

  // Extract headings for table of contents
  const toc = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(markdownContent)) !== null) {
    const level = match[1].length;
    const title = match[2];
    const slug = title.toLowerCase().replace(/[^\w]+/g, '-');

    if (level === 2) { // Only include h2 headings in TOC
      toc.push({ title, slug });
    }
  }

  // Extract FAQ sections from frontmatter
  const faqs = data.faqs || [];

  // Calculate word count
  const plainText = markdownContent.replace(/[#*`\[\]()!]/g, '').replace(/\n+/g, ' ');
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;

  // Detect if this is a tutorial/how-to post
  const isHowTo = data.isHowTo || false;
  const isReview = data.isReview || false;

  // Extract steps if provided
  const steps = data.steps || [];

  // Generate post slug if not provided
  const slug = data.slug || file.replace('.md', '');

  // Prepare post data
  const post = {
    ...data,
    slug,
    content: html,
    wordCount,
    faqs,
    isHowTo,
    isReview,
    steps,
    toc,
    tocHtml: toc.map(h => `<li><a href="#${h.slug}">${h.title}</a></li>`).join('\n'),
    tagsHtml: data.tags ? data.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('') : ''
  };

  // Add to posts array
  posts.push(post);
}

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

console.log(`   ✓ Found ${posts.length} blog posts`);

// ===== GENERATE HTML FILES =====
console.log('5. Generating HTML files...');

// Process each post and save it to the correct location
posts.forEach(post => {
  // Save to /blog/slug/ directory
  const postOutputDir = path.join(OUTPUT_DIR, 'blog', post.slug);
  fs.ensureDirSync(postOutputDir);

  // Write post HTML file as index.html in the post directory
  const postHtml = compilePost({
    post,
    siteUrl: SITE_URL
  });

  fs.writeFileSync(
    path.join(postOutputDir, 'index.html'),
    postHtml
  );

  console.log(`   ✓ Generated: /blog/${post.slug}/index.html`);
});

// Generate blog index
console.log('   Generating blog index page...');
const blogIndexHtml = compileBlogIndex({
  posts,
  siteUrl: SITE_URL,
  has_more_pages: posts.length > 10
});

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'blog', 'index.html'),
  blogIndexHtml
);

console.log('   ✓ Generated: /blog/index.html');

// ===== GENERATE RSS FEED =====
console.log('6. Generating RSS feed...');
const rssItems = posts.map(post => {
  const postUrl = `${SITE_URL}/blog/${post.slug}/`;
  const pubDate = new Date(post.date).toUTCString();

  return `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${pubDate}</pubDate>
    <dc:creator><![CDATA[${post.author || 'Saadman Rafat'}]]></dc:creator>
    ${post.tags ? post.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('\n    ') : ''}
    <description><![CDATA[${post.description || ''}]]></description>
    <content:encoded><![CDATA[
      ${post.tldr ? `<p><strong>TL;DR:</strong> ${post.tldr}</p>` : ''}
      ${post.content}
    ]]></content:encoded>
    ${post.image ? `<enclosure url="${SITE_URL}/assets/images/blog/${post.image}" length="0" type="image/jpeg" />` : ''}
  </item>`;
}).join('');

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom" 
  xmlns:content="http://purl.org/rss/1.0/modules/content/" 
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Saadman Rafat's Blog</title>
    <description>Insights on Python development, serverless architecture, Docker, Kubernetes, and AI research by Saadman Rafat.</description>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Saadman.dev Blog Engine</generator>
    <copyright>© ${new Date().getFullYear()} Saadman Rafat</copyright>
    <ttl>60</ttl>
    <image>
      <url>https://avatars.githubusercontent.com/u/13638758?s=400&amp;u=2b3265acd3fa799a558f8b95d147053cbf4e7767&amp;v=4</url>
      <title>Saadman Rafat's Blog</title>
      <link>${SITE_URL}/blog/</link>
      <width>144</width>
      <height>144</height>
    </image>
    ${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'rss.xml'), rssFeed);
console.log('   ✓ Generated: /rss.xml');

// ===== GENERATE DYNAMIC SITEMAP =====
console.log('7. Generating sitemap...');
const currentDate = new Date().toISOString().split('T')[0];

const sitemapEntries = [
  `  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`,
  `  <url>
    <loc>${SITE_URL}/blog/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
  `  <url>
    <loc>${SITE_URL}/search/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
];

posts.forEach(post => {
  const lastMod = post.updated || post.date;
  sitemapEntries.push(`  <url>
    <loc>${SITE_URL}/blog/${post.slug}/</loc>
    <lastmod>${new Date(lastMod).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    ${post.image ? `<image:image>
      <image:loc>${SITE_URL}/assets/images/blog/${post.image}</image:loc>
      <image:title><![CDATA[${post.title}]]></image:title>
      <image:caption><![CDATA[${post.description || ''}]]></image:caption>
    </image:image>` : ''}
  </url>`);
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
console.log('   ✓ Generated: /sitemap.xml');

// ===== CREATE A FALLBACK 404 PAGE =====
console.log('8. Creating 404 page...');
const notFoundPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Not Found - Saadman Rafat</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="https://avatars.githubusercontent.com/u/13638758" type="image/png">
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #000000;
      --accent-color: #000000;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: var(--font-sans);
      max-width: 40rem;
      margin: 0 auto;
      padding: 3rem 1rem;
      text-align: center;
    }
    h1 {
      font-size: 3rem;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
    }
    a {
      color: var(--text-color);
      text-decoration: none;
      border-bottom: 2px solid var(--text-color);
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.5rem 1rem;
      margin: 0 0.5rem;
    }
    a:hover {
      background-color: var(--text-color);
      color: var(--bg-color);
    }
    .error-code {
      font-size: 8rem;
      font-weight: 900;
      margin: 2rem 0;
    }
  </style>
</head>
<body>
  <div class="error-code">404</div>
  <h1>Page Not Found</h1>
  <p>The page you're looking for doesn't exist.</p>
  <div>
    <a href="/">Home</a>
    <a href="/blog/">Blog</a>
    <a href="/search/">Search</a>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), notFoundPage);
console.log('   ✓ Generated: /404.html');

// ===== GENERATE SEARCH INDEX =====
console.log('9. Generating search index...');

// Create search index from posts
const searchIndex = lunr(function() {
  this.field('title', { boost: 10 });
  this.field('content');
  this.field('tags', { boost: 5 });
  this.field('description', { boost: 7 });
  this.ref('slug');

  posts.forEach(post => {
    // Strip HTML and decode entities for search
    const cleanContent = post.content
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .substring(0, 5000); // Limit content length for search

    this.add({
      title: post.title,
      content: cleanContent,
      description: post.description || '',
      tags: post.tags ? post.tags.join(' ') : '',
      slug: post.slug
    });
  });
});

// Create metadata for search results
const postsMetadata = posts.map(post => ({
  title: post.title,
  description: post.description || '',
  slug: post.slug,
  date: post.date,
  readTime: post.readTime || 5,
  tags: post.tags || [],
  image: post.image
}));

// Write search index and metadata
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'search-index.json'),
  JSON.stringify(searchIndex)
);

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'posts-metadata.json'),
  JSON.stringify(postsMetadata)
);

console.log('   ✓ Generated: /search-index.json');
console.log('   ✓ Generated: /posts-metadata.json');

// ===== GENERATE SEARCH PAGE =====
console.log('10. Generating search page...');
const searchHtml = compileSearch({
  siteUrl: SITE_URL
});

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'search', 'index.html'),
  searchHtml
);

console.log('   ✓ Generated: /search/index.html');

// ===== FINAL OUTPUT SUMMARY =====
console.log('\n=== Build Complete! ===');
console.log(`Total blog posts processed: ${posts.length}`);
console.log('\nGenerated files:');
console.log('- /index.html (Homepage)');
console.log('- /blog/index.html (Blog Index)');
posts.forEach(post => {
  console.log(`- /blog/${post.slug}/index.html`);
});
console.log('- /search/index.html (Search Page)');
console.log('- /rss.xml (RSS Feed)');
console.log('- /sitemap.xml (Sitemap)');
console.log('- /404.html (404 Page)');
console.log('- /search-index.json (Search Index)');
console.log('- /posts-metadata.json (Posts Metadata)');
console.log('- /.nojekyll (GitHub Pages marker)');

// List output directory structure
console.log('\nOutput directory structure:');
function listDir(dir, prefix = '') {
  const items = fs.readdirSync(dir).sort();
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const isDirectory = fs.statSync(itemPath).isDirectory();
    console.log(`${prefix}${isDirectory ? '📁' : '📄'} ${item}`);
    if (isDirectory && !item.startsWith('.') && item !== 'node_modules') {
      listDir(itemPath, `${prefix}  `);
    }
  }
}
listDir(OUTPUT_DIR);

console.log('\n✅ Build completed successfully!');