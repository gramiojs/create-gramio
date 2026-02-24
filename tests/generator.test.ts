import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateProject } from "../src/core/generator.js";
import { Preferences } from "../src/utils.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gramio-test-"));
});

afterEach(async () => {
	await fs.rm(tmpDir, { recursive: true, force: true });
});

function makePrefs(overrides: Partial<Preferences> = {}): Preferences {
	const prefs = new Preferences();
	prefs.projectName = "test-bot";
	prefs.dir = "test-bot";
	Object.assign(prefs, overrides);
	return prefs;
}

describe("minimal project", () => {
	test("generates root files", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const files = await fs.readdir(tmpDir);
		expect(files).toContain("package.json");
		expect(files).toContain("tsconfig.json");
		expect(files).toContain("README.md");
		expect(files).toContain("CLAUDE.md");
		expect(files).toContain(".env");
		expect(files).toContain(".env.example");
		expect(files).toContain(".gitignore");
	});

	test("generates src files", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const src = await fs.readdir(path.join(tmpDir, "src"));
		expect(src).toContain("index.ts");
		expect(src).toContain("bot.ts");
		expect(src).toContain("config.ts");
	});

	test("generates src/plugins/index.ts", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const plugins = await fs.readdir(path.join(tmpDir, "src/plugins"));
		expect(plugins).toContain("index.ts");
	});

	test(".gitignore includes .env and .env.production", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const gitignore = await fs.readFile(path.join(tmpDir, ".gitignore"), "utf-8");
		expect(gitignore).toContain(".env");
		expect(gitignore).not.toContain(".env.example");
	});
});

describe("handlers vs autoload", () => {
	test("non-autoload generates src/handlers/start.ts", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const handlers = await fs.readdir(path.join(tmpDir, "src/handlers"));
		expect(handlers).toContain("start.ts");
	});

	test("non-autoload handler extends shared composer", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const content = await fs.readFile(path.join(tmpDir, "src/handlers/start.ts"), "utf-8");
		expect(content).toContain("../plugins/index.ts");
		expect(content).toContain(".extend(composer)");
	});

	test("autoload generates src/commands/start.ts", async () => {
		await generateProject(makePrefs({ plugins: ["Autoload"] }), tmpDir, tmpDir);
		const commands = await fs.readdir(path.join(tmpDir, "src/commands"));
		expect(commands).toContain("start.ts");
	});

	test("autoload command imports BotType from plugins", async () => {
		await generateProject(makePrefs({ plugins: ["Autoload"] }), tmpDir, tmpDir);
		const content = await fs.readFile(path.join(tmpDir, "src/commands/start.ts"), "utf-8");
		expect(content).toContain("../plugins/index.ts");
		expect(content).toContain("BotType");
	});
});

describe("plugins", () => {
	test("plugins/index.ts has correct imports for selected plugins", async () => {
		await generateProject(
			makePrefs({ plugins: ["Auto-retry", "Scenes"], storage: "Redis" }),
			tmpDir,
			tmpDir,
		);
		const content = await fs.readFile(path.join(tmpDir, "src/plugins/index.ts"), "utf-8");
		expect(content).toContain("@gramio/auto-retry");
		expect(content).toContain("@gramio/scenes");
		expect(content).toContain("@gramio/storage-redis");
	});

	test("Broadcast is in bot.ts, not plugins/index.ts", async () => {
		await generateProject(makePrefs({ plugins: ["Broadcast"] }), tmpDir, tmpDir);

		const pluginsContent = await fs.readFile(path.join(tmpDir, "src/plugins/index.ts"), "utf-8");
		expect(pluginsContent).not.toContain("@gramio/broadcast");

		const botContent = await fs.readFile(path.join(tmpDir, "src/bot.ts"), "utf-8");
		expect(botContent).toContain("@gramio/broadcast");
		expect(botContent).toContain("export const broadcast");
		expect(botContent).not.toContain("new Redis(");
	});

	test("Broadcast generates services/redis.ts even without Redis storage", async () => {
		await generateProject(makePrefs({ plugins: ["Broadcast"], storage: "In-memory" }), tmpDir, tmpDir);
		const services = await fs.readdir(path.join(tmpDir, "src/services"));
		expect(services).toContain("redis.ts");
	});
});

describe("optional features", () => {
	test("tests:true generates tests/bot.test.ts", async () => {
		await generateProject(makePrefs({ tests: true }), tmpDir, tmpDir);
		const testsDir = await fs.readdir(path.join(tmpDir, "tests"));
		expect(testsDir).toContain("bot.test.ts");
	});

	test("githubActions:true generates .github/workflows/ci.yml", async () => {
		await generateProject(makePrefs({ githubActions: true }), tmpDir, tmpDir);
		const workflows = await fs.readdir(path.join(tmpDir, ".github/workflows"));
		expect(workflows).toContain("ci.yml");
	});

	test("docker:true generates Dockerfile and docker-compose.yml", async () => {
		await generateProject(makePrefs({ docker: true }), tmpDir, tmpDir);
		const files = await fs.readdir(tmpDir);
		expect(files).toContain("Dockerfile");
		expect(files).toContain("docker-compose.yml");
	});

	test("vscode:true generates .vscode directory", async () => {
		await generateProject(makePrefs({ vscode: true }), tmpDir, tmpDir);
		const files = await fs.readdir(tmpDir);
		expect(files).toContain(".vscode");
	});
});

describe("CLAUDE.md", () => {
	test("contains project name", async () => {
		await generateProject(makePrefs({ projectName: "my-awesome-bot" }), tmpDir, tmpDir);
		const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
		expect(content).toContain("# my-awesome-bot");
	});

	test("reflects selected linter", async () => {
		await generateProject(makePrefs({ linter: "Biome" }), tmpDir, tmpDir);
		const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
		expect(content).toContain("Biome");
	});

	test("contains self-update instructions", async () => {
		await generateProject(makePrefs(), tmpDir, tmpDir);
		const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
		expect(content).toContain("Keeping this file up to date");
	});
});
