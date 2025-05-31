import child_process from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { promisify } from "node:util";

const nodeMajorVersion = process?.versions?.node?.split(".")[0];

if (nodeMajorVersion && Number(nodeMajorVersion) < 22)
	console.warn(
		`Node.js version ${process?.versions?.node} is not recommended for this template. Please upgrade to Node.js 22 or higher.`,
	);

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export function detectPackageManager() {
	const userAgent = process.env.npm_config_user_agent;

	if (!userAgent)
		throw new Error(
			`Package manager was not detected. Please specify template with "--pm". For example, "bun create gramio ./dir --pm bun"`,
		);

	return userAgent.split(" ")[0].split("/")[0] as PackageManager;
}

export async function createOrFindDir(path: string) {
	await fs.stat(path).catch(async () => fs.mkdir(path, { recursive: true }));
}

export const exec = promisify(child_process.exec);

export function runExternalCLI(
	command: string,
	args: string[],
	directory: string,
) {
	return new Promise<void>((resolve, reject) => {
		const child = child_process.spawn(command, args, {
			cwd: directory,
			shell: true,
			stdio: "inherit",
		});
		child.on("exit", () => {
			child.unref();
			resolve();
		});
	});
}

type Runtime = "Node.js" | "Deno" | "Bun";

export class Preferences {
	projectName = "";
	type:
		| "Bot"
		| "Mini App + Bot + Elysia (backend framework) monorepo"
		| "Mini App + Bot monorepo"
		| "Plugin" = "Bot";
	dir = "";
	packageManager: PackageManager = "bun";
	runtime: Runtime = "Node.js";
	linter: "ESLint" | "Biome" | "None" = "None";
	orm: "Prisma" | "Drizzle" | "None" = "None";
	database:
		| "PostgreSQL"
		| "MySQL"
		| "MongoDB"
		| "SQLite"
		| "SQLServer"
		| "CockroachDB" = "PostgreSQL";
	driver:
		| "node-postgres"
		| "Postgres.JS"
		| "Bun.sql"
		| "MySQL 2"
		| "bun:sqlite"
		| "better-sqlite3"
		| "None" = "None";
	git = true;
	others: ("Husky" | "Jobify" | "Posthog")[] = [];
	plugins: (
		| "Scenes"
		| "Auto-retry"
		| "Media-group"
		| "Media-cache"
		| "Auto answer callback query"
		| "Session"
		| "I18n"
		| "Autoload"
		| "Prompt"
		| "Split"
		| "Pagination"
		| "Posthog"
	)[] = [];
	storage: "Redis" | "In-memory" = "In-memory";
	i18n = {
		languages: [] as string[],
		primaryLanguage: "en" as string,
	};
	i18nType: "I18n-in-TS" | "Fluent" | undefined;
	createSharedFolder = true;
	deno = false;

	docker = false;

	webhookAdapter: "None" | "Elysia" | "Fastify" | "node:http" | "Bun.serve" =
		"None";

	vscode = false;
	locks = false;
	meta: {
		databasePassword: string;
	} = {
		databasePassword: randomBytes(12).toString("hex"),
	};

	noInstall = false;
}

export type PreferencesType = InstanceType<typeof Preferences>;

export const pmExecuteMap: Record<PackageManager, string> = {
	npm: "npx",
	bun: "bun x",
	yarn: "yarn dlx",
	pnpm: "pnpm dlx",
};

export const pmRunMap: Record<PackageManager, string> = {
	npm: "npm run",
	bun: "bun",
	yarn: "yarn",
	pnpm: "pnpm",
};

export const pmFilterMonorepoMap: Record<PackageManager, string | false> = {
	npm: false,
	yarn: false,
	bun: "bun --filter 'apps/*'",
	pnpm: "pnpm --filter 'apps/*'",
};

export const pmLockFilesMap: Record<PackageManager, string> = {
	npm: "package-lock.json",
	bun: "bun.lock",
	yarn: "yarn.lock",
	pnpm: "pnpm-lock.yaml",
};

export const pmInstallFrozenLockfile: Record<PackageManager, string> = {
	npm: "npm ci",
	bun: "bun install --frozen-lockfile",
	yarn: "yarn install --frozen-lockfile",
	pnpm: "pnpm install --frozen-lockfile",
};

export const pmInstallFrozenLockfileProduction: Record<PackageManager, string> =
	{
		npm: "npm ci --production",
		bun: "bun install --frozen-lockfile --production",
		yarn: "yarn install --frozen-lockfile --production",
		pnpm: "pnpm install --frozen-lockfile --prod",
	};
