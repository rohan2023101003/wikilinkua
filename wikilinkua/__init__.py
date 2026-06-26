"""WikiLinkua web application.

A standalone language-learning tool built on Wikidata Lexemes. This package is
independent of Ordia: it ships its own templates, styles and routes.
"""

# Load .env (local dev) before anything reads os.environ. On Toolforge there is
# no .env; environment variables are set with `toolforge envvars` instead, so this
# is a no-op there. Safe if python-dotenv isn't installed.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, redirect, request, session, url_for


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object("wikilinkua.config.Config")

    from .views import main as main_blueprint
    from .auth import bp as auth_blueprint, current_user
    app.register_blueprint(main_blueprint)
    app.register_blueprint(auth_blueprint)

    # Endpoints reachable WITHOUT being logged in: the login flow + static files.
    PUBLIC_ENDPOINTS = {
        "auth.login_page",
        "auth.login_start",
        "auth.callback",
        "auth.logout",
        "static",
    }

    @app.before_request
    def require_login():
        """Gate the whole app behind login — you must log in before using it."""
        if request.endpoint in PUBLIC_ENDPOINTS or request.endpoint is None:
            return None
        if not session.get("user"):
            return redirect(url_for("auth.login_page"))
        return None

    @app.context_processor
    def inject_user():
        # makes `current_user` available in every template (nav, etc.)
        return {"current_user": current_user()}

    return app
