import type { PackageManager } from "../utils";

export function getInstallCommands(pm: PackageManager) {
	const commands: string[] = [];

	commands.push(`${pm} install`);

	return commands;
}
