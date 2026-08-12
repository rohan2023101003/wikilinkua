"""Contribute pronunciation audio to Wikimedia Commons.

In-app flow: the learner records a word in the browser, listens, and submits.
The audio is uploaded to Wikimedia Commons *on the user's behalf* using their
OAuth token (so it counts as their own contribution), then can be linked to the
Wikidata lexeme form via P443.

Until the OAuth consumer with **upload** grants is approved, the upload step
returns a clear "not enabled yet" message - recording and listening already work.
"""

import datetime

from flask import (Blueprint, current_app, jsonify, render_template, request,
                   session)

bp = Blueprint("contribute", __name__)


@bp.route("/contribute/record")
def contribute_page():
    """Recording page - reached from the Contribute section's "no audio" task.

    Lives under /contribute/record so that /contribute itself belongs to the
    in-app Contribute section (the data-gap dashboard).
    Can be pre-filled via ?word=&code=&lang=&qid= .
    """
    return render_template(
        "contribute.html",
        word=request.args.get("word", ""),
        lang_code=request.args.get("code", ""),
        lang_name=request.args.get("lang", ""),
        lang_qid=request.args.get("qid", ""),
    )


@bp.route("/api/contribute-audio", methods=["POST"])
def contribute_audio():
    """Receive a recorded clip and upload it to Commons (when permitted)."""
    token = session.get("oauth_token")
    if not token:
        return jsonify(
            ok=False,
            message=("Uploading needs a real Wikimedia login. On the live site, "
                     "log in with Wikimedia first. (The local dev login can't "
                     "upload - there's no real token.)"),
        )

    audio = request.files.get("audio")
    word = (request.form.get("word") or "").strip()
    code = (request.form.get("code") or "").strip()
    lang_name = (request.form.get("lang") or "").strip()
    if not audio or not word:
        return jsonify(ok=False, message="Please record a clip and enter the word.")

    username = (session.get("user") or {}).get("username", "Unknown")
    ext, mime = _audio_kind(audio.filename, audio.mimetype)
    try:
        result = _upload_to_commons(
            token, audio.read(), word, code, lang_name, username,
            current_app.config["COMMONS_API_URL"], ext, mime,
        )
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        result = {"ok": False, "message": "Upload failed: " + str(exc)}
    return jsonify(result)


# What the browser can hand us -> (Commons file extension, MIME type sent along).
_AUDIO_KINDS = {
    "ogg": ("ogg", "audio/ogg"),
    "oga": ("oga", "audio/ogg"),
    "opus": ("opus", "audio/ogg"),
    "webm": ("webm", "audio/webm"),
    "wav": ("wav", "audio/wav"),
    "mp3": ("mp3", "audio/mpeg"),
    "m4a": ("m4a", "audio/mp4"),
    "flac": ("flac", "audio/flac"),
}


def _audio_kind(filename, mimetype):
    """Pick the file extension Commons should see, from the upload itself."""
    ext = (filename or "").rsplit(".", 1)[-1].lower()
    if ext in _AUDIO_KINDS:
        return _AUDIO_KINDS[ext]
    base = (mimetype or "").split(";")[0].strip().lower()
    for kind_ext, (out_ext, out_mime) in _AUDIO_KINDS.items():
        if base == out_mime and kind_ext == out_ext:
            return out_ext, out_mime
    return "webm", "audio/webm"


# Characters MediaWiki refuses in a page title.
_BAD_TITLE_CHARS = '#<>[]|{}:/\\?"'


def _safe_title_part(text, fallback):
    cleaned = "".join(" " if ch in _BAD_TITLE_CHARS else ch for ch in (text or ""))
    cleaned = " ".join(cleaned.split()).strip()
    return cleaned[:80] or fallback


def _upload_to_commons(token, audio_bytes, word, code, lang_name, username,
                       api_url, ext="webm", mime="audio/webm"):
    """Upload one audio clip to Commons via the action API + OAuth bearer token."""
    import requests

    sess = requests.Session()
    sess.headers.update({
        "Authorization": "Bearer " + token,
        "User-Agent": "WikiLinkua/1.0 (https://wikilinkua.toolforge.org)",
    })

    # 1) Fetch a CSRF token. With an identity-only token (no edit/upload grant),
    #    the API returns the anonymous token "+\\" - our signal that uploads
    #    aren't permitted yet.
    tok = sess.get(api_url, params={
        "action": "query", "meta": "tokens", "type": "csrf", "format": "json",
    }, timeout=20).json()
    csrf = tok.get("query", {}).get("tokens", {}).get("csrftoken", "")
    if not csrf or csrf == "+\\":
        return {
            "ok": False,
            "message": ("Upload permission isn't granted yet - the OAuth consumer "
                        "in use has no 'upload' grant. Your recording still works; "
                        "log out and back in if the consumer was just updated."),
        }

    safe_word = _safe_title_part(word, "word")
    safe_user = _safe_title_part(username, "WikiLinkua user")
    base_name = 'Pronunciation of {word} ({code}) - {user}'.format(
        word=safe_word, code=code or "xx", user=safe_user)

    date = datetime.date.today().isoformat()
    in_lang = (" in " + lang_name) if lang_name else ""
    text = (
        "=={{int:filedesc}}==\n"
        "{{Information\n"
        '|description={{en|1=Pronunciation of "' + word + '"' + in_lang + ".}}\n"
        "|date=" + date + "\n"
        "|source={{own}}\n"
        "|author=[[User:" + username + "|" + username + "]]\n"
        "}}\n\n"
        "=={{int:license-header}}==\n"
        "{{self|cc-by-sa-4.0}}\n\n"
        "[[Category:Pronunciation]]"
    )
    if lang_name:
        text += "\n[[Category:" + lang_name + " pronunciation]]"

    def do_upload(filename, ignore_warnings):
        data = {
            "action": "upload",
            "filename": filename,
            "text": text,
            "comment": "Pronunciation recorded via WikiLinkua",
            "token": csrf,
            "format": "json",
        }
        if ignore_warnings:
            data["ignorewarnings"] = 1
        return sess.post(
            api_url, data=data,
            files={"file": (filename, audio_bytes, mime)}, timeout=60,
        ).json()

    # First try the clean name and let Commons tell us about problems, so an
    # identical file already on Commons is reported rather than silently
    # overwriting someone else's work (which ignorewarnings=1 would do).
    filename = base_name + "." + ext
    resp = do_upload(filename, ignore_warnings=False)

    warnings = resp.get("upload", {}).get("warnings", {})
    if warnings:
        if "duplicate" in warnings or "exists-normalized" in warnings:
            dup = warnings.get("duplicate") or []
            existing = dup[0] if dup else ""
            return {
                "ok": False,
                "message": ("This exact recording is already on Commons"
                            + (' as "' + existing + '"' if existing else "")
                            + ". Nothing to upload."),
            }
        # Name clash or a fussy title: retry once under a timestamped name.
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        filename = base_name + " " + stamp + "." + ext
        resp = do_upload(filename, ignore_warnings=True)

    up = resp.get("upload", {})
    if up.get("result") == "Success":
        return {
            "ok": True,
            "message": "Uploaded to Wikimedia Commons!",
            "url": up.get("imageinfo", {}).get("descriptionurl", ""),
        }

    err = resp.get("error", {})
    if err.get("code") in ("permissiondenied", "mustbeloggedin", "notloggedin"):
        return {
            "ok": False,
            "message": ("Commons refused the upload: your login doesn't carry the "
                        "upload grant. Log out and log in again to refresh it."),
        }
    return {"ok": False, "message": err.get("info", "Upload did not succeed.")}
