import { describe, expect, it } from 'vitest';
import { parseStartTime, resolveLink } from './links.js';

describe('parseStartTime', () => {
  it('reads plain seconds and h/m/s forms', () => {
    expect(parseStartTime('90')).toBe(90);
    expect(parseStartTime('1m30s')).toBe(90);
    expect(parseStartTime('1h2m3s')).toBe(3723);
    expect(parseStartTime('nonsense')).toBe(0);
  });
});

describe('resolveLink', () => {
  const src = raw => resolveLink(raw).media?.src;

  it('turns YouTube links into embeds that accept commands', () => {
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&enablejsapi=1');
    expect(src('youtu.be/dQw4w9WgXcQ?t=1m30s')).toContain('start=90');
    expect(src('https://youtube.com/shorts/abcdefgh')).toContain('/embed/abcdefgh');
    expect(src('https://www.youtube.com/playlist?list=PL123')).toContain('/embed/videoseries?');
  });

  it('plays video files directly and embeds other pages', () => {
    expect(resolveLink('https://example.com/a.MP4').media.kind).toBe('video');
    expect(resolveLink('https://example.com/').media.kind).toBe('page');
  });

  it('explains links it can’t load', () => {
    expect(resolveLink('ftp://example.com').error).toMatch(/http and https/);
    expect(resolveLink('https://www.youtube.com/channel/abc').error).toMatch(/Couldn't find/);
    expect(resolveLink('   ')).toBeNull();
  });

  it('mentions Error 153 only when opened as a file', () => {
    const yt = 'https://youtu.be/dQw4w9WgXcQ';
    expect(resolveLink(yt).status).toBe('Playing from YouTube.');
    expect(resolveLink(yt, { isFile: true }).status).toMatch(/Error 153/);
  });
});
