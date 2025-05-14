const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');
const Handlebars = require('handlebars');

// Configure marked for syntax highlighting and other features
marked.setOptions({
  highlight: function(code, lang) {
    return code;
  },
  headerIds: true,
  gfm: true
});

// Directories
const contentDir = path.join(process.cwd(), 'content');
const templatesDir = path.join(process.cwd(), 'templates');
const outputDir = path.join(process.cwd(), 'dist');
const assetsDir = path.join(process.cwd(), 'assets');

// Clear and recreate the output directory
console.log('🧹 Cleaning output directory...');
fs.removeSync(outputDir);
fs.ensureDirSync(outputDir);
fs.ensureDirSync(path.join(outputDir, 'blog'));
fs.ensureDirSync(path.join(outputDir, 'assets'));

// Copy assets
console.log('📁 Copying assets...');
if (fs.existsSync(assetsDir)) {
  fs.copySync(assetsDir, path.join(outputDir, 'assets'));
}

// Copy static files from root directly to dist
console.log('📄 Copying static files...');
const staticFiles = ['index.html', 'robots.txt', 'CNAME'];
staticFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    fs.copySync(
      path.join(process.cwd(), file),
      path.join(outputDir, file)
    );
  }
});

// Load templates
console.log('📝 Loading templates...');
let postTemplate, blogIndexTemplate;

try {
  postTemplate = fs.readFileSync(
    path.join(templatesDir, 'post.html'),
    'utf8'
  );
  blogIndexTemplate = fs.readFileSync(
    path.join(templatesDir, 'blog-index.html'),
    'utf8'
  );
} catch (error) {
  console.error('❌ Error loading templates:', error);
  process.exit(1);
}

// Compile templates
const compilePost = Handlebars.compile(postTemplate);
const compileBlogIndex = Handlebars.compile(blogIndexTemplate);

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

// Parse and process all blog posts
console.log('🔍 Finding and processing blog posts...');
const postsDir = path.join(contentDir, 'blog');
const posts = [];

if (fs.existsSync(postsDir)) {
  fs.readdirSync(postsDir).forEach(file => {
    if (path.extname(file) === '.md') {
      console.log(`  Processing: ${file}`);
      const filePath = path.join(postsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Parse frontmatter and content
      const { data, content: markdownContent } = matter(content);

      // Generate HTML from markdown
      const html = marked.parse(markdownContent);

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
        tagsHtml: data.tags ? data.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('\n') : ''
      };

      // Add to posts array
      posts.push(post);
    }
  });
}

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Process each post and save it to the correct location
console.log('💾 Saving blog posts...');
posts.forEach(post => {
  // IMPORTANT: Save to /blog/slug/ directory, NOT /content/blog/
  const postOutputDir = path.join(outputDir, 'blog', post.slug);
  fs.ensureDirSync(postOutputDir);

  // Write post HTML file as index.html in the post directory
  fs.writeFileSync(
    path.join(postOutputDir, 'index.html'),
    compilePost({
      post,
      siteUrl: 'https://saadman.dev'
    })
  );

  console.log(`  Saved: /blog/${post.slug}/`);
});

// Generate blog index
console.log('📑 Generating blog index...');
fs.writeFileSync(
  path.join(outputDir, 'blog', 'index.html'),
  compileBlogIndex({
    posts,
    siteUrl: 'https://saadman.dev',
    has_more_pages: posts.length > 10
  })
);

// Generate RSS feed
console.log('📡 Generating RSS feed...');
const rssItems = posts.map(post => `
  <item>
    <title>${post.title}</title>
    <link>https://saadman.dev/blog/${post.slug}/</link>
    <guid isPermaLink="true">https://saadman.dev/blog/${post.slug}/</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <dc:creator>Saadman Rafat</dc:creator>
    ${post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('\n    ') : ''}
    <description>${post.description}</description>
    <content:encoded><![CDATA[
      ${post.content.substring(0, 500)}...
      <p><a href="https://saadman.dev/blog/${post.slug}/">Continue reading →</a></p>
    ]]></content:encoded>
    ${post.image ? `<enclosure url="https://saadman.dev/assets/images/blog/${post.image}" length="0" type="image/jpeg" />` : ''}
  </item>
`).join('');

const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Saadman Rafat's Blog</title>
    <description>Insights on Python development, serverless architecture, Docker, Kubernetes, and AI research by Saadman Rafat.</description>
    <link>https://saadman.dev/blog/</link>
    <atom:link href="https://saadman.dev/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Saadman.dev Blog Engine</generator>
    <copyright>© ${new Date().getFullYear()} Saadman Rafat</copyright>
    <ttl>60</ttl>
    <image>
      <url>https://avatars.githubusercontent.com/u/13638758?s=400&u=2b3265acd3fa799a558f8b95d147053cbf4e7767&v=4</url>
      <title>Saadman Rafat's Blog</title>
      <link>https://saadman.dev/blog/</link>
      <width>144</width>
      <height>144</height>
    </image>
    ${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(path.join(outputDir, 'rss.xml'), rssFeed);

// Generate sitemap
console.log('🗺️ Generating sitemap...');
const sitemapEntries = [
  `<url>
    <loc>https://saadman.dev/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`,
  `<url>
    <loc>https://saadman.dev/blog/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
];

posts.forEach(post => {
  const lastMod = post.updated || post.date;
  sitemapEntries.push(`<url>
    <loc>https://saadman.dev/blog/${post.slug}/</loc>
    <lastmod>${new Date(lastMod).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    ${post.image ? `<image:image>
      <image:loc>https://saadman.dev/assets/images/blog/${post.image}</image:loc>
      <image:title>${post.title}</image:title>
      <image:caption>${post.description}</image:caption>
    </image:image>` : ''}
  </url>`);
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${sitemapEntries.join('\n  ')}
</urlset>`;

fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);

// List all generated files
console.log('\n✅ Build complete! Generated files:');
console.log('  /blog/index.html (Blog Index)');
posts.forEach(post => {
  console.log(`  /blog/${post.slug}/index.html`);
});
console.log('  /rss.xml');
console.log('  /sitemap.xml');