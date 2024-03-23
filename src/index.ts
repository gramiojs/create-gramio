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
	getIndex,
	getInstallCommands,
	getPackageJson,
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

	await fs.writeFile(`${projectDir}/package.json`, getPackageJson(preferences));
	await fs.writeFile(`${projectDir}/tsconfig.json`, getTSConfig());

	await fs.mkdir(`${projectDir}/src`);
	await fs.writeFile(`${projectDir}/src/index.ts`, getIndex());

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

	const commands = getInstallCommands(preferences);

	for await (const command of commands) {
		await task(command, async () => {
			await exec(command, {
				cwd: projectDir,
			});
		});
	}
});
