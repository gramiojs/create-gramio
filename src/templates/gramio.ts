import type { PreferencesType } from "../utils.js";

const dbExportedMap = {
	Prisma: "prisma",
	Drizzle: "client",
};

export function getIndex({ orm, driver, plugins, deno }: PreferencesType) {
	const gramioPlugins: string[] = [];
	const imports: string[] = [`import { Bot } from "gramio"`];

	if (plugins.includes("Media-group")) {
		imports.push(`import { mediaGroup } from "@gramio/media-group"`);
		gramioPlugins.push(".extend(mediaGroup())");
	}
	if (plugins.includes("Auto-retry")) {
		imports.push(`import { autoRetry } from "@gramio/auto-retry"`);
		gramioPlugins.push(".extend(autoRetry())");
	}
	if (plugins.includes("Media-cache")) {
		imports.push(`import { mediaCache } from "@gramio/media-cache"`);
		gramioPlugins.push(".extend(mediaCache())");
	}
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
	if (plugins.includes("I18n")) {
		imports.push(`import { i18n } from "@gramio/i18n"`);
		imports.push(`import type { TypedFluentBundle } from "./locales.types";`);
		gramioPlugins.push(".extend(i18n<TypedFluentBundle>())");
	}

	if (deno) imports.push(`import { load } from "@std/dotenv";`);

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
		...(deno ? ["await load({ export: true });", ""] : []),
		`const bot = new Bot(${
			deno ? `Deno.env.get("TOKEN")` : "process.env.TOKEN"
		} as string)`,
		...gramioPlugins,
		`    .command("start", (context) => context.send("Hi!"))`,
		"    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));",
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
