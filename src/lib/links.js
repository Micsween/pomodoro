const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;

// Accepts "90", "90s", "1m30s", "1h2m3s" and returns seconds.
export function parseStartTime(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

// Returns a YouTube embed URL for the given link, or null if it isn't YouTube.
export function youtubeEmbedUrl(url) {
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;

  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1];
  } else {
    return null;
  }

  const list = url.searchParams.get('list');
  // enablejsapi lets the page pause the player with postMessage.
  const params = new URLSearchParams({ autoplay: '1', rel: '0', enablejsapi: '1' });
  const start = parseStartTime(url.searchParams.get('t') || url.searchParams.get('start'));
  if (start) params.set('start', String(start));

  if (id && /^[\w-]{6,}$/.test(id)) {
    if (list) params.set('list', list);
    return `https://www.youtube.com/embed/${id}?${params}`;
  }
  if (list) {
    params.set('list', list);
    return `https://www.youtube.com/embed/videoseries?${params}`;
  }
  return null;
}

// Works out what to show for a pasted link. Returns
//   { error }                                  when it can't be shown, or
//   { media: { kind, src }, status, href }     where kind is 'youtube', 'video' or 'page'.
export function resolveLink(raw, { isFile = false } = {}) {
  let text = raw.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = 'https://' + text;

  let url;
  try {
    url = new URL(text);
  } catch (e) {
    return { error: "That doesn't look like a link." };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Only http and https links can be loaded.' };
  }

  const isYouTubeHost = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(url.hostname);
  const embed = youtubeEmbedUrl(url);

  if (embed) {
    return {
      media: { kind: 'youtube', src: embed },
      status: isFile
        ? 'Playing from YouTube. If you see "Error 153", open this page through a local server instead of as a file.'
        : 'Playing from YouTube.',
      href: url.href,
    };
  }
  if (isYouTubeHost) return { error: "Couldn't find a video or playlist in that YouTube link." };
  if (VIDEO_FILE.test(url.pathname)) {
    return { media: { kind: 'video', src: url.href }, status: 'Playing video file.', href: url.href };
  }
  return {
    media: { kind: 'page', src: url.href },
    status: 'Trying to embed this page. Many sites block embedding, so it may stay blank.',
    href: url.href,
  };
}
