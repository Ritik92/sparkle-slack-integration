# Setup — sparkles-slack

About 30 minutes end-to-end. Steps run in parallel where possible.

## 1. Slack app (10 min)

1. Go to https://api.slack.com/apps → **Create New App** → **From an app manifest**
2. Pick a workspace (create a free one at slack.com/get-started if needed)
3. Paste the contents of [`slack-manifest.yaml`](./slack-manifest.yaml)
4. **Create** → **Install to Workspace** → approve
5. **Basic Information** → copy **Signing Secret** → `SLACK_SIGNING_SECRET`
6. **OAuth & Permissions** → copy **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`

You'll come back to update the slash command URL once you have a tunnel.

## 2. GitHub test repo + PAT (5 min)

1. Create a fresh repo (e.g. `sparkles-slack-demo`) — any small Next.js project works. Even a single `src/app/page.tsx` is enough to demo.
2. **Settings → Developer settings → Personal access tokens → Fine-grained tokens** → **Generate new token**
3. Repository access: **only this repo**
4. Permissions: **Contents: Read and write**, **Pull requests: Read and write**, **Metadata: Read-only**
5. Copy → `GITHUB_TOKEN`. Note `GITHUB_OWNER` (your username) and `GITHUB_REPO` (`sparkles-slack-demo`).

## 3. Anthropic API (3 min)

1. https://console.anthropic.com → **API Keys** → **Create Key**
2. Copy → `ANTHROPIC_API_KEY`

## 4. Cloudflare (5 min)

1. https://dash.cloudflare.com → free signup if needed
2. In this folder:
   ```bash
   bun install
   bunx wrangler login
   ```

## 5. Local secrets

```bash
cp .dev.vars.example .dev.vars
# fill in the values
```

## 6. Run + tunnel

In one terminal:

```bash
bun run dev
```

In another terminal, expose port 3000 over HTTPS so Slack can reach it:

```bash
# Option A — Cloudflare Tunnel (free, no signup needed for ephemeral tunnels)
cloudflared tunnel --url http://localhost:3000

# Option B — ngrok
ngrok http 3000
```

Copy the public HTTPS URL.

Go back to your Slack app → **Slash Commands** → edit `/ship` → set **Request URL** to:
```
https://<your-tunnel>/api/slack/events
```
Save.

## 7. Test

In your Slack workspace, in any channel, type:

```
/ship change the homepage heading to "Hello Dan"
```

Expected sequence in-thread:
- `🔧 <@you> said: "..." — working on it…`
- `🔍 Reading the repo…`
- `🧠 Asking Claude which files matter (N in tree)…`
- `✏️ Generating change for: src/app/page.tsx`
- `✅ PR #1 opened: https://github.com/you/sparkles-slack-demo/pull/1`

Open the PR and verify the diff is sane.

## 8. Deploy to production

```bash
bunx wrangler secret put SLACK_SIGNING_SECRET
bunx wrangler secret put SLACK_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put ANTHROPIC_API_KEY
```

`GITHUB_OWNER` and `GITHUB_REPO` go in `wrangler.jsonc` under `vars` (not secrets).

Then:

```bash
bun run deploy
```

You'll get a `*.workers.dev` URL. Update your Slack app's slash command URL to point there. Done.

## Troubleshooting

**"invalid signature"** — `SLACK_SIGNING_SECRET` is wrong, or your tunnel is stripping headers, or Slack timestamp clock skew. Double-check and try again.

**"expected file at ..."** — Claude picked a path that's a directory or doesn't exist. Re-run; it's flaky on first call sometimes. Add more files to your test repo.

**Slack timeout error** — your handler took >3s before the initial 200. Verify `waitUntil` is wired and the synchronous path is just signature-verify + ack.

**Octokit 404 on createOrUpdateFileContents** — your PAT doesn't have the right repo or permissions. Re-issue with Contents: Read+Write.
