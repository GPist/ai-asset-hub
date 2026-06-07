# Setup Guide

## Quick start (demo mode)

```bash
git clone https://github.com/GPist/ai-asset-hub
cd ai-asset-hub
./scripts/setup.sh --demo
```

`setup.sh` generates `.env` with random secrets, starts Gitea + Postgres, creates
the admin user, generates an admin token, and seeds a sample asset.

Visit [http://localhost:3000](http://localhost:3000).
Log in with any demo user (see below).

**Demo users (password: `password`):**
- alice@example.com
- bob@example.com

The sample "PDF Extractor" skill will already be in the catalog.

> If Docker hangs pulling images, see [VERIFICATION.md](VERIFICATION.md#fix-one-time-on-this-machine).

---

## Production setup

### 1. Copy and edit `.env`

```bash
cp .env.example .env
```

Edit every `changeme_*` value:

| Variable | Purpose |
|---|---|
| `GITEA_SECRET_KEY` | Gitea internal secret (min 32 chars, random) |
| `GITEA_INTERNAL_TOKEN` | Gitea internal token (min 32 chars, random) |
| `GITEA_JWT_SECRET` | Gitea JWT secret |
| `GITEA_ADMIN_PASSWORD` | Initial admin password (change after first login) |
| `NEXTAUTH_SECRET` | NextAuth session secret |

### 2. Start Gitea, then create the admin user

```bash
docker compose up -d db gitea

# Wait until Gitea is healthy, then create the FIRST admin (CLI — required;
# the first admin cannot be created over the API):
docker compose exec gitea gitea admin user create \
  --admin --username hubadmin --password "$GITEA_ADMIN_PASSWORD" \
  --email admin@example.com --must-change-password=false
```

> `./scripts/setup.sh` does all of this (and the admin token below) automatically.

Then start the rest:

```bash
docker compose up -d
```

### 3. Wire your OIDC provider

After first start, bootstrap creates an OAuth2 app in Gitea and prints:

```
OIDC_CLIENT_ID=ai-asset-hub-web
OIDC_CLIENT_SECRET=<generated>
```

Copy these into `.env`.

Then in Gitea admin settings, add an Authentication Source:
- Type: **OpenID Connect**
- Name: your IdP name (e.g. "Okta")
- Discovery URL: your IdP's OIDC discovery endpoint
- Client ID / Secret: from your IdP

Also set in `.env`:
```
OIDC_ISSUER=<your IdP issuer URL>
```

Restart: `docker compose restart web`

See [IDENTITY.md](IDENTITY.md) for specific provider guides.

### 4. Get the admin token

```bash
docker compose exec gitea \
  gitea admin user generate-access-token \
  --username hubadmin --raw \
  --token-name hub-admin-token
```

Copy the printed token into `.env` as `GITEA_ADMIN_TOKEN=…`, then restart the web app.

### 5. Set up a domain / TLS

Update `GITEA_URL`, `NEXTAUTH_URL`, and `GITEA_DOMAIN` in `.env` to your domain.
Use a reverse proxy (Caddy, nginx, Traefik) with TLS in front of ports 3000 and 3001.

---

## Troubleshooting

**Bootstrap container keeps restarting:** Gitea isn't healthy yet. Wait 30s and re-run
`docker compose restart bootstrap`.

**Login fails after OIDC setup:** Check the Gitea logs: `docker compose logs gitea`.
Ensure the redirect URI in your IdP matches `$GITEA_URL/user/oauth2/<name>/callback`.

**Catalog is empty:** The admin token may not be set. Run the step above to generate one.
