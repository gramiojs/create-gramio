import type { PreferencesType } from "../utils.js";
import { pmExecuteMap, pmRunMap } from "../utils.js";

export function getClaudeMd(preferences: PreferencesType): string {
	const {
		projectName,
		plugins,
		linter,
		orm,
		database,
		driver,
		storage,
		webhookAdapter,
		i18nType,
		tests,
		locks,
		docker,
		others,
		packageManager,
	} = preferences;

	const run = pmRunMap[packageManager];
	const exec = pmExecuteMap[packageManager];

	const hasAutoload = plugins.includes("Autoload");
	const hasScenes = plugins.includes("Scenes");
	const hasI18n = plugins.includes("I18n");
	const hasSession = plugins.includes("Session");
	const hasViews = plugins.includes("Views");
	const hasBroadcast = plugins.includes("Broadcast");
	const hasRedis = storage === "Redis";

	// --- Tech stack ---
	const stack: string[] = ["- **Framework**: [GramIO](https://gramio.dev/)"];
	if (linter !== "None") stack.push(`- **Linter**: ${linter}`);
	if (orm !== "None")
		stack.push(`- **ORM**: ${orm} (${database} via ${driver})`);
	if (plugins.length) stack.push(`- **Plugins**: ${plugins.join(", ")}`);
	if (storage !== "In-memory") stack.push(`- **Storage**: ${storage}`);
	if (webhookAdapter !== "None") stack.push(`- **Webhook**: ${webhookAdapter}`);
	if (others.length) stack.push(`- **Other tools**: ${others.join(", ")}`);

	// --- Project structure ---
	const structure: string[] = ["```", "src/"];
	structure.push(
		"├── index.ts          # Entry point — starts the bot, graceful shutdown",
	);
	structure.push("├── bot.ts            # Bot instance with plugin chain");
	structure.push(
		"├── config.ts         # Typed environment variables (env-var)",
	);
	structure.push("├── plugins/");
	structure.push(
		"│   └── index.ts      # Shared Composer — extend this in every handler for typing",
	);

	if (hasAutoload) {
		structure.push(
			"├── commands/         # Auto-loaded handlers (one export default per file)",
		);
	} else {
		structure.push(
			"├── handlers/         # Command/event composers (each extends shared composer)",
		);
	}

	structure.push("├── shared/");
	structure.push(
		"│   ├── keyboards/    # Reusable Keyboard / InlineKeyboard builders",
	);
	structure.push("│   └── callback-data/ # CallbackData class definitions");

	if (hasI18n && i18nType === "I18n-in-TS") {
		structure.push(
			"│   └── locales/      # I18n-in-TS translation files (one file per language)",
		);
	}
	if (hasViews) {
		structure.push(
			"│   └── views/        # Re-renderable message components (defineView)",
		);
	}
	if (hasScenes) {
		structure.push(
			"├── scenes/           # Multi-step conversation flows (Scene instances)",
		);
	}
	if (hasRedis) {
		structure.push("├── services/");
		structure.push(
			"│   └── redis.ts      # ioredis client (shared across plugins)",
		);
	}

	if (orm === "Drizzle") {
		structure.push("└── db/");
		structure.push("    ├── index.ts      # DB client (drizzle instance)");
		structure.push("    └── schema.ts     # Table definitions");
	} else if (orm === "Prisma") {
		structure.push(
			"# Note: Prisma schema lives at the root: ./prisma/schema.prisma",
		);
	}

	structure.push("```");

	// --- Key commands ---
	const commands: string[] = ["```bash"];
	commands.push(`${run} dev          # Start with hot-reload`);
	commands.push(`${run} start        # Production start`);
	if (linter !== "None") {
		commands.push(`${run} lint         # Check code style`);
		commands.push(`${run} lint:fix     # Auto-fix lint issues`);
	}
	if (tests) {
		commands.push(`${run} test         # Run tests`);
	}
	if (orm === "Drizzle") {
		commands.push(
			`${run} generate     # Generate Drizzle migrations (after schema change)`,
		);
		commands.push(
			`${run} push         # Push schema to DB without migration (dev only)`,
		);
		commands.push(`${run} migrate      # Apply pending migrations`);
	}
	if (orm === "Prisma") {
		commands.push(
			`${exec} prisma migrate dev     # Generate + apply migration (dev)`,
		);
		commands.push(`${exec} prisma migrate deploy  # Apply migrations (prod)`);
	}
	commands.push("```");

	// --- Architecture notes ---
	const archNotes: string[] = [];

	archNotes.push(
		"### Plugin composition",
		"",
		"All top-level plugins are registered once in `src/plugins/index.ts` as a shared `Composer`.",
		"The composer is **named** (`{ name: \"main\" }`) and marked **`.as(\"scoped\")`** — these two together are load-bearing:",
		"",
		"- `name` enables structural deduplication: extending the same composer twice (e.g. via two routers) is a no-op the second time.",
		"- `.as(\"scoped\")` makes `derive`/`decorate` results propagate to the parent (the bot) instead of being trapped in a per-extend isolation group. Without it, types say `ctx.t` / `ctx.session` / `ctx.render` exist, but at runtime they would be missing in handlers.",
		"",
		"Every handler file **must extend** this composer so it inherits full plugin typing:",
		"",
		"```ts",
		`import { Composer } from "gramio";`,
		`import { composer } from "../plugins/index.ts";`,
		"",
		"export const myComposer = new Composer()",
		"    .extend(composer)",
		`    .command("start", (ctx) => ctx.send("Hi!"));`,
		"```",
		"",
		"> When adding a new shared sub-composer (e.g. `withUser` for auth/db loading), give it a `name`, end the chain with `.as(\"scoped\")`, and **extend it on the bot BEFORE any router that uses it** — otherwise dedup will skip the runtime registration inside routers and `ctx.user` will exist only in the first router that ran. See [Production Architecture](https://gramio.dev/extend/middleware.md#production-architecture).",
	);

	if (hasAutoload) {
		archNotes.push(
			"",
			"> `autoload()` is registered at the bot level only — never inside the shared composer.",
			"",
			"### Adding a new command (Autoload)",
			"",
			"Create `src/commands/my-feature.ts` with a default export:",
			"",
			"```ts",
			`import type { BotType } from "../plugins/index.ts";`,
			"",
			"export default (bot: BotType) =>",
			`    bot.command("feature", (ctx) => ctx.send("Hello!"));`,
			"```",
		);
	} else {
		archNotes.push(
			"",
			"### Adding a new handler",
			"",
			"1. Create `src/handlers/my-feature.ts` extending the shared composer",
			"2. Import and chain it via `.extend(myComposer)` in `src/bot.ts`",
		);
	}

	if (hasScenes) {
		archNotes.push(
			"",
			"### Scenes",
			"",
			"Scenes live in `src/scenes/`. Each file exports a `Scene` instance.",
			"Register new scenes inside `scenes([...])` in `src/plugins/index.ts`.",
		);
	}

	if (hasI18n) {
		if (i18nType === "I18n-in-TS") {
			archNotes.push(
				"",
				"### I18n (I18n-in-TS)",
				"",
				"Translations live in `src/shared/locales/`. Each language is a TypeScript file",
				"where keys are functions or plain text values — this gives full type-safety and IDE autocomplete. You also can use nested keys (which will be flattened to dot-notation).",
				"",
				"```ts",
				`// src/shared/locales/en.ts`,
				`import { format } from "gramio";`,
				`import { pluralizeEnglish, type LanguageMap } from "@gramio/i18n";`,
				"",
				"export default {",
				`    welcome: (name: string) => format\`Hello, \${name}!\`,`,
				`    help: "Send /start to begin",`,
				`    items: {`,
				`        count: (n: number) => format\`You have \${n} \${pluralizeEnglish(n, "item", "items")}\`,`,
				`    },`,
				"} satisfies LanguageMap;",
				"```",
				"",
				"Nested keys are accessed with dot-notation: `ctx.t('items.count', 5)`.",
				"Use `ctx.from.firstName` (camelCase) — GramIO normalizes Telegram's snake_case fields.",
				"",
				"```ts",
				"// in a handler",
				"ctx.send(ctx.t('welcome', ctx.from.firstName));",
				"ctx.send(ctx.t('items.count', 42));",
				"```",
				"",
				"To add a new language: create `src/shared/locales/<lang>.ts` satisfying `ShouldFollowLanguage<typeof en>` and register it in `src/shared/locales/index.ts`.",
			);
		} else {
			archNotes.push(
				"",
				"### I18n (Fluent)",
				"",
				`Translations are \`.ftl\` files in \`src/locales/<lang>/\`. Generated types live in \`src/locales.types.ts\` (\`TypedFluentBundle\`). Run \`${exec} fluent2ts\` to regenerate types after editing \`.ftl\` files.`,
			);
		}
	}

	if (hasViews) {
		archNotes.push(
			"",
			"### Views",
			"",
			"`src/shared/views/` contains reusable message components built with `@gramio/views`.",
			"`defineView` is created via `initViewsBuilder` and exported from `src/shared/views/builder.ts`.",
			"Views use a method-chaining builder (`this.response`) and auto-detect whether to send a new message or edit an existing one:",
			"",
			"```ts",
			`import { defineView } from "../shared/views/builder.ts";`,
			"",
			"export const myView = defineView().render(function (param: string) {",
			`    return this.response`,
			`        .text(this.t("welcome") + param)`,
			'        .keyboard(new InlineKeyboard().text("Refresh", "refresh"));',
			"});",
			"```",
			"",
			"`render` is derived into context via `defineView.buildRender(context, globalData)` (done once in `src/plugins/index.ts`).",
			"Use it in handlers: `await context.render(myView, param)`.",
		);
	}

	if (hasBroadcast) {
		archNotes.push(
			"",
			"### Broadcast",
			"",
			"`broadcast` is created in `src/bot.ts` via `new Broadcast(redis)` and exported.",
			"Each broadcast **type** is registered with `.type(name, handler)` — the handler receives the arguments you pass per-item and should call `bot.api.*`:",
			"",
			"```ts",
			`// src/bot.ts`,
			`export const broadcast = new Broadcast(redis)`,
			`    .type("newsletter", (chatId: number, text: string) =>`,
			`        bot.api.sendMessage({ chat_id: chatId, text })`,
			`    );`,
			"```",
			"",
			"Trigger a broadcast by calling `.start(name, items)` where each item is a tuple matching the handler's arguments:",
			"",
			"```ts",
			`import { broadcast } from "./bot.ts";`,
			"",
			`await broadcast.start("newsletter", userIds.map((id) => [id, "Hello!"]));`,
			"```",
			"",
			"To add a new broadcast type, append another `.type(...)` call on the `broadcast` chain in `src/bot.ts`.",
		);
	}

	if (orm === "Drizzle") {
		archNotes.push(
			"",
			"### Database",
			"",
			"Schema is defined in `src/db/schema.ts`. After any change:",
			`1. \`${run} generate\` — creates a new migration file`,
			`2. \`${run} migrate\` — applies it`,
			"",
			`> Never edit migration files manually — always use \`${exec} drizzle-kit generate\`.`,
		);
	} else if (orm === "Prisma") {
		archNotes.push(
			"",
			"### Database",
			"",
			"Schema is defined in `prisma/schema.prisma`. After any change:",
			`1. \`${exec} prisma migrate dev\` — creates + applies a migration (dev)`,
			`2. \`${exec} prisma migrate deploy\` — applies migrations in prod`,
			`3. \`${exec} prisma generate\` — regenerates the Prisma client`,
		);
	}

	if (locks) {
		archNotes.push(
			"",
			"### Locks (Verrou)",
			"",
			"`src/services/locks.ts` exports a `locker` instance.",
			"Use it to prevent concurrent processing of the same resource:",
			"",
			"```ts",
			`await locker.createLock("user-42").run(async () => {`,
			"    // only one execution at a time per key",
			"});",
			"```",
		);
	}

	// --- Useful links ---
	const docLinks: string[] = [
		"## Useful links",
		"",
		"> Any GramIO docs page is also available as clean Markdown by appending `.md` to the URL — fetch those when you need a specific reference instead of the whole `llms-full.txt`.",
		"",
		"| Topic | URL |",
		"|-------|-----|",
		"| GramIO docs index (LLM-optimized) | https://gramio.dev/llms.txt |",
		"| Full docs in one file (for context loading) | https://gramio.dev/llms-full.txt |",
		"| Bot context & methods | https://gramio.dev/bot-api.md |",
		"| Keyboards | https://gramio.dev/keyboards/overview.md |",
		"| Formatting helpers | https://gramio.dev/formatting.md |",
		"| Composer (named, scoped, dedup) | https://gramio.dev/extend/composer.md |",
		"| Middleware & production architecture | https://gramio.dev/extend/middleware.md |",
		"| CallbackData (type-safe payloads) | https://gramio.dev/callback-data.md |",
	];

	if (tests) {
		docLinks.push("| Testing guide | https://gramio.dev/testing.md |");
	}
	if (hasScenes) {
		docLinks.push(
			"| Scenes plugin | https://gramio.dev/plugins/official/scenes.md |",
		);
	}
	if (hasI18n) {
		docLinks.push(
			"| I18n plugin | https://gramio.dev/plugins/official/i18n.md |",
		);
	}
	if (hasViews) {
		docLinks.push(
			"| Views plugin | https://gramio.dev/plugins/official/views.md |",
		);
	}
	if (hasBroadcast) {
		docLinks.push(
			"| Broadcast / rate limits | https://gramio.dev/rate-limits.md |",
		);
	}
	if (hasAutoload) {
		docLinks.push(
			"| Autoload plugin | https://gramio.dev/plugins/official/autoload.md |",
		);
	}
	if (hasSession) {
		docLinks.push(
			"| Session plugin | https://gramio.dev/plugins/official/session.md |",
		);
	}
	if (locks) {
		docLinks.push("| Verrou (locks) | https://verrou.dev/ |");
	}
	if (orm === "Drizzle") {
		docLinks.push("| Drizzle ORM | https://orm.drizzle.team/ |");
	}
	if (orm === "Prisma") {
		docLinks.push("| Prisma docs | https://www.prisma.io/docs |");
	}

	// --- Self-update instructions ---
	const selfUpdateRows = [
		"| New plugin installed | Tech Stack, Architecture |",
		hasAutoload
			? "| New command file added | no update needed (Autoload handles it) |"
			: "| New handler added | Project Structure |",
		"| New service / external client | Project Structure |",
		"| New env variable | document it in config.ts inline |",
		"| Script added to package.json | Key Commands |",
	];
	if (orm !== "None")
		selfUpdateRows.push("| Schema changed | Database section |");
	if (hasI18n) selfUpdateRows.push("| New language added | I18n section |");

	const aiSetup = [
		"## AI assistant setup",
		"",
		"This project ships with a [GramIO Skill](https://gramio.dev/) that teaches your AI assistant the framework — examples, plugin guides, type-safe callback patterns, formatting rules, and migration playbooks.",
		"",
		"```bash",
		`${exec} skills add gramiojs/documentation/skills`,
		"```",
		"",
		"Once installed, Claude Code, Cursor, and other agents auto-load GramIO knowledge when they detect bot code. Without it, agents tend to hallucinate `parse_mode: \"HTML\"`, `ctx.data.startsWith(...)`, or `ctx as any` — patterns this project explicitly forbids (see Conventions).",
	];

	return [
		`# ${projectName}`,
		"",
		"> This file is read by Claude Code and other AI agents to understand the project.",
		"> **Keep it accurate.** Update it whenever the structure or conventions change.",
		"",
		...aiSetup,
		"",
		"## Tech Stack",
		"",
		...stack,
		"",
		"## Project Structure",
		"",
		...structure,
		"",
		"## Key Commands",
		"",
		...commands,
		"",
		"## Conventions",
		"",
		"### Context",
		"",
		"- **Context fields are camelCase**: GramIO normalizes all Telegram snake_case fields — use `ctx.from.firstName`, `ctx.chat.lastName`, `ctx.message.messageId`, etc.",
		"- **Never use raw Telegram snake_case** (`first_name`, `chat_id`, `message_id`) when accessing context properties.",
		"- **Never touch `ctx.payload` or `ctx.update.*`** — those are raw internal objects. Every Telegram field has a camelCase getter directly on the context (`ctx.from`, `ctx.chatId`, `ctx.messageId`, `ctx.text`, `ctx.data`, `ctx.queryData`).",
		"- **Type derivation, not casts**: after `.derive()` / `.decorate()` / `.extend(plugin)` the new fields appear on the inferred context type automatically. Never write `ctx as unknown as { myField }`. Export `BotContext = typeof composer['_']['context']` if you need to reuse the type.",
		"",
		"### Callback queries",
		"",
		"- **Never parse `ctx.data` manually with `startsWith` / `split`.** `CallbackData.pack()` produces a 6-character sha1 hash prefix + serialized payload — literal-prefix checks like `ctx.data?.startsWith(\"nav:\")` will silently never match at runtime.",
		"- Use one of these four patterns, picked by the shape of the data:",
		"  - **Fixed string** → `bot.callbackQuery(\"refresh\", handler)`",
		"  - **Variable slug** → `bot.callbackQuery(/^user_(\\d+)$/, (ctx) => ctx.match![1])`",
		"  - **Structured payload** → `new CallbackData(\"nav\").enum(\"to\", [...])` + `bot.callbackQuery(nav, (ctx) => ctx.queryData.to)` (preferred for >1 field)",
		"  - **Stale-safe unpack** → `nav.safeUnpack(ctx.data!)` returns `{ success, data }` for inline keyboards that may outlive a schema change",
		"",
		"### Formatting",
		"",
		"- **Never set `parse_mode`.** GramIO's `format` builds `MessageEntity[]` and passes them automatically — adding `parse_mode: \"HTML\"` or `\"MarkdownV2\"` corrupts the message.",
		"- **Never call native `Array.prototype.join` on formatted values** — it triggers `.toString()` and silently drops every entity. Use `import { join } from \"gramio\"` and `join(items, (x) => bold(x), \"\\n\")`.",
		"- **Always wrap composed/reused styled content in `` format`...` ``.** Embedding a `Formattable` in a plain template literal strips entities.",
		"- **Never call `.toString()` on a `FormattableString`.** Pass it directly as the `text` / `caption` argument.",
		"",
		"### TypeScript hygiene",
		"",
		"- **No `any` anywhere** — no `ctx: any`, `as any`, `<any>`, or implicit-any handler params. Derive types from `ContextType<typeof bot, \"update_name\">` or the exported `BotType`. If a value is genuinely unknown at a system boundary, use `unknown` + narrowing.",
		"",
		"## Architecture",
		"",
		...archNotes,
		"",
		...docLinks,
		"",
		"## Keeping this file up to date",
		"",
		"When making changes, update the relevant section above:",
		"",
		"| Change | Section to update |",
		"|--------|-------------------|",
		...selfUpdateRows,
	].join("\n");
}
