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
