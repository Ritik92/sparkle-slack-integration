import { Octokit } from "@octokit/rest";

const TEXT_EXTENSIONS = new Set([
	"ts", "tsx", "js", "jsx", "mjs", "cjs",
	"json", "md", "mdx", "css", "scss", "html",
	"yaml", "yml", "toml", "txt", "py", "rb", "go", "rs",
]);

function isTextFile(path: string): boolean {
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	return TEXT_EXTENSIONS.has(ext);
}

export interface RepoFile {
	path: string;
	sha: string;
}

export interface FileContent {
	path: string;
	content: string;
	sha: string;
}

export class GitHubClient {
	private octokit: Octokit;

	constructor(
		token: string,
		private owner: string,
		private repo: string,
	) {
		this.octokit = new Octokit({ auth: token });
	}

	async getDefaultBranch(): Promise<{ name: string; sha: string }> {
		const { data: repoData } = await this.octokit.repos.get({
			owner: this.owner,
			repo: this.repo,
		});
		const defaultBranch = repoData.default_branch;
		const { data: ref } = await this.octokit.git.getRef({
			owner: this.owner,
			repo: this.repo,
			ref: `heads/${defaultBranch}`,
		});
		return { name: defaultBranch, sha: ref.object.sha };
	}

	async listTextFiles(branchSha: string, max = 200): Promise<RepoFile[]> {
		const { data: tree } = await this.octokit.git.getTree({
			owner: this.owner,
			repo: this.repo,
			tree_sha: branchSha,
			recursive: "true",
		});
		return tree.tree
			.filter((node) => node.type === "blob" && node.path && isTextFile(node.path))
			.slice(0, max)
			.map((node) => ({ path: node.path!, sha: node.sha! }));
	}

	async getFileContent(path: string, ref: string): Promise<FileContent> {
		const { data } = await this.octokit.repos.getContent({
			owner: this.owner,
			repo: this.repo,
			path,
			ref,
		});
		if (Array.isArray(data) || data.type !== "file") {
			throw new Error(`expected file at ${path}`);
		}
		const content = Buffer.from(data.content, "base64").toString("utf8");
		return { path, content, sha: data.sha };
	}

	async createBranch(name: string, fromSha: string): Promise<void> {
		await this.octokit.git.createRef({
			owner: this.owner,
			repo: this.repo,
			ref: `refs/heads/${name}`,
			sha: fromSha,
		});
	}

	async commitFile(args: {
		branch: string;
		path: string;
		content: string;
		sha: string;
		message: string;
	}): Promise<void> {
		await this.octokit.repos.createOrUpdateFileContents({
			owner: this.owner,
			repo: this.repo,
			branch: args.branch,
			path: args.path,
			message: args.message,
			content: Buffer.from(args.content, "utf8").toString("base64"),
			sha: args.sha,
		});
	}

	async openPR(args: {
		branch: string;
		base: string;
		title: string;
		body: string;
	}): Promise<{ number: number; url: string }> {
		const { data: pr } = await this.octokit.pulls.create({
			owner: this.owner,
			repo: this.repo,
			head: args.branch,
			base: args.base,
			title: args.title,
			body: args.body,
		});
		return { number: pr.number, url: pr.html_url };
	}
}
