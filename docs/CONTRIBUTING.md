# Contributing

## Contributing a new asset

1. Sign in to the hub.
2. Click **+ New asset** (coming soon — for now, contact an admin to create the repo).
3. Once the asset exists, click **Propose a change** to edit it.
4. Describe what you changed and click **Send for review**.
5. A reviewer will approve, ask for changes, or decline your proposal.

## Contributing to this project (the hub itself)

1. Fork this repo on GitHub.
2. Create a feature branch: `feat/your-feature`
3. Follow the existing code style (TypeScript, no comments on obvious things).
4. Open a PR against `main`.

### Local development

```bash
# Start Gitea + demo IdP
docker compose --profile demo up -d gitea dex bootstrap db

# In a separate terminal, run the web app locally
cd web
npm install
cp ../.env.example .env.local  # edit as needed
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Running type checks

```bash
cd web && npm run typecheck
```

## Asset format

See the [README](../README.md#asset-format) for the `hub.json` schema and asset structure.

## What's not in scope

- Custom GPT import/export (OpenAI's format is closed, non-exportable)
- Multi-tenant SaaS features
- Per-user key management in MVP (use Gitea profile settings for SSH/GPG keys)
