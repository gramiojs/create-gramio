import type { PreferencesType } from "../utils.js";

type PluginChunk = { imports: string[]; composerPlugins: string[] };

/**
 * Builds plugin imports + Composer chain for everything EXCEPT the `scenes`
 * plugin. Paths are relative to `src/plugins/` (one level below `src/`).
 *
 * Splitting out `scenes` lets us emit a separate `plugins/base.ts` that
 * scene files can safely extend — scenes need typed access to derives
 * (i18n, Views, session, …) without triggering a circular import, since
 * `plugins/index.ts` itself has to import the scene files in order to
 * register them with the `scenes(...)` plugin.
 */
function buildBasePluginContent({
	plugins,
	i18nType,
	storage,
}: PreferencesType): PluginChunk {
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
		// Cover all triggers that can read user language — message, callback_query,
		// inline_query, pre_checkout_query, etc. Without filter, t is available everywhere.
		composerPlugins.push(`.derive((context) => ({
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
	if (plugins.includes("Views")) {
		// path from src/plugins/ → src/shared/views/
		imports.push(`import { defineView } from "../shared/views/builder.ts"`);
		// Views needs render in context for both message and callback_query
		if (i18nType === "I18n-in-TS") {
			composerPlugins.push(`.derive(["message", "callback_query"], (context) => ({
		render: defineView.buildRender(context, {
			t: i18n.buildT(context.from?.languageCode ?? "en"),
		}),
	}))`);
		} else {
			composerPlugins.push(`.derive(["message", "callback_query"], (context) => ({
		render: defineView.buildRender(context, {}),
	}))`);
		}
	}
	return { imports, composerPlugins };
}

function buildStorageLines(
	storage: PreferencesType["storage"],
	exported: boolean,
): string[] {
	const keyword = exported ? "export const" : "const";
	if (storage === "Redis") {
		return [
			`import { redisStorage } from "@gramio/storage-redis"`,
			`import { redis } from "../services/redis.ts"`,
			"",
			`${keyword} storage = redisStorage(redis);`,
		];
	}
	if (storage === "SQLite") {
		return [
			`import { sqliteStorage } from "@gramio/storage-sqlite"`,
			"",
			`${keyword} storage = sqliteStorage();`,
		];
	}
	return [];
}

function buildComposerLines(
	composerPlugins: string[],
	name: string,
	exportAs: string,
): string[] {
	// `.as("scoped")` — derive/decorate results propagate to the parent (the bot)
	// instead of being trapped inside a per-extend isolation group. Required so
	// handler/scene composers that `.extend(...)` for typing actually see ctx.t /
	// ctx.session / ctx.render at runtime, and so named-composer dedup is safe.
	const indented = composerPlugins.map((p) => `    ${p}`);
	const decl = `export const ${exportAs} = new Composer({ name: "${name}" })`;
	return composerPlugins.length > 0
		? [decl, ...indented, '    .as("scoped");']
		: [`${decl}.as("scoped");`];
}

/**
 * Generates `src/plugins/base.ts` — the shared named+scoped composer that
 * both the bot (via `plugins/index.ts`) and every Scene extend.
 *
 * The Scene extending `baseComposer` is what flows typed derives (t, render,
 * session, …) into `.step(...)` handlers. GramIO's registration-time dedup
 * (keyed on `name: "base"`) ensures the middleware still runs exactly once
 * per update even though both bot and scene extend it.
 *
 * Emitted only when `Scenes` is enabled.
 */
export function getPluginsBase(preferences: PreferencesType): string {
	const { storage } = preferences;
	const { imports, composerPlugins } = buildBasePluginContent(preferences);
	const storageLines = buildStorageLines(storage, true);

	return [
		`import { Composer } from "gramio"`,
		...imports,
		...(storageLines.length ? ["", ...storageLines] : []),
		"",
		...buildComposerLines(composerPlugins, "base", "baseComposer"),
	].join("\n");
}

/**
 * Generates `src/plugins/index.ts` — the composer every handler/command
 * composer extends for full plugin typing.
 *
 * - With `Scenes`: thin assembly file on top of `baseComposer` that registers
 *   the `scenes(...)` plugin. Scene files live in `src/scenes/` and import
 *   `baseComposer` from `./base.ts` to avoid circular imports (this file
 *   imports the scene files to pass them into `scenes([...])`).
 * - Without `Scenes`: single-file layout — all plugin extensions inlined on
 *   the exported `composer`.
 */
export function getPluginsIndex(preferences: PreferencesType): string {
	const { plugins, storage } = preferences;
	const hasScenes = plugins.includes("Scenes");
	const usesStorage = storage === "Redis" || storage === "SQLite";

	if (hasScenes) {
		const imports = [
			`import { Composer } from "gramio"`,
			`import { scenes } from "@gramio/scenes"`,
			`import { baseComposer${usesStorage ? ", storage" : ""} } from "./base.ts"`,
			`import { greetingScene } from "../scenes/greeting.ts"`,
		];

		const scenesExtend = usesStorage
			? ".extend(scenes([greetingScene], { storage }))"
			: ".extend(scenes([greetingScene]))";

		return [
			...imports,
			"",
			'export const composer = new Composer({ name: "main" })',
			"    .extend(baseComposer)",
			`    ${scenesExtend}`,
			'    .as("scoped");',
			"",
			"export type BotType = typeof composer;",
		].join("\n");
	}

	const { imports, composerPlugins } = buildBasePluginContent(preferences);
	const storageLines = buildStorageLines(storage, false);

	return [
		`import { Composer } from "gramio"`,
		...imports,
		...(storageLines.length ? ["", ...storageLines] : []),
		"",
		...buildComposerLines(composerPlugins, "main", "composer"),
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
export function getBot({ plugins, storage }: PreferencesType): string {
	const hasAutoload = plugins.includes("Autoload");
	const hasBroadcast = plugins.includes("Broadcast");
	// Broadcast always needs Redis — reuse services/redis.ts if it exists
	const broadcastUsesServiceRedis = hasBroadcast;

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
		lines.push(`import { Broadcast } from "@gramio/broadcast"`);
		lines.push(`import { redis } from "./services/redis.ts"`);
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
			`export const broadcast = new Broadcast(redis)`,
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
