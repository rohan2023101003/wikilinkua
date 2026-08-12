import React, { useState, useEffect, useMemo } from 'react';
import { LANGUAGES, resolveLangQid, getLanguage } from '../utils/sparql';
import {
  PRIORITY_META, fetchLanguageProfile, tasksFor, fetchTaskExamples,
  wdqsLink, lexemeUrl,
} from '../utils/gaps';

const CARD = { border: '1px solid #c8ccd1', borderRadius: '2px', background: '#fff', padding: '20px' };
const BTN_PRIMARY = { padding: '8px 16px', borderRadius: '2px', background: '#3366cc', color: '#fff', border: '1px solid #3366cc', fontWeight: '600', cursor: 'pointer', fontSize: '13px' };
const BTN_GHOST = { padding: '8px 16px', borderRadius: '2px', background: '#fff', color: '#202122', border: '1px solid #a2a9b1', fontWeight: '600', cursor: 'pointer', fontSize: '13px' };

const fmt = (n) => (n === null || n === undefined ? '—' : n.toLocaleString());

function TaskRow({ task, qid, langName }) {
  const [state, setState] = useState({ status: 'idle', count: null, error: null });
  const [examples, setExamples] = useState(null);
  const [open, setOpen] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const meta = PRIORITY_META[task.priority];

  // Counts are fetched by the parent one at a time; expose a run method via props
  // would be heavier, so each row fetches when it first becomes visible.
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', count: null, error: null });
    setExamples(null);
    setOpen(false);
    task.getCount(qid)
      .then(n => { if (alive) setState({ status: 'done', count: n, error: null }); })
      .catch(e => { if (alive) setState({ status: 'error', count: null, error: e.message }); });
    return () => { alive = false; };
  }, [task, qid]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && examples === null && !loadingExamples) {
      setLoadingExamples(true);
      try {
        setExamples(await fetchTaskExamples(task, qid));
      } catch {
        setExamples([]);
      } finally {
        setLoadingExamples(false);
      }
    }
  };

  const nothingToDo = state.status === 'done' && state.count === 0;

  return (
    <div style={{ ...CARD, padding: '16px 20px', marginBottom: '10px', opacity: nothingToDo ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#202122' }}>{task.title}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em', color: meta.color, background: meta.bg, border: '1px solid ' + meta.border, padding: '2px 6px', borderRadius: '2px' }}>
              {task.priority}
            </span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#54595d', lineHeight: 1.5 }}>
            <strong style={{ color: '#202122' }}>Unlocks:</strong> {task.unlocks}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#54595d', lineHeight: 1.5 }}>
            <strong style={{ color: '#202122' }}>How to fix:</strong> {task.fix}
          </p>
        </div>

        <div style={{ textAlign: 'right', minWidth: '120px' }}>
          {state.status === 'loading' && <span style={{ fontSize: '13px', color: '#72777d' }}>counting…</span>}
          {state.status === 'error' && (
            <span title={state.error} style={{ fontSize: '12px', color: '#bf3c2c' }}>query failed</span>
          )}
          {state.status === 'done' && (
            <>
              <div style={{ fontSize: '24px', fontWeight: '800', color: nothingToDo ? '#0e7a63' : meta.color, letterSpacing: '-0.02em' }}>
                {fmt(state.count)}
              </div>
              <div style={{ fontSize: '11px', color: '#72777d' }}>{nothingToDo ? 'nothing to fix' : 'lexemes'}</div>
            </>
          )}
        </div>
      </div>

      {state.status === 'done' && state.count > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button onClick={toggle} style={BTN_GHOST}>
            {open ? 'Hide examples' : 'Show words to fix'}
          </button>
          <a href={wdqsLink(task.listQuery(qid, 200))} target="_blank" rel="noopener noreferrer" style={{ ...BTN_GHOST, textDecoration: 'none', display: 'inline-block' }}>
            Open full list in Query Service
          </a>
          {task.recordable && (
            <a href="/contribute/record" style={{ ...BTN_PRIMARY, textDecoration: 'none', display: 'inline-block' }}>
              Record pronunciations
            </a>
          )}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #eaecf0', paddingTop: '12px' }}>
          {loadingExamples && <p style={{ fontSize: '13px', color: '#72777d', margin: 0 }}>Loading examples…</p>}
          {!loadingExamples && examples && examples.length === 0 && (
            <p style={{ fontSize: '13px', color: '#72777d', margin: 0 }}>Could not load examples right now.</p>
          )}
          {!loadingExamples && examples && examples.length > 0 && (
            <>
              <p style={{ fontSize: '12px', color: '#72777d', margin: '0 0 8px' }}>
                Each link opens the lexeme on Wikidata, where you can make the edit.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {examples.map(ex => (
                  <a
                    key={ex.lexemeId}
                    href={lexemeUrl(ex.lexemeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={ex.lexemeId + ' · ' + langName}
                    style={{ fontSize: '13px', padding: '4px 10px', border: '1px solid #c8ccd1', borderRadius: '2px', color: '#3366cc', textDecoration: 'none', background: '#f8f9fa' }}
                  >
                    {ex.lemma || ex.lexemeId}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContributeMode({ profile, onNavigate }) {
  const languageChoices = useMemo(() => {
    const picked = [
      ...(profile ? [resolveLangQid(profile.targetLang)] : []),
      ...((profile && profile.knownLangs) || []).map(resolveLangQid),
    ];
    const seen = new Set();
    const mine = [];
    picked.forEach(qid => {
      if (seen.has(qid)) return;
      seen.add(qid);
      const lang = getLanguage(qid);
      if (lang) mine.push(lang);
    });
    return { mine, all: LANGUAGES };
  }, [profile]);

  const [qid, setQid] = useState(() =>
    (profile && resolveLangQid(profile.targetLang)) || LANGUAGES[0].qid);
  const [langProfile, setLangProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lang = getLanguage(qid) || {};

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setLangProfile(null);
    fetchLanguageProfile(qid)
      .then(p => { if (alive) setLangProfile(p); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [qid]);

  const tasks = langProfile ? tasksFor(langProfile) : [];
  const readyPct = langProfile && langProfile.total
    ? Math.round((langProfile.learnerReady / langProfile.total) * 100)
    : 0;

  return (
    <div className="fadeIn" style={{ maxWidth: '960px', margin: '0 auto', color: '#202122' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Contribute</h1>
        <p style={{ fontSize: '15px', color: '#54595d', margin: 0, lineHeight: 1.5 }}>
          WikiLinkua can only teach what Wikidata knows. These are the gaps in{' '}
          <strong>{lang.name}</strong> right now - each one is a small edit that makes the
          app work better for everyone learning this language.
        </p>
      </div>

      {/* Language picker */}
      <div style={{ ...CARD, marginBottom: '20px' }}>
        <label htmlFor="gap-lang" style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
          Language to improve
        </label>
        <select
          id="gap-lang"
          value={qid}
          onChange={e => setQid(e.target.value)}
          style={{ width: '100%', maxWidth: '420px', padding: '8px 10px', border: '1px solid #a2a9b1', borderRadius: '2px', fontSize: '14px', background: '#fff' }}
        >
          {languageChoices.mine.length > 0 && (
            <optgroup label="Your languages">
              {languageChoices.mine.map(l => (
                <option key={'mine-' + l.qid} value={l.qid}>{l.name}</option>
              ))}
            </optgroup>
          )}
          <optgroup label="All languages">
            {languageChoices.all.map(l => (
              <option key={l.qid} value={l.qid}>{l.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Headline numbers */}
      {loading && (
        <div style={{ ...CARD, textAlign: 'center', color: '#54595d', fontSize: '14px' }}>
          Measuring {lang.name} data coverage…
        </div>
      )}

      {error && (
        <div style={{ ...CARD, border: '1px solid #bf3c2c', background: '#fee7e6', color: '#bf3c2c', fontSize: '14px' }}>
          Could not reach the Wikidata Query Service: {error}
        </div>
      )}

      {langProfile && (
        <>
          <div style={{ ...CARD, marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em' }}>{fmt(langProfile.total)}</div>
                <div style={{ fontSize: '12px', color: '#72777d' }}>{lang.name} lexemes</div>
              </div>
              <div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#3366cc', letterSpacing: '-0.02em' }}>{fmt(langProfile.learnerReady)}</div>
                <div style={{ fontSize: '12px', color: '#72777d' }}>usable for learning ({readyPct}%)</div>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#54595d', lineHeight: 1.5 }}>
              "Usable for learning" means the word has a sense linked to a concept (P5137), which
              is what lets WikiLinkua connect it to a language you already know. The rest of the
              vocabulary is invisible to learners until someone fills that in.
            </p>
          </div>

          {tasks.map(task => (
            <TaskRow key={task.id} task={task} qid={qid} langName={lang.name} />
          ))}

          <div style={{ ...CARD, marginTop: '20px', background: '#f8f9fa' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '700' }}>Other ways to help</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#54595d', lineHeight: 1.7 }}>
              <li><a href="/contribute/record" style={{ color: '#3366cc' }}>Record a pronunciation</a> for a word that has none.</li>
              <li>In <button onClick={() => onNavigate('article')} style={{ background: 'none', border: 'none', color: '#3366cc', padding: 0, cursor: 'pointer', font: 'inherit' }}>Article mode</button>, articles missing in your language link straight to Content Translation.</li>
              <li>Add or correct subtitles on Commons videos - <button onClick={() => onNavigate('video')} style={{ background: 'none', border: 'none', color: '#3366cc', padding: 0, cursor: 'pointer', font: 'inherit' }}>Video mode</button> shows which videos have none.</li>
              <li>
                Read the{' '}
                <a href="https://www.wikidata.org/wiki/Wikidata:Lexicographical_data" target="_blank" rel="noopener noreferrer" style={{ color: '#3366cc' }}>
                  lexicographical data documentation
                </a>{' '}
                for how your language should be modelled.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
