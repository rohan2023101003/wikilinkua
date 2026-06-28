import { LANGUAGES } from './sparql';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

async function commonsApi(params) {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({ ...params, format: 'json', origin: '*' }).toString();
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Commons API error: ' + res.statusText);
  return res.json();
}

export function getLang(qid) {
  return LANGUAGES.find(l => l.qid === qid) || null;
}

export async function fetchVideosInLanguage(langName) {
  const categories = [
    `Category:Videos in ${langName}`,
    `Category:${langName} videos`,
    `Category:${langName}-language videos`,
  ];
  for (const cmtitle of categories) {
    const data = await commonsApi({
      action: 'query',
      list: 'categorymembers',
      cmtitle,
      cmtype: 'file',
      cmlimit: '500',
    });
    const members = (data.query?.categorymembers || []).map(m => m.title);
    if (members.length > 0) return members;
  }
  return [];
}

export async function fetchVideoThumbnails(titles) {
  const results = {};
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const data = await commonsApi({
      action: 'query',
      titles: chunk.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '400',
    });
    Object.values(data.query?.pages || {}).forEach(page => {
      const info = page.imageinfo?.[0];
      if (info?.url) {
        const name = (info.extmetadata?.ObjectName?.value || page.title.replace(/^File:/, '')).replace(/\.[^.]+$/, '');
        results[page.title] = { title: page.title, name, thumbUrl: info.thumburl || null, videoUrl: info.url };
      }
    });
  }
  return results;
}

// Batch-check which TimedText subtitle pages actually exist.
// Returns Map<videoTitle, Set<langCode>> for tracks that exist.
export async function checkSubtitleTracks(videoTitles, langCodes) {
  const result = new Map(videoTitles.map(t => [t, new Set()]));

  const checks = videoTitles.flatMap(title => {
    const bare = title.replace(/^File:/, '');
    return langCodes.map(code => ({ tt: `TimedText:${bare}.${code}.srt`, title, code }));
  });

  for (let i = 0; i < checks.length; i += 50) {
    const chunk = checks.slice(i, i + 50);
    const lookup = new Map(chunk.map(c => [c.tt.replace(/_/g, ' '), c]));
    const data = await commonsApi({
      action: 'query',
      titles: chunk.map(c => c.tt).join('|'),
      prop: 'info',
    });
    Object.values(data.query?.pages || {}).forEach(page => {
      if (!('missing' in page)) {
        const entry = lookup.get(page.title.replace(/_/g, ' '));
        if (entry) result.get(entry.title)?.add(entry.code);
      }
    });
  }

  return result;
}

export async function fetchSubtitleRaw(fileTitle, langCode) {
  const bare = fileTitle.replace(/^File:/, '');
  const data = await commonsApi({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: `TimedText:${bare}.${langCode}.srt`,
  });
  const page = Object.values(data.query?.pages || {})[0];
  return page?.revisions?.[0]?.slots?.main?.['*'] || null;
}

export function parseSrt(srtText) {
  if (!srtText) return [];
  return srtText.trim().split(/\n\s*\n/).flatMap(block => {
    const lines = block.split('\n');
    const tsIdx = lines.findIndex(l => l.includes('-->'));
    if (tsIdx < 0) return [];
    return [lines.slice(tsIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim()];
  }).filter(Boolean);
}

export function srtToVttBlob(srtText) {
  if (!srtText) return null;
  const vtt = 'WEBVTT\n\n' + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}

export function extractLemmas(srtText) {
  const lines = parseSrt(srtText);
  const tokens = lines.join(' ').toLowerCase().match(/[\p{L}]+/gu) || [];
  return [...new Set(tokens)].filter(t => t.length > 2);
}
