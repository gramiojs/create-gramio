import type { PreferencesType } from "../utils";

export function getInstallCommands({
	database,
	orm,
	packageManager,
	linter,
	git,
	others,
}: PreferencesType) {
	const commands: string[] = [];
	if (git) commands.push("git init");

	commands.push(`${packageManager} install`);
	if (others.includes("Husky") && linter !== "None")
		commands.push(`echo "bun lint:fix" > .husky/pre-commit`);

	if (orm === "Prisma")
		commands.push(
			`bunx prisma init --datasource-provider ${database.toLowerCase()}`,
		);
	if (linter === "Biome") commands.push("bunx @biomejs/biome init");
	if (linter !== "None") commands.push("bun lint:fix");

	return commands;
}
