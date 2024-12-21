import dedent from "ts-dedent";
import type { PreferencesType } from "../utils.js";

const dbExportedMap = {
	Prisma: "prisma",
	Drizzle: "client",
};

export function getIndex({
	orm,
	driver,
	plugins,
	deno,
	type,
	i18nType,
	storage,
	others,
}: PreferencesType) {
	const gramioPlugins: string[] = [];
	const imports: string[] = [
		`import { Bot } from "gramio"`,
		`import { config } from "./config.ts"`,
	];
	const gracefulShutdownTasks: string[] = [];

	gracefulShutdownTasks.push("await bot.stop()");
	if (others.includes("Posthog")) {
		imports.push(`import { posthog } from "./posthog.ts"`);
		gracefulShutdownTasks.push("await posthog.shutdown()");
	}

	if (plugins.includes("Auto answer callback query")) {
		imports.push(
			`import { autoAnswerCallbackQuery } from "@gramio/auto-answer-callback-query"`,
		);
		gramioPlugins.push(".extend(autoAnswerCallbackQuery())");
	}

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
	if (plugins.includes("Scenes")) {
		imports.push(`import { scenes } from "@gramio/scenes"`);
		imports.push(`import { greetingScene } from "./scenes/greeting.ts"`);
		gramioPlugins.push(
			storage === "In-memory" || !storage
				? ".extend(scenes([greetingScene]))"
				: `.extend(scenes([greetingScene], {
			storage
		}))`,
		);
	}
	if (plugins.includes("Prompt")) {
		imports.push(`import { prompt } from "@gramio/prompt"`);
		gramioPlugins.push(".extend(prompt())");
	}
	if (plugins.includes("Autoload")) {
		imports.push(`import { autoload } from "@gramio/autoload"`);
		gramioPlugins.push(".extend(autoload())");
	}
	if (i18nType === "Fluent") {
		imports.push(`import { i18n } from "@gramio/i18n/fluent"`);
		imports.push(
			`import type { TypedFluentBundle } from "./locales.types.ts";`,
		);
		gramioPlugins.push(".extend(i18n<TypedFluentBundle>())");
	} else if (i18nType === "I18n-in-TS") {
		imports.push(`import { i18n } from "./shared/locales/index.ts"`);
		gramioPlugins.push(`.derive(\"message\", (context) => ({
				t: i18n.buildT(context.from?.languageCode ?? "en"),
			}))`);
	}

	if (deno) imports.push(`import { load } from "@std/dotenv";`);

	if (
		orm !== "None" &&
		driver !== "Postgres.JS" &&
		driver !== "MySQL 2" &&
		driver !== "Bun SQLite or better-sqlite3"
	)
		imports.push(
			`import { ${dbExportedMap[orm]} } from "${type.includes("monorepo") ? "@monorepo/db" : "./db"}"`,
		);

	if (storage === "Redis") {
		imports.push(`import { redisStorage } from "@gramio/storage-redis"`);
		imports.push("");
		imports.push(`const storage = redisStorage({
				host: config.REDIS_HOST
			});`);
	}

	return [
		...imports,
		"",
		...(deno ? ["await load({ export: true });", ""] : []),
		`const bot = new Bot(${
			deno ? `Deno.env.get("BOT_TOKEN")` : "config.BOT_TOKEN"
		})`,
		...gramioPlugins,
		...(!plugins.includes("Autoload")
			? [`    .command("start", (context) => context.send("Hi!"))`]
			: []),
		"    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));",
		dedent /* sts */`	
		const signals = ["SIGINT", "SIGTERM"];
		
		for (const signal of signals) {
			process.on(signal, async () => {
				console.log(\`Received \${signal}. Initiating graceful shutdown...\`);
				${gracefulShutdownTasks.join("\n")}
				process.exit(0);
			})
		}
			
		process.on("uncaughtException", (error) => {
			console.error(error);
		})

		process.on("unhandledRejection", (error) => {
			console.error(error);
		})`,
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
		...(plugins.includes("Autoload")
			? ["export type BotType = typeof bot;"]
			: []),
	].join("\n");
}
