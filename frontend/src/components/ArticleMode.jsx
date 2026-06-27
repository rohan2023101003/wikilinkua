import React, { useState, useEffect, useRef } from 'react';
import { FlashcardExercise } from './Flashcards';
import { LANGUAGES } from '../utils/sparql';

const CARD = { border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: '24px' };
const BTN_PRIMARY = { padding: '10px 20px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
const BTN_GHOST = { padding: '10px 20px', borderRadius: '2px', background: '#fff', color: '#202122', border: '1px solid #c8ccd1', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
const MIN_SENTENCES = 5;

function Spinner({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #c8ccd1', borderTop: '3px solid #3366cc', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {msg && <p style={{ color: '#54595d', fontSize: '14px', margin: 0 }}>{msg}</p>}
    </div>
  );
}

const stripHtml = (s) => s.replace(/<[^>]*>/g, '');
const sentenceCount = (text) => (text.match(/[.!?]/g) || []).length;

async function wikiApiFetch(langCode, params) {
  const url = new URL(`https://${langCode}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({ ...params, format: 'json', origin: '*' }).toString();
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Wikipedia API error: ' + res.statusText);
  return res.json();
}

function pickSeeds(words, progress) {
  const prog = progress?.words || {};
  const known    = words.filter(w => (prog[w.lexemeId]?.boxLevel || 0) >= 3);
  const learning = words.filter(w => prog[w.lexemeId] && (prog[w.lexemeId]?.boxLevel || 0) < 3);
  const fallback = words.filter(w => w.cognate || w.phoneticMatch);

  const pool = [
    ...known.sort(() => 0.5 - Math.random()).slice(0, 5),
    ...learning.sort(() => 0.5 - Math.random()).slice(0, 4),
    ...fallback.sort(() => 0.5 - Math.random()).slice(0, 7),
  ];

  const seen = new Set();
  return pool.filter(w => seen.has(w.lexemeId) ? false : (seen.add(w.lexemeId), true)).slice(0, 12);
}

export default function ArticleMode({ profile, words, progress, onAnswerWord, onNavigate }) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('idle');
  const [searchResults, setSearchResults] = useState([]);
  const [extract, setExtract] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [error, setError] = useState(null);
  const [fcWords, setFcWords] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcScore, setFcScore] = useState(0);
  const [fcDone, setFcDone] = useState(false);
  const [hasKnownLink, setHasKnownLink] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const loadedForRef = useRef(null);

  const targetLang = LANGUAGES.find(l => l.qid === profile.targetLang);
  const langCode = targetLang?.code || 'en';
  const knownLangs = (profile.knownLangs || []).map(qid => LANGUAGES.find(l => l.qid === qid)).filter(Boolean);
  const wikiApi = (params) => wikiApiFetch(langCode, params);

  // Load recommendations once per target language when words are ready
  useEffect(() => {
    if (!words.length) return;
    const key = profile.targetLang;
    if (loadedForRef.current === key) return;
    loadedForRef.current = key;

    (async () => {
      setLoadingRecs(true);
      try {
        const seeds = pickSeeds(words, progress);
        if (!seeds.length) return;

        const knownCodes = knownLangs.map(l => l.code);

        // Run seed searches and WithoutInterwiki list in parallel
        const [seedSearches, noInterwikiData] = await Promise.all([
          Promise.all(
            seeds.map(w =>
              wikiApiFetch(langCode, { action: 'query', list: 'search', srsearch: w.lemma, srlimit: '5' })
                .then(d => d.query?.search || [])
                .catch(() => [])
            )
          ),
          // Pages with no interwiki links at all — guaranteed missing in all languages
          wikiApiFetch(langCode, {
            action: 'query', list: 'querypage', qppage: 'WithoutInterwiki', qplimit: '50',
          }).catch(() => null),
        ]);

        // Seed-based candidates
        const seen = new Set();
        const seedCandidates = [];
        for (const results of seedSearches) {
          for (const r of results) {
            if (!seen.has(r.title)) {
              seen.add(r.title);
              seedCandidates.push({ title: r.title, snippet: stripHtml(r.snippet) });
            }
          }
        }

        // WithoutInterwiki candidates (exclude any already in seed results)
        const noInterwikiTitles = (noInterwikiData?.query?.querypage?.results || [])
          .map(r => r.title)
          .filter(t => !seen.has(t));

        // Batch-fetch extracts for seed candidates (with langlinks to check coverage)
        const pageMap = new Map();
        const seedTitles = seedCandidates.slice(0, 40).map(c => c.title);
        for (let i = 0; i < seedTitles.length; i += 20) {
          const chunk = seedTitles.slice(i, i + 20);
          const batchParams = {
            action: 'query', prop: 'extracts|langlinks',
            exintro: '1', explaintext: '1', lllimit: 'max',
            titles: chunk.join('|'),
          };
          if (knownCodes.length) batchParams.lllang = knownCodes.join('|');
          const data = await wikiApiFetch(langCode, batchParams);
          Object.values(data.query?.pages || {}).forEach(p => pageMap.set(p.title, p));
        }

        // Batch-fetch extracts for WithoutInterwiki candidates (no langlinks needed)
        const noInterwikiFetch = noInterwikiTitles.slice(0, 20);
        for (let i = 0; i < noInterwikiFetch.length; i += 20) {
          const chunk = noInterwikiFetch.slice(i, i + 20);
          const data = await wikiApiFetch(langCode, {
            action: 'query', prop: 'extracts', exintro: '1', explaintext: '1',
            titles: chunk.join('|'),
          });
          Object.values(data.query?.pages || {}).forEach(p => pageMap.set(p.title, p));
        }

        // Filter seed candidates by sentence count, annotate with hasKnownLink
        const seedFiltered = seedCandidates
          .map(c => {
            const page = pageMap.get(c.title);
            return { ...c, extract: page?.extract || '', hasKnownLink: (page?.langlinks || []).length > 0 };
          })
          .filter(c => sentenceCount(c.extract) >= MIN_SENTENCES);

        // Filter WithoutInterwiki candidates — hasKnownLink is definitively false
        const noInterwikiFiltered = noInterwikiFetch
          .map(title => {
            const page = pageMap.get(title);
            return { title, snippet: '', extract: page?.extract || '', hasKnownLink: false };
          })
          .filter(c => sentenceCount(c.extract) >= MIN_SENTENCES);

        // Merge: guarantee at least RESERVED slots for no-link articles
        const TOTAL = 15, RESERVED = 5;
        const allNoLink = [...noInterwikiFiltered, ...seedFiltered.filter(c => !c.hasKnownLink)];
        const allHasLink = seedFiltered.filter(c => c.hasKnownLink);
        const noLinkPick  = allNoLink.slice(0, Math.max(RESERVED, TOTAL - allHasLink.length));
        const hasLinkPick = allHasLink.slice(0, TOTAL - noLinkPick.length);
        const combined = [...noLinkPick, ...hasLinkPick].sort(() => 0.5 - Math.random());

        setRecommendations(combined);
      } catch (e) {
        // Recommendations are best-effort — silent failure is fine
      } finally {
        setLoadingRecs(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, profile.targetLang]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setPhase('searching');
    setError(null);
    try {
      const data = await wikiApi({ action: 'query', list: 'search', srsearch: query });
      setSearchResults(data.query?.search || []);
      setPhase('results');
    } catch (e) {
      setError('Search failed: ' + e.message);
      setPhase('idle');
    }
  };

  const handleSelectArticle = async (title) => {
    setPhase('loading');
    setError(null);
    try {
      const knownCodes = knownLangs.map(l => l.code);
      const params = {
        action: 'query', prop: 'extracts|langlinks',
        exintro: '1', explaintext: '1',
        lllimit: 'max',
        titles: title,
      };
      if (knownCodes.length) params.lllang = knownCodes.join('|');
      const data = await wikiApi(params);
      const page = Object.values(data.query?.pages || {})[0];
      setExtract(page?.extract || '');
      setHasKnownLink((page?.langlinks || []).length > 0);
      setArticleTitle(title);
      setPhase('article');
    } catch (e) {
      setError('Could not load article: ' + e.message);
      setPhase('results');
    }
  };

  const handleMakeFlashcards = () => {
    const tokens = (extract.toLowerCase().match(/[\p{L}]+/gu) || []).filter(t => t.length > 2);
    const unique = [...new Set(tokens)];
    const wordMap = new Map(words.map(w => [w.lemma.toLowerCase(), w]));
    const matched = unique.map(t => wordMap.get(t)).filter(w => w?.gloss);
    const deduped = [...new Map(matched.map(w => [w.lexemeId, w])).values()];
    if (!deduped.length) {
      setError('No matching vocabulary found in this article. Try a different topic.');
      return;
    }
    setFcWords(deduped.slice(0, 20));
    setFcIndex(0); setFcScore(0); setFcDone(false); setError(null);
    setPhase('flashcards');
  };

  const handleFcAnswer = (correct) => {
    const word = fcWords[fcIndex];
    if (correct) setFcScore(s => s + 1);
    onAnswerWord(word.lexemeId, correct);
    if (fcIndex + 1 < fcWords.length) setFcIndex(i => i + 1);
    else setFcDone(true);
  };

  // ── Idle / Search / Results ───────────────────────────────────────────────
  if (phase === 'idle' || phase === 'searching' || phase === 'results') {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px', color: '#202122' }}>Article Mode</h2>
          <p style={{ color: '#54595d', margin: 0, fontSize: '14px' }}>
            Read Wikipedia article extracts in {targetLang?.name}, then build flashcards from the vocabulary.
          </p>
        </div>

        {error && (
          <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#bf3c2c', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {/* Search box */}
        <div style={CARD}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={`Search ${targetLang?.name} Wikipedia…`}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #a2a9b1', borderRadius: '2px', fontSize: '14px', outline: 'none' }}
              autoFocus
            />
            <button onClick={handleSearch} style={BTN_PRIMARY} disabled={phase === 'searching'}>
              {phase === 'searching' ? 'Searching…' : 'Search'}
            </button>
          </div>

          {phase === 'results' && searchResults.length === 0 && (
            <p style={{ marginTop: '16px', color: '#72777d', fontSize: '14px', margin: '16px 0 0' }}>No results found.</p>
          )}

          {phase === 'results' && searchResults.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map(r => (
                <button
                  key={r.pageid}
                  onClick={() => handleSelectArticle(r.title)}
                  style={{ textAlign: 'left', padding: '12px 14px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eaf3ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#3366cc', marginBottom: '3px' }}>{r.title}</div>
                  <div style={{ fontSize: '13px', color: '#54595d', lineHeight: '1.5' }}>{stripHtml(r.snippet)}…</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {phase !== 'results' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#54595d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Recommended for you
            </div>

            {loadingRecs && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: '100px', background: '#eaecf0', borderRadius: '2px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
              </div>
            )}

            {!loadingRecs && recommendations.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {recommendations.map(rec => (
                  <button
                    key={rec.title}
                    onClick={() => handleSelectArticle(rec.title)}
                    style={{ textAlign: 'left', padding: '14px 16px', border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eaf3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#3366cc', lineHeight: '1.3' }}>{rec.title}</div>
                    <div style={{ fontSize: '12px', color: '#54595d', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {rec.extract.slice(0, 160)}…
                    </div>
                    {!rec.hasKnownLink && knownLangs.length > 0 && (
                      <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: '600', color: '#a66800', borderTop: '1px solid #f0e0b0', paddingTop: '6px' }}>
                        No {knownLangs[0].name} article yet
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!loadingRecs && recommendations.length === 0 && !words.length && (
              <p style={{ fontSize: '13px', color: '#72777d' }}>Recommendations load once your vocabulary data is ready.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') return <Spinner msg="Loading article…" />;

  // ── Article ───────────────────────────────────────────────────────────────
  if (phase === 'article') {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => { setPhase('idle'); setError(null); }} style={BTN_GHOST}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#202122', flex: 1 }}>{articleTitle}</h2>
        </div>

        {error && (
          <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', marginBottom: '12px' }}>
            <p style={{ margin: 0, color: '#bf3c2c', fontSize: '13px' }}>{error}</p>
          </div>
        )}

        {!hasKnownLink && knownLangs.length > 0 && (() => {
          const toLang = knownLangs[0];
          const cxUrl = `https://${toLang.code}.wikipedia.org/wiki/Special:ContentTranslation?from=${langCode}&to=${toLang.code}&page=${encodeURIComponent(articleTitle)}`;
          return (
            <div style={{ border: '1px solid #a2a9b1', borderRadius: '2px', background: '#f8f9fa', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#54595d', lineHeight: '1.5' }}>
                No {toLang.name} version of this article exists yet.
              </p>
              <a href={cxUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: '600', color: '#3366cc', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Translate it on Wikipedia ↗
              </a>
            </div>
          );
        })()}

        <div style={{ ...CARD, marginBottom: '16px', lineHeight: '1.85', fontSize: '15px', color: '#202122', maxHeight: '420px', overflowY: 'auto' }}>
          {extract || <span style={{ color: '#72777d' }}>No extract available.</span>}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <a
            href={`https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...BTN_GHOST, textDecoration: 'none', display: 'inline-block' }}
          >
            Full article ↗
          </a>
          <button onClick={handleMakeFlashcards} style={BTN_PRIMARY}>Make flashcards</button>
        </div>
      </div>
    );
  }

  // ── Flashcards ────────────────────────────────────────────────────────────
  if (phase === 'flashcards') {
    if (fcDone) {
      return (
        <div style={{ maxWidth: '550px', margin: '40px auto', ...CARD, textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Lesson complete</h3>
          <p style={{ color: '#54595d', fontSize: '14px', marginBottom: '24px' }}>
            {fcScore} / {fcWords.length} correct — from <em>{articleTitle}</em>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => { setFcIndex(0); setFcScore(0); setFcDone(false); }} style={BTN_PRIMARY}>Replay</button>
            <button onClick={() => setPhase('article')} style={BTN_GHOST}>Back to article</button>
            <button onClick={() => onNavigate('game-modes')} style={BTN_GHOST}>Home</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => setPhase('article')} style={{ ...BTN_GHOST, fontSize: '0.9rem', padding: '6px 12px' }}>← Back to article</button>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#54595d' }}>Card {fcIndex + 1} of {fcWords.length}</span>
        </div>
        <div style={{ height: '6px', background: '#eaecf0', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '100%', background: '#3366cc', width: `${(fcIndex / fcWords.length) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
        <FlashcardExercise word={fcWords[fcIndex]} onAnswer={handleFcAnswer} />
      </div>
    );
  }

  return null;
}
