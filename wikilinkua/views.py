"""Routes.

Thin: every page is a template that does its data work in the browser against
the Wikidata Query Service. No database or server-side data processing (yet).
"""

from flask import Blueprint, render_template

main = Blueprint("main", __name__)


@main.route("/")
def index():
    """Landing page listing the games / learning modes."""
    return render_template("index.html")


@main.route("/wikilinkua/")
def wikilinkua():
    """WikiLinkua bridge-words explorer."""
    return render_template("wikilinkua.html")


@main.route("/false-friends/")
def false_friends():
    """Friend-or-Faux true/false-friend quiz."""
    return render_template("false-friends.html")
