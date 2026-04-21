import fs from "node:fs/promises";
import path from "node:path";
import dedent from "ts-dedent";

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
import { getElysiaAuthPlugin, getWebhookIndex } from "templates/webhook.js";
import { getHandlerStart } from "templates/handlers.js";
import { getTestFile, getTestSetup } from "templates/test.js";
import { getCIWorkflow } from "templates/ci.js";
import {
	generateEslintConfig,
	getBot,
	getClaudeMd,
	getPluginsBase,
	getPluginsIndex,
	getConfigFile,
	getDatabaseConfigFile,
	getDatabasePackageJSON,
	getDBIndex,
	getDrizzleConfig,
	getEnvFile,
	getIndex,
	getMonorepoPackageJSON,
	getMonorepoReadme,
	getPackageJson,
	getReadme,
	getTSConfig,
} from "templates/index.js";
import { createOrFindDir } from "../utils.js";
import type { PreferencesType } from "../utils.js";

export async function generateProject(
	preferences: PreferencesType,
	projectDir: string,
	monorepoRootDir: string,
): Promise<void> {
	const { type, linter, orm, plugins } = preferences;

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
	await fs.writeFile(`${projectDir}/package.json`, getPackageJson(preferences));
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
	await fs.writeFile(`${projectDir}/CLAUDE.md`, getClaudeMd(preferences));
	await fs.writeFile(
		`${projectDir}/.gitignore`,
		["dist", "node_modules", ".env", ".env.production"].join("\n"),
	);

	await fs.mkdir(`${projectDir}/src`);
	await fs.writeFile(`${projectDir}/src/index.ts`, getIndex(preferences));
	await fs.writeFile(`${projectDir}/src/bot.ts`, getBot(preferences));
	// src/plugins/ — shared composer that all child composers extend for typing.
	// Lives in its own directory so handlers/commands can import without
	// creating a circular dependency with bot.ts.
	await fs.mkdir(`${projectDir}/src/plugins`);
	// When Scenes is enabled we split the composer across two files:
	//   plugins/base.ts  — named+scoped `baseComposer` (no scene imports),
	//                      extended by both the bot and every Scene.
	//   plugins/index.ts — thin assembly: baseComposer + scenes([...]).
	// Without the split, `scenes/*.ts` importing from `plugins/index.ts`
	// would circle back through the `scenes([...])` registration and TS
	// silently collapses the shared composer type to `any`.
	if (plugins.includes("Scenes")) {
		await fs.writeFile(
			`${projectDir}/src/plugins/base.ts`,
			getPluginsBase(preferences),
		);
	}
	await fs.writeFile(
		`${projectDir}/src/plugins/index.ts`,
		getPluginsIndex(preferences),
	);
	await fs.writeFile(
		`${projectDir}/src/config.ts`,
		getConfigFile(preferences),
	);

	if (preferences.webhookAdapter !== "None") {
		await fs.mkdir(`${projectDir}/src/server`);
		await fs.writeFile(
			`${projectDir}/src/server/index.ts`,
			getWebhookIndex(preferences),
		);
		await fs.mkdir(`${projectDir}/src/server/routes`);
		if (preferences.webhookAdapter === "Elysia" && preferences.authPlugin) {
			await fs.mkdir(`${projectDir}/src/server/plugins`);
			await fs.writeFile(
				`${projectDir}/src/server/plugins/auth.ts`,
				getElysiaAuthPlugin(),
			);
		}
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
		const hasI18nTs =
			plugins.includes("I18n") && preferences.i18nType === "I18n-in-TS";
		await fs.writeFile(
			`${projectDir}/src/shared/views/builder.ts`,
			dedent /* ts */`
			import { initViewsBuilder } from "@gramio/views";
			${hasI18nTs ? `import type { TFunction } from "../locales/index.ts";` : ""}

			interface Data {
				${hasI18nTs ? "t: TFunction;" : "// add your shared view data here"}
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

	if (plugins.includes("Scenes")) {
		await fs.mkdir(`${projectDir}/src/scenes`);
		await fs.writeFile(
			`${projectDir}/src/scenes/greeting.ts`,
			getSceneTemplate(),
		);
	}

	if (plugins.includes("Autoload")) {
		await fs.mkdir(`${projectDir}/src/commands`);
		await fs.writeFile(
			`${projectDir}/src/commands/start.ts`,
			dedent /* */`
		import type { BotType } from "../plugins/index.ts";

		export default (bot: BotType) => bot.command("start", (context) => context.send("Hi!"))`,
		);
	} else {
		// Non-Autoload: generate handlers directory with example structure
		await fs.mkdir(`${projectDir}/src/handlers`);
		await fs.writeFile(
			`${projectDir}/src/handlers/start.ts`,
			getHandlerStart(),
		);
	}

	// Ensure i18n has default languages when set via preset
	if (preferences.i18nType === "I18n-in-TS" && preferences.i18n.languages.length === 0) {
		preferences.i18n.languages = ["en"];
		preferences.i18n.primaryLanguage = "en";
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

	if (preferences.storage === "Redis" || plugins.includes("Broadcast")) {
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

	if (preferences.tests) {
		await fs.mkdir(`${projectDir}/tests`);
		await fs.writeFile(
			`${projectDir}/tests/setup.ts`,
			getTestSetup(preferences),
		);
		await fs.writeFile(
			`${projectDir}/tests/bot.test.ts`,
			getTestFile(preferences),
		);
	}

	if (preferences.githubActions) {
		await fs.mkdir(`${projectDir}/.github`);
		await fs.mkdir(`${projectDir}/.github/workflows`);
		await fs.writeFile(
			`${projectDir}/.github/workflows/ci.yml`,
			getCIWorkflow(preferences),
		);
	}
}
