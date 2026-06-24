"""WikiLinkua — standalone entrypoint.

Run locally with:  python app.py   (or)   flask --app app run
"""

from wikilinkua import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
