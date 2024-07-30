import { type PreferencesType, pmExecuteMap } from "../utils.js";

export function getInstallCommands({
	database,
	orm,
	packageManager,
	linter,
	git,
	others,
	plugins,
}: PreferencesType) {
	const commands: string[] = [];
	if (git) commands.push("git init");

	commands.push(`${packageManager} install`);
	if (others.includes("Husky") && linter !== "None")
		commands.push(`echo "${packageManager} run lint:fix" > .husky/pre-commit`);

	if (orm === "Prisma")
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
