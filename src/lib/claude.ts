import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export interface EditPlan {
	file: string;
	newContent: string;
	summary: string;
}

const EDIT_SYSTEM = `You are a precise code-editing assistant.

You receive:
- The user's natural-language change request
- A list of file paths in a repo
- The current contents of one or more candidate files

Your job: produce the COMPLETE new contents of EXACTLY ONE file that, when committed, satisfies the request.

Rules:
- Pick ONE file from the candidate set. Do not invent paths.
- Return the FULL new file contents, not a diff.
- Preserve existing formatting and conventions of the file.
- Keep the change minimal — only edit what's needed.

Respond with valid JSON only, no prose, no code fences:
{
  "file": "<path relative to repo root, must match one of the candidate paths>",
  "newContent": "<full new contents of that file>",
  "summary": "<single short imperative sentence describing the change, suitable as a PR title>"
}`;

const PICK_SYSTEM = `Given a change request and a flat list of file paths, return up to N file paths most likely to contain the code that needs editing.

Respond with valid JSON only, no prose, no code fences. Format: ["path/one.tsx", "path/two.ts"].`;

export async function pickRelevantFiles(
	apiKey: string,
	request: string,
	fileTree: string[],
	max = 3,
): Promise<string[]> {
	const client = new Anthropic({ apiKey });
	const res = await client.messages.create({
		model: MODEL,
		max_tokens: 500,
		system: PICK_SYSTEM.replace("N", String(max)),
		messages: [
			{
				role: "user",
				content: `Request: ${request}\n\nFiles:\n${fileTree.map((p) => `- ${p}`).join("\n")}`,
			},
		],
	});
	const text = extractText(res);
	const paths = JSON.parse(stripFences(text)) as string[];
	return paths.filter((p) => fileTree.includes(p)).slice(0, max);
}

export async function planEdit(
	apiKey: string,
	request: string,
	fileTree: string[],
	candidates: { path: string; content: string }[],
): Promise<EditPlan> {
	const client = new Anthropic({ apiKey });

	const userMsg = [
		`Change request: ${request}`,
		"",
		"Repo file tree (paths only):",
		...fileTree.map((p) => `- ${p}`),
		"",
		"Candidate files (pick exactly one):",
		...candidates.map(
			(f) => `=== ${f.path} ===\n${f.content}\n=== end ${f.path} ===`,
		),
	].join("\n");

	const res = await client.messages.create({
		model: MODEL,
		max_tokens: 8000,
		system: EDIT_SYSTEM,
		messages: [{ role: "user", content: userMsg }],
	});

	const text = extractText(res);
	const plan = JSON.parse(stripFences(text)) as EditPlan;

	if (!plan.file || typeof plan.newContent !== "string" || !plan.summary) {
		throw new Error("invalid edit plan from Claude");
	}
	if (!candidates.some((c) => c.path === plan.file)) {
		throw new Error(`Claude picked ${plan.file} which wasn't in candidates`);
	}
	return plan;
}

function extractText(res: Anthropic.Messages.Message): string {
	return res.content
		.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
		.map((b) => b.text)
		.join("");
}

function stripFences(text: string): string {
	return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}
