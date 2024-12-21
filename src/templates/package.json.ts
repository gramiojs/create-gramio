import { dependencies } from "../deps.js";
import {
	type PreferencesType,
	pmExecuteMap,
	pmFilterMonorepoMap,
	pmRunMap,
} from "../utils.js";

export function getPackageJson({
	packageManager,
	linter,
	orm,
	driver,
	others,
	plugins,
	type,
	i18nType,
	storage,
}: PreferencesType) {
	const sample = {
		private: true,
		type: "module",
		scripts: {
			dev:
				packageManager === "bun"
					? "bun --watch src/index.ts"
					: `${pmExecuteMap[packageManager]} tsx watch src/index.ts`,
		} as Record<string, string>,
		dependencies: {
			gramio: dependencies.gramio,
			"env-var": dependencies["env-var"],
		} as Record<keyof typeof dependencies | "@monorepo/db", string>,
		devDependencies: {
			typescript: dependencies.typescript,
		} as Record<keyof typeof dependencies, string>,
	};
	// @ts-expect-error
	if (type.includes("monorepo")) sample.name = "@monorepo/bot";

	if (packageManager === "bun")
		sample.devDependencies["@types/bun"] = dependencies["@types/bun"];
	else sample.devDependencies["@types/node"] = dependencies["@types/node"];

	if (linter === "Biome") {
		sample.scripts.lint = `${pmExecuteMap[packageManager]} @biomejs/biome check src`;
		sample.scripts["lint:fix"] = `${packageManager} run lint --fix`;
		sample.devDependencies["@biomejs/biome"] = dependencies["@biomejs/biome"];
	}
	if (linter === "ESLint") {
		sample.scripts.lint = `${pmExecuteMap[packageManager]} eslint \"src/**/*.ts\"`;
		sample.scripts["lint:fix"] = `${pmRunMap[packageManager]} lint -- --fix`;
		sample.devDependencies.eslint = dependencies.eslint;
		sample.devDependencies["@antfu/eslint-config"] =
			dependencies["@antfu/eslint-config"];
		if (orm === "Drizzle")
			sample.devDependencies["eslint-plugin-drizzle"] =
				dependencies["eslint-plugin-drizzle"];
	}

	if (!type.includes("monorepo")) {
		if (orm === "Prisma") sample.devDependencies.prisma = dependencies.prisma;
		if (orm === "Drizzle") {
			sample.dependencies["drizzle-orm"] = dependencies["drizzle-orm"];
			sample.devDependencies["drizzle-kit"] = dependencies["drizzle-kit"];
			if (driver === "node-postgres") {
				sample.dependencies.pg = dependencies.pg;
				sample.devDependencies["@types/pg"] = dependencies["@types/pg"];
			}
			if (driver === "Postgres.JS") {
				sample.dependencies.postgres = dependencies.postgres;
			}
			if (driver === "MySQL 2") {
				sample.dependencies.mysql2 = dependencies.mysql2;
			}
			if (driver === "Bun SQLite or better-sqlite3") {
				if (packageManager !== "bun")
					sample.dependencies["better-sqlite3"] =
						dependencies["better-sqlite3"];
			}
			sample.scripts.generate = `${pmExecuteMap[packageManager]} drizzle-kit generate`;
			sample.scripts.push = `${pmExecuteMap[packageManager]} drizzle-kit push`;
			sample.scripts.migrate = `${pmExecuteMap[packageManager]} drizzle-kit migrate`;
			sample.scripts.studio = `${pmExecuteMap[packageManager]} drizzle-kit studio`;
		}
	} else sample.dependencies["@monorepo/db"] = "workspace:";

	if (others.includes("Husky")) {
		sample.devDependencies.husky = dependencies.husky;
		sample.scripts.prepare = "husky";
	}

	if (plugins.includes("Session"))
		sample.dependencies["@gramio/session"] = dependencies["@gramio/session"];
	if (plugins.includes("Autoload"))
		sample.dependencies["@gramio/autoload"] = dependencies["@gramio/autoload"];
	if (plugins.includes("Prompt"))
		sample.dependencies["@gramio/prompt"] = dependencies["@gramio/prompt"];
	if (plugins.includes("Auto-retry"))
		sample.dependencies["@gramio/auto-retry"] =
			dependencies["@gramio/auto-retry"];
	if (plugins.includes("Media-cache"))
		sample.dependencies["@gramio/media-cache"] =
			dependencies["@gramio/media-cache"];
	if (plugins.includes("I18n")) {
		sample.dependencies["@gramio/i18n"] = dependencies["@gramio/i18n"];
		if (i18nType === "Fluent")
			sample.scripts.fluent = `${pmExecuteMap[packageManager]} fluent2ts@latest`;
	}
	if (plugins.includes("Media-group"))
		sample.dependencies["@gramio/media-group"] =
			dependencies["@gramio/media-group"];

	if (plugins.includes("Scenes"))
		sample.dependencies["@gramio/scenes"] = dependencies["@gramio/scenes"];

	if (storage === "Redis")
		sample.dependencies["@gramio/storage-redis"] =
			dependencies["@gramio/storage-redis"];

	if (others.includes("Jobify")) {
		sample.dependencies.ioredis = dependencies.ioredis;
		sample.dependencies.jobify = dependencies.jobify;
	}

	if (others.includes("Posthog")) {
		sample.dependencies["posthog-node"] = dependencies["posthog-node"];
	}

	return JSON.stringify(sample, null, 2);
}

export function getMonorepoPackageJSON() {
	const sample = {
		private: true,
		workspaces: ["packages/*", "apps/*"],
	};

	return JSON.stringify(sample, null, 2);
}

export function getDatabasePackageJSON({
	orm,
	driver,
	packageManager,
}: PreferencesType) {
	const devScript = pmFilterMonorepoMap[packageManager];
	const sample = {
		name: "@monorepo/db",
		version: "1.0.0",
		private: true,
		scripts: (devScript === false
			? {}
			: {
					dev: `${devScript} dev`,
				}) as Record<string, string>,
		dependencies: {} as Record<keyof typeof dependencies, string>,
		devDependencies: {
			typescript: dependencies.typescript,
		} as Record<keyof typeof dependencies, string>,
		exports: {
			".": "./src/index.ts",
		},
	};
	if (orm === "Prisma") sample.devDependencies.prisma = dependencies.prisma;
	if (orm === "Drizzle") {
		sample.dependencies["drizzle-orm"] = dependencies["drizzle-orm"];
		sample.devDependencies["drizzle-kit"] = dependencies["drizzle-kit"];
		if (driver === "node-postgres") {
			sample.dependencies.pg = dependencies.pg;
			sample.devDependencies["@types/pg"] = dependencies["@types/pg"];
		}
		if (driver === "Postgres.JS") {
			sample.dependencies.postgres = dependencies.postgres;
		}
		if (driver === "MySQL 2") {
			sample.dependencies.mysql2 = dependencies.mysql2;
		}
		if (driver === "Bun SQLite or better-sqlite3") {
			if (packageManager !== "bun")
				sample.dependencies["better-sqlite3"] = dependencies["better-sqlite3"];
		}
		sample.scripts.generate = `${pmExecuteMap[packageManager]} drizzle-kit generate`;
		sample.scripts.push = `${pmExecuteMap[packageManager]} drizzle-kit push`;
		sample.scripts.migrate = `${pmExecuteMap[packageManager]} drizzle-kit migrate`;
		sample.scripts.studio = `${pmExecuteMap[packageManager]} drizzle-kit studio`;
	}

	return JSON.stringify(sample, null, 2);
}
