#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import minimist from "minimist";
import task from "tasuku";
import { getIndex } from "./templates/gramio";
import { getInstallCommands } from "./templates/install";
import { getPackageJson } from "./templates/package.json";
import { getTSConfig } from "./templates/tsconfig.json";
import { createOrFindDir, detectPackageManager, exec } from "./utils";

const args = minimist(process.argv.slice(2));

const packageManager = detectPackageManager();

const dir = args._.at(0);
if (!dir)
	throw new Error(
		`Specify the folder like this - ${packageManager} create gramio DIR-NAME`,
	);

const projectDir = path.resolve(`${process.cwd()}/`, dir);

createOrFindDir(projectDir).then(async () => {
	await fs.writeFile(`${projectDir}/package.json`, getPackageJson());
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
