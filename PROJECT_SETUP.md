# WikiLinkua - Engineering & Deployment Runbook (scratch → live on Toolforge)

This is the **ops/infrastructure** doc (not the product proposal - that's
`PROPOSAL.md`). It is the end-to-end process to go from *nothing* to a working,
publicly hosted tool at **`https://wikilinkua.toolforge.org`** with:

- code on **GitHub** (deployed to Toolforge from there, exactly like Ordia),
- **login via Wikimedia OAuth** (users sign in with their existing Wikimedia
  account - we never store passwords),
- per-user progress / streaks stored in **Toolforge ToolsDB** (MariaDB),
- the app running as a **Toolforge webservice**.

It focuses on **what to apply for, where, in what order, and what has approval
lead-time** - so you start every slow request *now* and never sit waiting later.
It does not contain application code.

> **Read this first:** how we handle user data is already decided - a **hybrid**
> (works on `localStorage` with no login; optional Wikimedia login syncs progress to
> a database). See [§2](#2-how-we-store-user-data-decided-hybrid--do-not-re-debate).
> The exact, step-by-step application process is [§3](#3-accounts--permissions--the-exact-application-process-step-by-step).

---

## 1. Target architecture (the end state)

```
                         ┌─────────────────────────────────────┐
   Browser (the learner) │  UI built with Wikimedia Codex       │
                         │  (design system: tokens + components) │
                         └───────────────┬─────────────────────┘
            ┌──────────────────┬─────────┴───────────┬───────────────────┐
            ▼                  ▼                     ▼                   ▼
  query.wikidata.org   wikilinkua.toolforge.org   meta.wikimedia.org   Commons
  (SPARQL - words,     (our Flask app on          (OAuth login -       (audio files
   meanings, IPA…)      Toolforge Kubernetes)      "log in with        P443)
                              │                      Wikimedia")
                              ▼
                        Toolforge ToolsDB
                        (MariaDB: user_id, progress,
                         streaks, SRS state)
```

Key point: the **language data** still comes live from Wikidata/Commons in the
browser (no change from today's games). The **only** thing the server + database
add is **remembering each user** (login, progress, streaks across devices).

### UI stack - Wikimedia Codex
The frontend uses **Codex** (`@wikimedia/codex` + `@wikimedia/codex-design-tokens`),
the official Wikimedia design system, so the tool is accessible, RTL-ready, and
visually native. **Codex needs no Wikimedia accounts or permissions** - it is just
an npm package / CSS, so it does **not** change the critical path in §3. It affects
only the **repo layout and the deploy step**, depending on which path you choose:

| Path | What it is | Deploy impact |
|---|---|---|
| **1. Codex CSS-only + tokens** *(recommended for the hackathon)* | Codex's CSS-only components + design tokens inside plain HTML/JS templates; replaces Bootstrap | **No build step.** Deploy as today - Flask serves templates + a CSS file. Newcomers stay in HTML/CSS/JS. |
| **2. Full Vue 3 SPA + Codex components** | A Vue app (`CdxButton`, `CdxCard`, …) built with Vite | **Adds a frontend build step** (`npm install && npm run build` → static `dist/`). Either let the Toolforge **build service** run the Node build, or commit the built assets; Flask shrinks to serving the SPA + a JSON API for OAuth/DB. Requires Vue knowledge. |

Pick **Path 1** unless someone scaffolds the Vue project before the event.

---

## 2. How we store user data (decided: hybrid - do not re-debate)

Progress is stored in **two layers**:

1. **`localStorage`** (always on, no login) - every visitor's streaks and progress
   are saved in their own browser. The tool is **fully usable with zero login**.
2. **Wikimedia OAuth login → ToolsDB** (optional) - a "Log in with Wikimedia" button
   copies that local progress into our database so it **follows the user across
   devices**.

That's the whole design. Build layer 1 first (needs no approvals, works for
everyone). Add layer 2 - referred to below as **"the sync layer"** - once the OAuth
client and database are ready. You are never blocked: the core tool ships without
waiting on any approval.

---

## 3. Accounts & permissions - the exact application process (step by step)

### 3.0 You need TWO different accounts (this trips up everyone)
They are separate systems and may have different usernames:

| Account | Make it at | Used for |
|---|---|---|
| **Wikimedia account** (your normal wiki-editing login, "SUL") | any Wikimedia wiki, e.g. meta.wikimedia.org | **registering the OAuth client**; it's also what your *users* log in with |
| **Wikimedia Developer account** (LDAP / "shell" account) | idm.wikimedia.org | Toolforge + wikitech (the deployer only) |

If you already edit Wikidata/Wikipedia you have the first. You almost certainly
need to **create the second**. **Code hosting uses GitHub** (see Step 5), so no
Wikimedia GitLab account is needed - and your mentee needs **neither** Wikimedia
account, only a GitHub login.

### 3.1 The plan: fire off the slow approvals on day 0, build while you wait
Only **two** things need human approval. Start both immediately, then work in
parallel:

```
DAY 0  ─┬─ [A] Request Toolforge membership      → wait ~1 day
        ├─ [B] Propose the PUBLIC OAuth 2.0 client → wait several days
        └─ MEANWHILE (no waiting):
             Step 1 dev account · Step 2 SSH key · Step 5 GitHub repo ·
             Step 6a OWNER-ONLY OAuth client (instant) → build & test login now
WHEN [A] approved → Step 4 create tool · deploy "hello world" · Step 7 ToolsDB
WHEN [B] approved → swap the owner-only client creds for the public ones. Done.
```

---

### Step 1 - Create your Wikimedia Developer account · *instant*
1. Go to **https://idm.wikimedia.org/** → **Create account**.
2. Fill in:
   - **Username** - your dev username (e.g. `Rohan2023`).
   - **Shell username** - lowercase, no spaces (e.g. `rohan2023`). This is your SSH
     login name and is **hard to change later** - choose carefully.
   - **Email** and **password**.
3. Click the confirmation link in your email. No approval wait.

### Step 2 - Add your SSH key · *instant*
1. On your computer run: `ssh-keygen -t ed25519 -C "your_email"` (press Enter for
   all defaults). This creates `~/.ssh/id_ed25519` (private - keep secret) and
   `~/.ssh/id_ed25519.pub` (public).
2. Open the **`.pub`** file and copy its full contents.
3. idm.wikimedia.org → your profile → **SSH keys** → paste it → save.

### Step 3 - Request Toolforge membership · *⏳ ~1 day - do this FIRST*
1. Go to **https://toolsadmin.wikimedia.org/** and log in with your **developer
   account**.
2. Open the **"Join Toolforge"** / membership request.
3. In the **reason** field, paste:
   > *I am building WikiLinkua, a language-learning web tool based on Wikidata
   > Lexemes and Wiktionary, for Wikimedia Hackathon 2026. I need Toolforge to host
   > the tool so the community can use it.*
4. Submit and **wait for the approval email** (usually within a day).
   **While you wait, do Steps 1, 2, 5 and 6a** - none of them need this.

### Step 4 - Create the tool · *instant, AFTER Step 3 is approved*
1. toolsadmin.wikimedia.org → **Tools** → **Create new tool**.
2. **Tool name:** `wikilinkua` (lowercase, hyphens allowed). This becomes your URL
   **`https://wikilinkua.toolforge.org`**. If it's taken, use e.g. `wikilinkua-app`.
3. **Title:** `WikiLinkua`. **Description:** one line, e.g. *"Learn a language
   through the ones you already know, using Wikidata Lexemes."*
4. Submit - the tool (its own service account) is created instantly.

### Step 5 - Create the GitHub repo · *instant - do anytime on day 0*
We use **GitHub** so a collaborator needs only a plain GitHub account - **no
Wikimedia account required to write code**. Toolforge deploys directly from a public
GitHub repo (exactly how Ordia itself is hosted), so there is **no future "migrate
to GitLab" step**.

**5.1 - Make sure you (and your mentee) have a GitHub account**
- Sign up free at **https://github.com/signup** if you don't already have one. Your
  mentee just needs their own free GitHub account - nothing else.

**5.2 - Create the repository** (GitHub can add the README, licence, and .gitignore
for you in this one screen):
1. Go to **https://github.com/new**.
2. Fill in:
   - **Repository name:** `wikilinkua`
   - **Description:** *"Learn a language through the ones you already know - Wikidata
     Lexemes. Wikimedia Hackathon 2026."*
   - **Visibility:** **Public**
   - **Add a README file:** ✅ tick it.
   - **Add .gitignore:** choose the **Python** template (keeps `__pycache__/`, venvs,
     etc. out of git).
   - **Choose a license:** select **Apache License 2.0** (same as Ordia, so anyone
     may legally host/fork it).
3. Click **Create repository**. You now have a repo with a `README.md`, a `LICENSE`
   file, and a `.gitignore` already in it.

**5.3 - Flesh out the README** (edit `README.md` in the GitHub web editor - the
pencil icon - and paste a skeleton like this, fill in over the hackathon):
```markdown
# WikiLinkua
Learn a new language through the languages you already know, using Wikidata Lexemes.
Wikimedia Hackathon 2026.

## What it does
(one paragraph - see PROPOSAL.md)

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
- DB_* (ToolsDB credentials)  - only needed for the optional login/sync layer

## License
Apache-2.0
```

**5.4 - Confirm the licence** is present: the repo's main page should show an
**"Apache-2.0"** badge near the top. If you forgot to add it at creation, click
**Add file → Create new file**, name it `LICENSE`, and GitHub will offer a
**"Choose a license template"** button → pick **Apache License 2.0** → commit.

**5.5 - Make sure secrets can never be committed:** open `.gitignore` (Add file →
Edit) and append these lines, so the OAuth secret / DB config never end up on
GitHub:
```
# local secrets - never commit
.env
config.local.py
*.cnf
```

**5.6 - Add your mentee as a collaborator:**
- Repo → **Settings → Collaborators → Add people** → enter their GitHub username →
  role **Write**. They accept the email invite, then push branches and open **pull
  requests**. No Toolforge or Wikimedia account needed for them.

**5.7 - (Optional) clone it to your computer** to work locally:
- `git clone https://github.com/<you>/wikilinkua.git`

### Step 6 - Register the OAuth 2.0 client · *do both on day 0*
Log in to meta with your **Wikimedia account** (not the developer account), then go
to **https://meta.wikimedia.org/wiki/Special:OAuthConsumerRegistration/propose/oauth2**.
Register **two clients**: **6a** (owner-only, for development today) and **6b**
(public, for real users - needs approval). Fill every field exactly as below.

| Field | **6a - dev (owner-only)** | **6b - public** |
|---|---|---|
| Application name | `WikiLinkua (dev)` | `WikiLinkua` |
| Application description | see 6a text below | see 6b text below |
| OAuth callback URL | `https://wikilinkua.toolforge.org/oauth-callback` | `https://wikilinkua.toolforge.org/oauth-callback` |
| Applicable project | `*` | `*` |
| "for use only by *you*" (owner-only) | **checked** | **unchecked** |
| Client is confidential | **checked** | **checked** |
| Authorization code | checked | checked |
| Refresh token | checked | checked |
| Client credentials | unchecked | unchecked |
| Types of grants | **Option 1** - "User identity verification only, no ability to read pages or act on a user's behalf" | **Option 1** (same) |
| Applicable grants (big list) | nothing checked | nothing checked |
| Allowed IP ranges | `0.0.0.0/0` and `::/0` | `0.0.0.0/0` and `::/0` |
| Allowed pages for editing | empty | empty |

**6a application description:**
```
Development instance of WikiLinkua, a language-learning tool that helps people learn a new language through the languages they already know, using Wikidata Lexemes. Logs the user in only to identify them and sync learning progress.
```

**6b application description:**
```
WikiLinkua is a language-learning web tool that helps people learn a new language through the languages they already know, using Wikidata Lexemes. Users log in with their Wikimedia account so their learning progress and streaks sync across devices. It only reads the user's identity and does not edit or act on any wiki.
```

- **6a** is approved instantly → you get a **client ID + secret** immediately to build with.
- **6b** becomes **"proposed"** → a Wikimedia OAuth admin approves it (**several days**).
  When approved, swap its client ID/secret in and real users can log in.

> **Right after each submit:** copy the **client secret immediately** - it is shown
> **once**. Put every client ID/secret into the tool as a secret (a config file in
> the tool's `$HOME` or an environment variable). **Never commit them to GitHub.**

### Step 7 - Create the ToolsDB database · *instant, after Step 4*
1. `ssh <shellname>@login.toolforge.org`, then `become wikilinkua`.
2. Look in **`~/replica.my.cnf`** for your database **username/prefix** (looks like
   `s5xxxx`).
3. Connect with `sql tools`, then create the database (its name **must** start with
   your prefix):
   `CREATE DATABASE s5xxxx__wikilinkua;`
4. Create the tables (schema sketch in §6). Connection: host
   `tools.db.svc.wikimedia.cloud`, credentials from `~/replica.my.cnf`.

### Step 8 - Write the privacy policy · *before public launch*
Because you store a username + learning history (**personal data**), Wikimedia Cloud
Services **requires** a privacy policy. Add `PRIVACY.md` to the repo and serve it at
`/privacy`. State: what you store (Wikimedia username, progress, streaks), why (to
sync learning across devices), that it is never shared or sold, how long you keep
it, and **how a user deletes their data** (a delete button or a contact address).
Link it in the footer.

### 3.2 "You are unblocked when…"
- ✅ Dev account + SSH key → you can SSH into Toolforge to deploy.
- ✅ Toolforge membership approved → you can create the tool (Step 4).
- ✅ Tool created → you get the URL, can deploy, and can make the ToolsDB.
- ✅ Owner-only OAuth client → you can build & demo login **today**.
- ✅ Public OAuth client approved → real users can log in.

---

## 4. Phase-by-phase flow

> This phase = exactly **§3 Steps 1–8**. Do the day-0 work there (dev account, SSH
> key, Toolforge membership ⏳, GitHub repo, owner-only OAuth client + public
> proposal ⏳). The phases below are what you do **after** the approvals land.

### Phase 1 - Create the tool & a "hello world" webservice
5. Once Toolforge membership is approved, create the tool `wikilinkua` (§3 Step 4).
6. SSH in and switch to the tool account:
   - `ssh <devaccount>@login.toolforge.org`
   - `become wikilinkua`  ← now you *are* the tool
7. Start a webservice to confirm the pipeline works end-to-end before any real code,
   using the **Toolforge Build Service** (buildpacks): point it at the public GitHub
   repo and it builds & runs it (commands in Phase 3).
   - Visit `https://wikilinkua.toolforge.org` - you should see your placeholder.

### Phase 2 - Repo & project skeleton
8. Structure the GitHub repo so the build service can run it (a `requirements.txt`,
   an entrypoint, and - for the build service - a `Procfile` declaring the web
   command). Keep the existing two games' templates as the starting UI.
9. Set up local dev (run Flask on your laptop against live Wikidata) so contributors
   don't need Toolforge access just to build frontend/features. **Most newcomers can
   contribute entirely locally** - only the deployer needs Toolforge.

### Phase 3 - Deploy from GitHub (the build/deploy loop)
10. With the build service: `toolforge build start https://github.com/<you>/wikilinkua.git`,
    then `toolforge webservice buildservice start` (consult
    `wikitech.wikimedia.org` → *Help:Toolforge/Build Service* for the exact current
    commands - they evolve).
11. Redeploy = push to GitHub → `toolforge build start` again → restart webservice.
    This is your "ship" button.

### Phase 4 - Database (the sync layer)
12. Provision **ToolsDB** (see §6). Create a database for the tool and the tables for
    user progress.

### Phase 5 - OAuth login (the sync layer)
13. Put the OAuth consumer **key + secret** into the tool as a secret (an env var /
    a non-committed config file in the tool's home - **never commit secrets to
    GitHub**).
14. Wire the login flow: `/login` → redirect to Wikimedia → `/oauth-callback` →
    you receive the user's identity → create/look-up their row in ToolsDB → set a
    session cookie. Use a maintained library (e.g. `mwoauth` / a Flask MediaWiki
    OAuth helper) rather than hand-rolling.

### Phase 6 - Go live & "anyone can host it"
15. Add a **privacy policy** (§8 / Step 8) and link it in the footer.
16. Write a **README** with: what the tool is, how to run locally, and **how to
    deploy your own copy on Toolforge** (so the "anyone can host" goal is real -
    that's just: create your own tool, clone the repo, set your own OAuth consumer,
    deploy). 
17. Announce on the Phabricator task (T425045) and the Telegram group.

---

## 5. Repository plan

- **Host:** **GitHub** - the Toolforge build service pulls directly from a public
  GitHub repo (this is how Ordia is hosted). A collaborator needs only a GitHub
  account, no Wikimedia account. (Wikimedia GitLab is the optional "native"
  alternative; not required, no migration needed.)
- **Visibility:** public.
- **Licence:** keep **Apache-2.0** (same as Ordia) so others can legally host/fork.
- **Branches:** `main` = deployable; feature branches per task; pull requests for
  review (good practice for newcomers' first contributions).
- **Secrets:** OAuth key/secret and DB credentials live **only** on the Toolforge
  tool (in `$HOME`), never in git. Document required env vars in the README.

---

## 6. Database plan (the sync layer)

- **Engine:** Toolforge **ToolsDB** - a shared MariaDB for tools. Persistent,
  backed up, free for Toolforge tools.
- **Connect:** over SSH as the tool, `sql tools` (host `tools.db.svc.wikimedia.cloud`).
- **Create your DB:** ToolsDB databases must be named with **your tool's assigned
  prefix** (something like `s5xxxx__wikilinkua`). Check the exact prefix from your
  tool's credentials file in `$HOME` and follow *Help:Toolforge/Database* on
  wikitech.
- **Minimal schema (sketch, not code):**
  - `users` - internal id, Wikimedia user id, username, created_at.
  - `progress` - user id, language pair, word/lexeme id, SRS box, due date,
    times_seen, times_correct.
  - `stats` - user id, current streak, longest streak, last_active date, total XP.
- **Privacy:** username + learning history = **personal data**. You must (a) publish
  a privacy policy, (b) store the minimum, (c) provide a way to delete an account's
  data. This is a Wikimedia Cloud Services requirement, not optional.

---

## 7. OAuth plan (the sync layer)

- **Why Wikimedia OAuth (not Google/email):** users already have Wikimedia accounts;
  it's the community-trusted, privacy-respecting choice; you store **no passwords**.
- **Consumer type:** request only **basic identification** ("identify the user").
  You do **not** need edit/write grants - you're not editing wikis on their behalf.
- **Callback:** `https://wikilinkua.toolforge.org/oauth-callback`.
- **Owner-only vs for-all-users:** owner-only is approved instantly and works for
  *your* account (perfect for building/demoing). The for-all-users consumer needs an
  OAuth admin to approve - **propose it on day 0** so it's ready.
- **What you get back:** the user's Wikimedia username + a stable user id → that's
  the key you store progress against.

---

## 8. Pre-hackathon checklist (the "do it now so you don't wait" list)

Tick these **before** the event so day 1 is pure building:

- [ ] Wikimedia (wiki-editing) account exists - needed to register OAuth (§3.0)
- [ ] Developer account created + SSH key added (§3 Steps 1–2)
- [ ] Toolforge membership requested ⏳ (§3 Step 3)
- [ ] GitHub repo created, public, Apache-2.0 licence, mentee added as collaborator (§3 Step 5)
- [ ] OAuth 2.0 client: owner-only registered **and** public one proposed ⏳ (§3 Step 6)
- [ ] Short privacy policy drafted for the sync layer (§3 Step 8)
- [ ] Everyone who only does frontend has the repo running **locally** (no Toolforge
      account needed for them)
- [ ] One person designated as **deployer** (owns the Toolforge tool + deploys)

---

## 9. Toolforge-specific gotchas

1. **Membership/OAuth approvals are the only things with real latency.** Everything
   else is instant. Front-load them (§8).
2. **Verify exact CLI commands on wikitech**, not from memory - Toolforge's build
   service and `webservice` commands change. Start at
   `wikitech.wikimedia.org/wiki/Help:Toolforge`.
3. **Secrets never go in git.** They live in the tool's `$HOME`.
4. **Only the deployer needs Toolforge.** Don't block newcomers on account approvals
   - they build locally and open merge requests.
5. **Storing personal data = privacy policy + data-deletion path.** Non-negotiable
   under Wikimedia Cloud Services terms.
6. **Free, but be polite to WDQS.** Cache results; keep the `LIMIT`/timeout caps the
   current games already use.
7. **Codex changes the frontend, not the permissions.** Using the Wikimedia Codex
   design system adds **no new accounts/approvals**. It only affects repo layout and
   the deploy step: the **CSS-only path needs no build**, while the **full Vue path
   adds a Node/Vite build** the build service must run (or you commit `dist/`).

---

## 10. Suggested order for *this* team (summary)

1. **Now (day 0):** dev account + SSH key → request Toolforge membership ⏳ →
   create GitHub repo → register owner-only OAuth client + propose the public one ⏳.
   (§3.1, §8)
2. **Hackathon Day 1:** create the tool, get "hello world" live on
   `*.toolforge.org`, and build the app locally against live Wikidata. The core tool
   works on `localStorage` alone - no DB or login needed yet.
3. **Hackathon Day 2:** add the sync layer - wire OAuth (owner-only client works
   today) + ToolsDB for cross-device progress. When the public client is approved,
   swap its credentials in so all users can log in.
4. **After:** write the README "deploy your own" section, publish the privacy
   policy, announce on T425045.

*Companion doc: `PROPOSAL.md` (the product vision & 2-day feature plan).*

---

# Part II - Implementation plan (ready to code)

The rest of this doc is the build plan. The guiding rule:

> **Config-first: everything that depends on access lives in environment variables,
> never in code.** You build the entire app *now* with local stand-ins (SQLite + a
> fake login). When Toolforge/OAuth/ToolsDB access lands, you **only change
> environment variables** - the code never changes.

---

## 11. The "now → later" swap table (read this first)

| Concern | **Now (local dev, day 0 - no waiting)** | **Later (when access lands)** | What you change |
|---|---|---|---|
| Where code runs | your laptop (`flask run`) | Toolforge webservice | nothing in code |
| Language data (words, IPA, audio) | live Wikidata Query Service from the browser | same | nothing - never changes |
| User progress storage | **SQLite file** (`sqlite:///wikilinkua.db`) | **ToolsDB** MariaDB | `DATABASE_URL` env var |
| Login | **mock login** (`DEV_LOGIN=true` → fake user) | **Wikimedia OAuth 2.0** | `DEV_LOGIN=false` + OAuth env vars |
| OAuth credentials | the **6a (dev)** client ID/secret | the **6b (public)** client ID/secret | `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` |
| OAuth callback | `http://localhost:5000/oauth-callback` | `https://wikilinkua.toolforge.org/oauth-callback` | `OAUTH_CALLBACK_URL` |

**Key consequence:** you can build and finish *every feature* before any approval
arrives. Approvals only flip env vars.

---

## 12. Repository structure

```
wikilinkua/
├── app.py                      # entrypoint: app = create_app()
├── config.py                   # THE only place env-specific values live
├── requirements.txt
├── Procfile                    # tells the Toolforge build service how to run it
├── .gitignore                  # ignores .env, *.cnf, __pycache__, *.db
├── .env.example                # documents required env vars (no secrets)
├── README.md
├── LICENSE                     # Apache-2.0
├── PRIVACY.md
└── wikilinkua/
    ├── __init__.py             # create_app() factory + blueprint registration
    ├── views.py                # page routes (/, /onboarding, /lesson, …)
    ├── api.py                  # JSON API: /api/progress  (sync layer)
    ├── auth.py                 # OAuth 2.0 login/callback/logout (+ mock login)
    ├── db.py                   # SQLAlchemy models + session (SQLite now, ToolsDB later)
    ├── templates/
    │   ├── base.html           # Codex CSS + nav + page shell
    │   ├── home.html           # dashboard: streak, % unlocked, "continue"
    │   ├── onboarding.html      # pick known langs + target + daily goal
    │   ├── lesson.html         # the flashcard / SRS lesson loop
    │   ├── bridges.html        # bridge-word explorer (today's WikiLinkua game)
    │   ├── false_friends.html  # Friend-or-Faux quiz (today's game)
    │   └── privacy.html
    └── static/
        ├── css/
        │   ├── codex.css       # Codex CSS-only components + design tokens
        │   └── app.css         # our small custom styles
        └── js/
            ├── sparql.js       # builds + runs WDQS queries (ported from games)
            ├── storage.js      # progress: localStorage always; syncs to API if logged in
            ├── srs.js          # spaced-repetition scheduler (Leitner/SM-2)
            ├── lesson.js       # drives the lesson screen
            └── app.js          # onboarding, profile, routing glue
```

---

## 13. Config & boilerplate files (copy these in)

**`config.py`** - the single source of truth for anything that changes between
local and Toolforge:
```python
import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")

    # Storage: SQLite now → ToolsDB later. Change ONLY this env var.
    #   now:   sqlite:///wikilinkua.db
    #   later: mysql+pymysql://USER:PASS@tools.db.svc.wikimedia.cloud:3306/s5xxxx__wikilinkua
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///wikilinkua.db")

    # Auth: mock login now → real OAuth later.
    DEV_LOGIN = os.environ.get("DEV_LOGIN", "true").lower() == "true"
    OAUTH_CLIENT_ID     = os.environ.get("OAUTH_CLIENT_ID", "")
    OAUTH_CLIENT_SECRET = os.environ.get("OAUTH_CLIENT_SECRET", "")
    OAUTH_CALLBACK_URL  = os.environ.get(
        "OAUTH_CALLBACK_URL", "http://localhost:5000/oauth-callback")

    # MediaWiki OAuth 2.0 endpoints (do not change)
    OAUTH_AUTHORIZE_URL = "https://meta.wikimedia.org/w/rest.php/oauth2/authorize"
    OAUTH_TOKEN_URL     = "https://meta.wikimedia.org/w/rest.php/oauth2/access_token"
    OAUTH_PROFILE_URL   = "https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile"
```

**`.env.example`** (commit this; copy to `.env` locally and fill in - `.env` is
gitignored):
```
SECRET_KEY=change-me
DEV_LOGIN=true
DATABASE_URL=sqlite:///wikilinkua.db
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
OAUTH_CALLBACK_URL=http://localhost:5000/oauth-callback
```

**`requirements.txt`:**
```
Flask
gunicorn
SQLAlchemy
PyMySQL
requests
Authlib
python-dotenv
```

**`Procfile`** (Toolforge build service reads this to run the app):
```
web: gunicorn -w 4 -b 0.0.0.0:8000 "wikilinkua:create_app()"
```
*(Toolforge routes web traffic to port 8000 for build-service apps; confirm on
`wikitech.wikimedia.org/wiki/Help:Toolforge/Build_Service`.)*

**`app.py`:**
```python
from wikilinkua import create_app
app = create_app()

if __name__ == "__main__":
    app.run(debug=True)   # local dev only
```

---

## 14. Backend (Flask) - what each file does

The backend stays **thin**: all language data is fetched in the browser from WDQS
(never changes). The server only (a) serves pages and (b) stores progress for
logged-in users.

**`wikilinkua/__init__.py`** - the app factory:
```python
from flask import Flask
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")
    from .db import init_db
    init_db(app)
    from .views import bp as views_bp
    from .api import bp as api_bp
    from .auth import bp as auth_bp
    app.register_blueprint(views_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)
    return app
```

**Routes to implement:**

| Method & path | File | Purpose |
|---|---|---|
| `GET /` | views.py | dashboard (or redirect to /onboarding if no profile) |
| `GET /onboarding` | views.py | pick known languages + target + daily goal |
| `GET /lesson` | views.py | the SRS lesson screen |
| `GET /bridges` | views.py | bridge-word explorer (today's game) |
| `GET /false-friends` | views.py | Friend-or-Faux quiz (today's game) |
| `GET /privacy` | views.py | privacy policy |
| `GET /login` | auth.py | start OAuth (or mock login if `DEV_LOGIN`) |
| `GET /oauth-callback` | auth.py | exchange code → fetch profile → create session |
| `POST /logout` | auth.py | clear session |
| `GET /api/progress` | api.py | return logged-in user's progress (JSON) |
| `POST /api/progress` | api.py | upsert logged-in user's progress (JSON) |

**`wikilinkua/db.py`** - SQLAlchemy; SQLite now, ToolsDB later, **same code**:
```python
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()
_Session = None

class User(Base):
    __tablename__ = "users"
    id        = Column(Integer, primary_key=True)
    wm_user_id = Column(String(64), unique=True)   # Wikimedia global user id
    username   = Column(String(255))
    created_at = Column(DateTime)

class Progress(Base):
    __tablename__ = "progress"
    id        = Column(Integer, primary_key=True)
    user_id   = Column(Integer, index=True)
    payload   = Column(Text)          # JSON blob: SRS state, streak, stats
    updated_at = Column(DateTime)

def init_db(app):
    global _Session
    engine = create_engine(app.config["DATABASE_URL"], future=True)
    Base.metadata.create_all(engine)   # auto-creates tables (SQLite & MariaDB)
    _Session = sessionmaker(bind=engine)

def session():
    return _Session()
```
> When ToolsDB is ready you set `DATABASE_URL` to the MariaDB URL and restart - the
> same `create_all` builds the tables there. No code change.

**`wikilinkua/auth.py`** - mock now, real OAuth later, switched by `DEV_LOGIN`:
```python
from flask import Blueprint, session, redirect, url_for, current_app, request
bp = Blueprint("auth", __name__)

@bp.route("/login")
def login():
    if current_app.config["DEV_LOGIN"]:
        session["user"] = {"id": "dev-1", "name": "DevUser"}   # fake login
        return redirect(url_for("views.home"))
    # real OAuth 2.0: redirect to OAUTH_AUTHORIZE_URL with client_id, redirect_uri,
    # response_type=code, then handle the code in /oauth-callback (use Authlib).
    ...

@bp.route("/oauth-callback")
def callback():
    # exchange ?code → access token (OAUTH_TOKEN_URL),
    # GET OAUTH_PROFILE_URL → {username, sub}, upsert User, set session["user"].
    ...

@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("views.home"))
```

---

## 15. Frontend (Codex CSS-only) - structure & flow

**Codex setup (no build step):** download Codex's **CSS-only** stylesheet (from
`doc.wikimedia.org/codex` → "Using CSS-only components", or the `@wikimedia/codex`
npm package's `dist`) into `static/css/codex.css`, and link it in `base.html`. Then
use Codex's documented CSS classes (e.g. `cdx-button`, `cdx-card`, `cdx-text-input`)
- no Vue, no npm at runtime.

**`base.html`** links: `codex.css`, `app.css`, and the JS modules; defines the nav
and a `{% block content %}`.

**JS module responsibilities:**
- `sparql.js` - port the bridge-word + Friend-or-Faux queries from the current game
  templates; exposes `findBridges(known, target)` etc. Talks straight to WDQS.
- `storage.js` - the progress layer. **Always** read/write `localStorage`. **If**
  the page says the user is logged in, also `POST /api/progress` to sync. This is
  the hybrid: works logged-out, syncs logged-in.
- `srs.js` - Leitner/SM-2: given a card result, schedule its next due date.
- `lesson.js` - builds a session (new + due cards), runs the flashcard flow, plays
  audio, updates streak.
- `app.js` - onboarding form → save profile to `localStorage`; routing/glue.

**Screens (the user journey):**
1. **Onboarding** (`onboarding.html`) - pick known languages, target, daily goal.
2. **Home/dashboard** (`home.html`) - "you already know ~X%", streak, "Continue".
3. **Lesson** (`lesson.html`) - flashcards, audio, "knew it / didn't", progress dots.
4. **Bridges** & **Friend-or-Faux** - the two existing games, kept as explore modes.

---

## 16. Feature list (what to build, how it's used, data source)

| Feature | Front/Back | How it's used | Data source |
|---|---|---|---|
| Onboarding & profile | front | pick known langs + target + goal; saved to localStorage | - |
| Placement "% you know" | front | first screen wow-factor | WDQS bridge query (P5137) |
| Daily lesson loop | front | the core habit: ~12–15 cards, 5–7 min | bridge words + frequency JSON |
| Spaced repetition (SRS) | front | schedules reviews; persists in localStorage (+DB if logged in) | localStorage / ToolsDB |
| Pronunciation / listening | front | audio button on each card | Commons P443; IPA P898 |
| Friend-or-Faux | front | trap-training mini-game | curated + P5976 + P5137 |
| Bridge explorer | front | browse all shared words | WDQS |
| Streak & progress | front | motivation; daily goal | localStorage / ToolsDB |
| Login & cross-device sync | back | optional "Log in with Wikimedia" → progress follows you | OAuth 2.0 + ToolsDB |

---

## 17. Build order, deployment, and the "access landed" checklist

### Milestones (build in this order - each is demoable on its own)
- **M0 - skeleton:** repo + config + `flask run` shows a "hello" page locally.
- **M1 - placement:** onboarding + profile (localStorage) + port the bridge query →
  show "you already know X%".
- **M2 - lesson loop:** `lesson.js` + `srs.js` → daily lesson with localStorage; streak.
- **M3 - depth:** audio (P443) in cards; fold in Friend-or-Faux and the bridge explorer.
- **M4 - sync layer (local):** `DEV_LOGIN=true` mock login → `/api/progress` →
  SQLite. Now progress also persists server-side.
- **M5 - production:** deploy to Toolforge; flip env vars to real OAuth + ToolsDB;
  add `PRIVACY.md`; polish.

Everything through **M4 needs no Wikimedia access** - do it on laptops on day 0.

### Deploy commands (Toolforge build service, once the tool exists)
```
ssh <shellname>@login.toolforge.org
become wikilinkua
toolforge build start https://github.com/<you>/wikilinkua.git
toolforge webservice buildservice start
# set environment variables (secrets) on the tool, e.g. via the build service env:
toolforge envvars create SECRET_KEY
toolforge envvars create OAUTH_CLIENT_ID
toolforge envvars create OAUTH_CLIENT_SECRET
toolforge envvars create OAUTH_CALLBACK_URL
toolforge envvars create DATABASE_URL
toolforge envvars create DEV_LOGIN          # set to: false
```
*(Confirm exact `toolforge` subcommands on wikitech - names can change.)*

### When access lands, change ONLY this (no code edits)
- ✅ **Toolforge membership approved** → create tool (Step 4), `toolforge build start`.
- ✅ **Tool live** → set env vars: `DEV_LOGIN=false`, `OAUTH_CLIENT_ID/SECRET` = your
  **6b** values, `OAUTH_CALLBACK_URL=https://wikilinkua.toolforge.org/oauth-callback`.
- ✅ **ToolsDB created** (Step 7) → set `DATABASE_URL` to the MariaDB URL. Restart.
- ✅ **6b approved** → nothing to change; the public can now log in.

That's the whole project: build everything locally now against SQLite + mock login,
then flip env vars as each approval arrives.
