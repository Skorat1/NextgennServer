import zlib from 'zlib';
import crypto from 'crypto';
import { query, isMySQLConnected } from '../config/db.js';

/**
 * In-memory cache for ultra-fast sitemap delivery and low database load
 */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sitemapCache = new Map();

export function clearSitemapCache() {
  sitemapCache.clear();
}

/**
 * Escapes characters for strict XML conformance (RFC 3023 / W3C Sitemap protocol)
 */
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalizes date to GameMonetize standard W3C ISO 8601 format: YYYY-MM-DDTHH:mm:ss+00:00
 */
function formatW3cDateTime(dateVal) {
  if (!dateVal) return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
    return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
  } catch {
    return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  }
}

/**
 * Converts a game title or object into a clean SEO URL-friendly slug
 * e.g. "Need for Race" -> "need-for-race"
 */
function toGameSlug(gameOrTitle) {
  if (!gameOrTitle) return '';
  const title = typeof gameOrTitle === 'string'
    ? gameOrTitle
    : (gameOrTitle.title || gameOrTitle.name || gameOrTitle.id || '');

  const slug = String(title)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || (typeof gameOrTitle === 'object' && gameOrTitle.id ? String(gameOrTitle.id).toLowerCase() : '');
}

/**
 * Resolves the canonical base public URL
 */
function getCanonicalBaseUrl(req) {
  const envUrl = process.env.SITE_URL || process.env.FRONTEND_URL || process.env.BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const rawHost = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5173';

  let baseUrl = `${proto}://${rawHost}`.replace(/\/+$/, '');
  if (baseUrl.includes(':5000')) {
    baseUrl = baseUrl.replace(':5000', ':5173');
  }

  return baseUrl;
}

/**
 * Formats image URLs so they are absolute URLs required by Google Image Sitemap
 */
function resolveAbsoluteImageUrl(imgUrl, baseUrl) {
  if (!imgUrl) return '';
  const trimmed = String(imgUrl).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Sends XML with caching, ETag, HTTP 304, and Gzip compression
 */
function sendXmlResponse(req, res, xmlContent) {
  const etag = `"${crypto.createHash('md5').update(xmlContent).digest('hex')}"`;
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff'
  });

  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip') && xmlContent.length > 1024) {
    res.set('Content-Encoding', 'gzip');
    const gzipped = zlib.gzipSync(Buffer.from(xmlContent, 'utf-8'));
    return res.status(200).send(gzipped);
  }

  return res.status(200).send(xmlContent);
}

/**
 * Fetches games & blog posts from MySQL
 */
async function fetchSitemapData() {
  let activeGames = [];
  let blogPosts = [];

  if (isMySQLConnected()) {
    try {
      const [gamesRes, blogsRes] = await Promise.all([
        query("SELECT id, title, thumbnail, updatedAt, createdAt FROM games WHERE status = 'active' ORDER BY updatedAt DESC"),
        query("SELECT id, title, image, updatedAt, createdAt FROM blog_posts WHERE published = 1 ORDER BY createdAt DESC")
      ]);
      activeGames = Array.isArray(gamesRes) ? gamesRes : [];
      blogPosts = Array.isArray(blogsRes) ? blogsRes : [];
    } catch (err) {
      console.warn('Sitemap MySQL fetch notice:', err.message);
    }
  }

  return { activeGames, blogPosts };
}

/**
 * Standard GameMonetize Schema & Structure Generator
 * Directly produces <urlset> with xsi:schemaLocation and 4-decimal precision priorities
 */
function buildGameMonetizeStyleXml(baseUrl, activeGames, blogPosts) {
  const nowW3c = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

  const staticRoutes = [
    { path: '', changefreq: 'daily', priority: '1.0000' },
    { path: 'trending', changefreq: 'daily', priority: '0.8000' },
    { path: 'most-played', changefreq: 'daily', priority: '0.8000' },
    { path: 'top-rated', changefreq: 'daily', priority: '0.8000' },
    { path: 'new', changefreq: 'daily', priority: '0.8000' },
    { path: 'blog', changefreq: 'daily', priority: '0.8000' },
    { path: 'developers', changefreq: 'daily', priority: '0.8000' },
    { path: 'about', changefreq: 'monthly', priority: '0.8000' },
    { path: 'faq', changefreq: 'monthly', priority: '0.8000' },
    { path: 'contact', changefreq: 'monthly', priority: '0.7000' },
    { path: 'privacy', changefreq: 'monthly', priority: '0.4000' },
    { path: 'terms', changefreq: 'monthly', priority: '0.4000' },
    { path: 'disclaimer', changefreq: 'monthly', priority: '0.4000' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset\n';
  xml += '      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '      xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '      xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '      xsi:schemaLocation="\n';
  xml += '            http://www.sitemaps.org/schemas/sitemap/0.9\n';
  xml += '            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n\n';

  // 1. Static Pages
  for (const r of staticRoutes) {
    const pageLoc = r.path ? `${baseUrl}/${r.path}` : `${baseUrl}/`;
    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(pageLoc)}</loc>\n`;
    xml += `       <lastmod>${nowW3c}</lastmod>\n`;
    xml += `       <changefreq>${r.changefreq}</changefreq>\n`;
    xml += `       <priority>${r.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  // 2. Published Blog Posts
  for (const post of blogPosts) {
    const postId = post.id;
    if (!postId) continue;
    const postUrl = `${baseUrl}/blog/${encodeURIComponent(postId)}`;
    const lastMod = formatW3cDateTime(post.updatedAt || post.createdAt);
    const postImage = resolveAbsoluteImageUrl(post.image, baseUrl);

    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(postUrl)}</loc>\n`;
    xml += `       <lastmod>${lastMod}</lastmod>\n`;
    xml += '       <changefreq>daily</changefreq>\n';
    xml += '       <priority>0.8000</priority>\n';
    if (postImage) {
      xml += '       <image:image>\n';
      xml += `            <image:loc>${escapeXml(postImage)}</image:loc>\n`;
      if (post.title) {
        xml += `            <image:title>${escapeXml(post.title)}</image:title>\n`;
      }
      xml += '       </image:image>\n';
    }
    xml += '  </url>\n';
  }

  // 3. Active Games with Game Name Slugs (Need for Race -> need-for-race)
  for (const game of activeGames) {
    const gid = game.id;
    if (!gid) continue;
    const gameSlug = toGameSlug(game.title || gid);
    const gameUrl = `${baseUrl}/game/${encodeURIComponent(gameSlug)}`;
    const lastMod = formatW3cDateTime(game.updatedAt || game.createdAt);
    const thumbUrl = resolveAbsoluteImageUrl(game.thumbnail, baseUrl);

    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(gameUrl)}</loc>\n`;
    xml += `       <lastmod>${lastMod}</lastmod>\n`;
    xml += '       <changefreq>daily</changefreq>\n';
    xml += '       <priority>0.8000</priority>\n';
    if (thumbUrl) {
      xml += '       <image:image>\n';
      xml += `            <image:loc>${escapeXml(thumbUrl)}</image:loc>\n`;
      if (game.title) {
        xml += `            <image:title>${escapeXml(game.title)}</image:title>\n`;
      }
      xml += '       </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Builds XML for static pages only (/sitemap-pages.xml)
 */
function buildPagesSitemapXml(baseUrl) {
  const nowW3c = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  const staticRoutes = [
    { path: '', changefreq: 'daily', priority: '1.0000' },
    { path: 'trending', changefreq: 'daily', priority: '0.8000' },
    { path: 'most-played', changefreq: 'daily', priority: '0.8000' },
    { path: 'top-rated', changefreq: 'daily', priority: '0.8000' },
    { path: 'new', changefreq: 'daily', priority: '0.8000' },
    { path: 'blog', changefreq: 'daily', priority: '0.8000' },
    { path: 'developers', changefreq: 'daily', priority: '0.8000' },
    { path: 'about', changefreq: 'monthly', priority: '0.8000' },
    { path: 'faq', changefreq: 'monthly', priority: '0.8000' },
    { path: 'contact', changefreq: 'monthly', priority: '0.7000' },
    { path: 'privacy', changefreq: 'monthly', priority: '0.4000' },
    { path: 'terms', changefreq: 'monthly', priority: '0.4000' },
    { path: 'disclaimer', changefreq: 'monthly', priority: '0.4000' }
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  for (const r of staticRoutes) {
    const pageLoc = r.path ? `${baseUrl}/${r.path}` : `${baseUrl}/`;
    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(pageLoc)}</loc>\n`;
    xml += `       <lastmod>${nowW3c}</lastmod>\n`;
    xml += `       <changefreq>${r.changefreq}</changefreq>\n`;
    xml += `       <priority>${r.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Builds XML for games only (/sitemap-games.xml)
 */
function buildGamesSitemapXml(baseUrl, activeGames) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  for (const game of activeGames) {
    const gid = game.id;
    if (!gid) continue;
    const gameSlug = toGameSlug(game.title || gid);
    const gameUrl = `${baseUrl}/game/${encodeURIComponent(gameSlug)}`;
    const lastMod = formatW3cDateTime(game.updatedAt || game.createdAt);
    const thumbUrl = resolveAbsoluteImageUrl(game.thumbnail, baseUrl);

    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(gameUrl)}</loc>\n`;
    xml += `       <lastmod>${lastMod}</lastmod>\n`;
    xml += '       <changefreq>daily</changefreq>\n';
    xml += '       <priority>0.8000</priority>\n';
    if (thumbUrl) {
      xml += '       <image:image>\n';
      xml += `            <image:loc>${escapeXml(thumbUrl)}</image:loc>\n`;
      if (game.title) {
        xml += `            <image:title>${escapeXml(game.title)}</image:title>\n`;
      }
      xml += '       </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Builds XML for blogs only (/sitemap-blogs.xml)
 */
function buildBlogsSitemapXml(baseUrl, blogPosts) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

  for (const post of blogPosts) {
    const postId = post.id;
    if (!postId) continue;
    const postUrl = `${baseUrl}/blog/${encodeURIComponent(postId)}`;
    const lastMod = formatW3cDateTime(post.updatedAt || post.createdAt);
    const postImage = resolveAbsoluteImageUrl(post.image, baseUrl);

    xml += '  <url>\n';
    xml += `       <loc>${escapeXml(postUrl)}</loc>\n`;
    xml += `       <lastmod>${lastMod}</lastmod>\n`;
    xml += '       <changefreq>daily</changefreq>\n';
    xml += '       <priority>0.8000</priority>\n';
    if (postImage) {
      xml += '       <image:image>\n';
      xml += `            <image:loc>${escapeXml(postImage)}</image:loc>\n`;
      if (post.title) {
        xml += `            <image:title>${escapeXml(post.title)}</image:title>\n`;
      }
      xml += '       </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Builds Sitemap Index XML (<sitemapindex>) if explicitly requested (?type=index)
 */
function buildIndexXml(baseUrl, gamesLastMod, blogsLastMod) {
  const nowW3c = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <sitemap>\n';
  xml += `       <loc>${escapeXml(baseUrl)}/sitemap-pages.xml</loc>\n`;
  xml += `       <lastmod>${nowW3c}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '  <sitemap>\n';
  xml += `       <loc>${escapeXml(baseUrl)}/sitemap-games.xml</loc>\n`;
  xml += `       <lastmod>${gamesLastMod || nowW3c}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '  <sitemap>\n';
  xml += `       <loc>${escapeXml(baseUrl)}/sitemap-blogs.xml</loc>\n`;
  xml += `       <lastmod>${blogsLastMod || nowW3c}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '</sitemapindex>';
  return xml;
}

/**
 * Main Controller for /sitemap.xml
 * Formatted identically to https://gamemonetize.com/sitemap.xml
 */
export async function generateSitemapXml(req, res) {
  try {
    const baseUrl = getCanonicalBaseUrl(req);
    const wantsIndex = req.query.type === 'index';

    const cacheKey = `sitemap_main_${baseUrl}_${wantsIndex ? 'index' : 'gamemonetize'}`;
    const cached = sitemapCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return sendXmlResponse(req, res, cached.xml);
    }

    const { activeGames, blogPosts } = await fetchSitemapData();

    let xml = '';
    if (wantsIndex) {
      const gamesLastMod = activeGames.length > 0 ? formatW3cDateTime(activeGames[0].updatedAt || activeGames[0].createdAt) : null;
      const blogsLastMod = blogPosts.length > 0 ? formatW3cDateTime(blogPosts[0].updatedAt || blogPosts[0].createdAt) : null;
      xml = buildIndexXml(baseUrl, gamesLastMod, blogsLastMod);
    } else {
      // Default: GameMonetize type unified sitemap
      xml = buildGameMonetizeStyleXml(baseUrl, activeGames, blogPosts);
    }

    sitemapCache.set(cacheKey, { xml, timestamp: Date.now() });
    return sendXmlResponse(req, res, xml);
  } catch (err) {
    console.error('Error generating GameMonetize style sitemap:', err);
    return res.status(500).set('Content-Type', 'application/xml; charset=utf-8').send('<?xml version="1.0" encoding="UTF-8"?><error>Error generating sitemap</error>');
  }
}

/**
 * Sub-sitemap controller for /sitemap-:type.xml
 */
export async function generateSubSitemapXml(req, res) {
  try {
    const baseUrl = getCanonicalBaseUrl(req);
    const rawType = (req.params.type || '').toLowerCase();
    const cacheKey = `sitemap_sub_${baseUrl}_${rawType}`;

    const cached = sitemapCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return sendXmlResponse(req, res, cached.xml);
    }

    let xml = '';
    if (rawType === 'pages') {
      xml = buildPagesSitemapXml(baseUrl);
    } else if (rawType === 'games') {
      const { activeGames } = await fetchSitemapData();
      xml = buildGamesSitemapXml(baseUrl, activeGames);
    } else if (rawType === 'blogs' || rawType === 'blog') {
      const { blogPosts } = await fetchSitemapData();
      xml = buildBlogsSitemapXml(baseUrl, blogPosts);
    } else if (rawType === 'all') {
      const { activeGames, blogPosts } = await fetchSitemapData();
      xml = buildGameMonetizeStyleXml(baseUrl, activeGames, blogPosts);
    } else {
      return res.status(404).set('Content-Type', 'application/xml; charset=utf-8').send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap not found</error>');
    }

    sitemapCache.set(cacheKey, { xml, timestamp: Date.now() });
    return sendXmlResponse(req, res, xml);
  } catch (err) {
    console.error('Error generating sub-sitemap:', err);
    return res.status(500).set('Content-Type', 'application/xml; charset=utf-8').send('<?xml version="1.0" encoding="UTF-8"?><error>Error generating sitemap</error>');
  }
}

/**
 * Dynamic robots.txt handler pointing to active sitemaps
 */
export function generateRobotsTxt(req, res) {
  const baseUrl = getCanonicalBaseUrl(req);
  const robots = `# NextGenn Search Engine Crawler Policy
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /admin/*
Disallow: /api/
Disallow: /api/admin
Disallow: /api/admin/
Disallow: /api/admin/*
Disallow: /uploads/temp/

# Crawl-delay for optimal server performance
Crawl-delay: 1

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`;

  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400'
  });
  return res.status(200).send(robots);
}

export function generateSitemapXsl(req, res) {
  res.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400'
  });
  return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>');
}

