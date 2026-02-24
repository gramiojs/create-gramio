import dedent from "ts-dedent";
import type { PreferencesType } from "../utils.js";

export function getTestFile({ packageManager }: PreferencesType) {
	if (packageManager === "bun") {
		return dedent /* ts */`
			import { expect, test } from "bun:test";
			import { TelegramTestEnvironment } from "@gramio/test";
			import { bot } from "../bot.ts";

			test("/start command", async () => {
				const env = new TelegramTestEnvironment(bot);
				const user = env.createUser();

				const messages = await user.sendMessage("/start");
				expect(messages[0]?.text).toBe("Hi!");
			});
		`;
	}

	return dedent /* ts */`
		import { test } from "node:test";
		import assert from "node:assert/strict";
		import { TelegramTestEnvironment } from "@gramio/test";
		import { bot } from "../bot.ts";

		test("/start command", async () => {
			const env = new TelegramTestEnvironment(bot);
			const user = env.createUser();

			const messages = await user.sendMessage("/start");
			assert.equal(messages[0]?.text, "Hi!");
		});
	`;
}
