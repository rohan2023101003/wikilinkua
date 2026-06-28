"""Phrases proxy.

The browser can query Wikidata (WDQS) directly, but Tatoeba's API isn't reliably
CORS-enabled, so we proxy it here. Given a target language + a word, return
target-language sentences containing that word, each with a translation in one of
the learner's known languages and an audio URL when Tatoeba has a recording.
"""

from flask import Blueprint, jsonify, request

bp = Blueprint("phrases", __name__)

# ISO 639-1 (used in the app) -> ISO 639-3 (used by Tatoeba).
ISO1_TO_ISO3 = {
    "en": "eng", "es": "spa", "fr": "fra", "de": "deu", "it": "ita",
    "pt": "por", "da": "dan", "sv": "swe", "no": "nor", "fa": "pes",
    "ar": "ara", "hi": "hin", "ur": "urd", "pa": "pan", "ml": "mal",
    "ta": "tam", "id": "ind", "ms": "msa", "ja": "jpn", "ru": "rus",
    "uk": "ukr", "pl": "pol", "cs": "ces", "tr": "tur", "eo": "epo",
    "la": "lat", "br": "bre", "eu": "eus", "yi": "yid",
}

TATOEBA_SEARCH = "https://tatoeba.org/en/api_v0/search"


@bp.route("/api/phrases")
def phrases():
    """Return Tatoeba sentences in `target` containing `word`, with a translation."""
    import requests  # imported here so the app starts even if requests is absent

    target = (request.args.get("target") or "").strip()
    word = (request.args.get("word") or "").strip()
    known_codes = [c.strip() for c in (request.args.get("known") or "").split(",") if c.strip()]

    from3 = ISO1_TO_ISO3.get(target)
    if not from3 or not word:
        return jsonify(ok=False, phrases=[], message="Missing or unsupported target/word.")

    known3 = {ISO1_TO_ISO3.get(c) for c in known_codes if ISO1_TO_ISO3.get(c)}

    try:
        resp = requests.get(
            TATOEBA_SEARCH,
            params={
                "from": from3,
                "query": word,
                # real sentences, not 1-2 word fragments, but still learnable length
                "word_count_min": 4,
                "word_count_max": 14,
                "sort": "relevance",
            },
            headers={"User-Agent": "WikiLinkua/1.0 (Wikimedia Hackathon 2026)"},
            timeout=20,
        )
        data = resp.json()
    except Exception as exc:  # noqa: BLE001
        return jsonify(ok=False, phrases=[], message="Tatoeba request failed: " + str(exc))

    out = []
    for r in (data.get("results") or [])[:15]:
        text = r.get("text")
        if not text or len(text.strip()) < 6:   # skip stray fragments
            continue

        # find the first translation in a language the learner knows
        translation = None
        for group in (r.get("translations") or []):
            for t in group:
                if t.get("lang") in known3 and t.get("text"):
                    translation = {"lang": t["lang"], "text": t["text"]}
                    break
            if translation:
                break

        audio = None
        audios = r.get("audios") or []
        if audios and len(audios) > 0:
            audio = "https://audio.tatoeba.org/sentences/{lang}/{sid}.mp3".format(
                lang=from3, sid=r.get("id"))

        out.append({
            "id": r.get("id"),
            "text": text,
            "lang": from3,
            "audio": audio,
            "translation": translation,
            "word": word,
        })

    return jsonify(ok=True, phrases=out)


# cxserver MinT endpoint. Note: the text MUST be wrapped in an HTML tag - sending
# plain text returns an empty translation.
CXSERVER_MT = "https://cxserver.wikimedia.org/v2/translate/{src}/{dst}/MinT"


@bp.route("/api/translate")
def translate():
    """Machine-translate a sentence with Wikimedia MinT (fallback when no human
    translation exists). Uses ISO 639-1 codes (en, es, ml, …)."""
    import html
    import re
    import requests

    src = (request.args.get("from") or "").strip()
    dst = (request.args.get("to") or "").strip()
    text = (request.args.get("text") or "").strip()
    if not src or not dst or not text:
        return jsonify(ok=False, text="", message="Missing from/to/text.")
    if src == dst:
        return jsonify(ok=True, text=text, engine="none")

    try:
        resp = requests.post(
            CXSERVER_MT.format(src=src, dst=dst),
            json={"html": "<p>" + html.escape(text) + "</p>"},
            headers={"User-Agent": "WikiLinkua/1.0 (Wikimedia Hackathon 2026)"},
            timeout=20,
        )
        contents = resp.json().get("contents", "") if resp.ok else ""
        plain = html.unescape(re.sub(r"<[^>]+>", "", contents)).strip()
        if not plain:
            return jsonify(ok=False, text="", message="No MinT translation for this pair.")
        return jsonify(ok=True, text=plain, engine="MinT")
    except Exception as exc:  # noqa: BLE001
        return jsonify(ok=False, text="", message="Translation failed: " + str(exc))
