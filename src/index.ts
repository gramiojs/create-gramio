#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { prompt } from "enquirer";
import minimist from "minimist";
import task from "tasuku";

import {
	getDBIndex,
	getDBMigrate,
	getDrizzleConfig,
	getEnvFile,
	getIndex,
	getInstallCommands,
	getPackageJson,
	getReadme,
	getTSConfig,
} from "./templates";
import {
	Preferences,
	type PreferencesType,
	createOrFindDir,
	detectPackageManager,
	exec,
} from "./utils";

const args = minimist(process.argv.slice(2));
const preferences = new Preferences();

const packageManager = detectPackageManager();

const dir = args._.at(0);
if (!dir)
	throw new Error(
		`Specify the folder like this - ${packageManager} create gramio DIR-NAME`,
	);

const projectDir = path.resolve(`${process.cwd()}/`, dir);

createOrFindDir(projectDir).then(async () => {
	preferences.dir = dir;
	preferences.packageManager = packageManager;
	if (args.deno) preferences.deno = true;

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
			"Media-cache",
			"Session",
			"I18n",
			"Autoload",
			"Prompt",
		] as PreferencesType["plugins"],
	});
	preferences.plugins = plugins;

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

	const { createSharedFolder } = await prompt<{ createSharedFolder: boolean }>({
		type: "toggle",
		name: "createSharedFolder",
		initial: "yes",
		message: "Create an shared folder (for keyboards, callback-data)?",
	});
	preferences.createSharedFolder = createSharedFolder;

	await task("Generating a template...", async ({ setTitle }) => {
		if (linter === "ESLint")
			await fs.writeFile(
				`${projectDir}/.eslintrc`,
				JSON.stringify(
					orm === "Drizzle"
						? {
								extends: [
									"standard-with-typescript",
									"plugin:drizzle/recommended",
								],
								plugins: ["drizzle"],
							}
						: { extends: ["standard-with-typescript"] },
					null,
					2,
				),
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

		if (orm !== "None") {
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
				await fs.writeFile(
					`${projectDir}/src/db/migrate.ts`,
					getDBMigrate(preferences),
				);
				if (preferences.database === "SQLite")
					await fs.writeFile(`${projectDir}/src/db/sqlite.db`, "");
			}
		}

		if (preferences.plugins.includes("Autoload")) {
			await fs.mkdir(`${projectDir}/src/commands`);
		}

		if (preferences.plugins.includes("I18n")) {
			await fs.mkdir(`${projectDir}/locales`);
			await fs.writeFile(
				`${projectDir}/locales/en.ftl`,
				"hello-user = Hello, {$userName}!",
			);
		}

		if (preferences.createSharedFolder) {
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
		}

		setTitle("Template generation is complete!");
	});

	const commands = getInstallCommands(preferences);

	for await (const command of commands) {
		await task(command, async () => {
			await exec(command, {
				cwd: projectDir,
			});
		});
	}
});
