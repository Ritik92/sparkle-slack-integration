const encoder = new TextEncoder();

export async function verifySlackRequest(
	signingSecret: string,
	timestamp: string,
	body: string,
	signature: string,
): Promise<boolean> {
	if (!timestamp || !signature) return false;

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - Number(timestamp)) > 60 * 5) return false;

	const baseString = `v0:${timestamp}:${body}`;
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(signingSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
	const expected =
		"v0=" +
		Array.from(new Uint8Array(sig))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	return safeCompare(expected, signature);
}

function safeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export interface SlashCommand {
	team_id: string;
	channel_id: string;
	user_id: string;
	user_name: string;
	command: string;
	text: string;
	response_url: string;
}

export function parseSlashCommand(body: string): SlashCommand {
	const params = new URLSearchParams(body);
	return {
		team_id: params.get("team_id") ?? "",
		channel_id: params.get("channel_id") ?? "",
		user_id: params.get("user_id") ?? "",
		user_name: params.get("user_name") ?? "",
		command: params.get("command") ?? "",
		text: params.get("text") ?? "",
		response_url: params.get("response_url") ?? "",
	};
}

export async function postMessage(
	botToken: string,
	channel: string,
	text: string,
	threadTs?: string,
): Promise<{ ts: string }> {
	const res = await fetch("https://slack.com/api/chat.postMessage", {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Authorization: `Bearer ${botToken}`,
		},
		body: JSON.stringify({
			channel,
			text,
			thread_ts: threadTs,
			unfurl_links: false,
		}),
	});
	const data = (await res.json()) as { ok: boolean; ts: string; error?: string };
	if (!data.ok) throw new Error(`slack postMessage failed: ${data.error}`);
	return { ts: data.ts };
}
