# sparkles-slack

Slack integration prototype for [@Sparklesdotdev](https://sparkles.dev) — type `/ship "<change>"` in Slack, get a real GitHub PR opened by Claude.

Built on Sparkles' open-source [`template-project`](https://github.com/sparklesdotdev/template-project): Next.js 16 · Bun · OpenNext · Cloudflare Workers · Wrangler.

## Demo

In any Slack channel:

```
/ship change the hero copy to "hello dan"
```

Bot replies in-thread:

```
🔧 @kartik said: "change the hero copy to 'hello dan'" — working on it…
🔍 Reading the repo…
🧠 Asking Claude which files matter (47 in tree)…
✏️ Generating change for: `src/app/page.tsx`
✅ PR #42 opened: https://github.com/you/repo/pull/42
```

## Pipeline

```
Slack /ship  →  Cloudflare Worker (Next.js Route Handler via OpenNext)
                  ├── verify Slack HMAC signature (Web Crypto)
                  ├── 200 OK in <3s ("🚀 On it.")
                  └── ctx.waitUntil( runEditFlow() )
                        ├── Octokit: default branch + file tree
                        ├── Claude (Sonnet 4.6): pick relevant files
                        ├── Octokit: fetch their contents
                        ├── Claude (Sonnet 4.6): produce new file contents
                        ├── Octokit: branch + commit + open PR
                        └── Slack: post PR link in-thread
```

## Files added on top of the template

```
src/
├── app/api/slack/events/route.ts   # webhook entrypoint
├── lib/
│   ├── env.ts                      # typed Cloudflare env access
│   ├── slack.ts                    # signature verify + postMessage
│   ├── github.ts                   # Octokit branch/commit/PR
│   ├── claude.ts                   # Anthropic SDK + edit prompt
│   └── flow.ts                     # the actual pipeline
slack-manifest.yaml                 # paste into api.slack.com/apps
SETUP.md                            # 30-min install walkthrough
.dev.vars.example                   # secret template
```

The template's existing landing page is replaced with a marketing page describing the prototype. Everything else from `template-project` is untouched.

## Setup

See [SETUP.md](./SETUP.md). TL;DR:

1. Create Slack app from `slack-manifest.yaml` → grab signing secret + bot token
2. GitHub fine-grained PAT (Contents r/w, PRs r/w) on a test repo
3. Anthropic API key
4. `bun install` → `bunx wrangler login` → fill `.dev.vars`
5. `bun run dev` + a Cloudflare Tunnel → point Slack at it
6. Type `/ship change the hero copy to "hello"` in any Slack channel

## Deploy

```bash
bunx wrangler secret put SLACK_SIGNING_SECRET
bunx wrangler secret put SLACK_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put ANTHROPIC_API_KEY
# GITHUB_OWNER and GITHUB_REPO live in wrangler.jsonc → vars
bun run deploy
```

## Design notes

- **Single-file edits only (MVP).** Multi-file changes require planning + atomic commits — straightforward but scope-creep for a prototype.
- **Two Claude calls per request:** one to pick candidate files (cheap, paths-only), one to produce the new content (full file contents in context). Keeps tokens reasonable on large repos.
- **PAT-based GitHub auth (MVP).** Production would use a GitHub App with per-installation OAuth so any team can connect any repo.
- **Bot-token Slack auth (MVP).** Production would use Slack OAuth distribution + per-workspace config UI for which repo to target.
- **No persistence yet.** Each `/ship` is independent. Real version would store workspace ↔ repo mapping in D1 / Durable Objects, plus per-user audit logs.

These gaps are deliberate — the goal is to prove the architecture end-to-end on the same stack, not ship a productized service.

## License

MIT
