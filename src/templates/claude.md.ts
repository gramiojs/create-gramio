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
	if (orm !== "None") stack.push(`- **ORM**: ${orm} (${database} via ${driver})`);
	if (plugins.length) stack.push(`- **Plugins**: ${plugins.join(", ")}`);
	if (storage !== "In-memory") stack.push(`- **Storage**: ${storage}`);
	if (webhookAdapter !== "None") stack.push(`- **Webhook**: ${webhookAdapter}`);
	if (others.length) stack.push(`- **Other tools**: ${others.join(", ")}`);

	// --- Project structure ---
	const structure: string[] = ["```", "src/"];
	structure.push("├── index.ts          # Entry point — starts the bot, graceful shutdown");
	structure.push("├── bot.ts            # Bot instance with plugin chain");
	structure.push("├── config.ts         # Typed environment variables (env-var)");
	structure.push("├── plugins/");
	structure.push("│   └── index.ts      # Shared Composer — extend this in every handler for typing");

	if (hasAutoload) {
		structure.push("├── commands/         # Auto-loaded handlers (one export default per file)");
	} else {
		structure.push("├── handlers/         # Command/event composers (each extends shared composer)");
	}

	structure.push("├── shared/");
	structure.push("│   ├── keyboards/    # Reusable Keyboard / InlineKeyboard builders");
	structure.push("│   └── callback-data/ # CallbackData class definitions");

	if (hasI18n && i18nType === "I18n-in-TS") {
		structure.push("│   └── locales/      # I18n-in-TS translation files (one file per language)");
	}
	if (hasViews) {
		structure.push("│   └── views/        # Re-renderable message components (defineView)");
	}
	if (hasScenes) {
		structure.push("├── scenes/           # Multi-step conversation flows (Scene instances)");
	}
	if (hasRedis) {
		structure.push("├── services/");
		structure.push("│   └── redis.ts      # ioredis client (shared across plugins)");
	}

	if (orm === "Drizzle") {
		structure.push("└── db/");
		structure.push("    ├── index.ts      # DB client (drizzle instance)");
		structure.push("    └── schema.ts     # Table definitions");
	} else if (orm === "Prisma") {
		structure.push("# Note: Prisma schema lives at the root: ./prisma/schema.prisma");
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
		commands.push(`${run} generate     # Generate Drizzle migrations (after schema change)`);
		commands.push(`${run} push         # Push schema to DB without migration (dev only)`);
		commands.push(`${run} migrate      # Apply pending migrations`);
	}
	if (orm === "Prisma") {
		commands.push(`${exec} prisma migrate dev     # Generate + apply migration (dev)`);
		commands.push(`${exec} prisma migrate deploy  # Apply migrations (prod)`);
	}
	commands.push("```");

	// --- Architecture notes ---
	const archNotes: string[] = [];

	archNotes.push(
		"### Plugin composition",
		"",
		"All top-level plugins are registered once in `src/plugins/index.ts` as a shared `Composer`.",
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
				"where keys are functions — this gives full type-safety and IDE autocomplete.",
				"",
				"```ts",
				`// src/shared/locales/en.ts`,
				"export default {",
				`    welcome: (name: string) => \`Hello, \${name}!\`,`,
				`    help: () => "Send /start to begin",`,
				"};",
				"```",
				"",
				"Use in handlers via `ctx.t('welcome', ctx.from.first_name)` (derived in plugins/index.ts).",
				"To add a new language: create `src/shared/locales/<lang>.ts` and register it in `src/shared/locales/index.ts`.",
			);
		} else {
			archNotes.push(
				"",
				"### I18n (Fluent)",
				"",
				"Translations are `.ftl` files in `src/locales/<lang>/`. Run `bun fluent` to regenerate types after editing `.ftl` files.",
			);
		}
	}

	if (hasViews) {
		archNotes.push(
			"",
			"### Views",
			"",
			"`src/shared/views/` contains re-renderable message components built with `defineView`.",
			"Views encapsulate a message's text + keyboard and can be re-rendered in-place:",
			"",
			"```ts",
			`import { defineView } from "../shared/views/builder.ts";`,
			"",
			"export const myView = defineView((data) => ({",
			`    text: data.t("welcome"),`,
			"    keyboard: new InlineKeyboard().text(\"Refresh\", \"refresh\"),",
			"}));",
			"```",
			"",
			"Send with `ctx.send(myView(data))`, re-render with `ctx.render(myView(data))`.",
		);
	}

	if (hasBroadcast) {
		archNotes.push(
			"",
			"### Broadcast",
			"",
			"`broadcast` is exported from `src/bot.ts` (requires Redis, uses BullMQ under the hood).",
			"Define message types with `.type()`, then trigger with `.start()`:",
			"",
			"```ts",
			`import { broadcast } from "./bot.ts";`,
			"",
			`await broadcast.start("message", userIds.map((id) => [id]));`,
			"```",
		);
	}

	if (orm === "Drizzle") {
		archNotes.push(
			"",
			"### Database",
			"",
			"Schema is defined in `src/db/schema.ts`. After any change:",
			"1. `bun generate` — creates a new migration file",
			"2. `bun migrate` — applies it",
			"",
			"> Never edit migration files manually — always use `bunx drizzle-kit generate`.",
		);
	} else if (orm === "Prisma") {
		archNotes.push(
			"",
			"### Database",
			"",
			"Schema is defined in `prisma/schema.prisma`. After any change:",
			"1. `bunx prisma migrate dev` — creates + applies a migration (dev)",
			"2. `bunx prisma migrate deploy` — applies migrations in prod",
			"3. `bunx prisma generate` — regenerates the Prisma client",
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
		"| Topic | URL |",
		"|-------|-----|",
		"| GramIO docs | https://gramio.dev/llms.txt |",
		"| Bot context & methods | https://gramio.dev/bot-api.md |",
		"| Keyboards | https://gramio.dev/keyboards/overview.md |",
		"| Formatting helpers | https://gramio.dev/formatting.md |",
	];

	if (tests) {
		docLinks.push("| Testing guide | https://gramio.dev/testing.md |");
	}
	if (hasScenes) {
		docLinks.push("| Scenes plugin | https://gramio.dev/plugins/official/scenes.md |");
	}
	if (hasI18n) {
		docLinks.push("| I18n plugin | https://gramio.dev/plugins/official/i18n.md |");
	}
	if (hasViews) {
		docLinks.push("| Views plugin | https://gramio.dev/plugins/official/views.md |");
	}
	if (hasBroadcast) {
		docLinks.push("| Broadcast / rate limits | https://gramio.dev/rate-limits.md |");
	}
	if (hasAutoload) {
		docLinks.push("| Autoload plugin | https://gramio.dev/plugins/official/autoload.md |");
	}
	if (hasSession) {
		docLinks.push("| Session plugin | https://gramio.dev/plugins/official/session.md |");
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
	if (orm !== "None") selfUpdateRows.push("| Schema changed | Database section |");
	if (hasI18n) selfUpdateRows.push("| New language added | I18n section |");

	return [
		`# ${projectName}`,
		"",
		"> This file is read by Claude Code and other AI agents to understand the project.",
		"> **Keep it accurate.** Update it whenever the structure or conventions change.",
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
