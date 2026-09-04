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
