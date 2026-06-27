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

async function fetchCategoryFiles(cmtitle) {
  const data = await commonsApi({
    action: 'query',
    list: 'categorymembers',
    cmtitle,
    cmtype: 'file',
    cmlimit: '500',
  });
  return (data.query?.categorymembers || []).map(m => m.title);
}

export async function fetchCategoryVideos(langName) {
  return fetchCategoryFiles(`Category:Videos with ${langName} subtitles`);
}

export async function fetchVideosInLanguage(langName) {
  return fetchCategoryFiles(`Category:Videos in ${langName}`);
}

export async function fetchVideoThumbnails(titles) {
  const results = {};
  const chunkSize = 50;
  for (let i = 0; i < titles.length; i += chunkSize) {
    const chunk = titles.slice(i, i + chunkSize);
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
        const raw = page.title;
        const name = raw.replace(/^File:/, '').replace(/\.[^.]+$/, '');
        results[raw] = {
          title: raw,
          name: info.extmetadata?.ObjectName?.value || name,
          thumbUrl: info.thumburl || null,
          videoUrl: info.url,
        };
      }
    });
  }
  return results;
}

export async function fetchSubtitleRaw(fileTitle, langCode) {
  const bare = fileTitle.replace(/^File:/, '');
  const ttitle = `TimedText:${bare}.${langCode}.srt`;
  const data = await commonsApi({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: ttitle,
  });
  const page = Object.values(data.query?.pages || {})[0];
  return page?.revisions?.[0]?.slots?.main?.['*'] || null;
}

export function parseSrt(srtText) {
  if (!srtText) return [];
  const blocks = srtText.trim().split(/\n\s*\n/);
  return blocks.flatMap(block => {
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
