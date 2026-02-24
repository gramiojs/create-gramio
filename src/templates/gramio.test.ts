import { describe, expect, test } from "bun:test";
import { Preferences } from "../utils.js";
import { getBot, getPluginsIndex } from "./gramio.js";

describe("getPluginsIndex — base", () => {
	test("imports Composer from gramio", () => {
		const output = getPluginsIndex(new Preferences());
		expect(output).toContain('import { Composer } from "gramio"');
	});

	test("exports composer and BotType", () => {
		const output = getPluginsIndex(new Preferences());
		expect(output).toContain("export const composer");
		expect(output).toContain("export type BotType = typeof composer;");
	});

	test("empty composer when no plugins", () => {
		const output = getPluginsIndex(new Preferences());
		expect(output).toContain("export const composer = new Composer();");
	});
});

describe("getPluginsIndex — plugins", () => {
	test("Auto-retry adds correct import and extend", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Auto-retry"];
		const output = getPluginsIndex(prefs);
		expect(output).toContain('@gramio/auto-retry');
		expect(output).toContain('.extend(autoRetry())');
	});

	test("Scenes adds scenes import and greetingScene", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Scenes"];
		const output = getPluginsIndex(prefs);
		expect(output).toContain('@gramio/scenes');
		expect(output).toContain('../scenes/greeting.ts');
	});

	test("I18n-in-TS adds shared locales import and derive", () => {
		const prefs = new Preferences();
		prefs.plugins = ["I18n"];
		prefs.i18nType = "I18n-in-TS";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('../shared/locales/index.ts');
		expect(output).toContain('.derive(');
	});

	test("Fluent adds typed bundle import", () => {
		const prefs = new Preferences();
		prefs.plugins = ["I18n"];
		prefs.i18nType = "Fluent";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('../locales.types.ts');
		expect(output).toContain('TypedFluentBundle');
	});

	test("Broadcast is NOT in composer (it is a class, not a plugin)", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Broadcast"];
		const output = getPluginsIndex(prefs);
		expect(output).not.toContain("@gramio/broadcast");
	});
});

describe("getPluginsIndex — storage", () => {
	test("Redis storage adds redisStorage + redis service import", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Session"];
		prefs.storage = "Redis";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('@gramio/storage-redis');
		expect(output).toContain('../services/redis.ts');
		expect(output).toContain('redisStorage(redis)');
	});

	test("SQLite storage adds sqliteStorage", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Session"];
		prefs.storage = "SQLite";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('@gramio/storage-sqlite');
		expect(output).toContain('sqliteStorage()');
	});

	test("Session with Redis uses storage variable", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Session"];
		prefs.storage = "Redis";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('.extend(session({ storage }))');
	});

	test("Session without storage uses session()", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Session"];
		prefs.storage = "In-memory";
		const output = getPluginsIndex(prefs);
		expect(output).toContain('.extend(session())');
	});
});

describe("getBot", () => {
	test("non-autoload imports startComposer from handlers", () => {
		const output = getBot(new Preferences());
		expect(output).toContain('./handlers/start.ts');
		expect(output).toContain('startComposer');
	});

	test("non-autoload does NOT export BotType (it lives in plugins/index.ts)", () => {
		const output = getBot(new Preferences());
		expect(output).not.toContain('export type BotType');
	});

	test("Autoload imports autoload plugin", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Autoload"];
		const output = getBot(prefs);
		expect(output).toContain('@gramio/autoload');
		expect(output).toContain('.extend(autoload())');
	});

	test("Autoload re-exports BotType from composer", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Autoload"];
		const output = getBot(prefs);
		expect(output).toContain('export type BotType = typeof composer;');
	});

	test("Broadcast imports Broadcast + reuses services/redis.ts", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Broadcast"];
		const output = getBot(prefs);
		expect(output).toContain('@gramio/broadcast');
		expect(output).toContain('./services/redis.ts');
		expect(output).toContain('new Broadcast(redis)');
		expect(output).toContain('export const broadcast');
		// no inline Redis creation
		expect(output).not.toContain('new Redis(');
	});

	test("Broadcast.type uses bot.api.sendMessage", () => {
		const prefs = new Preferences();
		prefs.plugins = ["Broadcast"];
		const output = getBot(prefs);
		expect(output).toContain('bot.api.sendMessage');
	});
});
