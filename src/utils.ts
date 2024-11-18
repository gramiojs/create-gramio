import child_process from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

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

export class Preferences {
	type:
		| "Bot"
		| "Mini App + Bot + Elysia (backend framework) monorepo"
		| "Mini App + Bot monorepo"
		| "Plugin" = "Bot";
	dir = "";
	packageManager: PackageManager = "bun";
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
		| "MySQL 2"
		| "Bun SQLite or better-sqlite3"
		| "None" = "None";
	git = true;
	others: ("Husky" | "Jobify")[] = [];
	plugins: (
		| "Scenes"
		| "Auto-retry"
		| "Media-group"
		| "Media-cache"
		| "Session"
		| "I18n"
		| "Autoload"
		| "Prompt"
	)[] = [];
	storage: "Redis" | "In-memory" = "In-memory";
	i18nType: "I18n-in-TS" | "Fluent" | undefined;
	createSharedFolder = true;
	deno = false;

	docker = false;
}

export type PreferencesType = InstanceType<typeof Preferences>;

export const pmExecuteMap: Record<PackageManager, string> = {
	npm: "npx",
	bun: "bun x",
	yarn: "yarn dlx",
	pnpm: "pnpm dlx",
};

export const pmFilterMonorepoMap: Record<PackageManager, string | false> = {
	npm: false,
	yarn: false,
	bun: "bun --filter 'apps/*'",
	pnpm: "pnpm --filter 'apps/*'",
};

export const pmLockFilesMap: Record<PackageManager, string> = {
	npm: "package.lock.json",
	bun: "bun.lockb",
	yarn: "yarn.lock",
	pnpm: "pnpm-lock.yaml",
};

export const pmInstallFrozenLockfile: Record<PackageManager, string> = {
	npm: "npm ci",
	bun: "bun install --frozen-lockfile",
	yarn: "yarn install --frozen-lockfile",
	pnpm: "pnpm install --frozen-lockfile",
};

export const pmInstallFrozenLockfileProduction: Record<PackageManager, string> = {
	npm: "npm ci --production",
	bun: "bun install --frozen-lockfile --production",
	yarn: "yarn install --frozen-lockfile --production",
	pnpm: "pnpm install --frozen-lockfile --prod",
};