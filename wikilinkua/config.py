"""Configuration.

The only place environment-specific values live. Everything that depends on
deployment/access is read from an environment variable so it can be changed
without touching code (see PROJECT_SETUP.md, Part II).
"""

import os


def _bool(name, default="false"):
    return os.environ.get(name, default).strip().lower() in ("1", "true", "yes")


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret-change-me")

    # Wikidata Query Service (the frontend reads this via static/js/app.js).
    SPARQL_ENDPOINT_URL = os.environ.get(
        "SPARQL_ENDPOINT_URL", "https://query.wikidata.org/sparql"
    )

    # --- Auth ---------------------------------------------------------------
    # DEV_LOGIN=true  -> fake "test user" login, no Wikimedia call (default now).
    # DEV_LOGIN=false -> real Wikimedia OAuth 2.0 (needs the PUBLIC consumer +
    #                    the env vars below). Flip this once 6b is approved.
    DEV_LOGIN = _bool("DEV_LOGIN", "true")

    OAUTH_CLIENT_ID = os.environ.get("OAUTH_CLIENT_ID", "")
    OAUTH_CLIENT_SECRET = os.environ.get("OAUTH_CLIENT_SECRET", "")
    OAUTH_CALLBACK_URL = os.environ.get(
        "OAUTH_CALLBACK_URL", "http://localhost:5000/oauth-callback"
    )

    # MediaWiki OAuth 2.0 REST endpoints (on meta) - do not change.
    OAUTH_AUTHORIZE_URL = "https://meta.wikimedia.org/w/rest.php/oauth2/authorize"
    OAUTH_TOKEN_URL = "https://meta.wikimedia.org/w/rest.php/oauth2/access_token"
    OAUTH_PROFILE_URL = "https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile"

    # Where to send people who don't have a Wikimedia account yet.
    WIKIMEDIA_CREATE_ACCOUNT_URL = (
        "https://meta.wikimedia.org/wiki/Special:CreateAccount"
    )

    # Wikimedia Commons API - target for in-app pronunciation uploads.
    COMMONS_API_URL = os.environ.get(
        "COMMONS_API_URL", "https://commons.wikimedia.org/w/api.php"
    )
