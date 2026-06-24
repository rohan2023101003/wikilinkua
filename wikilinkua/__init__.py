"""WikiLinkua web application.

A standalone language-learning tool built on Wikidata Lexemes. This package is
independent of Ordia: it ships its own templates, styles and routes.
"""

from flask import Flask


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object("wikilinkua.config.Config")

    from .views import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app
