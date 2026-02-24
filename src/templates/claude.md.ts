import type { PreferencesType } from "../utils.js";

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
	} = preferences;

	const hasAutoload = plugins.includes("Autoload");
	const hasScenes = plugins.includes("Scenes");
	const hasI18n = plugins.includes("I18n");
	const hasSession = plugins.includes("Session");
	const hasBroadcast = plugins.includes("Broadcast");
	const hasRedis = storage === "Redis";

	// --- Tech stack ---
	const stack: string[] = ["- **Framework**: [GramIO](https://gramio.dev/)"];
	if (linter !== "None") stack.push(`- **Linter**: ${linter}`);
	if (orm !== "None") stack.push(`- **ORM**: ${orm} (${database} via ${driver})`);
	if (plugins.length)
		stack.push(`- **Plugins**: ${plugins.join(", ")}`);
	if (storage !== "In-memory")
		stack.push(`- **Storage**: ${storage}`);
	if (webhookAdapter !== "None")
		stack.push(`- **Webhook**: ${webhookAdapter}`);
	if (others.length) stack.push(`- **Other tools**: ${others.join(", ")}`);

	// --- Project structure ---
	const structure: string[] = [
		"```",
		"src/",
		"├── index.ts          # Entry point — starts the bot, graceful shutdown",
		"├── bot.ts            # Bot instance with plugin chain",
		"├── config.ts         # Typed environment variables (env-var)",
		"├── plugins/",
		"│   └── index.ts      # Shared Composer — extend this in every handler for typing",
	];

	if (hasAutoload) {
		structure.push("├── commands/         # Auto-loaded handlers (one export default per file)");
	} else {
		structure.push("├── handlers/         # Command/event composers (each extends shared composer)");
	}

	structure.push("├── shared/");
	structure.push("│   ├── keyboards/    # Reusable Keyboard / InlineKeyboard builders");
	structure.push("│   └── callback-data/ # CallbackData class definitions");

	if (hasI18n && i18nType === "I18n-in-TS") {
		structure.push("│   └── locales/      # I18n-in-TS translation files");
	}
	if (hasScenes) {
		structure.push("├── scenes/           # Multi-step conversation flows");
	}
	if (hasRedis || hasBroadcast) {
		structure.push("├── services/");
		if (hasRedis) structure.push("│   └── redis.ts      # ioredis client");
		if (hasBroadcast) structure.push("│   # (broadcast is initialised in bot.ts)");
	}
	if (orm !== "None") {
		structure.push("└── db/               # Database schema & client");
		structure.push("    ├── index.ts");
		structure.push("    └── schema.ts");
	}

	structure.push("```");

	// --- Key commands ---
	const commands: string[] = ["```bash", "bun dev          # Start with hot-reload"];
	if (linter !== "None") {
		commands.push("bun lint         # Check code style");
		commands.push("bun lint:fix     # Auto-fix lint issues");
	}
	if (tests) commands.push("bun test         # Run tests");
	if (orm === "Drizzle") {
		commands.push("bun generate     # Generate Drizzle migrations");
		commands.push("bun push         # Push schema to DB (dev only)");
		commands.push("bun migrate      # Apply migrations");
	}
	if (orm === "Prisma") {
		commands.push("bunx prisma migrate dev     # Generate + apply migration (dev)");
		commands.push("bunx prisma migrate deploy  # Apply migrations (prod)");
	}
	commands.push("```");

	// --- Architecture notes ---
	const archNotes: string[] = [];

	archNotes.push(
		"### Plugin composition",
		"",
		`All top-level plugins are registered once in \`src/plugins/index.ts\` as a shared \`Composer\`.`,
		`Every handler file **must extend** this composer so it inherits full plugin typing:`,
		"",
		"```ts",
		`import { Composer } from "gramio";`,
		`import { composer } from "../plugins/index.ts";`,
		"",
		`export const myComposer = new Composer()`,
		`    .extend(composer)`,
		`    .command("start", (ctx) => ctx.send("Hi!"));`,
		"```",
		"",
		`> \`autoload()\` is registered at the bot level only — never inside the shared composer.`,
	);

	if (hasAutoload) {
		archNotes.push(
			"",
			"### Adding a new command (Autoload)",
			"",
			"Create `src/commands/my-feature.ts` and export a default function:",
			"",
			"```ts",
			`import type { BotType } from "../plugins/index.ts";`,
			"",
			`export default (bot: BotType) =>`,
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

	if (hasBroadcast) {
		archNotes.push(
			"",
			"### Broadcast",
			"",
			"`broadcast` is exported from `src/bot.ts`. Define new message types with `.type()`,",
			"then trigger them with `broadcast.start(\"type\", chatIds.map(id => [id]))`.",
		);
	}

	if (orm === "Drizzle") {
		archNotes.push(
			"",
			"### Database",
			"",
			"Schema is defined in `src/db/schema.ts`. After changing it:",
			"1. Run `bun generate` to create a migration",
			"2. Run `bun migrate` to apply it",
			"> Never edit migration files manually — always use `bunx drizzle-kit generate`.",
		);
	}

	if (locks) {
		archNotes.push(
			"",
			"### Locks (Verrou)",
			"",
			"`src/services/locks.ts` exports a `locker` instance.",
			"Use it to prevent concurrent operations on the same resource:",
			"```ts",
			`await locker.createLock("user-42").run(async () => { ... });`,
			"```",
		);
	}

	// --- Self-update instructions ---
	const selfUpdate = [
		"## Keeping this file up to date",
		"",
		"**When you make changes to the project, update the relevant sections above:**",
		"",
		"| Change | Section to update |",
		"|--------|------------------|",
		"| New plugin installed | Tech Stack, Architecture |",
		hasAutoload
			? "| New command added | no update needed (Autoload) |"
			: "| New handler added | Project Structure |",
		"| New service / external client | Project Structure |",
		"| New env variable | (document it in config.ts inline) |",
		"| Script added to package.json | Key Commands |",
		orm !== "None" ? "| Schema change | Database section |" : "",
		"",
		"Keep descriptions short and accurate.",
		"Delete rows from Project Structure when files are removed.",
	].filter((line) => line !== "");

	return [
		`# ${projectName}`,
		"",
		"> This file is read by Claude Code and other AI agents to understand the project.",
		"> Keep it accurate. Update it whenever the structure or conventions change.",
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
		...selfUpdate,
	].join("\n");
}
