# WikiLinkua Privacy Policy

## Summary

WikiLinkua is built to minimize data collection. The current app stores the learning profile and progress in the browser unless the user is using a login-enabled feature that requires a Wikimedia session.

## What we store

- selected known languages and target language,
- local word progress and phrase review state,
- temporary session state for login and Commons uploads,
- optional Wikimedia username and id when the user signs in.

## What we do not store

- passwords,
- payment details,
- private messages,
- a central database of learning history in the current code path.

## Why external services are used

The app queries Wikimedia-hosted and other third-party services to fetch language data, sentence examples, translations, videos, and pronunciation uploads.

## Third-party services

- Wikidata Query Service,
- Tatoeba,
- Wikimedia MinT,
- Wikimedia Commons,
- Wikimedia OAuth,
- Wikipedia APIs.

## Access and permissions

Some features require login or upload permission:

- real Wikimedia login for identity-aware features,
- Commons upload permission for pronunciation contribution,
- browser access to microphone for recording audio,
- network access to the external services listed above.

## Retention and deletion

Progress stored in the browser can be cleared by deleting site data for the domain. Any future sync-backed data store should provide an explicit user deletion path and clear retention terms before launch.

## Future changes

If cross-device sync is added later, the privacy policy must be updated to describe the database, retention, deletion, and support process in detail.
