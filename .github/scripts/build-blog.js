/**
 * Blog Build Script for Saadman.dev
 * This script converts Markdown blog posts to HTML
 */

const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');
const Handlebars = require('handlebars');

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
  gfm: true
});

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

// ===== CREATE DIRECTORY STRUCTURE =====
// Clear and recreate the output directory
console.log('1. Setting up directory structure...');
fs.removeSync(OUTPUT_DIR);
fs.ensureDirSync(OUTPUT_DIR);
fs.ensureDirSync(path.join(OUTPUT_DIR, 'blog'));
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
const staticFiles = ['index.html', 'robots.txt', 'CNAME', '.nojekyll'];
staticFiles.forEach(file => {
  if (fs.existsSync(path.join(SOURCE_DIR, file))) {
    fs.copySync(
      path.join(SOURCE_DIR, file),
      path.join(OUTPUT_DIR, file)
    );
    console.log(`   ✓ Copied static file: ${file}`);
  } else {
    console.log(`   ! Static file not found: ${file}`);
    // Create .nojekyll if it doesn't exist
    if (file === '.nojekyll') {
      fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '');
      console.log(`   ✓ Created empty ${file} file`);
    }
  }
});

// ===== LOAD TEMPLATES =====
console.log('3. Loading HTML templates...');
let postTemplate, blogIndexTemplate;

try {
  if (fs.existsSync(path.join(SOURCE_DIR, 'templates', 'post.html'))) {
    postTemplate = fs.readFileSync(
      path.join(SOURCE_DIR, 'templates', 'post.html'),
      'utf8'
    );
    console.log('   ✓ Loaded post template');
  } else {
    console.error('   ✖ Post template not found at templates/post.html');
    console.log('   Creating fallback post template');
    postTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>{{post.title}} - Saadman Rafat</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <h1>{{post.title}}</h1>
  <div>{{{post.content}}}</div>
  <a href="/blog/">Back to blog</a>
</body>
</html>`;
  }

  if (fs.existsSync(path.join(SOURCE_DIR, 'templates', 'blog-index.html'))) {
    blogIndexTemplate = fs.readFileSync(
      path.join(SOURCE_DIR, 'templates', 'blog-index.html'),
      'utf8'
    );
    console.log('   ✓ Loaded blog index template');
  } else {
    console.error('   ✖ Blog index template not found at templates/blog-index.html');
    console.log('   Creating fallback blog index template');
    blogIndexTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>Blog - Saadman Rafat</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <h1>Blog</h1>
  <ul>
    {{#each posts}}
    <li><a href="/blog/{{this.slug}}/">{{this.title}}</a></li>
    {{/each}}
  </ul>
  <a href="/">Back to Home</a>
</body>
</html>`;
  }
} catch (error) {
  console.error('Error loading templates:', error);
  process.exit(1);
}

// Compile templates
const compilePost = Handlebars.compile(postTemplate);
const compileBlogIndex = Handlebars.compile(blogIndexTemplate);

// ===== FIND AND PROCESS BLOG POSTS =====
console.log('4. Finding and processing blog posts...');
const contentDir = path.join(SOURCE_DIR, 'content');
const postsDir = path.join(contentDir, 'blog');
const posts = [];

// Check if content directory exists
if (!fs.existsSync(contentDir)) {
  console.error(`   ✖ Content directory not found at ${contentDir}`);
  // Create a sample blog post
  console.log('   Creating sample blog post...');
  fs.ensureDirSync(postsDir);

  const samplePost = `---
title: "Sample Blog Post"
description: "This is a sample blog post created by the build system."
date: ${new Date().toISOString()}
author: "Saadman Rafat"
image: "sample.jpg"
tags: ["Sample", "Blog"]
readTime: 1
slug: "sample-blog-post"
---

## Introduction

This is a sample blog post created by the build system because no blog posts were found.

## How to Create Blog Posts

Create Markdown files in the \`content/blog/\` directory with YAML frontmatter to add your own posts.

## Conclusion

Replace this with your own content!
`;

  fs.writeFileSync(path.join(postsDir, 'sample.md'), samplePost);
  console.log('   ✓ Created sample blog post at content/blog/sample.md');
}

// Check if blog directory exists
if (!fs.existsSync(postsDir)) {
  console.error(`   ✖ Blog posts directory not found at ${postsDir}`);
  fs.ensureDirSync(postsDir);
  console.log(`   ✓ Created blog posts directory at ${postsDir}`);

  const samplePost = `---
title: "Sample Blog Post"
description: "This is a sample blog post created by the build system."
date: ${new Date().toISOString()}
author: "Saadman Rafat"
image: "sample.jpg"
tags: ["Sample", "Blog"]
readTime: 1
slug: "sample-blog-post"
---

## Introduction

This is a sample blog post created by the build system because no blog posts were found.

## How to Create Blog Posts

Create Markdown files in the \`content/blog/\` directory with YAML frontmatter to add your own posts.

## Conclusion

Replace this with your own content!
`;

  fs.writeFileSync(path.join(postsDir, 'sample.md'), samplePost);
  console.log('   ✓ Created sample blog post at content/blog/sample.md');
}

// Read and process all blog posts
if (fs.existsSync(postsDir)) {
  const files = fs.readdirSync(postsDir);

  if (files.length === 0) {
    console.log('   ! No blog posts found, creating a sample post');
    const samplePost = `---
title: "Sample Blog Post"
description: "This is a sample blog post created by the build system."
date: ${new Date().toISOString()}
author: "Saadman Rafat"
image: "sample.jpg"
tags: ["Sample", "Blog"]
readTime: 1
slug: "sample-blog-post"
---

## Introduction

This is a sample blog post created by the build system because no blog posts were found.

## How to Create Blog Posts

Create Markdown files in the \`content/blog/\` directory with YAML frontmatter to add your own posts.

## Conclusion

Replace this with your own content!
`;
    fs.writeFileSync(path.join(postsDir, 'sample.md'), samplePost);
    console.log('   ✓ Created sample blog post');
    files.push('sample.md');
  }

  for (const file of files) {
    if (path.extname(file) === '.md') {
      console.log(`   Processing: ${file}`);
      const filePath = path.join(postsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Parse frontmatter and content
      let data, markdownContent;
      try {
        const result = matter(content);
        data = result.data;
        markdownContent = result.content;
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
      const lines = markdownContent.split('\n');
      lines.forEach(line => {
        if (line.startsWith('## ')) {
          const title = line.replace('## ', '');
          const slug = title.toLowerCase().replace(/[^\w]+/g, '-');
          toc.push({ title, slug });
        }
      });

      // Generate post slug if not provided
      const slug = data.slug || file.replace('.md', '');

      // Prepare post data
      const post = {
        ...data,
        slug,
        content: html,
        toc,
        tocHtml: toc.map(h => `<li><a href="#${h.slug}">${h.title}</a></li>`).join('\n'),
        post.tagsHtml = data.tags ? data.tags.map(tag => `<span class="post-tag">${tag}</span>`).join(' ') : ''
      };

      // Add to posts array
      posts.push(post);
    }
  }
}

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

console.log(`   Found ${posts.length} blog posts`);

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

// Generate direct test file
console.log('   Generating test file...');
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'blog', 'test.html'),
  '<html><body><h1>Blog Test Page</h1><p>If you can see this, the blog directory is accessible.</p></body></html>'
);

console.log('   ✓ Generated: /blog/test.html');

// ===== GENERATE RSS FEED =====
console.log('6. Generating RSS feed...');
const rssItems = posts.map(post => `
  <item>
    <title>${post.title}</title>
    <link>${SITE_URL}/blog/${post.slug}/</link>
    <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}/</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <dc:creator>Saadman Rafat</dc:creator>
    ${post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('\n    ') : ''}
    <description>${post.description || ''}</description>
    <content:encoded><![CDATA[
      ${post.content.substring(0, 500)}...
      <p><a href="${SITE_URL}/blog/${post.slug}/">Continue reading →</a></p>
    ]]></content:encoded>
    ${post.image ? `<enclosure url="${SITE_URL}/assets/images/blog/${post.image}" length="0" type="image/jpeg" />` : ''}
  </item>
`).join('');

const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
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
      <url>https://avatars.githubusercontent.com/u/13638758?s=400&u=2b3265acd3fa799a558f8b95d147053cbf4e7767&v=4</url>
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

// ===== GENERATE SITEMAP =====
console.log('7. Generating sitemap...');
const sitemapEntries = [
  `<url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`,
  `<url>
    <loc>${SITE_URL}/blog/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
];

posts.forEach(post => {
  const lastMod = post.updated || post.date;
  sitemapEntries.push(`<url>
    <loc>${SITE_URL}/blog/${post.slug}/</loc>
    <lastmod>${new Date(lastMod).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    ${post.image ? `<image:image>
      <image:loc>${SITE_URL}/assets/images/blog/${post.image}</image:loc>
      <image:title>${post.title}</image:title>
      <image:caption>${post.description || ''}</image:caption>
    </image:image>` : ''}
  </url>`);
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${sitemapEntries.join('\n  ')}
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
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 650px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #2c3e50; }
    a { color: #3498db; }
  </style>
</head>
<body>
  <h1>Page Not Found</h1>
  <p>The page you're looking for doesn't exist.</p>
  <p>Here are some helpful links:</p>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/blog/">Blog</a></li>
  </ul>
</body>
</html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), notFoundPage);
console.log('   ✓ Generated: /404.html');

// ===== FINAL OUTPUT SUMMARY =====
console.log('\n=== Build Complete! ===');
console.log('Generated files:');
console.log('- /blog/index.html (Blog Index)');
posts.forEach(post => {
  console.log(`- /blog/${post.slug}/index.html`);
});
console.log('- /blog/test.html (Test file)');
console.log('- /rss.xml');
console.log('- /sitemap.xml');
console.log('- /404.html');

// List the files in the output directory
console.log('\nFinal output directory structure:');
function listDir(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const isDirectory = fs.statSync(itemPath).isDirectory();
    console.log(`${prefix}${isDirectory ? '📁' : '📄'} ${item}`);
    if (isDirectory) {
      listDir(itemPath, `${prefix}  `);
    }
  }
}
listDir(OUTPUT_DIR);

console.log('\nIf you still encounter issues, check:');
console.log('1. GitHub Pages is serving from the correct branch and directory');
console.log('2. The .nojekyll file is present to prevent Jekyll processing');
console.log('3. DNS settings if using a custom domain');