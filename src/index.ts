#!/usr/bin/env node
import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { prompt } from "enquirer";
import minimist from "minimist";
import task from "tasuku";

import {
	generateEslintConfig,
	getDBIndex,
	getDatabasePackageJSON,
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
	Preferences,
	type PreferencesType,
	createOrFindDir,
	detectPackageManager,
	exec,
	pmExecuteMap,
	runExternalCLI,
} from "./utils.js";
import { getI18nForLang, getI18nIndex } from "templates/i18n.js";
import dedent from "ts-dedent";
import { getSceneTemplate } from "templates/scenes.js";

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

createOrFindDir(projectDir).then(async () => {
	preferences.dir = dir;
	preferences.packageManager = packageManager;
	if (args.deno) preferences.deno = true;

	const { type } = await prompt<{ type: PreferencesType["type"] }>({
		type: "select",
		name: "type",
		message: "Select type of project:",
		choices: [
			"Bot",
			"Mini App + Bot + Elysia (backend framework) monorepo",
			"Mini App + Bot monorepo",
			"Plugin",
		],
	});
	preferences.type = type;

	if (type.includes("monorepo")) {
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
			["create-elysiajs@latest", "server", "--monorepo"],
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
			PostgreSQL: ["Postgres.JS", "node-postgres"],
			MySQL: ["MySQL 2"],
			SQLite: ["Bun SQLite or better-sqlite3"],
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
			"Auto-retry",
			"Media-group",
			"Media-cache",
			"Session",
			"I18n",
			"Autoload",
			"Prompt",
		] as PreferencesType["plugins"],
	});
	preferences.plugins = plugins;

	if(plugins.includes("I18n")) {
		const { type } = await prompt<{
			type: PreferencesType["i18nType"];
		}>({
			type: "select",
			name: "type",
			message: `Select type of i18n localization usage:`,
			choices: ["I18n-in-TS", "Fluent"],
		});

		preferences.i18nType = type
	}

	const { others } = await prompt<{ others: PreferencesType["others"] }>({
		type: "multiselect",
		name: "others",
		message: "Select others tools: (Space to select, Enter to continue)",
		choices: ["Husky"],
	});
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

	// const { createSharedFolder } = await prompt<{ createSharedFolder: boolean }>({
	// 	type: "toggle",
	// 	name: "createSharedFolder",
	// 	initial: "yes",
	// 	message: "Create an shared folder (for keyboards, callback-data)?",
	// });
	// preferences.createSharedFolder = createSharedFolder;

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
				getDBIndex(preferences),
			);
			await fs.writeFile(
				`${databasePackageDir}/.env`,
				getEnvFile(preferences, ["DATABASE_URL"]),
			);
			await fs.appendFile(
				`${monorepoRootDir}/apps/server/.env`,
				`\n${getEnvFile(preferences, ["DATABASE_URL"])}`,
			);
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
		await fs.writeFile(`${projectDir}/README.md`, getReadme(preferences));
		await fs.writeFile(
			`${projectDir}/.gitignore`,
			["dist", "node_modules", ".env"].join("\n"),
		);

		await fs.mkdir(`${projectDir}/src`);
		await fs.writeFile(`${projectDir}/src/index.ts`, getIndex(preferences));

		await fs.mkdir(`${projectDir}/src/shared`);
		await fs.mkdir(`${projectDir}/src/shared/keyboards`);
		await fs.writeFile(
			`${projectDir}/src/shared/keyboards/index.ts`,
			`// import { Keyboard, InlineKeyboard } from "gramio"`,
		);
		await fs.mkdir(`${projectDir}/src/shared/callback-data`);
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
						? `// import { pgTable } from "drizzle-orm/pg-core"`
						: preferences.database === "MySQL"
							? `// import { mysqlTable } from "drizzle-orm/mysql-core"`
							: `// import { sqliteTable } from "drizzle-orm/sqlite-core"`,
				);
				if (preferences.database === "SQLite")
					await fs.writeFile(`${projectDir}/sqlite.db`, "");
			}
		}

		if(preferences.plugins.includes("Scenes")) {
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
				dedent/* */`
				import type { BotType } from "../index";

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
				getI18nIndex(),
			);
			await fs.writeFile(
				`${projectDir}/src/shared/locales/en.ts`,
				getI18nForLang(true),
			);
			await fs.writeFile(
				`${projectDir}/src/shared/locales/ru.ts`,
				getI18nForLang(),
			);
		}

		// if (preferences.createSharedFolder) {
			
		// }

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
