export async function detectGameMetadata(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }

  let targetUrl = url.trim();
  // 1. Extract src from <iframe> tag if user pasted full embed iframe
  const iframeMatch = targetUrl.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) {
    targetUrl = iframeMatch[1];
  }

  // 2. Check if it's a Google opensocial gadget URL with embedded ?url=
  let gadgetXmlUrl = null;
  if (targetUrl.includes('opensocial.googleusercontent.com/gadgets/ifr') || targetUrl.includes('/game-proxy/gadgets/ifr')) {
    try {
      const parsed = new URL(targetUrl, 'http://localhost');
      gadgetXmlUrl = parsed.searchParams.get('url');
    } catch {}
  } else if (targetUrl.endsWith('.xml') || targetUrl.includes('.xml?')) {
    gadgetXmlUrl = targetUrl;
  }

  let detected = {
    thumbnail: '',
    banner: '',
    previewVideo: '',
    title: '',
    description: ''
  };

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  // Heuristic 0: YouTube & Shorts URLs
  const ytMatch = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
  if (ytMatch) {
    const vidId = ytMatch[1];
    detected.thumbnail = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
    detected.banner = detected.thumbnail;
    detected.previewVideo = targetUrl;
  }

  // Heuristic 1: CrazyGames URLs (Direct High-Res 16:9 Cover & Video Teaser)
  const cgMatch = targetUrl.match(/crazygames\.com\/(?:game|embed|en_US)\/([a-zA-Z0-9-]+)/i) ||
                  targetUrl.match(/https?:\/\/([a-zA-Z0-9-]+)\.game-files\.crazygames\.com/i) ||
                  targetUrl.match(/https?:\/\/files\.crazygames\.com\/([a-zA-Z0-9-]+)/i);
  if (cgMatch) {
    const slug = cgMatch[1];
    detected.thumbnail = `https://images.crazygames.com/games/${slug}/cover-16x9.png`;
    detected.previewVideo = `https://videos.crazygames.com/games/${slug}/cover-16x9.mp4`;
    detected.banner = detected.thumbnail;
    detected.title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Direct video file
  if (/\.(mp4|webm|ogg)($|\?)/i.test(targetUrl) && !detected.previewVideo) {
    detected.previewVideo = targetUrl;
  }

  // Heuristic 2: Poki URLs
  const pokiMatch = targetUrl.match(/poki\.com\/(?:[a-zA-Z-]+\/)?g\/([a-zA-Z0-9-]+)/i);
  if (pokiMatch) {
    const slug = pokiMatch[1];
    detected.thumbnail = `https://img.poki.com/cdn-cgi/image/quality=78,width=600,height=600,fit=cover,f=auto/${slug}.png`;
    if (!detected.title) detected.title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Heuristic 3: GameMonetize
  const gmMatch = targetUrl.match(/gamemonetize\.(?:com|co)\/([a-zA-Z0-9]+)/i) || targetUrl.match(/html5\.gamemonetize\.com\/([a-zA-Z0-9]+)/i);
  if (gmMatch) {
    const id = gmMatch[1];
    detected.thumbnail = `https://img.gamemonetize.com/${id}/512x384.jpg`;
    detected.banner = detected.thumbnail;
  }

  // Heuristic 4: GameDistribution
  const gdMatch = targetUrl.match(/html5\.gamedistribution\.com\/([a-zA-Z0-9]+)/i);
  if (gdMatch) {
    const id = gdMatch[1];
    detected.thumbnail = `https://img.gamedistribution.com/${id}-512x384.jpeg`;
    detected.banner = detected.thumbnail;
  }

  // Case A: Google Gadgets XML Extraction
  if (gadgetXmlUrl && !detected.thumbnail) {
    try {
      const xmlResp = await fetch(gadgetXmlUrl, { headers: fetchHeaders, signal: AbortSignal.timeout(6000) });
      if (xmlResp.ok) {
        const xmlText = await xmlResp.text();
        
        const titleMatch = xmlText.match(/<ModulePrefs[^>]*\btitle=["']([^"']+)["']/i) || xmlText.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) detected.title = titleMatch[1];

        const thumbMatch = xmlText.match(/<ModulePrefs[^>]*\bthumbnail=["']([^"']+)["']/i) ||
                           xmlText.match(/<Thumbnail>([^<]+)<\/Thumbnail>/i) ||
                           xmlText.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
        if (thumbMatch) detected.thumbnail = thumbMatch[1];

        const descMatch = xmlText.match(/<ModulePrefs[^>]*\bdescription=["']([^"']+)["']/i) ||
                          xmlText.match(/<Description>([^<]+)<\/Description>/i);
        if (descMatch) detected.description = descMatch[1];

        const screenshotMatch = xmlText.match(/<Screenshot[^>]*\burl=["']([^"']+)["']/i) || xmlText.match(/<Screenshot>([^<]+)<\/Screenshot>/i);
        if (screenshotMatch) {
          detected.banner = screenshotMatch[1];
          if (!detected.thumbnail) detected.thumbnail = screenshotMatch[1];
        }

        // Resolve relative XML assets
        if (detected.thumbnail && !detected.thumbnail.startsWith('http')) {
          try {
            detected.thumbnail = new URL(detected.thumbnail, gadgetXmlUrl).href;
          } catch {}
        }
        if (detected.banner && !detected.banner.startsWith('http')) {
          try {
            detected.banner = new URL(detected.banner, gadgetXmlUrl).href;
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Gadget XML fetch error:', err.message);
    }
  }

  // Case B: General Web Page / OpenGraph / JSON-LD / HTML5 Extraction
  if (!detected.thumbnail) {
    let finalFetchUrl = targetUrl;
    if (!finalFetchUrl.startsWith('http://') && !finalFetchUrl.startsWith('https://')) {
      finalFetchUrl = 'https://' + finalFetchUrl;
    }

    try {
      const resp = await fetch(finalFetchUrl, { headers: fetchHeaders, signal: AbortSignal.timeout(6000) });
      const contentType = resp.headers.get('content-type') || '';

      // If direct image URL was passed
      if (contentType.startsWith('image/')) {
        detected.thumbnail = finalFetchUrl;
        detected.banner = finalFetchUrl;
      } else if (contentType.includes('text/html') || contentType.includes('application/xhtml') || contentType.includes('application/xml')) {
        const html = await resp.text();

        // 1. JSON-LD structured metadata extraction
        try {
          const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          if (jsonLdMatches) {
            for (const block of jsonLdMatches) {
              const rawJson = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
              const parsed = JSON.parse(rawJson);
              const item = Array.isArray(parsed) ? parsed[0] : (parsed?.['@graph'] ? parsed['@graph'][0] : parsed);
              if (item) {
                if (item.image) {
                  detected.thumbnail = typeof item.image === 'string' ? item.image : (item.image.url || item.image[0]);
                } else if (item.thumbnailUrl) {
                  detected.thumbnail = typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : item.thumbnailUrl[0];
                }
                if (item.name && !detected.title) detected.title = item.name;
                if (item.description && !detected.description) detected.description = item.description;
                if (detected.thumbnail) break;
              }
            }
          }
        } catch {}

        // 2. OpenGraph and Twitter meta tag image extraction
        if (!detected.thumbnail) {
          const ogImgMatch = html.match(/<meta[^>]*property=["']og:image(?::url|:secure_url)?["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image(?::url|:secure_url)?["']/i) ||
                             html.match(/<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i) ||
                             html.match(/<link[^>]*rel=["'](?:image_src|apple-touch-icon|icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);
          
          if (ogImgMatch) {
            detected.thumbnail = ogImgMatch[1];
          }
        }

        // 3. Fallback to prominent in-page game banner/cover image
        if (!detected.thumbnail) {
          const imgTagMatch = html.match(/<img[^>]*class=["'][^"']*(?:cover|thumb|poster|banner|hero|game-img)[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                              html.match(/<img[^>]*src=["']([^"']*(?:cover|thumb|banner|screenshot|icon)[^"']*)["']/i);
          if (imgTagMatch) {
            detected.thumbnail = imgTagMatch[1];
          }
        }

        // OpenGraph video preview
        const ogVideoMatch = html.match(/<meta[^>]*property=["']og:video(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/i);
        if (ogVideoMatch) {
          detected.previewVideo = ogVideoMatch[1];
        }

        // Title
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (ogTitleMatch && !detected.title) {
          detected.title = ogTitleMatch[1].replace(/ - Play on .*| \| Play Online.*| - Poki| - CrazyGames| - Free Online Games/i, '').trim();
        }

        // Description
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (ogDescMatch && !detected.description) {
          detected.description = ogDescMatch[1].trim();
        }

        // Resolve relative URL to absolute URL
        if (detected.thumbnail && !detected.thumbnail.startsWith('http')) {
          try {
            detected.thumbnail = new URL(detected.thumbnail, finalFetchUrl).href;
          } catch {}
        }
        if (detected.thumbnail && !detected.banner) {
          detected.banner = detected.thumbnail;
        }
      }
    } catch (err) {
      console.warn('HTML fetch error:', err.message);
    }
  }

  if (detected.thumbnail) detected.thumbnail = detected.thumbnail.replace(/&amp;/g, '&').trim();
  if (detected.banner) detected.banner = detected.banner.replace(/&amp;/g, '&').trim();

  return detected;
}
