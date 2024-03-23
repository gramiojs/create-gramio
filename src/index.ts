#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { prompt } from "enquirer";
import minimist from "minimist";
import task from "tasuku";

import {
	getIndex,
	getInstallCommands,
	getPackageJson,
	getTSConfig,
} from "./templates";
import {
	Preferences,
	type PreferencesType,
	createOrFindDir,
	detectPackageManager,
	exec,
} from "./utils";

const args = minimist(process.argv.slice(2));
const preferences = new Preferences();

const packageManager = detectPackageManager();

const dir = args._.at(0);
if (!dir)
	throw new Error(
		`Specify the folder like this - ${packageManager} create gramio DIR-NAME`,
	);

const projectDir = path.resolve(`${process.cwd()}/`, dir);

createOrFindDir(projectDir).then(async () => {
	preferences.dir = dir;
	preferences.packageManager = packageManager;

	const { linter } = await prompt<{ linter: PreferencesType["linter"] }>({
		type: "select",
		name: "linter",
		message: "Select linters/formatters:",
		choices: ["None", "ESLint", "Biome"],
	});
	preferences.linter = linter;

	await fs.writeFile(`${projectDir}/package.json`, getPackageJson(preferences));
	await fs.writeFile(`${projectDir}/tsconfig.json`, getTSConfig());

	await fs.mkdir(`${projectDir}/src`);
	await fs.writeFile(`${projectDir}/src/index.ts`, getIndex());

	const commands = getInstallCommands(packageManager);

	for await (const command of commands) {
		await task(command, async () => {
			await exec(command, {
				cwd: projectDir,
			});
		});
	}
});
