import type { PackageManager, PreferencesType } from "../utils";

export function getInstallCommands({
	database,
	orm,
	packageManager,
	linter,
}: PreferencesType) {
	const commands: string[] = [];

	commands.push(`${packageManager} install`);

	if (orm === "Prisma")
		commands.push(
			`bunx prisma init --datasource-provider ${database.toLowerCase()}`,
		);
	if (linter === "Biome") commands.push("bunx @biomejs/biome init");
	if (linter !== "None") commands.push("bun lint:fix");

	return commands;
}
