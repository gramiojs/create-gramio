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
	}: PreferencesType,
	monorepoRootDir: string,
) {
	const commands: (string | [command: string, cwd: string])[] = [];
	if (git) commands.push("git init");

	commands.push([`${packageManager} install`, monorepoRootDir]);
	if (others.includes("Husky") && linter !== "None")
		commands.push(`echo "${packageManager} run lint:fix" > .husky/pre-commit`);

	if (orm === "Prisma" && !type.includes("monorepo"))
		commands.push(
			`${
				pmExecuteMap[packageManager]
			} prisma init --datasource-provider ${database.toLowerCase()}`,
		);
	if (plugins.includes("I18n"))
		commands.push(`${pmExecuteMap[packageManager]} fluent2ts`);

	if (linter === "Biome")
		commands.push(`${pmExecuteMap[packageManager]} @biomejs/biome init`);
	if (linter !== "None") commands.push(`${packageManager} run lint:fix`);

	return commands;
}
