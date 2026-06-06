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

| Gitea org role | Hub capability |
|---|---|
| Org owner / `admins` team | Approve & publish, Decline, Ask for changes |
| Org member | Browse, download, Propose a change, Make your own copy |
| Anonymous (no account) | Browse and download only |

Add users to the `admins` team in the Gitea admin panel to grant review permissions.

## Signing

In MVP, every merge commit is signed by the **instance key** (configured via
`SIGNING_KEY = default` in Gitea). This means: any merge has a cryptographic signature
proving it was processed by this hub instance.

Individual user SSH/GPG key signing (the "Verified" badge on individual commits) is
supported natively by Gitea — users can add their own keys in their profile settings.
