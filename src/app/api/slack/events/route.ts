import type { NextRequest } from "next/server";
import { getEnv, waitUntil } from "@/lib/env";
import { parseSlashCommand, postMessage, verifySlackRequest } from "@/lib/slack";
import { runEditFlow } from "@/lib/flow";

export async function POST(req: NextRequest) {
	const env = getEnv();
	const body = await req.text();
	const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
	const signature = req.headers.get("x-slack-signature") ?? "";

	const valid = await verifySlackRequest(
		env.SLACK_SIGNING_SECRET,
		timestamp,
		body,
		signature,
	);
	if (!valid) {
		return new Response("invalid signature", { status: 401 });
	}

	// Slack URL verification handshake (sent once when subscribing to events)
	if (body.startsWith("{")) {
		const payload = JSON.parse(body) as { type?: string; challenge?: string };
		if (payload.type === "url_verification" && payload.challenge) {
			return new Response(payload.challenge, {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			});
		}
	}

	const cmd = parseSlashCommand(body);
	if (!cmd.command) {
		return new Response("ok", { status: 200 });
	}

	if (!cmd.text.trim()) {
		return Response.json({
			response_type: "ephemeral",
			text: 'Usage: `/ship change the hero copy to "hello dan"`',
		});
	}

	waitUntil(
		(async () => {
			try {
				const seed = await postMessage(
					env.SLACK_BOT_TOKEN,
					cmd.channel_id,
					`🔧 <@${cmd.user_id}> said: "${cmd.text}" — working on it…`,
				);
				await runEditFlow({
					env,
					request: cmd.text,
					channelId: cmd.channel_id,
					threadTs: seed.ts,
					userName: cmd.user_name,
					userId: cmd.user_id,
				});
			} catch (err) {
				console.error("flow failed:", err);
			}
		})(),
	);

	return Response.json({ response_type: "ephemeral", text: "🚀 On it." });
}
