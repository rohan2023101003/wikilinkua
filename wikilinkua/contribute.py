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
    Can be pre-filled via ?word=&code=&lang=&qid=&lexeme= . When `lexeme` is
    present the upload is linked to that lexeme's matching form with P443, which
    is what turns the recording into usable pronunciation data.
    """
    return render_template(
        "contribute.html",
        word=request.args.get("word", ""),
        lang_code=request.args.get("code", ""),
        lang_name=request.args.get("lang", ""),
        lang_qid=request.args.get("qid", ""),
        lexeme_id=request.args.get("lexeme", ""),
    )


@bp.route("/api/upload-check")
def upload_check():
    """Report whether THIS session can actually upload, and why not.

    Asks Commons what rights the session's token really carries, so a failure
    names its own cause instead of surfacing as a bare API error after the user
    has already recorded a clip.
    """
    token = session.get("oauth_token")
    client_id = current_app.config.get("OAUTH_CLIENT_ID") or ""
    info = {
        "loggedIn": bool(session.get("user")),
        "devLogin": bool(current_app.config["DEV_LOGIN"]),
        # The client id is public (it appears in the authorize URL); the secret is not.
        "clientId": (client_id[:8] + "…") if client_id else "(not set)",
        "scopes": current_app.config.get("OAUTH_SCOPES", ""),
        "canUpload": False,
        "reason": "",
    }

    if not token:
        info["reason"] = (
            "This session has no Wikimedia token. The development login cannot upload - "
            "log in with a real Wikimedia account."
        )
        return jsonify(info)

    import requests
    try:
        resp = requests.get(
            current_app.config["COMMONS_API_URL"],
            params={"action": "query", "meta": "userinfo", "uiprop": "rights",
                    "format": "json"},
            headers={"Authorization": "Bearer " + token},
            timeout=20,
        ).json()
    except Exception as exc:  # noqa: BLE001
        info["reason"] = "Could not reach Commons: " + str(exc)
        return jsonify(info)

    err = resp.get("error", {})
    if err:
        info["apiError"] = err.get("code", "")
        info["reason"] = (
            "Commons rejected this session's token (" + err.get("code", "error") + "). "
            "Your login was almost certainly created before the current OAuth "
            "permissions were granted - log out and log in again to get a fresh token."
        )
        return jsonify(info)

    userinfo = resp.get("query", {}).get("userinfo", {})
    rights = set(userinfo.get("rights") or [])
    info["commonsUser"] = userinfo.get("name")
    info["hasUploadRight"] = "upload" in rights
    # Publishing a NEW file also creates its File: description page, so `createpage`
    # is required on top of `upload`. No upload grant includes it - only the
    # "Create, edit, and move pages" (createeditmovepage) grant does.
    info["hasCreateRight"] = "createpage" in rights
    info["canUpload"] = info["hasUploadRight"] and info["hasCreateRight"]

    if not info["hasUploadRight"]:
        info["reason"] = (
            "Your Wikimedia session is valid but carries no upload right. Log out and log "
            "in again so the current permissions are applied."
        )
    elif not info["hasCreateRight"]:
        info["reason"] = (
            "You can upload, but not create the file's description page, so Commons will "
            "refuse a new file. The OAuth consumer needs the 'Create, edit, and move "
            "pages' grant (createeditmovepage) as well as the upload grants - upload "
            "grants alone do not include it. That needs a consumer update on Meta."
        )
    return jsonify(info)


@bp.route("/api/link-audio", methods=["POST"])
def link_audio():
    """Link an EXISTING Commons file to a lexeme form with P443.

    Useful on its own: writing a statement is an edit to an existing entity, so it
    needs only the `editpage` grant - unlike uploading a new file, which also needs
    `createpage`. So recordings made elsewhere (Lingua Libre, or a file already on
    Commons) can be connected to Wikidata even while the upload grant is pending.
    """
    token = session.get("oauth_token")
    if not token:
        return jsonify(ok=False, message="Linking needs a real Wikimedia login.")

    lexeme_id = (request.form.get("lexeme") or "").strip().upper()
    word = (request.form.get("word") or "").strip()
    filename = (request.form.get("filename") or "").strip()
    # Accept a bare name, a File: title, or a pasted Commons URL.
    filename = filename.replace("_", " ")
    for prefix in ("https://commons.wikimedia.org/wiki/",
                   "http://commons.wikimedia.org/wiki/"):
        if filename.startswith(prefix):
            filename = filename[len(prefix):]
    if filename.lower().startswith("file:"):
        filename = filename.split(":", 1)[1].strip()

    if not lexeme_id.startswith("L") or not word or not filename:
        return jsonify(ok=False,
                       message="Need a lexeme id, the word, and the Commons file name.")

    try:
        result = _link_audio_to_form(
            token, lexeme_id, word, filename,
            current_app.config["WIKIDATA_API_URL"],
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify(ok=False, message="Linking failed: " + str(exc))

    return jsonify(ok=bool(result.get("linked")),
                   message=result.get("note", ""),
                   formId=result.get("formId", ""))


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
    lexeme_id = (request.form.get("lexeme") or "").strip()
    # Who is speaking matters: a learner's recording presented as a native
    # pronunciation is worse than no recording. Commons readers need to know.
    proficiency = (request.form.get("proficiency") or "").strip()
    region = (request.form.get("region") or "").strip()
    ext, mime = _audio_kind(audio.filename, audio.mimetype)
    try:
        result = _upload_to_commons(
            token, audio.read(), word, code, lang_name, username,
            current_app.config["COMMONS_API_URL"], ext, mime,
            proficiency, region,
        )
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        return jsonify({"ok": False, "message": "Upload failed: " + str(exc)})

    # A file on Commons that nothing points at helps nobody: link it to the
    # lexeme form so the word actually gains audio and leaves the gap list.
    if result.get("ok") and lexeme_id.upper().startswith("L"):
        try:
            link = _link_audio_to_form(
                token, lexeme_id.upper(), word, result.get("filename", ""),
                current_app.config["WIKIDATA_API_URL"],
            )
        except Exception as exc:  # noqa: BLE001
            link = {"linked": False, "note": "Uploaded, but linking to the lexeme "
                                             "failed: " + str(exc)}
        result.update(link)
        result["message"] = result["message"] + " " + link.get("note", "")
    elif result.get("ok"):
        result["linked"] = False
        result["note"] = ("Uploaded to Commons. It is not attached to any Wikidata "
                          "lexeme, so add P443 by hand for it to count as pronunciation "
                          "data.")
        result["message"] = result["message"] + " " + result["note"]

    return jsonify(result)


def _link_audio_to_form(token, lexeme_id, word, filename, wikidata_api):
    """Point the lexeme's matching Form at the uploaded file with P443.

    Without this the upload is a dead end: a file sits on Commons, the Wikidata
    lexeme still has no audio, the word keeps appearing in the "no audio" gap
    list, and WikiLinkua still cannot play it.

    Audio belongs on a **Form**, not on the Lexeme - "italien" and "italiens" are
    pronounced differently and each carries its own P443. So we only link when the
    recorded word unambiguously matches exactly one form; otherwise we say so and
    let a human choose, rather than guessing and writing a wrong statement.

    Writing this is an edit to an existing entity, so it needs `editpage` - not
    the `createpage` grant the Commons upload needs.
    """
    import json as _json
    import requests

    sess = requests.Session()
    sess.headers.update({
        "Authorization": "Bearer " + token,
        "User-Agent": "WikiLinkua/1.0 (https://wikilinkua.toolforge.org)",
    })

    entity = sess.get(wikidata_api, params={
        "action": "wbgetentities", "ids": lexeme_id, "format": "json",
    }, timeout=20).json()
    lex = (entity.get("entities") or {}).get(lexeme_id)
    if not lex:
        return {"linked": False, "note": "Could not read " + lexeme_id + " from Wikidata."}

    target = (word or "").strip().casefold()
    matches = []
    for form in lex.get("forms", []):
        reps = [r.get("value", "") for r in (form.get("representations") or {}).values()]
        if any(r.strip().casefold() == target for r in reps):
            matches.append((form, reps))

    if len(matches) != 1:
        why = ("no form of this lexeme is spelled that way"
               if not matches else "several forms are spelled that way")
        return {"linked": False, "note":
                "Uploaded, but not linked automatically because " + why +
                ". Add P443 to the right form by hand."}

    form, reps = matches[0]
    if "P443" in (form.get("claims") or {}):
        return {"linked": False, "formId": form["id"],
                "note": "Uploaded. " + form["id"] + " already has audio, so no statement "
                        "was added - a second recording can still be added by hand."}

    csrf = sess.get(wikidata_api, params={
        "action": "query", "meta": "tokens", "type": "csrf", "format": "json",
    }, timeout=20).json().get("query", {}).get("tokens", {}).get("csrftoken", "")
    if not csrf or csrf == "+\\":
        return {"linked": False, "formId": form["id"],
                "note": "Uploaded to Commons, but the Wikidata edit was refused "
                        "(no edit permission). Add P443 to " + form["id"] + " by hand."}

    res = sess.post(wikidata_api, data={
        "action": "wbcreateclaim",
        "entity": form["id"],
        "property": "P443",
        "snaktype": "value",
        "value": _json.dumps(filename),   # commonsMedia takes the bare file name
        "token": csrf,
        "summary": "add pronunciation recorded via WikiLinkua",
        "format": "json",
    }, timeout=30).json()

    if res.get("success") == 1:
        return {"linked": True, "formId": form["id"],
                "note": "Linked to " + form["id"] + " with P443."}
    err = res.get("error", {})
    return {"linked": False, "formId": form["id"],
            "note": "Uploaded to Commons, but adding P443 to " + form["id"] +
                    " failed: " + (err.get("info") or err.get("code") or "unknown error")}


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


_PROFICIENCY_LABELS = {
    "native": "native speaker",
    "fluent": "fluent speaker",
    "learner": "learner (not a native speaker)",
}


def _upload_to_commons(token, audio_bytes, word, code, lang_name, username,
                       api_url, ext="webm", mime="audio/webm",
                       proficiency="", region=""):
    """Upload one audio clip to Commons via the action API + OAuth bearer token."""
    import requests

    sess = requests.Session()
    sess.headers.update({
        "Authorization": "Bearer " + token,
        "User-Agent": "WikiLinkua/1.0 (https://wikilinkua.toolforge.org)",
    })

    # 1) Fetch a CSRF token. *How* this fails identifies the problem precisely,
    #    so report the specific cause rather than one vague message.
    tok = sess.get(api_url, params={
        "action": "query", "meta": "tokens", "type": "csrf", "format": "json",
    }, timeout=20).json()

    api_error = tok.get("error", {})
    code_ = api_error.get("code", "")
    if code_ in ("readapidenied", "mwoauth-invalid-authorization",
                 "mwoauth-invalid-authorization-invalid-user"):
        return {
            "ok": False,
            "message": (
                "Your login carries no API permission, so Commons refuses the request "
                "before the upload is even attempted (API said: " + code_ + "). "
                "Either this deployment is using an identity-only OAuth consumer, or "
                "your session was created before the upload grants existed. "
                "Log out and log in again first; if it still fails, the deployed "
                "OAUTH_CLIENT_ID / OAUTH_SCOPES need updating."
            ),
        }
    if api_error:
        return {"ok": False, "message": "Commons rejected the request: "
                + (api_error.get("info") or code_ or "unknown error")}

    csrf = tok.get("query", {}).get("tokens", {}).get("csrftoken", "")
    if not csrf or csrf == "+\\":
        # An anonymous token means Commons saw the request as logged out.
        return {
            "ok": False,
            "message": ("Commons treated this request as logged out, so the upload was "
                        "refused. Log out of WikiLinkua and log in again to get a fresh "
                        "token that includes the upload permission."),
        }

    safe_word = _safe_title_part(word, "word")
    safe_user = _safe_title_part(username, "WikiLinkua user")
    base_name = 'Pronunciation of {word} ({code}) - {user}'.format(
        word=safe_word, code=code or "xx", user=safe_user)

    date = datetime.date.today().isoformat()
    in_lang = (" in " + lang_name) if lang_name else ""

    # Say who is speaking. Without this a learner's attempt is indistinguishable
    # from a native pronunciation, which makes the file unusable for teaching.
    speaker = _PROFICIENCY_LABELS.get(proficiency, "")
    speaker_bits = [b for b in (speaker, region) if b]
    speaker_note = (" Spoken by a " + ", ".join(speaker_bits) + ".") if speaker_bits else ""

    # Files belong in the language-specific pronunciation category
    # ("Category:French pronunciation"); the bare "Category:Pronunciation" is a
    # top-level container that should not hold individual files.
    category = (lang_name + " pronunciation") if lang_name else "Pronunciation"

    text = (
        "=={{int:filedesc}}==\n"
        "{{Information\n"
        '|description={{en|1=Pronunciation of "' + word + '"' + in_lang + "."
        + speaker_note + "}}\n"
        "|date=" + date + "\n"
        "|source={{own}}\n"
        "|author=[[User:" + username + "|" + username + "]]\n"
        "}}\n\n"
        "=={{int:license-header}}==\n"
        "{{self|cc-by-sa-4.0}}\n\n"
        "[[Category:" + category + "]]"
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
            "filename": up.get("filename") or filename,
        }

    err = resp.get("error", {})
    code_ = err.get("code", "")
    info_ = err.get("info", "")

    # Publishing a NEW file also creates its File: description page. That needs the
    # `createpage` right, which NO upload grant confers - only the "Create, edit,
    # and move pages" (createeditmovepage) grant does. No amount of retrying or
    # re-logging-in fixes it; the consumer itself has to be updated.
    if code_ in ("nocreate-loggedin", "cantcreate", "protectedpage") \
            or "permission to create" in info_.lower():
        return {
            "ok": False,
            "message": (
                "Commons accepted the audio but refused to create the file's description "
                "page. Publishing a new file needs the 'Create, edit, and move pages' "
                "(createeditmovepage) OAuth grant in addition to the upload grants - the "
                "upload grants alone do not allow creating pages. The OAuth consumer has "
                "to be updated on Meta and re-approved; this cannot be worked around in "
                "the app. (API said: " + (code_ or info_) + ")"
            ),
        }

    if code_ in ("permissiondenied", "mustbeloggedin", "notloggedin"):
        return {
            "ok": False,
            "message": ("Commons refused the upload: your login doesn't carry the "
                        "upload grant. Log out and log in again to refresh it."),
        }
    return {"ok": False, "message": info_ or "Upload did not succeed."}

LEXEME_RE = __import__("re").compile(r"^L[1-9][0-9]*$")


def _wikidata_session(token):
    import requests
    sess = requests.Session()
    sess.headers.update({
        "Authorization": "Bearer " + token,
        "User-Agent": "WikiLinkua/1.0 (https://wikilinkua.toolforge.org)",
    })
    return sess


@bp.route("/api/lexeme/<lexeme_id>")
def lexeme_summary(lexeme_id):
    """Lemma, language and existing derivation for one lexeme.

    Used to preview an edit before it is made: the learner should see *which*
    word they are about to point at, not just an L-number they typed.
    """
    import requests
    if not LEXEME_RE.match(lexeme_id or ""):
        return jsonify(ok=False, message="Not a lexeme id (expected something like L1234).")
    try:
        data = requests.get(
            current_app.config["WIKIDATA_API_URL"],
            params={"action": "wbgetentities", "ids": lexeme_id, "format": "json"},
            headers={"User-Agent": "WikiLinkua/1.0 (https://wikilinkua.toolforge.org)"},
            timeout=20,
        ).json()
    except Exception as exc:  # noqa: BLE001
        return jsonify(ok=False, message="Could not reach Wikidata: " + str(exc))

    ent = (data.get("entities") or {}).get(lexeme_id)
    if not ent or ent.get("missing") is not None:
        return jsonify(ok=False, message=lexeme_id + " does not exist on Wikidata.")

    lemmas = [v.get("value", "") for v in (ent.get("lemmas") or {}).values()]
    existing = [
        c.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
        for c in (ent.get("claims") or {}).get("P5191", [])
    ]
    return jsonify(
        ok=True,
        id=lexeme_id,
        lemma=lemmas[0] if lemmas else lexeme_id,
        lemmas=lemmas,
        language=ent.get("language", ""),
        category=ent.get("lexicalCategory", ""),
        derivedFrom=[e for e in existing if e],
    )


@bp.route("/api/lexeme/derived-from", methods=["POST"])
def add_derived_from():
    """Record P5191 "derived from lexeme" on the learner's behalf.

    This is the edit that turns a "same meaning" pair into a real etymological
    link, and it is the single most valuable statement a WikiLinkua user can add:
    every cognate the app can show rests on P5191.

    Deliberately NOT a one-click "these two are cognates" button. Cognates usually
    descend from a shared ancestor rather than from each other - English *night*
    and German *Nacht* are cognates, but neither derives from the other. Writing
    lexeme -> sibling would be false. So the caller must name the ancestor, and
    the UI explains that before offering the form.
    """
    token = session.get("oauth_token")
    if not token:
        return jsonify(ok=False, message=(
            "Editing Wikidata needs a real Wikimedia login. The development login "
            "has no token."))

    payload = request.get_json(silent=True) or request.form
    lexeme = (payload.get("lexeme") or "").strip().upper()
    ancestor = (payload.get("ancestor") or "").strip().upper()

    if not LEXEME_RE.match(lexeme) or not LEXEME_RE.match(ancestor):
        return jsonify(ok=False, message="Both ids must look like L1234.")
    if lexeme == ancestor:
        return jsonify(ok=False, message="A word cannot be derived from itself.")

    sess = _wikidata_session(token)
    api = current_app.config["WIKIDATA_API_URL"]

    try:
        entities = sess.get(api, params={
            "action": "wbgetentities", "ids": lexeme + "|" + ancestor, "format": "json",
        }, timeout=25).json().get("entities", {})
    except Exception as exc:  # noqa: BLE001
        return jsonify(ok=False, message="Could not reach Wikidata: " + str(exc))

    for lid in (lexeme, ancestor):
        ent = entities.get(lid)
        if not ent or ent.get("missing") is not None:
            return jsonify(ok=False, message=lid + " does not exist on Wikidata.")

    # Never write a duplicate statement.
    already = [
        c.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
        for c in (entities[lexeme].get("claims") or {}).get("P5191", [])
    ]
    if ancestor in already:
        return jsonify(ok=True, alreadyPresent=True,
                       message=lexeme + " is already recorded as derived from " + ancestor + ".")

    csrf = sess.get(api, params={
        "action": "query", "meta": "tokens", "type": "csrf", "format": "json",
    }, timeout=20).json().get("query", {}).get("tokens", {}).get("csrftoken", "")
    if not csrf or csrf == "+\\":
        return jsonify(ok=False, message=(
            "Wikidata refused the edit token. Log out and log in again so the "
            "current permissions apply."))

    import json as _json
    res = sess.post(api, data={
        "action": "wbcreateclaim",
        "entity": lexeme,
        "property": "P5191",
        "snaktype": "value",
        "value": _json.dumps({"entity-type": "lexeme", "id": ancestor}),
        "token": csrf,
        "summary": "add derived from lexeme via WikiLinkua",
        "format": "json",
    }, timeout=30).json()

    if res.get("success") == 1:
        lemma = next(iter((entities[ancestor].get("lemmas") or {}).values()), {}).get("value", ancestor)
        return jsonify(ok=True, message="Recorded: " + lexeme + " derives from " + ancestor +
                                        " (" + lemma + ").",
                       url="https://www.wikidata.org/wiki/Lexeme:" + lexeme)
    err = res.get("error", {})
    return jsonify(ok=False, message="Wikidata rejected the edit: " +
                                     (err.get("info") or err.get("code") or "unknown error"))
