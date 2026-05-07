import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Bindings {
	SLACK_SIGNING_SECRET: string;
	SLACK_BOT_TOKEN: string;
	GITHUB_TOKEN: string;
	GITHUB_OWNER: string;
	GITHUB_REPO: string;
	ANTHROPIC_API_KEY: string;
}

export function getEnv(): Bindings {
	const { env } = getCloudflareContext();
	return env as unknown as Bindings;
}

export function waitUntil(p: Promise<unknown>): void {
	const { ctx } = getCloudflareContext();
	ctx.waitUntil(p);
}
