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


@bp.route("/contribute")
def contribute_page():
    """Recording page. Can be pre-filled via ?word=&code=&lang=&qid= ."""
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
    try:
        result = _upload_to_commons(
            token, audio.read(), word, code, lang_name, username,
            current_app.config["COMMONS_API_URL"],
        )
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        result = {"ok": False, "message": "Upload failed: " + str(exc)}
    return jsonify(result)


def _upload_to_commons(token, audio_bytes, word, code, lang_name, username, api_url):
    """Upload one audio clip to Commons via the action API + OAuth bearer token."""
    import requests

    sess = requests.Session()
    sess.headers.update({"Authorization": "Bearer " + token})

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
            "message": ("Upload permission isn't granted yet. Your recording "
                        "works - uploads go live once the Commons-upload OAuth "
                        "consumer is approved and its keys are set."),
        }

    filename = 'Pronunciation of {word} ({code}) - {user}.webm'.format(
        word=word, code=code or "xx", user=username)
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

    resp = sess.post(api_url, data={
        "action": "upload",
        "filename": filename,
        "text": text,
        "comment": "Pronunciation recorded via WikiLinkua",
        "token": csrf,
        "ignorewarnings": 1,
        "format": "json",
    }, files={"file": (filename, audio_bytes, "audio/webm")}, timeout=60).json()

    up = resp.get("upload", {})
    if up.get("result") == "Success":
        return {
            "ok": True,
            "message": "Uploaded to Wikimedia Commons!",
            "url": up.get("imageinfo", {}).get("descriptionurl", ""),
        }
    err = resp.get("error", {})
    return {"ok": False, "message": err.get("info", "Upload did not succeed.")}
