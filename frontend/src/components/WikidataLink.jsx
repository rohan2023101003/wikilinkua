import React, { useState } from 'react';

/** The Wikidata mark, drawn inline so it needs no external asset. */
export function WikidataIcon({ size = 14, title = 'Wikidata' }) {
  const bar = (x, w, h, y, fill) => <rect key={x + '-' + y} x={x} y={y} width={w} height={h} fill={fill} />;
  const R = '#990000', G = '#339966', B = '#006699';
  return (
    <svg viewBox="0 0 48 26" width={size * (48 / 26)} height={size} role="img"
         aria-label={title} style={{ flexShrink: 0, verticalAlign: 'middle' }}>
      <title>{title}</title>
      {[
        bar(0, 2.5, 20, 3, R), bar(4, 2.5, 20, 3, R),
        bar(9, 2.5, 20, 3, G), bar(13, 2.5, 12, 7, G), bar(17, 2.5, 20, 3, G),
        bar(22, 2.5, 20, 3, B), bar(26, 2.5, 12, 7, B),
        bar(31, 2.5, 20, 3, G), bar(35, 2.5, 12, 7, G),
        bar(40, 2.5, 20, 3, B), bar(44, 2.5, 20, 3, B),
      ]}
    </svg>
  );
}

/**
 * A word that links to its Wikidata lexeme.
 *
 * Every lemma the app shows is a real entity someone can improve, so it should
 * behave like one: click it and you are on the page where the fix is made.
 */
export function LexemeLink({ id, children, showIcon = true, style = {} }) {
  if (!id || !/^L\d+$/.test(id)) {
    return <span style={style}>{children}</span>;
  }
  return (
    <a
      href={'https://www.wikidata.org/wiki/Lexeme:' + id}
      target="_blank"
      rel="noopener noreferrer"
      title={'Open ' + id + ' on Wikidata (opens in a new tab)'}
      style={{
        color: 'inherit', textDecoration: 'none', display: 'inline-flex',
        alignItems: 'center', gap: '5px', borderBottom: '1px dotted #a2a9b1',
        ...style,
      }}
    >
      {children}
      {showIcon && <WikidataIcon size={12} title={'Edit ' + id + ' on Wikidata'} />}
    </a>
  );
}

const INPUT = {
  padding: '7px 9px', border: '1px solid #a2a9b1', borderRadius: '2px',
  fontSize: '13px', width: '130px', fontFamily: 'monospace',
};

/**
 * Record "derived from lexeme" (P5191) without leaving the app.
 *
 * This is the edit that upgrades a "same meaning" pair into a real cognate, and
 * every cognate the app can show depends on it existing.
 *
 * It asks for the ANCESTOR rather than offering a one-click "these two are
 * cognates", because cognates usually descend from a shared older word instead of
 * from each other: English *night* and German *Nacht* are cognates, but neither
 * derives from the other. A one-click button between two same-meaning words would
 * mass-produce false statements.
 */
export function DerivedFromEditor({ word, relation, canEdit, onDone }) {
  const [open, setOpen] = useState(false);
  const [ancestor, setAncestor] = useState('');
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const lookUp = async (id) => {
    setPreview(null);
    if (!/^L\d+$/i.test(id.trim())) return;
    try {
      const r = await fetch('/api/lexeme/' + id.trim().toUpperCase());
      const d = await r.json();
      setPreview(d.ok ? d : { error: d.message });
    } catch {
      setPreview({ error: 'Could not reach Wikidata.' });
    }
  };

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const r = await fetch('/api/lexeme/derived-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lexeme: word.lexemeId, ancestor: ancestor.trim().toUpperCase() }),
      });
      const d = await r.json();
      setStatus(d);
      if (d.ok && onDone) onDone();
    } catch (e) {
      setStatus({ ok: false, message: 'Network error: ' + e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'none', border: 'none', padding: 0, color: '#3366cc',
          cursor: 'pointer', fontSize: '12px', textDecoration: 'underline',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
        }}
      >
        <WikidataIcon size={11} title="Wikidata" />
        Add a word origin
      </button>
    );
  }

  return (
    <div style={{
      marginTop: '10px', padding: '12px', border: '1px solid #b8d4f9',
      borderRadius: '2px', background: '#eaf3ff',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#202122', lineHeight: 1.5 }}>
        Does <strong>{word.lemma}</strong> come from an older word? Give that word's
        lexeme id and it is recorded on Wikidata as <strong>P5191</strong>.
      </p>
      <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#54595d', lineHeight: 1.5 }}>
        Point at the <em>ancestor</em>, not at
        {relation && relation.knownLemma ? <> “{relation.knownLemma}”</> : ' the other word'}.
        Two cognates usually descend from a shared older word rather than from each
        other — recording them as derived from each other would be wrong.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={ancestor}
          onChange={(e) => { setAncestor(e.target.value); lookUp(e.target.value); }}
          placeholder="L1002578"
          style={INPUT}
          aria-label="Ancestor lexeme id"
        />
        <button
          onClick={submit}
          disabled={busy || !canEdit || !/^L\d+$/i.test(ancestor.trim())}
          style={{
            padding: '7px 14px', borderRadius: '2px', fontWeight: 600, fontSize: '13px',
            background: canEdit ? '#3366cc' : '#c8ccd1', color: '#fff',
            border: '1px solid ' + (canEdit ? '#3366cc' : '#c8ccd1'),
            cursor: canEdit && !busy ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Saving…' : 'Record it'}
        </button>
        <button
          onClick={() => { setOpen(false); setStatus(null); setPreview(null); setAncestor(''); }}
          style={{ background: 'none', border: 'none', color: '#54595d', cursor: 'pointer', fontSize: '12px' }}
        >
          Cancel
        </button>
      </div>

      {preview && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: preview.error ? '#bf3c2c' : '#0e7a63' }}>
          {preview.error
            ? preview.error
            : <>That is <strong>{preview.lemma}</strong> ({preview.id}) — check it is the right word.</>}
        </p>
      )}

      {!canEdit && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#886600' }}>
          Log in with a Wikimedia account to make this edit. It is published under your
          name, exactly like editing Wikidata directly.
        </p>
      )}

      {status && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: status.ok ? '#0e7a63' : '#bf3c2c' }}>
          {status.message}
          {status.ok && status.url && (
            <> <a href={status.url} target="_blank" rel="noopener noreferrer">View on Wikidata</a></>
          )}
        </p>
      )}
    </div>
  );
}
