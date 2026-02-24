import pkg from "enquirer";

const { prompt } = pkg;

import type { PreferencesType } from "../utils.js";
import type { ParsedArgs } from "./args.js";

export type InfraChoice =
	| "Docker"
	| "GitHub Actions CI"
	| "Tests (@gramio/test)"
	| "AI Skills (GramIO)"
	| "Husky (git hooks)"
	| "Jobify (background jobs)"
	| "PostHog (analytics)"
	| "Locks (Verrou)"
	| "VSCode settings"
	| "Git init";

export async function promptProjectType(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (args.type) {
		const typeMap: Record<string, PreferencesType["type"]> = {
			bot: "Bot",
			"monorepo-mini": "Mini App + Bot monorepo",
			"monorepo-elysia": "Mini App + Bot + Elysia (backend framework) monorepo",
		};
		preferences.type = typeMap[args.type] ?? "Bot";
		return;
	}

	const { type } = await prompt<{ type: PreferencesType["type"] }>({
		type: "select",
		name: "type",
		message: "Select type of project:",
		choices: [
			"Bot",
			"Mini App + Bot + Elysia (backend framework) monorepo",
			"Mini App + Bot monorepo",
		],
	});
	preferences.type = type;
}

export async function promptLinter(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (args.linter) {
		const linterMap: Record<string, PreferencesType["linter"]> = {
			none: "None",
			eslint: "ESLint",
			biome: "Biome",
		};
		preferences.linter = linterMap[args.linter.toLowerCase()] ?? "None";
		return;
	}

	const { linter } = await prompt<{ linter: PreferencesType["linter"] }>({
		type: "select",
		name: "linter",
		message: "Select linters/formatters:",
		choices: ["Biome", "ESLint", "None"],
	});
	preferences.linter = linter;
}

export async function promptOrm(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (args.orm) {
		const ormMap: Record<string, PreferencesType["orm"]> = {
			none: "None",
			prisma: "Prisma",
			drizzle: "Drizzle",
		};
		preferences.orm = ormMap[args.orm.toLowerCase()] ?? "None";
	} else {
		const { orm } = await prompt<{ orm: PreferencesType["orm"] }>({
			type: "select",
			name: "orm",
			message: "Select ORM/Query Builder:",
			choices: ["Drizzle", "Prisma", "None"],
		});
		preferences.orm = orm;
	}

	const { orm } = preferences;

	if (orm === "Prisma") {
		if (args.database) {
			const dbMap: Record<string, PreferencesType["database"]> = {
				postgresql: "PostgreSQL",
				mysql: "MySQL",
				mongodb: "MongoDB",
				sqlite: "SQLite",
				sqlserver: "SQLServer",
				cockroachdb: "CockroachDB",
			};
			preferences.database = dbMap[args.database.toLowerCase()] ?? "PostgreSQL";
		} else {
			const { database } = await prompt<{
				database: PreferencesType["database"];
			}>({
				type: "select",
				name: "database",
				message: "Select DataBase for Prisma:",
				choices: [
					"PostgreSQL",
					"MySQL",
					"MongoDB",
					"SQLite",
					"SQLServer",
					"CockroachDB",
				],
			});
			preferences.database = database;
		}
	}

	if (orm === "Drizzle") {
		let database: "PostgreSQL" | "MySQL" | "SQLite";

		if (args.database) {
			const dbMap: Record<string, "PostgreSQL" | "MySQL" | "SQLite"> = {
				postgresql: "PostgreSQL",
				mysql: "MySQL",
				sqlite: "SQLite",
			};
			database = dbMap[args.database.toLowerCase()] ?? "PostgreSQL";
		} else {
			const result = await prompt<{
				database: "PostgreSQL" | "MySQL" | "SQLite";
			}>({
				type: "select",
				name: "database",
				message: "Select DataBase for Drizzle:",
				choices: ["PostgreSQL", "MySQL", "SQLite"],
			});
			database = result.database;
		}

		preferences.database = database;

		const driversMap: Record<typeof database, PreferencesType["driver"][]> = {
			PostgreSQL: (
				[
					"Postgres.JS",
					preferences.runtime === "Bun" ? "Bun.sql" : undefined,
					"node-postgres",
				] as const
			).filter((x) => x !== undefined),
			MySQL: ["MySQL 2"],
			SQLite: [preferences.runtime === "Bun" ? "bun:sqlite" : "better-sqlite3"],
		};

		if (args.driver) {
			const driverMap: Record<string, PreferencesType["driver"]> = {
				"postgres.js": "Postgres.JS",
				"node-postgres": "node-postgres",
				"bun.sql": "Bun.sql",
				mysql2: "MySQL 2",
				"bun:sqlite": "bun:sqlite",
				"better-sqlite3": "better-sqlite3",
			};
			preferences.driver =
				driverMap[args.driver.toLowerCase()] ??
				driversMap[database][0] ??
				"None";
		} else {
			const { driver } = await prompt<{ driver: PreferencesType["driver"] }>({
				type: "select",
				name: "driver",
				message: `Select driver for ${database}:`,
				choices: driversMap[database],
			});
			preferences.driver = driver;
		}
	}
}

export async function promptPlugins(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (args.plugins !== undefined) {
		const pluginMap: Record<string, PreferencesType["plugins"][number]> = {
			"auto-answer-callback-query": "Auto answer callback query",
			scenes: "Scenes",
			i18n: "I18n",
			views: "Views",
			"media-group": "Media-group",
			"media-cache": "Media-cache",
			autoload: "Autoload",
			session: "Session",
			prompt: "Prompt",
			posthog: "Posthog",
			split: "Split",
			pagination: "Pagination",
			"auto-retry": "Auto-retry",
		};
		preferences.plugins = args.plugins
			.split(",")
			.map((p) => pluginMap[p.trim().toLowerCase()])
			.filter(Boolean) as PreferencesType["plugins"];
		return;
	}

	const { plugins } = await prompt<{ plugins: PreferencesType["plugins"] }>({
		type: "multiselect",
		name: "plugins",
		message: "Select GramIO plugins: (Space to select, Enter to continue)",
		choices: [
			"Auto answer callback query",
			"Scenes",
			"I18n",
			"Views",
			"Media-group",
			"Media-cache",
			"Autoload",
			"Session",
			"Prompt",
			"Posthog",
			"Split",
			"Pagination",
			"Auto-retry",
		] satisfies PreferencesType["plugins"],
	});
	preferences.plugins = plugins;
}

export async function promptI18n(
	_args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (!preferences.plugins.includes("I18n")) return;

	const { type } = await prompt<{ type: PreferencesType["i18nType"] }>({
		type: "select",
		name: "type",
		message: "Select type of i18n localization usage:",
		choices: ["I18n-in-TS", "Fluent"],
	});
	preferences.i18nType = type;

	if (type === "I18n-in-TS") {
		const { languages } = await prompt<{ languages: string[] }>({
			type: "multiselect",
			name: "languages",
			message: "Select languages:",
			choices: ["en", "ru"],
		});
		preferences.i18n.languages = languages;

		if (languages.length > 1) {
			const { primaryLanguage } = await prompt<{ primaryLanguage: string }>({
				type: "select",
				name: "primaryLanguage",
				message: "Select primary language:",
				choices: languages,
			});
			preferences.i18n.primaryLanguage = primaryLanguage;
		} else {
			if (languages.length === 0) throw new Error("No languages selected");
			preferences.i18n.primaryLanguage = languages[0];
		}
	}
}

export async function promptStorage(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	const needsStorage =
		preferences.plugins.includes("Scenes") ||
		preferences.plugins.includes("Session");
	if (!needsStorage) return;

	if (args.storage) {
		const storageMap: Record<string, PreferencesType["storage"]> = {
			redis: "Redis",
			"in-memory": "In-memory",
			sqlite: "SQLite",
		};
		preferences.storage = storageMap[args.storage.toLowerCase()] ?? "In-memory";
		return;
	}

	const { storage } = await prompt<{ storage: PreferencesType["storage"] }>({
		type: "select",
		name: "storage",
		message: "Select storage adapter (for Session/Scenes):",
		choices: ["Redis", "In-memory", "SQLite"],
	});
	preferences.storage = storage;
}

export async function promptWebhook(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	if (args.webhook) {
		const webhookMap: Record<string, PreferencesType["webhookAdapter"]> = {
			none: "None",
			"bun.serve": "Bun.serve",
			elysia: "Elysia",
			fastify: "Fastify",
			"node:http": "node:http",
			hono: "Hono",
		};
		preferences.webhookAdapter =
			webhookMap[args.webhook.toLowerCase()] ?? "None";
	} else {
		const { webhookAdapter } = await prompt<{
			webhookAdapter: PreferencesType["webhookAdapter"];
		}>({
			type: "select",
			name: "webhookAdapter",
			message: "Do you want to use webhook adapter on production?:",
			choices: (
				[
					"None",
					preferences.runtime === "Bun" ? "Bun.serve" : undefined,
					preferences.runtime === "Bun" ? "Elysia" : undefined,
					"Fastify",
					"node:http",
					"Hono",
				] as const
			).filter((x) => x !== undefined) as PreferencesType["webhookAdapter"][],
		});
		preferences.webhookAdapter = webhookAdapter;
	}

	if (preferences.webhookAdapter === "Elysia") {
		const { authPlugin } = await prompt<{ authPlugin: boolean }>({
			type: "toggle",
			name: "authPlugin",
			initial: "yes",
			message: "Do you want to add plugin with x-init-data auth?",
		});
		preferences.authPlugin = authPlugin;
	}
}

function getInfraDefaults(preferences: PreferencesType): InfraChoice[] {
	const defaults: InfraChoice[] = [
		"Git init",
		"AI Skills (GramIO)",
		"Tests (@gramio/test)",
		"Jobify (background jobs)",
		"Locks (Verrou)",
		"VSCode settings",
		"Docker",
	];
	if (preferences.plugins.includes("Posthog"))
		defaults.push("PostHog (analytics)");
	return defaults;
}

export async function promptInfrastructure(
	args: ParsedArgs,
	preferences: PreferencesType,
): Promise<void> {
	const hasCliInfraArgs =
		args.docker === true ||
		args.vscode === true ||
		args.git === false ||
		args.locks === true ||
		args.tests === true ||
		args["github-actions"] === true ||
		args.husky === true ||
		args.others !== undefined;

	let selected: InfraChoice[];

	if (hasCliInfraArgs) {
		selected = [];
		if (args.docker) selected.push("Docker");
		if (args.vscode) selected.push("VSCode settings");
		if (args.git !== false) selected.push("Git init");
		if (args.locks) selected.push("Locks (Verrou)");
		if (args.tests) selected.push("Tests (@gramio/test)");
		if (args["github-actions"]) selected.push("GitHub Actions CI");
		if (args.husky) selected.push("Husky (git hooks)");
		if (args.others) {
			const othersLower = args.others.toLowerCase();
			if (othersLower.includes("jobify"))
				selected.push("Jobify (background jobs)");
			if (othersLower.includes("posthog")) selected.push("PostHog (analytics)");
		}
	} else {
		const defaults = getInfraDefaults(preferences);
		const { infrastructure } = await prompt<{
			infrastructure: InfraChoice[];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}>({
			type: "multiselect",
			name: "infrastructure",
			message:
				"Select infrastructure options: (Space to select, Enter to continue)",
			choices: [
				"Git init",
				"Docker",
				"Jobify (background jobs)",
				"Tests (@gramio/test)",
				"AI Skills (GramIO)",
				"Locks (Verrou)",
				"VSCode settings",
				"PostHog (analytics)",
				"GitHub Actions CI",
				"Husky (git hooks)",
			],
			initial: defaults,
		} as Parameters<typeof prompt>[0]);
		selected = infrastructure;
	}

	preferences.docker = selected.includes("Docker");
	preferences.vscode = selected.includes("VSCode settings");
	preferences.git = selected.includes("Git init");
	preferences.locks = selected.includes("Locks (Verrou)");
	preferences.tests = selected.includes("Tests (@gramio/test)");
	preferences.githubActions = selected.includes("GitHub Actions CI");
	preferences.aiSkills = selected.includes("AI Skills (GramIO)");

	const others: PreferencesType["others"] = [];
	if (selected.includes("Husky (git hooks)")) others.push("Husky");
	if (selected.includes("Jobify (background jobs)")) others.push("Jobify");
	if (selected.includes("PostHog (analytics)")) others.push("Posthog");
	if (preferences.plugins.includes("Posthog") && !others.includes("Posthog"))
		others.push("Posthog");
	preferences.others = others;
}
