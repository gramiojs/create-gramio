import type { PreferencesType } from "../utils";

const dbExportedMap = {
	Prisma: "prisma",
	Drizzle: "client",
};

export function getIndex({ orm, driver, plugins }: PreferencesType) {
	const gramioPlugins: string[] = [];
	const imports: string[] = [`import { Bot } from "gramio"`];

	if (plugins.includes("Session")) {
		imports.push(`import { session } from "@gramio/session"`);
		gramioPlugins.push(".extend(session())");
	}
	if (plugins.includes("Prompt")) {
		imports.push(`import { prompt } from "@gramio/prompt"`);
		gramioPlugins.push(".extend(prompt())");
	}
	if (plugins.includes("Autoload")) {
		imports.push(`import { autoload } from "@gramio/autoload"`);
		gramioPlugins.push(".extend(autoload())");
	}

	if (
		orm !== "None" &&
		driver !== "Postgres.JS" &&
		driver !== "MySQL 2" &&
		driver !== "Bun SQLite or better-sqlite3"
	)
		imports.push(`import { ${dbExportedMap[orm]} } from "./db"`);

	return [
		...imports,
		"",
		"const bot = new Bot(process.env.TOKEN as string)",
		...gramioPlugins,
		`    .command("start", (context) => context.send("Hi!"))`,
		"    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started`));",
		...(orm !== "None" &&
		driver !== "Postgres.JS" &&
		driver !== "MySQL 2" &&
		driver !== "Bun SQLite or better-sqlite3"
			? [
					"",
					orm === "Prisma" ? "prisma.$connect()" : "client.connect()",
					".then(async () => {",
					`console.log("🗄️ Database was connected!")`,
					"await bot.start()",
					"})",
				]
			: ["\nbot.start();"]),
	].join("\n");
}
