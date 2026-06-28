# WikiLinkua

Learn a new language through the languages you **already** know - powered by
Wikidata Lexemes. Wikimedia Hackathon 2026 ([T425045](https://phabricator.wikimedia.org/T425045)).

Standalone web app (independent of Ordia, where the two games were first
prototyped). It currently ships two modes:

- **Bridge Words** (`/wikilinkua/`) - pick the languages you speak and a target
  language; it finds the words whose meanings cross over (cognates, loanwords,
  phonetic look-alikes) and turns them into a flashcard quiz with audio.
- **Friend or Faux** (`/false-friends/`) - a quiz on true friends vs *faux amis*.

All language data is fetched live in the browser from the
[Wikidata Query Service](https://query.wikidata.org/sparql); there is no database
yet. More learning features (daily lessons, spaced repetition, progress/streaks,
optional Wikimedia login) are planned - see `PROPOSAL.md` and `PROJECT_SETUP.md`.

## Project layout

```
app.py                     # entrypoint (create_app)
Procfile                   # for the Toolforge build service
requirements.txt
wikilinkua/                # the Flask package
├── __init__.py            # application factory
├── config.py
├── views.py               # routes: / , /wikilinkua/ , /false-friends/
├── templates/             # base.html, index.html, the two games
└── static/                # css/bootstrap.min.css, css/app.css, js/app.js
```

## Run locally

in the frontend folder:
```
npm install
npm run build
```

in the root folder:
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py          # http://localhost:5000
```

## Deploy on Toolforge (build service)

```bash
ssh <shellname>@login.toolforge.org
become wikilinkua
toolforge build start https://github.com/rohan2023101003/wikilinkua.git
toolforge webservice buildservice start
```

See `PROJECT_SETUP.md` for the full runbook (accounts, OAuth, database, deploy).

## License

Apache-2.0.
