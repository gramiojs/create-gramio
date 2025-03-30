import path from "node:path";
import { type PreferencesType, pmExecuteMap } from "../utils.js";

export function getInstallCommands(
	{
		database,
		orm,
		packageManager,
		linter,
		git,
		others,
		plugins,
		type,
		i18nType,
		noInstall,
	}: PreferencesType,
	monorepoRootDir: string,
) {
	const databasePackageDir = path.resolve(monorepoRootDir, "packages", "db");
	const commands: (string | [command: string, cwd: string])[] = [];
	if (git && !type.includes("monorepo")) commands.push("git init");
	if (git && type.includes("monorepo"))
		commands.push(["git init", monorepoRootDir]);

	if (!noInstall) commands.push([`${packageManager} install`, monorepoRootDir]);

	if (others.includes("Husky") && linter !== "None")
		commands.push(`echo "${packageManager} run lint:fix" > .husky/pre-commit`);

	if (orm === "Prisma" && !type.includes("monorepo"))
		commands.push(
			`${
				pmExecuteMap[packageManager]
			} prisma init --datasource-provider ${database.toLowerCase()}`,
		);
	if (orm === "Prisma" && type.includes("monorepo"))
		commands.push([
			`${
				pmExecuteMap[packageManager]
			} prisma init --datasource-provider ${database.toLowerCase()}`,
			databasePackageDir,
		]);

	if (i18nType === "Fluent")
		commands.push(`${pmExecuteMap[packageManager]} fluent2ts`);

	if (linter === "Biome")
		commands.push(`${pmExecuteMap[packageManager]} @biomejs/biome init`);
	if (linter !== "None") commands.push(`${packageManager} run lint:fix`);

	if (type.includes("monorepo"))
		commands.push([
			`${pmExecuteMap[packageManager]} @biomejs/biome check --fix --skip-errors`,
			monorepoRootDir,
		]);

	return commands;
}
