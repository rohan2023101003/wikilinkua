"""Routes.

Thin: every page is a template that does its data work in the browser against
the Wikidata Query Service. No database or server-side data processing (yet).
"""

from flask import Blueprint, current_app, jsonify, render_template, request

main = Blueprint("main", __name__)


@main.route("/")
@main.route("/app/")
def index():
    """Serve the React application."""
    return render_template("app.html")


@main.route("/wikilinkua/")
def wikilinkua():
    """Serve the React application."""
    return render_template("app.html")


@main.route("/false-friends/")
def false_friends():
    """Serve the React application."""
    return render_template("app.html")


# Every in-app destination gets a real URL: deep links work, the back button
# works, and the server-rendered pages can link to the same places the SPA nav
# does. They all render the same bundle; App.jsx maps the path to a view.
@main.route("/words")
@main.route("/phrases")
@main.route("/progress")
@main.route("/video")
@main.route("/article")
@main.route("/profile")
def spa_views():
    """Serve the React app for the remaining in-app destinations."""
    return render_template("app.html")


@main.route("/learn")
def learn():
    """Serve the SPA on the guided course view (deep-linkable)."""
    return render_template("app.html")


@main.route("/practice")
def practice():
    """Serve the SPA on the free-practice dashboard (the pre-course home)."""
    return render_template("app.html")


@main.route("/contribute")
def contribute():
    """Serve the React application on the Contribute (data gaps) view.

    The audio recorder is a sub-page at /contribute/record.
    """
    return render_template("app.html")


@main.route("/guide")
def guide():
    """Serve the user guide."""
    return render_template("guide.html")


@main.route("/docs")
def docs_index():
    """Serve the docs landing page."""
    return render_template("docs_index.html")


@main.route("/privacy")
def privacy():
    """Serve the privacy policy."""
    return render_template("privacy.html")


@main.route("/api/sparql", methods=["GET", "POST"])
def sparql_proxy():
    """Proxy SPARQL queries to the Wikidata Query Service with a Wikimedia-compliant User-Agent."""
    import requests

    query = request.values.get("query") or (request.get_json(silent=True) or {}).get("query")
    if not query:
        return jsonify(error="Missing query"), 400

    endpoint = current_app.config.get("SPARQL_ENDPOINT_URL", "https://query.wikidata.org/sparql")
    user_agent = current_app.config.get(
        "USER_AGENT",
        "WikiLinkua/1.0 (https://wikilinkua.toolforge.org/; tools.wikilinkua@toolforge.org)",
    )
    headers = {
        "Accept": request.headers.get("Accept", "application/sparql-results+json"),
        "User-Agent": user_agent,
    }

    try:
        resp = requests.post(endpoint, data={"query": query}, headers=headers, timeout=60)
        return (
            resp.content,
            resp.status_code,
            {"Content-Type": resp.headers.get("Content-Type", "application/sparql-results+json")},
        )
    except requests.Timeout:
        return jsonify(error="SPARQL query timed out"), 504
    except Exception as exc:  # noqa: BLE001
        return jsonify(error=str(exc)), 502
