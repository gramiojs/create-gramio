#!/usr/bin/env node
import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import pkg from "enquirer";

const { prompt } = pkg;

import minimist from "minimist";
import task from "tasuku";

import {
	getDevelopmentDockerCompose,
	getDockerCompose,
	getDockerfile,
} from "templates/docker.js";
import { getI18nForLang, getI18nIndex } from "templates/i18n.js";
import { getSceneTemplate } from "templates/scenes.js";
import { getLocksFile } from "templates/services/locks.js";
import { getPosthogIndex } from "templates/services/posthog.js";
import { getRedisFile } from "templates/services/redis.js";
import { getVSCodeExtensions, getVSCodeSettings } from "templates/vscode.js";
import { getWebhookIndex } from "templates/webhook.js";
import dedent from "ts-dedent";
import {
	generateEslintConfig,
	getBot,
	getConfigFile,
	getDatabaseConfigFile,
	getDatabasePackageJSON,
	getDBIndex,
	getDrizzleConfig,
	getEnvFile,
	getIndex,
	getInstallCommands,
	getMonorepoPackageJSON,
	getMonorepoReadme,
	getPackageJson,
	getReadme,
	getTSConfig,
} from "./templates/index.js";
import {
	createOrFindDir,
	detectPackageManager,
	exec,
	Preferences,
	type PreferencesType,
	pmExecuteMap,
	runExternalCLI,
} from "./utils.js";

const args = minimist(process.argv.slice(2));

const preferences = new Preferences();

const packageManager = args.pm ?? detectPackageManager();

const dir = args._.at(0);
if (!dir)
	throw new Error(
		`Specify the folder like this - ${packageManager} create gramio DIR-NAME`,
	);

let projectDir = path.resolve(`${process.cwd()}/`, dir);
const monorepoRootDir = path.resolve(`${process.cwd()}/`, dir);
const appsDir = path.resolve(projectDir, "apps");

process.on("unhandledRejection", async (error) => {
	const filesInTargetDirectory = await fs.readdir(projectDir);
	if (filesInTargetDirectory.length) {
		const { overwrite } = await prompt<{ overwrite: boolean }>({
			type: "toggle",
			name: "overwrite",
			initial: "yes",
			message: `You exit the process. Do you want to delete the directory ${path.basename(projectDir)}?`,
		});
		if (!overwrite) {
			console.log("Cancelled...");
			return process.exit(0);
		}
	}
	console.log("Template deleted...");
	console.error(error);
	await fs.rm(projectDir, { recursive: true });
	process.exit(0);
});

createOrFindDir(projectDir)
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.then(async () => {
		preferences.dir = dir;
		preferences.projectName = path.basename(projectDir);
		preferences.packageManager = packageManager;
		// TODO: prompt it
		preferences.runtime = packageManager === "bun" ? "Bun" : "Node.js";
		if (args.deno) preferences.deno = true;

		// biome-ignore lint/complexity/noExtraBooleanCast: <explanation>
		preferences.noInstall = !Boolean(args.install ?? true);

		const filesInTargetDirectory = await fs.readdir(projectDir);
		if (filesInTargetDirectory.length) {
			const { deleteFiles } = await prompt<{ deleteFiles: boolean }>({
				type: "toggle",
				name: "deleteFiles",
				initial: "yes",
				message: `\n${filesInTargetDirectory.join(
					"\n",
				)}\n\nThe directory ${preferences.projectName} is not empty. Do you want to delete the files?`,
			});
			if (!deleteFiles) {
				console.log("Cancelled...");
				return process.exit(0);
			}

			await fs.rm(projectDir, { recursive: true });
		}

		const { type } = await prompt<{ type: PreferencesType["type"] }>({
			type: "select",
			name: "type",
			message: "Select type of project:",
			choices: [
				"Bot",
				"Mini App + Bot + Elysia (backend framework) monorepo",
				"Mini App + Bot monorepo",
				// "Plugin",
			],
			// .filter((x) =>
			// 	preferences.packageManager !== "bun" ? x === "Bot" : true,
			// ),
		});
		preferences.type = type;

		if (type.includes("monorepo")) {
			console.warn(
				"Be worried about monorepo selection, it can be buggy or not so convenient because support both monorepo and just bot project is not so easy.\nAlso we don't have our own mini-app templates so it will force pnpm as package manager and etc",
			);
			projectDir = path.resolve(appsDir, "bot");
			await createOrFindDir(projectDir);
		}

		if (type.includes("Mini App")) {
			console.log("\nChoose your Telegram Mini App!\n");

			await runExternalCLI(
				`${pmExecuteMap[preferences.packageManager]}`,
				["@telegram-apps/create-mini-app@latest", "."],
				appsDir,
			);
		}
		if (type.includes("Elysia")) {
			console.log("\nChoose your Elysia!\n");

			await runExternalCLI(
				`${pmExecuteMap[preferences.packageManager]}`,
				["create-elysiajs@latest", "server", "--monorepo", "--no-install"],
				appsDir,
			);
		}

		console.log("\nChoose your Telegram bot!\n");

		const { linter } = await prompt<{ linter: PreferencesType["linter"] }>({
			type: "select",
			name: "linter",
			message: "Select linters/formatters:",
			choices: ["None", "ESLint", "Biome"],
		});
		preferences.linter = linter;

		const { orm } = await prompt<{ orm: PreferencesType["orm"] }>({
			type: "select",
			name: "orm",
			message: "Select ORM/Query Builder:",
			choices: ["None", "Prisma", "Drizzle"],
		});
		preferences.orm = orm;
		if (orm === "Prisma") {
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
		if (orm === "Drizzle") {
			const { database } = await prompt<{
				database: "PostgreSQL" | "MySQL" | "SQLite";
			}>({
				type: "select",
				name: "database",
				message: "Select DataBase for Drizzle:",
				choices: ["PostgreSQL", "MySQL", "SQLite"],
			});
			const driversMap: Record<typeof database, PreferencesType["driver"][]> = {
				PostgreSQL: (
					[
						"Postgres.JS",
						preferences.runtime === "Bun" ? "Bun.sql" : undefined,
						"node-postgres",
					] as const
				).filter((x) => x !== undefined),
				MySQL: ["MySQL 2"],
				SQLite: [
					// TODO: support node:sqlite
					preferences.runtime === "Bun" ? "bun:sqlite" : "better-sqlite3",
				],
			};

			const { driver } = await prompt<{ driver: PreferencesType["driver"] }>({
				type: "select",
				name: "driver",
				message: `Select driver for ${database}:`,
				choices: driversMap[database],
			});
			preferences.database = database;
			preferences.driver = driver;
		}

		const { plugins } = await prompt<{
			plugins: PreferencesType["plugins"];
		}>({
			type: "multiselect",
			name: "plugins",
			message: "Select GramIO plugins: (Space to select, Enter to continue)",
			choices: [
				"Scenes",
				"I18n",
				"Views",
				"Media-group",
				"Media-cache",
				"Auto answer callback query",
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

		if (plugins.includes("I18n")) {
			const { type } = await prompt<{
				type: PreferencesType["i18nType"];
			}>({
				type: "select",
				name: "type",
				message: "Select type of i18n localization usage:",
				choices: ["I18n-in-TS", "Fluent"],
			});

			preferences.i18nType = type;

			if (type === "I18n-in-TS") {
				const { languages } = await prompt<{
					languages: string[];
				}>({
					type: "multiselect",
					name: "languages",
					message: "Select languages:",
					choices: ["en", "ru"],
				});
				preferences.i18n.languages = languages;

				if (languages.length > 1) {
					const { primaryLanguage } = await prompt<{
						primaryLanguage: string;
					}>({
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

		if (plugins.includes("Scenes")) {
			const { storage } = await prompt<{
				storage: PreferencesType["storage"];
			}>({
				type: "select",
				name: "storage",
				message: "Select type of storage for Scene plugin:",
				choices: ["Redis", "In-memory"],
			});

			preferences.storage = storage;
		}

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
				] as const
			).filter(
				(x) => x !== undefined,
			) satisfies PreferencesType["webhookAdapter"][],
		});

		preferences.webhookAdapter = webhookAdapter;

		const { others } = await prompt<{ others: PreferencesType["others"] }>({
			type: "multiselect",
			name: "others",
			message: "Select others tools: (Space to select, Enter to continue)",
			choices: [
				"Jobify",
				...(plugins.includes("Posthog") ? [] : ["Posthog"]),
				"Husky",
			],
		});

		if (plugins.includes("Posthog")) {
			others.push("Posthog");
		}

		preferences.others = others;

		if (!others.includes("Husky")) {
			const { git } = await prompt<{ git: boolean }>({
				type: "toggle",
				name: "git",
				initial: "yes",
				message: "Create an empty Git repository?",
			});
			preferences.git = git;
		} else preferences.git = true;

		const { locks } = await prompt<{ locks: boolean }>({
			type: "toggle",
			name: "locks",
			initial: "yes",
			message: "Do you want to use Locks to prevent race conditions?",
		});

		preferences.locks = locks;
		// const { createSharedFolder } = await prompt<{ createSharedFolder: boolean }>({
		// 	type: "toggle",
		// 	name: "createSharedFolder",
		// 	initial: "yes",
		// 	message: "Create an shared folder (for keyboards, callback-data)?",
		// });
		// preferences.createSharedFolder = createSharedFolder;

		const { docker } = await prompt<{ docker: boolean }>({
			type: "toggle",
			name: "docker",
			initial: "yes",
			message: "Create Dockerfile + docker.compose.yml?",
		});

		preferences.docker = docker;

		const { vscode } = await prompt<{ vscode: boolean }>({
			type: "toggle",
			name: "vscode",
			initial: "yes",
			message:
				"Create .vscode folder with VSCode extensions recommendations and settings?",
		});

		preferences.vscode = vscode;

		await task("Generating a template...", async ({ setTitle }) => {
			if (type.includes("monorepo")) {
				const databasePackageDir = path.resolve(
					monorepoRootDir,
					"packages",
					"db",
				);
				await createOrFindDir(databasePackageDir);
				await fs.writeFile(
					path.resolve(databasePackageDir, "package.json"),
					getDatabasePackageJSON(preferences),
				);
				await fs.mkdir(`${databasePackageDir}/src`);
				await fs.writeFile(
					`${databasePackageDir}/src/index.ts`,
					getDBIndex(preferences).replace("../config.ts", "./config.ts"),
				);
				await fs.writeFile(
					`${databasePackageDir}/src/config.ts`,
					getDatabaseConfigFile(preferences),
				);
				await fs.writeFile(
					`${databasePackageDir}/.env`,
					getEnvFile(preferences, false, ["DATABASE_URL"]),
				);
				if (preferences.type.includes("Elysia")) {
					await fs.mkdir(`${monorepoRootDir}/apps/server`).catch(() => {});
					await fs.appendFile(
						`${monorepoRootDir}/apps/server/.env`,
						`\n${getEnvFile(preferences, false, ["DATABASE_URL"])}`,
					);
				}

				if (orm === "Drizzle") {
					await fs.writeFile(
						`${databasePackageDir}/drizzle.config.ts`,
						getDrizzleConfig(preferences),
					);
					await fs.writeFile(
						`${databasePackageDir}/src/schema.ts`,
						preferences.database === "PostgreSQL"
							? `// import { pgTable } from "drizzle-orm/pg-core"`
							: preferences.database === "MySQL"
								? `// import { mysqlTable } from "drizzle-orm/mysql-core"`
								: `// import { sqliteTable } from "drizzle-orm/sqlite-core"`,
					);
					if (preferences.database === "SQLite")
						await fs.writeFile(`${databasePackageDir}/sqlite.db`, "");
				}

				await fs.writeFile(
					path.resolve(monorepoRootDir, "package.json"),
					getMonorepoPackageJSON(),
				);

				await fs.writeFile(
					path.resolve(monorepoRootDir, "README.md"),
					getMonorepoReadme(preferences),
				);
				await fs.writeFile(
					`${monorepoRootDir}/.gitignore`,
					["dist", "node_modules", ".env"].join("\n"),
				);
			}

			if (linter === "ESLint")
				await fs.writeFile(
					`${projectDir}/eslint.config.mjs`,
					generateEslintConfig(preferences),
				);
			await fs.writeFile(
				`${projectDir}/package.json`,
				getPackageJson(preferences),
			);
			await fs.writeFile(`${projectDir}/tsconfig.json`, getTSConfig());
			await fs.writeFile(`${projectDir}/.env`, getEnvFile(preferences));
			if (preferences.docker)
				await fs.writeFile(
					`${projectDir}/.env.production`,
					getEnvFile(preferences, true),
				);
			await fs.writeFile(
				`${projectDir}/.env.example`,
				getEnvFile(preferences, false),
			);
			await fs.writeFile(`${projectDir}/README.md`, getReadme(preferences));
			await fs.writeFile(
				`${projectDir}/.gitignore`,
				["dist", "node_modules", ".env", ".env.production"].join("\n"),
			);

			await fs.mkdir(`${projectDir}/src`);
			await fs.writeFile(`${projectDir}/src/index.ts`, getIndex(preferences));
			await fs.writeFile(`${projectDir}/src/bot.ts`, getBot(preferences));
			await fs.writeFile(
				`${projectDir}/src/config.ts`,
				getConfigFile(preferences),
			);

			if (preferences.webhookAdapter !== "None") {
				await fs.writeFile(
					`${projectDir}/src/webhook.ts`,
					getWebhookIndex(preferences),
				);
			}

			await fs.mkdir(`${projectDir}/src/shared`);
			await fs.mkdir(`${projectDir}/src/shared/keyboards`);
			await fs.writeFile(
				`${projectDir}/src/shared/keyboards/index.ts`,
				`// import { Keyboard, InlineKeyboard } from "gramio"`,
			);
			await fs.mkdir(`${projectDir}/src/shared/callback-data`);
			if (plugins.includes("Pagination")) {
				await fs.mkdir(`${projectDir}/src/shared/pagination`);
				await fs.writeFile(
					`${projectDir}/src/shared/pagination/index.ts`,
					`// import { Pagination } from "@gramio/pagination"`,
				);
			}

			if (plugins.includes("Views")) {
				await fs.mkdir(`${projectDir}/src/shared/views`);
				await fs.writeFile(
					`${projectDir}/src/shared/views/builder.ts`,
					dedent /* ts */`
					import { initViewsBuilder } from "@gramio/views";
					import type { TFunction } from "../locales/index.ts";

					interface Data {
						t: TFunction;
					}
					
					export const defineView = initViewsBuilder<Data>();
					`,
				);
			}

			await fs.writeFile(
				`${projectDir}/src/shared/callback-data/index.ts`,
				`// import { CallbackData } from "gramio"`,
			);

			if (orm !== "None" && !type.includes("monorepo")) {
				await fs.mkdir(`${projectDir}/src/db`);
				await fs.writeFile(
					`${projectDir}/src/db/index.ts`,
					getDBIndex(preferences),
				);

				if (orm === "Drizzle") {
					await fs.writeFile(
						`${projectDir}/drizzle.config.ts`,
						getDrizzleConfig(preferences),
					);
					await fs.writeFile(
						`${projectDir}/src/db/schema.ts`,
						preferences.database === "PostgreSQL"
							? dedent /* ts */`
import { pgTable, bigint, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: bigint("id", { mode: "number" }).primaryKey(),
	
	name: text("name"),
	username: text("username"),
	startParameter: text("start_parameter"),

	languageCode: text("language_code"),

	createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
`
							: preferences.database === "MySQL"
								? `// import { mysqlTable } from "drizzle-orm/mysql-core"`
								: `// import { sqliteTable } from "drizzle-orm/sqlite-core"`,
					);
					if (preferences.database === "SQLite")
						await fs.writeFile(`${projectDir}/sqlite.db`, "");
				}
			}

			if (preferences.plugins.includes("Scenes")) {
				await fs.mkdir(`${projectDir}/src/scenes`);
				await fs.writeFile(
					`${projectDir}/src/scenes/greeting.ts`,
					getSceneTemplate(),
				);
			}

			if (preferences.plugins.includes("Autoload")) {
				await fs.mkdir(`${projectDir}/src/commands`);
				await fs.writeFile(
					`${projectDir}/src/commands/start.ts`,
					dedent /* */`
				import type { BotType } from "../bot.ts";

				export default (bot: BotType) => bot.command("start", (context) => context.send("Hi!"))`,
				);
			}

			if (preferences.i18nType === "Fluent") {
				await fs.mkdir(`${projectDir}/locales`);
				await fs.writeFile(
					`${projectDir}/locales/en.ftl`,
					"hello-user = Hello, {$userName}!",
				);
			} else if (preferences.i18nType === "I18n-in-TS") {
				await fs.mkdir(`${projectDir}/src/shared/locales`);
				await fs.writeFile(
					`${projectDir}/src/shared/locales/index.ts`,
					getI18nIndex(
						preferences.i18n.primaryLanguage,
						preferences.i18n.languages.map((x) =>
							// @ts-expect-error idk why it is not string
							typeof x === "string" ? x : x.name,
						),
					),
				);
				for (const languageRaw of preferences.i18n.languages) {
					const language =
						// @ts-expect-error idk why it is not string
						typeof languageRaw === "string" ? languageRaw : languageRaw.name;

					await fs.writeFile(
						`${projectDir}/src/shared/locales/${language}.ts`,
						getI18nForLang(
							language === preferences.i18n.primaryLanguage,
							language,
							preferences.i18n.primaryLanguage,
						),
					);
				}
			}
			if (preferences.docker) {
				await fs.writeFile(
					`${projectDir}/Dockerfile`,
					getDockerfile(preferences),
				);
				await fs.writeFile(
					`${projectDir}/docker-compose.dev.yml`,
					getDevelopmentDockerCompose(preferences),
				);
				await fs.writeFile(
					`${projectDir}/docker-compose.yml`,
					getDockerCompose(preferences),
				);
			}

			await fs.mkdir(`${projectDir}/src/services`);

			if (preferences.others.includes("Posthog")) {
				await fs.writeFile(
					`${projectDir}/src/services/posthog.ts`,
					getPosthogIndex(),
				);
			}

			if (preferences.storage === "Redis") {
				await fs.writeFile(
					`${projectDir}/src/services/redis.ts`,
					getRedisFile(),
				);
			}

			if (preferences.locks) {
				await fs.writeFile(
					`${projectDir}/src/services/locks.ts`,
					getLocksFile(preferences),
				);
			}

			if (preferences.vscode) {
				await fs.mkdir(`${projectDir}/.vscode`);
				await fs.writeFile(
					`${projectDir}/.vscode/settings.json`,
					getVSCodeSettings(preferences),
				);
				await fs.writeFile(
					`${projectDir}/.vscode/extensions.json`,
					getVSCodeExtensions(preferences),
				);
			}

			setTitle("Template generation is complete!");
		});

		const commands = getInstallCommands(preferences, monorepoRootDir);

		for await (const commandItem of commands) {
			const command =
				typeof commandItem === "string" ? commandItem : commandItem[0];

			await task(command, async () => {
				await exec(command, {
					cwd: typeof commandItem === "string" ? projectDir : commandItem[1],
				}).catch((e) => console.error(e));
			});
		}
	});
