# Verification Status

Last run: 2026-06-07 — **full stack verified end-to-end against a live Gitea** (macOS, Docker Desktop).

## ✅ Verified end-to-end (live stack)

Brought up with `./scripts/setup.sh --demo` (Gitea + Postgres + web + Dex), then exercised
the real HTTP API and the Gitea engine.

### Build & boot
- `docker compose build web` / `bootstrap` succeed; all 18 routes compile; TS + ESLint pass.
- `better-sqlite3` native module compiles for Alpine/musl and loads at runtime.
- Web app boots (Next.js standalone) and stays up.

### M0 — Infra & bootstrap
- Postgres + Gitea come up healthy; admin user created via CLI; admin token generated.
- `bootstrap` creates the `ai-assets` org, `admins` + `contributors` teams, registers the
  web app's OAuth2 client, and seeds the `pdf-extractor` sample asset (hub.json, SKILL.md,
  README.md) tagged `1.0.0`. Re-running is idempotent.

### M2 — Browse / detail / versions / download
| Check | Result |
|---|---|
| `GET /` catalog lists "PDF Extractor" | ✅ 200 |
| `GET /a/ai-assets/pdf-extractor` renders SKILL.md | ✅ 200 |
| Version history (tag `1.0.0`) | ✅ |
| `GET /api/install/.../1.0.0.zip` download | ✅ 200, zip contains hub.json + SKILL.md |
| `GET /api/marketplace.json` (Claude Code marketplace) | ✅ lists `ai-assets.pdf-extractor` with a working download URL |

### M4 / M5 / M6 — Collaboration loop (exact Gitea API the web routes call)
Exercised as a non-admin user (`alice`, in the `contributors` team) proposing, admin reviewing:

| Step | Result |
|---|---|
| M4 Propose: branch + commit (contents API `new_branch`) | ✅ 200 |
| M4 Propose: open PR | ✅ PR #1, attributed to `alice` |
| M5 Review: admin lists open PRs (review queue) | ✅ `[(1, 'Improve wording', by alice)]` |
| M5 Review: request changes (`REQUEST_CHANGES`) | ✅ |
| M5 Approve & publish: squash-merge | ✅ 200, HEAD = `Improve wording (#1)` |
| M6 Fork ("make your own copy") | ✅ `alice/pdf-extractor` |

**Identity/provenance:** the commit and PR are attributed to the real authenticated user
(`alice`) — the core provenance guarantee.

## ⚠️ Known setup requirements (documented, not bugs)

- **Contributors need write access.** "Propose a change" creates a branch in the org repo, so
  a contributor must be in the `contributors` team (bootstrap creates it with write + all
  repos). Signed-in users in no team can browse/download/**fork** but not propose directly.
  See [IDENTITY.md](IDENTITY.md#user-roles).
- **Cryptographic merge signing is opt-in.** Merges are unsigned until a GPG key is configured
  on the Gitea instance (authorship attribution works regardless). See
  [IDENTITY.md](IDENTITY.md#signing).
- **Interactive browser login (M1).** The web app uses Gitea as its OAuth2 provider, federated
  to your IdP (Dex in demo). After first `setup.sh` run, copy the `OIDC_CLIENT_SECRET` that the
  `bootstrap` container prints into `.env` and `docker compose up -d web`. The OAuth redirect
  dance itself requires a browser, so it isn't covered by the headless API checks above; the
  token-propagation and all per-user API operations it drives **are** verified.

## Environment note (resolved)
Docker Desktop initially couldn't pull images — its VM resolved Docker Hub to **IPv6-only**
addresses it couldn't route, hanging every pull. Resolved on this machine (a daemon restart /
DNS settings change). If pulls hang elsewhere, set `{"dns": ["8.8.8.8"]}` in Docker Desktop →
Settings → Docker Engine → Apply & Restart.

## Reproduce
```bash
./scripts/setup.sh --demo
curl -s localhost:3000/api/marketplace.json        # lists the seeded asset
curl -sL localhost:3000/api/install/ai-assets/pdf-extractor/1.0.0.zip -o a.zip && unzip -l a.zip
```
Maps to milestones M0–M6 in [SPEC.md](../SPEC.md#8-build-order-milestones--acceptance-criteria).
