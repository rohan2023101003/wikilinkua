"""Authentication.

Two modes, switched by the DEV_LOGIN config flag:

* DEV_LOGIN=true  — a local "test user" login, no network call. Lets us build and
  demo every logged-in feature now, before the public OAuth consumer is approved.
* DEV_LOGIN=false — the real Wikimedia OAuth 2.0 authorization-code flow. This is
  wired and ready; it starts working the moment the PUBLIC (6b) consumer is
  approved and the OAUTH_* env vars are set. (It cannot be tested with an
  owner-only consumer — owner-only disables the interactive login flow.)

We never store passwords. We only read the user's Wikimedia username + id.
"""

import secrets
from urllib.parse import urlencode

from flask import (Blueprint, current_app, flash, redirect, render_template,
                   request, session, url_for)

bp = Blueprint("auth", __name__)


def current_user():
    """Return the logged-in user dict ({'id','username'}) or None."""
    return session.get("user")


@bp.route("/login")
def login_page():
    """Show the login page."""
    return render_template(
        "login.html",
        dev_login=current_app.config["DEV_LOGIN"],
        create_account_url=current_app.config["WIKIMEDIA_CREATE_ACCOUNT_URL"],
    )


@bp.route("/login/start")
def login_start():
    """Begin login. Dev mode logs in instantly; real mode redirects to Wikimedia."""
    if current_app.config["DEV_LOGIN"]:
        session["user"] = {"id": "dev-1", "username": "TestUser"}
        flash("Logged in as a development test user.")
        return redirect(url_for("main.index"))

    # Real Wikimedia OAuth 2.0 — authorization code flow.
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state
    params = {
        "response_type": "code",
        "client_id": current_app.config["OAUTH_CLIENT_ID"],
        "redirect_uri": current_app.config["OAUTH_CALLBACK_URL"],
        "state": state,
    }
    return redirect(current_app.config["OAUTH_AUTHORIZE_URL"] + "?" + urlencode(params))


@bp.route("/oauth-callback")
def callback():
    """Handle the Wikimedia redirect: exchange code -> token -> profile."""
    import requests  # imported here so dev mode needs no extra dependency

    if not request.args.get("state") or \
            request.args.get("state") != session.pop("oauth_state", None):
        flash("Login failed (security check). Please try again.")
        return redirect(url_for("auth.login_page"))

    code = request.args.get("code")
    if not code:
        flash("Login was cancelled.")
        return redirect(url_for("auth.login_page"))

    token_resp = requests.post(
        current_app.config["OAUTH_TOKEN_URL"],
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": current_app.config["OAUTH_CLIENT_ID"],
            "client_secret": current_app.config["OAUTH_CLIENT_SECRET"],
            "redirect_uri": current_app.config["OAUTH_CALLBACK_URL"],
        },
        timeout=15,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]

    profile = requests.get(
        current_app.config["OAUTH_PROFILE_URL"],
        headers={"Authorization": "Bearer " + access_token},
        timeout=15,
    ).json()

    session["user"] = {
        "id": str(profile.get("sub", "")),
        "username": profile.get("username", "Wikimedian"),
    }
    # Keep the access token so we can act on the user's behalf (e.g. upload audio
    # to Commons) when the consumer has the needed grants. Dev login has no token.
    session["oauth_token"] = access_token
    flash("Logged in as " + session["user"]["username"] + ".")
    return redirect(url_for("main.index"))


@bp.route("/logout", methods=["POST"])
def logout():
    """Clear the session."""
    session.clear()
    return redirect(url_for("main.index"))
