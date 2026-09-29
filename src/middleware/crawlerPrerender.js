import { Game } from '../models/Game.js';
import { Category } from '../models/Category.js';

const BOT_USER_AGENTS = /bot|crawl|spider|facebookexternalhit|whatsapp|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|pinterest|googlebot|bingbot|yandex|duckduckbot/i;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

export async function handleGamePrerender(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  const isBot = BOT_USER_AGENTS.test(userAgent);

  const gameId = req.params.id;
  if (!gameId) return next();

  try {
    const game = await Game.findOne({ id: gameId });
    const cleanSlug = game ? toGameSlug(game.title) : toGameSlug(gameId);

    // If not a bot and not explicitly asking for preview, redirect to frontend client port if needed or pass
    const isPreview = req.query.preview === '1' || req.query.seo === '1';
    if (!isBot && !isPreview) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(302, `${frontendUrl}/game/${encodeURIComponent(cleanSlug)}`);
    }

    if (!game) {
      return res.status(404).send('<!DOCTYPE html><html><head><title>Game Not Found | NextGenn</title></head><body><h1>Game Not Found</h1></body></html>');
    }

    const host = req.get('x-forwarded-host') || req.get('host') || 'nextgenn.com';
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const baseUrl = `${proto}://${host}`.replace(':5000', ':5173');
    const gameUrl = `${baseUrl}/game/${encodeURIComponent(cleanSlug)}`;
    const title = `${escapeHtml(game.title)} - Play Free Online on NextGenn`;
    const description = escapeHtml(game.description || `Play ${game.title} free online in your browser on NextGenn. Fast, instant arcade and HTML5 gameplay with zero downloads.`);
    const image = escapeHtml(game.thumbnail || `${baseUrl}/logo.png`);
    const category = escapeHtml(game.category || 'Arcade');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'VideoGame',
          'name': game.title,
          'description': game.description || `Play ${game.title} free online on NextGenn.`,
          'image': game.thumbnail || `${baseUrl}/logo.png`,
          'url': gameUrl,
          'genre': game.category || 'Arcade',
          'gamePlatform': ['Web Browser', 'Desktop', 'Mobile', 'Tablet'],
          'applicationCategory': 'Game',
          'operatingSystem': 'Any',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD'
          },
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': Number(game.rating || 4.8).toFixed(1),
            'ratingCount': Math.max(Number(game.likes || 0) + Number(game.dislikes || 0), 10)
          }
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': `${baseUrl}/`
            },
            {
              '@type': 'ListItem',
              'position': 2,
              'name': category,
              'item': `${baseUrl}/category/${encodeURIComponent(category.toLowerCase())}`
            },
            {
              '@type': 'ListItem',
              'position': 3,
              'name': game.title,
              'item': gameUrl
            }
          ]
        }
      ]
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${escapeHtml(game.title)}, play ${escapeHtml(game.title)}, ${category} games, free online games, nextgenn">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${gameUrl}">

  <!-- OpenGraph -->
  <meta property="og:type" content="game">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${gameUrl}">
  <meta property="og:site_name" content="NextGenn Games">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body>
  <article>
    <h1>${escapeHtml(game.title)}</h1>
    <p>Category: <strong>${category}</strong></p>
    <img src="${image}" alt="${escapeHtml(game.title)}" width="400" />
    <p>${description}</p>
    <p><a href="${gameUrl}">Click here to play ${escapeHtml(game.title)} instantly in your browser on NextGenn</a></p>
  </article>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600'
    });
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error pre-rendering game SEO:', err);
    return next();
  }
}
