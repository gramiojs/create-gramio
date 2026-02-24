import { describe, expect, test } from "bun:test";
import { Preferences } from "../utils.js";
import { applyPreset } from "./presets.js";

describe("applyPreset — minimal", () => {
	test("no plugins, no extras", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "minimal");
		expect(prefs.linter).toBe("None");
		expect(prefs.orm).toBe("None");
		expect(prefs.plugins).toEqual([]);
		expect(prefs.others).toEqual([]);
	});

	test("git on, docker/vscode/locks off", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "minimal");
		expect(prefs.git).toBe(true);
		expect(prefs.docker).toBe(false);
		expect(prefs.vscode).toBe(false);
		expect(prefs.locks).toBe(false);
	});

	test("tests and aiSkills off", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "minimal");
		expect(prefs.tests).toBe(false);
		expect(prefs.aiSkills).toBe(false);
	});
});

describe("applyPreset — recommended", () => {
	test("Biome + Drizzle + PostgreSQL", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "recommended");
		expect(prefs.linter).toBe("Biome");
		expect(prefs.orm).toBe("Drizzle");
		expect(prefs.database).toBe("PostgreSQL");
		expect(prefs.driver).toBe("Postgres.JS");
	});

	test("docker + vscode + locks + husky", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "recommended");
		expect(prefs.docker).toBe(true);
		expect(prefs.vscode).toBe(true);
		expect(prefs.locks).toBe(true);
		expect(prefs.others).toContain("Husky");
	});

	test("tests on, aiSkills on, githubActions off", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "recommended");
		expect(prefs.tests).toBe(true);
		expect(prefs.aiSkills).toBe(true);
		expect(prefs.githubActions).toBe(false);
	});

	test("i18n nested object merged correctly", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "recommended");
		expect(prefs.i18n.languages).toContain("en");
		expect(prefs.i18n.languages).toContain("ru");
		expect(prefs.i18n.primaryLanguage).toBe("en");
	});
});

describe("applyPreset — full", () => {
	test("includes Autoload and Session", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "full");
		expect(prefs.plugins).toContain("Autoload");
		expect(prefs.plugins).toContain("Session");
	});

	test("githubActions on, Jobify in others", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "full");
		expect(prefs.githubActions).toBe(true);
		expect(prefs.others).toContain("Jobify");
	});

	test("aiSkills on", () => {
		const prefs = new Preferences();
		applyPreset(prefs, "full");
		expect(prefs.aiSkills).toBe(true);
	});
});
