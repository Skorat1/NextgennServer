export function sanitizeGameUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();

  // 1. Extract src if an <iframe> snippet was provided
  const iframeMatch = clean.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) {
    clean = iframeMatch[1];
  }

  clean = clean.replace(/^https?:\/\/"https?:\/\//i, 'https://');
  clean = clean.replace(/^"|"$/g, '').trim();
  clean = clean.replace(/&amp;/g, '&');

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
