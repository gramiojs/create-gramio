import { dependencies } from "../deps";
import type { PreferencesType } from "../utils";

export function getPackageJson({
	packageManager,
	linter,
	orm,
	driver,
}: PreferencesType) {
	const sample = {
		scripts: {
			dev: "npx src/index.ts --watch",
		} as Record<string, string>,
		dependencies: {
			gramio: dependencies.gramio,
		} as Record<string, string>,
		devDependencies: {
			typescript: dependencies.typescript,
		} as Record<string, string>,
	};

	if (packageManager === "bun")
		sample.devDependencies["@types/bun"] = dependencies["@types/bun"];
	else sample.devDependencies["@types/node"] = dependencies["@types/node"];

	if (linter === "Biome") {
		sample.scripts.lint = "bunx @biomejs/biome check src";
		sample.scripts["lint:fix"] = "bun lint --apply";
		sample.devDependencies["@biomejs/biome"] = dependencies["@biomejs/biome"];
	}
	if (linter === "ESLint") {
		sample.scripts.lint = `bunx eslint \"src/**/*.ts\"`;
		sample.scripts["lint:fix"] = `bunx eslint \"src/**/*.ts\" --fix`;
		sample.devDependencies.eslint = dependencies.eslint;
		sample.devDependencies["eslint-config-standard-with-typescript"] =
			dependencies["eslint-config-standard-with-typescript"];
		sample.devDependencies["eslint-plugin-promise"] =
			dependencies["eslint-plugin-promise"];
		sample.devDependencies["eslint-plugin-import"] =
			dependencies["eslint-plugin-import"];
		sample.devDependencies["eslint-plugin-n"] = dependencies["eslint-plugin-n"];
		sample.devDependencies["@typescript-eslint/eslint-plugin"] =
			dependencies["@typescript-eslint/eslint-plugin"];
		if (orm === "Drizzle")
			sample.devDependencies["eslint-plugin-drizzle"] =
				dependencies["eslint-plugin-drizzle"];
	}

	if (orm === "Prisma") sample.devDependencies.prisma = dependencies.prisma;
	if (orm === "Drizzle") {
		sample.dependencies["drizzle-orm"] = dependencies["drizzle-orm"];
		sample.devDependencies["drizzle-kit"] = dependencies["drizzle-kit"];
		if (driver === "node-postgres") {
			sample.dependencies.pg = dependencies.pg;
			sample.devDependencies["@types/pg"] = dependencies["@types/pg"];
			sample.scripts.generate = "bunx drizzle-kit generate:pg";
		}
		if (driver === "Postgres.JS") {
			sample.dependencies.postgres = dependencies.postgres;
			sample.scripts["migration:generate"] = "bunx drizzle-kit generate:pg";
		}
		if (driver === "MySQL 2") {
			sample.dependencies.mysql2 = dependencies.mysql2;
			sample.scripts["migration:generate"] = "bunx drizzle-kit generate:mysql";
		}
		if (driver === "Bun SQLite or better-sqlite3") {
			sample.scripts["migration:generate"] = "bunx drizzle-kit generate:sqlite";
			if (packageManager !== "bun")
				sample.dependencies["better-sqlite3"] = dependencies["better-sqlite3"];
		}

		sample.scripts["migration:push"] = "bun src/db/migrate.ts";
		sample.scripts.migrate = "bun migration:generate && bun migration:push";
	}

	return JSON.stringify(sample, null, 2);
}
