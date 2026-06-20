# WikiLinkua
Learn a new language through the languages you already know, using Wikidata Lexemes.
Wikimedia Hackathon 2026.

## What it does
(one paragraph — see PROPOSAL.md)

## Run locally
1. python -m venv venv && source venv/bin/activate
2. pip install -r requirements.txt
3. flask run   # opens http://localhost:5000

## Deploy your own copy on Toolforge
1. Create your own Toolforge tool, then: become <yourtool>
2. toolforge build start https://github.com/<you>/wikilinkua.git
3. toolforge webservice buildservice start
(See PROJECT_SETUP.md for the full runbook.)

## Configuration / secrets
Set these as env vars on the tool (never commit them):
- OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET  (Wikimedia OAuth 2.0)
- DB_* (ToolsDB credentials)  — only needed for the optional login/sync layer

## License
Apache-2.0
