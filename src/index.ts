#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import pkg from "enquirer";

const { prompt } = pkg;

import task from "tasuku";

import { parseArgs } from "./cli/args.js";
import { applyPreset, type PresetName } from "./cli/presets.js";
import {
	promptI18n,
	promptInfrastructure,
	promptLinter,
	promptOrm,
	promptPlugins,
	promptProjectType,
	promptStorage,
	promptWebhook,
} from "./cli/prompts.js";
import { generateProject } from "./core/generator.js";
import {
	createOrFindDir,
	detectPackageManager,
	exec,
	Preferences,
	pmExecuteMap,
	runExternalCLI,
} from "./utils.js";
import { getInstallCommands } from "./templates/index.js";

const args = parseArgs();

const preferences = new Preferences();

const packageManager = args.pm ?? detectPackageManager();

const dir = args._.at(0);
if (!dir)
	throw new Error(
		`Specify the folder like this - ${packageManager} create gramio DIR-NAME`,
	);

let projectDir = path.resolve(`${process.cwd()}/`, dir);
const monorepoRootDir = path.resolve(`${process.cwd()}/`, dir);
const appsDir = path.resolve(projectDir, "apps");

process.on("unhandledRejection", async (error) => {
	const filesInTargetDirectory = await fs.readdir(projectDir);
	if (filesInTargetDirectory.length) {
		const { overwrite } = await prompt<{ overwrite: boolean }>({
			type: "toggle",
			name: "overwrite",
			initial: "yes",
			message: `You exit the process. Do you want to delete the directory ${path.basename(projectDir)}?`,
		});
		if (!overwrite) {
			console.log("Cancelled...");
			return process.exit(0);
		}
	}
	console.log("Template deleted...");
	console.error(error);
	await fs.rm(projectDir, { recursive: true });
	process.exit(0);
});

createOrFindDir(projectDir)
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.then(async () => {
		preferences.dir = dir;
		preferences.projectName = path.basename(projectDir);
		preferences.packageManager = packageManager;
		// TODO: prompt it
		preferences.runtime = packageManager === "bun" ? "Bun" : "Node.js";
		if (args.deno) preferences.deno = true;

		// biome-ignore lint/complexity/noExtraBooleanCast: <explanation>
		preferences.noInstall = !Boolean(args.install ?? true);

		const filesInTargetDirectory = await fs.readdir(projectDir);
		if (filesInTargetDirectory.length) {
			const { deleteFiles } = await prompt<{ deleteFiles: boolean }>({
				type: "toggle",
				name: "deleteFiles",
				initial: "yes",
				message: `\n${filesInTargetDirectory.join(
					"\n",
				)}\n\nThe directory ${preferences.projectName} is not empty. Do you want to delete the files?`,
			});
			if (!deleteFiles) {
				console.log("Cancelled...");
				return process.exit(0);
			}

			await fs.rm(projectDir, { recursive: true });
		}

		// Phase 0: Quick Start
		let useCustom = false;

		if (args.yes) {
			applyPreset(preferences, "recommended");
		} else if (args.preset) {
			applyPreset(preferences, args.preset as PresetName);
		} else {
			const { startChoice } = await prompt<{ startChoice: string }>({
				type: "select",
				name: "startChoice",
				message: "How do you want to start?",
				choices: [
					"Custom — choose everything yourself",
					"Minimal — just a bot, no extras",
					"Recommended — production-ready setup (Biome, Drizzle+PG, Autoload, Tests)",
					"Full — all features enabled",
				],
			});

			if (startChoice.startsWith("Minimal")) {
				applyPreset(preferences, "minimal");
			} else if (startChoice.startsWith("Recommended")) {
				applyPreset(preferences, "recommended");
			} else if (startChoice.startsWith("Full")) {
				applyPreset(preferences, "full");
			} else {
				useCustom = true;
			}
		}

		if (useCustom) {
			// Phase 1: Foundation
			await promptProjectType(args, preferences);

			if (preferences.type.includes("monorepo")) {
				console.warn(
					"Be worried about monorepo selection, it can be buggy or not so convenient because support both monorepo and just bot project is not so easy.\nAlso we don't have our own mini-app templates so it will force pnpm as package manager and etc",
				);
				projectDir = path.resolve(appsDir, "bot");
				await createOrFindDir(projectDir);
			}

			if (preferences.type.includes("Mini App")) {
				console.log("\nChoose your Telegram Mini App!\n");

				await runExternalCLI(
					`${pmExecuteMap[preferences.packageManager]}`,
					["@telegram-apps/create-mini-app@latest", "."],
					appsDir,
				);
			}
			if (preferences.type.includes("Elysia")) {
				console.log("\nChoose your Elysia!\n");

				await runExternalCLI(
					`${pmExecuteMap[preferences.packageManager]}`,
					["create-elysiajs@latest", "server", "--monorepo", "--no-install"],
					appsDir,
				);
			}

			console.log("\nChoose your Telegram bot!\n");

			// Phase 2: Data & Plugins
			await promptLinter(args, preferences);
			await promptOrm(args, preferences);
			await promptPlugins(args, preferences);
			await promptI18n(args, preferences);
			await promptStorage(args, preferences);

			// Phase 3: Infrastructure
			await promptWebhook(args, preferences);
			await promptInfrastructure(args, preferences);
		}

		await task("Generating a template...", async ({ setTitle }) => {
			await generateProject(preferences, projectDir, monorepoRootDir);
			setTitle("Template generation is complete!");
		});

		const commands = getInstallCommands(preferences, monorepoRootDir);

		for await (const commandItem of commands) {
			const command =
				typeof commandItem === "string" ? commandItem : commandItem[0];

			await task(command, async () => {
				await exec(command, {
					cwd: typeof commandItem === "string" ? projectDir : commandItem[1],
				}).catch((e) => console.error(e));
			});
		}
	});
