import type { PreferencesType } from "../utils.js";

/**
 * Builds plugin imports + Composer chain for `src/plugins/index.ts`.
 * Paths are relative to `src/plugins/` (one level below `src/`).
 */
function buildPluginContent({ plugins, i18nType, storage }: PreferencesType): {
	imports: string[];
	composerPlugins: string[];
} {
	const imports: string[] = [];
	const composerPlugins: string[] = [];

	if (plugins.includes("Auto answer callback query")) {
		imports.push(
			`import { autoAnswerCallbackQuery } from "@gramio/auto-answer-callback-query"`,
		);
		composerPlugins.push(".extend(autoAnswerCallbackQuery())");
	}
	if (plugins.includes("Media-group")) {
		imports.push(`import { mediaGroup } from "@gramio/media-group"`);
		composerPlugins.push(".extend(mediaGroup())");
	}
	if (plugins.includes("Auto-retry")) {
		imports.push(`import { autoRetry } from "@gramio/auto-retry"`);
		composerPlugins.push(".extend(autoRetry())");
	}
	if (plugins.includes("Media-cache")) {
		imports.push(`import { mediaCache } from "@gramio/media-cache"`);
		composerPlugins.push(".extend(mediaCache())");
	}
	if (plugins.includes("Session")) {
		imports.push(`import { session } from "@gramio/session"`);
		composerPlugins.push(
			storage === "In-memory" || !storage
				? ".extend(session())"
				: `.extend(session({ storage }))`,
		);
	}
	if (plugins.includes("Scenes")) {
		imports.push(`import { scenes } from "@gramio/scenes"`);
		// path from src/plugins/ → src/scenes/
		imports.push(`import { greetingScene } from "../scenes/greeting.ts"`);
		composerPlugins.push(
			storage === "In-memory" || !storage
				? ".extend(scenes([greetingScene]))"
				: `.extend(scenes([greetingScene], {
		storage
	}))`,
		);
	}
	if (plugins.includes("Prompt")) {
		imports.push(`import { prompt } from "@gramio/prompt"`);
		composerPlugins.push(".extend(prompt())");
	}
	if (i18nType === "Fluent") {
		imports.push(`import { i18n } from "@gramio/i18n/fluent"`);
		// path from src/plugins/ → src/locales.types.ts
		imports.push(
			`import type { TypedFluentBundle } from "../locales.types.ts";`,
		);
		composerPlugins.push(".extend(i18n<TypedFluentBundle>())");
	} else if (i18nType === "I18n-in-TS") {
		// path from src/plugins/ → src/shared/locales/
		imports.push(`import { i18n } from "../shared/locales/index.ts"`);
		composerPlugins.push(`.derive("message", (context) => ({
			t: i18n.buildT(context.from?.languageCode ?? "en"),
		}))`);
	}
	if (plugins.includes("Posthog")) {
		imports.push(`import { posthogPlugin } from "@gramio/posthog"`);
		// path from src/plugins/ → src/services/
		imports.push(`import { posthog } from "../services/posthog.ts"`);
		composerPlugins.push(".extend(posthogPlugin(posthog))");
	}
	if (plugins.includes("Pagination")) {
		imports.push(`import { paginationFor } from "@gramio/pagination/plugin"`);
		composerPlugins.push(".extend(paginationFor([]))");
	}
	return { imports, composerPlugins };
}

function buildComposerLines(composerPlugins: string[]): string[] {
	const indented = composerPlugins.map((p) => `    ${p}`);
	return composerPlugins.length > 0
		? [
				"export const composer = new Composer()",
				...indented.slice(0, -1),
				`${indented.at(-1)};`,
			]
		: ["export const composer = new Composer();"];
}

/**
 * Generates `src/plugins/index.ts` — the shared composer that every
 * handler/command composer extends for full plugin typing.
 *
 * Exports `composer` and `BotType` so child files have a single import.
 */
export function getPluginsIndex(preferences: PreferencesType): string {
	const { storage } = preferences;
	const { imports, composerPlugins } = buildPluginContent(preferences);

	const storageLines: string[] = [];
	if (storage === "Redis") {
		// path from src/plugins/ → src/services/
		storageLines.push(
			`import { redisStorage } from "@gramio/storage-redis"`,
		);
		storageLines.push(`import { redis } from "../services/redis.ts"`);
		storageLines.push("");
		storageLines.push("const storage = redisStorage(redis);");
	} else if (storage === "SQLite") {
		storageLines.push(`import { sqliteStorage } from "@gramio/storage-sqlite"`);
		storageLines.push("");
		storageLines.push("const storage = sqliteStorage();");
	}

	return [
		`import { Composer } from "gramio"`,
		...imports,
		...(storageLines.length ? ["", ...storageLines] : []),
		"",
		...buildComposerLines(composerPlugins),
		"",
		"export type BotType = typeof composer;",
	].join("\n");
}

/**
 * Generates `src/bot.ts`.
 *
 * Both Autoload and non-Autoload import composer from `./plugins/index.ts`.
 * - Autoload: `.extend(autoload())` added at bot level (never in shared composer).
 * - Non-Autoload: `.extend(startComposer)` added at bot level.
 */
export function getBot({ plugins }: PreferencesType): string {
	const hasAutoload = plugins.includes("Autoload");
	const hasBroadcast = plugins.includes("Broadcast");

	const botExtends = [
		"    .extend(composer)",
		hasAutoload ? "    .extend(autoload())" : "    .extend(startComposer)",
	];

	const lines = [
		`import { Bot } from "gramio"`,
		`import { config } from "./config.ts"`,
		`import { composer } from "./plugins/index.ts"`,
	];

	if (hasBroadcast) {
		lines.push(`import Redis from "ioredis"`);
		lines.push(`import { Broadcast } from "@gramio/broadcast"`);
	}

	if (hasAutoload) {
		lines.push(`import { autoload } from "@gramio/autoload"`);
	} else {
		lines.push(`import { startComposer } from "./handlers/start.ts"`);
	}

	lines.push(
		"",
		"export const bot = new Bot(config.BOT_TOKEN)",
		...botExtends,
		"    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));",
	);

	if (hasBroadcast) {
		lines.push(
			"",
			"const broadcastRedis = new Redis({ maxRetriesPerRequest: null });",
			"",
			`export const broadcast = new Broadcast(broadcastRedis)`,
			`    .type("message", (chatId: number) =>`,
			`        bot.api.sendMessage({ chat_id: chatId, text: "Hello!" })`,
			`    );`,
		);
	}

	if (hasAutoload) {
		lines.push("", "export type BotType = typeof composer;");
	}

	return lines.join("\n");
}
