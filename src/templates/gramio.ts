import type { PreferencesType } from "../utils";

export function getIndex({ orm, driver }: PreferencesType) {
	const plugins: string[] = [];
	const imports: string[] = [`import { Bot } from "gramio"`];

	return [
		...imports,
		"",
		"",
		"const bot = new Bot(process.env.TOKEN as string)",
		...plugins,
		`    .command("start", (context) => context.send("Hi!"))`,
		"    .onStart(console.log);",
		...(orm !== "None" &&
		driver !== "Postgres.JS" &&
		driver !== "MySQL 2" &&
		driver !== "Bun SQLite or better-sqlite3"
			? [
					"",
					orm === "Prisma"
						? "await prisma.$connect()"
						: "await client.connect()",
					`console.log("🗄️ Database was connected!")`,
					"",
			  ]
			: "\n"),

		"",
		"bot.start();",
	].join("\n");
}
