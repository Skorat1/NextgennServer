import { Router } from 'express';

const router = Router();

// --- GAME EMBED PROXY (CORS / CSP Bypass for XML & Google Gadget iframes) ---
router.get(['/*', ''], async (req, res, next) => {
  let targetUrl = req.query.url;
  if (!targetUrl) {
    const pathSuffix = req.originalUrl.replace(/^\/game-proxy/, '');
    if (pathSuffix.startsWith('/gadgets/ifr')) {
      targetUrl = `https://opensocial.googleusercontent.com${pathSuffix}`;
    } else if (pathSuffix.startsWith('http://') || pathSuffix.startsWith('https://')) {
      targetUrl = pathSuffix;
    }
  }

  if (!targetUrl) {
    // Fallthrough to the all route handler below
    return next();
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    if (contentType.includes('text/html')) {
      let html = await response.text();
      const autoFitStyle = `
<style id="nextgenn-fullscreen-fit">
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #000000 !important;
}
canvas, #canvas, #game, #gameCanvas, #game-canvas, #c2canvas, #unity-canvas, .webgl-content, #unityContainer {
  width: 100% !important;
  height: 100% !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  display: block !important;
  margin: 0 auto !important;
}
</style>
`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${autoFitStyle}</head>`);
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', `${autoFitStyle}</body>`);
      } else {
        html = autoFitStyle + html;
      }
      res.send(html);
      return;
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).send(`Proxy Error: ${err.message}`);
  }
});

router.all('/*', async (req, res) => {
  try {
    const subPath = req.path.replace(/^\/game-proxy/, '');
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    // Upstream server for Google Gadgets proxy
    const upstreamBase = 'https://opensocial.googleusercontent.com';
    const upstreamUrl = `${upstreamBase}${subPath}${queryString}`;

    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    };

    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    // Strip frame-busting / CSP restrictions so iframe embeds work in frontend
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');

    response.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'content-encoding'].includes(lower)) {
        res.setHeader(key, val);
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    res.status(response.status);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const autoFitStyle = `
<style id="nextgenn-fullscreen-fit">
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
}
canvas, #canvas, #game, #gameCanvas, #game-canvas, #c2canvas, #unity-canvas, iframe, embed, object {
  width: 100% !important;
  height: 100% !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  object-fit: fill !important;
  display: block !important;
  margin: 0 auto !important;
}
</style>
`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${autoFitStyle}</head>`);
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', `${autoFitStyle}</body>`);
      } else {
        html = autoFitStyle + html;
      }
      res.send(html);
      return;
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('⚠️ Game proxy error:', err.message);
    res.status(502).json({ error: 'Failed to proxy game content', details: err.message });
  }
});

export default router;
