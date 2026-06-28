"""Routes.

Thin: every page is a template that does its data work in the browser against
the Wikidata Query Service. No database or server-side data processing (yet).
"""

from flask import Blueprint, render_template

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
