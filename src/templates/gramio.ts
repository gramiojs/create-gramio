export function getIndex() {
	return [
		`import { Bot } from "gramio";`,
		"",
		`const bot = new Bot("") // put you token here`,
		`    .command("start", (context) => context.send("Hi!"))`,
		"    .onStart(console.log);",
		"",
		"bot.start();",
	].join("\n");
}
