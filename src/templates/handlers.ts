import dedent from "ts-dedent";

export function getHandlerStart() {
	return dedent /* ts */`
		import type { Bot } from "gramio";

		export function registerStartHandler(bot: Bot) {
			return bot.command("start", (context) => context.send("Hi!"));
		}
	`;
}
