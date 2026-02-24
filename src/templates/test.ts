import dedent from "ts-dedent";
import type { PreferencesType } from "../utils.js";

/**
 * Generates `tests/setup.ts` — sets required env vars before bot.ts is loaded.
 * Listed as the first import in every test file so it runs first (ESM order guarantee).
 */
export function getTestSetup({ orm }: PreferencesType): string {
	const lines = [
		"// Sets required environment variables for tests.",
		"// ??= ensures real values take precedence if already set.",
		`process.env.BOT_TOKEN ??= "test";`,
	];

	if (orm !== "None") {
		lines.push(
			`process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";`,
		);
	}

	return lines.join("\n");
}

export function getTestFile({ packageManager }: PreferencesType) {
	if (packageManager === "bun") {
		return dedent /* ts */`
			import "./setup.ts";
			import { expect, test } from "bun:test";
			import { TelegramTestEnvironment } from "@gramio/test";
			import { bot } from "../src/bot.ts";

			test("/start command", async () => {
				const env = new TelegramTestEnvironment(bot);
				const user = env.createUser();

				await user.sendMessage("/start");

				expect(env.lastApiCall("sendMessage")?.params.text).toBe("Hi!");
			});
		`;
	}

	return dedent /* ts */`
		import "./setup.ts";
		import { test } from "node:test";
		import assert from "node:assert/strict";
		import { TelegramTestEnvironment } from "@gramio/test";
		import { bot } from "../src/bot.ts";

		test("/start command", async () => {
			const env = new TelegramTestEnvironment(bot);
			const user = env.createUser();

			await user.sendMessage("/start");

			assert.equal(env.lastApiCall("sendMessage")?.params.text, "Hi!");
		});
	`;
}
