import { describe, expect, test } from "bun:test";
import { parseArgs } from "./args.js";

describe("parseArgs — positional", () => {
	test("captures directory name", () => {
		expect(parseArgs(["my-bot"])._[0]).toBe("my-bot");
	});
});

describe("parseArgs — preset flags", () => {
	test("--yes sets yes:true", () => {
		expect(parseArgs(["dir", "--yes"]).yes).toBe(true);
	});

	test("-y is alias for --yes", () => {
		expect(parseArgs(["dir", "-y"]).yes).toBe(true);
	});

	test("--preset captures name", () => {
		expect(parseArgs(["dir", "--preset", "full"]).preset).toBe("full");
	});

	test("-p is alias for --preset", () => {
		expect(parseArgs(["dir", "-p", "minimal"]).preset).toBe("minimal");
	});
});

describe("parseArgs — git flag", () => {
	test("git defaults to true when not passed", () => {
		expect(parseArgs(["dir"]).git).toBe(true);
	});

	test("--no-git sets git to false", () => {
		expect(parseArgs(["dir", "--no-git"]).git).toBe(false);
	});

	test("--git keeps git true", () => {
		expect(parseArgs(["dir", "--git"]).git).toBe(true);
	});
});

describe("parseArgs — infra boolean flags", () => {
	test("docker/vscode/locks/tests default to false", () => {
		const args = parseArgs(["dir"]);
		expect(args.docker).toBe(false);
		expect(args.vscode).toBe(false);
		expect(args.locks).toBe(false);
		expect(args.tests).toBe(false);
		expect(args["github-actions"]).toBe(false);
		expect(args.husky).toBe(false);
	});

	test("--docker sets docker:true", () => {
		expect(parseArgs(["dir", "--docker"]).docker).toBe(true);
	});

	test("--tests sets tests:true", () => {
		expect(parseArgs(["dir", "--tests"]).tests).toBe(true);
	});

	test("--github-actions sets correctly", () => {
		expect(parseArgs(["dir", "--github-actions"])["github-actions"]).toBe(true);
	});
});

describe("parseArgs — hasCliInfraArgs logic", () => {
	test("no infra flags → none is true", () => {
		const args = parseArgs(["dir"]);
		// none of these are true — the prompt should show
		expect(
			args.docker === true ||
				args.vscode === true ||
				args.git === false ||
				args.locks === true ||
				args.tests === true ||
				args["github-actions"] === true ||
				args.husky === true,
		).toBe(false);
	});

	test("--docker → hasCliInfraArgs is truthy", () => {
		const args = parseArgs(["dir", "--docker"]);
		expect(args.docker === true).toBe(true);
	});

	test("--no-git → git===false triggers CLI branch", () => {
		const args = parseArgs(["dir", "--no-git"]);
		expect(args.git === false).toBe(true);
	});
});
