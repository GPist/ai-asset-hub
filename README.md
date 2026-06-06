# AI Asset Hub

An open-source, self-hostable collaboration hub for AI assets — skills, hooks, agents, prompts, and any Markdown-based configuration used with Claude Code, Codex, Cowork, and other AI tools.

## The problem it solves

Organizations build up libraries of AI skills and agents, but there's no good way for non-technical team members to contribute improvements. Email threads, Slack messages, and manual copy-paste don't scale. Taking in contributions becomes incredibly hard.

## How it works

**Users see plain language. Git does the work underneath.**

| You see | What happens |
|---|---|
| Propose a change | Creates a branch + commit + pull request |
| Send for review | Marks the proposal ready |
| Approve & publish | Merges the pull request |
| What changed | Renders a diff |
| Make your own copy | Forks the repository |
| Roll back to this version | Creates a revert commit |

The engine is **[Gitea](https://gitea.io) (MIT)**, run headless. The front-end is a Next.js app that talks to the Gitea API. Identity comes from your existing SSO (OIDC/OAuth2) — no new password system.

## Key features (MVP)

- **Catalog** — browse, search, and download assets with categories and tags
- **Version history** — every change is a commit; pick any version
- **Plain-language diff** — see what changed between versions without reading raw diffs
- **Propose a change** — browser-based editing that turns into a proper Git PR
- **Admin review queue** — approve, ask for changes, or decline proposals
- **Forks** — make your own copy of any asset
- **Rollback** — revert to any prior version
- **Download / install** — zip download + one-liner install into `.claude/skills/` (Claude Code), with Codex + Cowork targets in Phase 2

## What it is NOT

- Not another static "awesome list"
- Not a custom-built version control system (Git does that)
- Not a SaaS — you host it
- Not locked to any cloud provider

## Tech stack

| Layer | Technology |
|---|---|
| Version control engine | Gitea (MIT, self-hosted) |
| Front-end | Next.js + TypeScript + Tailwind |
| Auth | Auth.js (NextAuth) → OIDC → your IdP |
| Catalog index | SQLite, refreshed by Gitea webhooks |
| Packaging | Docker Compose |

## Getting started

```bash
cp .env.example .env
# Edit .env with your OIDC provider settings
docker compose --profile demo up
```

Visit `http://localhost:3000`. Log in with the demo identity (Dex). The Gitea engine runs at `http://localhost:3001` but you shouldn't need to visit it directly.

See [docs/SETUP.md](docs/SETUP.md) for production setup and [docs/IDENTITY.md](docs/IDENTITY.md) for wiring your own OIDC provider.

## Asset format

Each asset is a folder with a `hub.json` manifest and a Markdown entry file:

```
my-skill/
├── hub.json        # name, type, tags, targets
├── SKILL.md        # the asset body (or AGENTS.md / prompt.md)
└── README.md       # optional — rendered on the detail page
```

`hub.json` schema:
```json
{
  "name": "my-skill",
  "title": "My Skill",
  "type": "skill",
  "summary": "One-line description.",
  "tags": ["tag1", "tag2"],
  "category": "Productivity",
  "targets": ["claude-code", "generic"],
  "entry": "SKILL.md",
  "version": "1.0.0"
}
```

Valid types: `skill` | `hook` | `agent` | `prompt` | `plugin`
Valid targets: `claude-code` | `codex` | `cowork` | `generic`

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

MIT
