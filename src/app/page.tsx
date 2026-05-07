import Link from "next/link";

const GITHUB_HANDLE = "your-handle";
const REPO_URL = `https://github.com/${GITHUB_HANDLE}/sparkles-slack`;

export default function Home() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
				<div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
					Slack integration prototype for{" "}
					<a
						href="https://sparkles.dev"
						className="text-foreground hover:underline"
						target="_blank"
						rel="noreferrer"
					>
						@Sparklesdotdev
					</a>
				</div>

				<h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
					Ship code from Slack.
				</h1>
				<p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
					Type{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
						/ship change the hero copy to &ldquo;hello&rdquo;
					</code>{" "}
					in any Slack channel. A real PR gets opened on your repo via Claude. Reviewed by humans, merged when good.
				</p>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					<Step n="1" title="Type in Slack" body={`/ship change the hero copy to "hello dan"`} />
					<Step n="2" title="Bot acknowledges in 200ms" body="🔧 working on it…" />
					<Step n="3" title="Claude writes the change" body="🔍 Reading · 🧠 Picking files · ✏️ Editing" />
					<Step n="4" title="PR opens on GitHub" body="✅ PR #42: change hero copy" />
				</div>

				<section className="mt-16">
					<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Stack (matches the Sparkles template)
					</h2>
					<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
						{[
							"Next.js 16",
							"React 19",
							"Bun",
							"OpenNext",
							"Cloudflare Workers",
							"Wrangler",
							"Anthropic Claude",
							"Octokit",
						].map((s) => (
							<span key={s} className="rounded-md border border-border bg-card px-2.5 py-1">
								{s}
							</span>
						))}
					</div>
				</section>

				<section className="mt-12">
					<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Why this exists
					</h2>
					<p className="text-balance text-sm leading-relaxed text-muted-foreground">
						Sparkles&apos; CEO posted that Slack integration was on the next-version roadmap. This is a working
						prototype on the same template stack — drop the{" "}
						<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
							/api/slack/events
						</code>{" "}
						route handler and the four lib files into the real repo and it lights up.
					</p>
				</section>

				<section className="mt-12">
					<h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Pipeline
					</h2>
					<pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">{`Slack /ship  →  Cloudflare Worker (Next.js Route Handler)
                  ├── verify Slack HMAC signature
                  ├── 200 OK in <3s ("🚀 On it.")
                  └── ctx.waitUntil( runEditFlow() )
                        ├── Octokit: default branch + file tree
                        ├── Claude: pick relevant files
                        ├── Octokit: fetch their contents
                        ├── Claude: produce new file contents
                        ├── Octokit: branch + commit + open PR
                        └── Slack: post PR link in-thread`}</pre>
				</section>

				<footer className="mt-16 flex items-center justify-between border-t border-border pt-6 text-sm text-muted-foreground">
					<span>
						Built by{" "}
						<a
							href={`https://github.com/${GITHUB_HANDLE}`}
							className="text-foreground hover:underline"
						>
							Kartik
						</a>
					</span>
					<Link href={REPO_URL} className="text-foreground hover:underline">
						Source →
					</Link>
				</footer>
			</main>
		</div>
	);
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<div className="mb-2 flex items-center gap-2">
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
					{n}
				</span>
				<span className="text-sm font-medium">{title}</span>
			</div>
			<code className="block truncate font-mono text-xs text-muted-foreground">{body}</code>
		</div>
	);
}
