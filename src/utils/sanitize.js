export function sanitizeGameUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();

  // Decode common HTML entities
  clean = clean
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  // 1. Extract src if an <iframe> snippet was provided
  const iframeMatch = clean.match(/src=["']([^"']+)["']/i) || clean.match(/src=([^>\s]+)/i);
  if (iframeMatch) {
    clean = iframeMatch[1].replace(/^["']|["']$/g, '');
  }

  clean = clean.replace(/^https?:\/\/"https?:\/\//i, 'https://');
  clean = clean.replace(/^["']|["']$/g, '').trim();

  // 2. Add protocol if missing
  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('//') && !clean.startsWith('/')) {
    clean = 'https://' + clean;
  }

  return clean;
}

export function sanitizeUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.__v;
  return obj;
}
