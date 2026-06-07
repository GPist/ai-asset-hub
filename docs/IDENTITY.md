# Identity & Authentication

AI Asset Hub uses a **bring-your-own-identity** model. You pick the OIDC provider; the hub
wires it through Gitea's authentication source mechanism.

## How it works

```
Browser → Web app (Auth.js) → Gitea OAuth2 → Gitea OIDC source → Your IdP
```

Users log into the web app via "Sign in". Auth.js starts an OAuth2 flow with Gitea.
Gitea delegates to your configured OIDC authentication source (your company IdP).
On first login, Gitea auto-creates a user account tied to the IdP identity.
The web app receives a Gitea token and uses it for all API calls — so every commit, PR,
and action is attributed to that user.

## Supported providers

Any OIDC-compliant provider works. Common examples:

### Keycloak (self-hosted)

1. Create a client in your realm with:
   - Client ID: `gitea`
   - Redirect URI: `http(s)://<GITEA_URL>/user/oauth2/keycloak/callback`
   - Access Type: confidential
2. In Gitea admin → Authentication Sources → Add:
   - Type: OpenID Connect
   - Discovery URL: `https://<keycloak>/realms/<realm>/.well-known/openid-configuration`
3. In `.env`: set `OIDC_ISSUER=https://<keycloak>/realms/<realm>`

### Okta

1. Create an OIDC app in Okta: Web, Authorization Code.
2. Redirect URI: `http(s)://<GITEA_URL>/user/oauth2/okta/callback`
3. In Gitea admin → Authentication Sources → Add:
   - Type: OpenID Connect
   - Discovery URL: `https://<okta-domain>/.well-known/openid-configuration`

### Microsoft Entra ID (Azure AD)

Discovery URL: `https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration`

### Google Workspace

Discovery URL: `https://accounts.google.com/.well-known/openid-configuration`

### Demo (Dex — for local dev only)

Run with `--profile demo`. Uses Dex with hardcoded test users. Not for production.

## User roles

Bootstrap creates two teams in the hub org:

| Gitea team | Permission | Hub capability |
|---|---|---|
| `admins` | owner | Approve & publish, Decline, Ask for changes (plus everything below) |
| `contributors` | write (all repos) | Propose a change, Make your own copy, download |
| (any signed-in user, no team) | — | Browse, download, fork |
| Anonymous | — | Browse and download only |

**Important:** "Propose a change" creates a branch in the asset's repo, which requires
**write** access. So a contributor must be a member of the `contributors` team (or
`admins`). Add OIDC-provisioned users to `contributors` in the Gitea admin panel, or map
an IdP group to the team via the OIDC source's group claim. Users who are signed in but in
no team can still browse, download, and **fork** (forking doesn't need write on the source)
— they just can't open a proposal directly against an org asset until added to a team.

## Signing

**Identity-bound authorship (always on):** every commit and PR is attributed to the
authenticated user (verified end-to-end — a proposal opened by `alice` shows `alice` as the
author and PR opener). This is the provenance guarantee the MVP relies on.

**Cryptographic instance signing (opt-in setup):** `docker-compose.yml` sets
`[repository.signing] SIGNING_KEY=default, MERGES=always`, but Gitea only actually signs
merges once a **GPG key exists on the instance**. To enable the green "Verified" badge on
merges, generate a key inside the Gitea container and point `SIGNING_KEY` at it (see Gitea's
[signing docs](https://docs.gitea.com/administration/signing)). Without this, merges are
unsigned but still fully attributed.

**Per-user signing:** users can add their own SSH/GPG key in their Gitea profile to get a
"Verified" badge on their individual commits.
