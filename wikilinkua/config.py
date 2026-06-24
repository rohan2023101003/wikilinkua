"""Configuration.

The only place environment-specific values live. Everything that depends on
deployment/access is read from an environment variable so it can be changed
without touching code (see PROJECT_SETUP.md, Part II).
"""

import os


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret-change-me")

    # Wikidata Query Service. The frontend reads this value (see static/js/app.js);
    # it is kept here too for any future server-side queries.
    SPARQL_ENDPOINT_URL = os.environ.get(
        "SPARQL_ENDPOINT_URL", "https://query.wikidata.org/sparql"
    )
