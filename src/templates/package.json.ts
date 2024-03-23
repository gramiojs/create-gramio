import { dependencies } from "deps";
import type { PreferencesType } from "utils";

export function getPackageJson({ packageManager, linter }: PreferencesType) {
	const sample = {
		scripts: {
			dev: "npx src/index.ts --watch",
		} as Record<string, string>,
		dependencies: {
			gramio: dependencies.gramio,
		} as Record<string, string>,
		devDependencies: {
			typescript: dependencies.typescript,
		} as Record<string, string>,
	};

	if (packageManager === "bun")
		sample.devDependencies["@types/bun"] = dependencies["@types/bun"];
	else sample.devDependencies["@types/node"] = dependencies["@types/node"];

	if (linter === "Biome") {
		sample.scripts.lint = "bunx @biomejs/biome check src";
		sample.scripts["lint:fix"] = "bun lint --apply";
		sample.devDependencies["@biomejs/biome"] = dependencies["@biomejs/biome"];
	}
	if (linter === "ESLint") {
		sample.scripts.lint = `bunx eslint \"src/**/*.ts\"`;
		sample.scripts["lint:fix"] = `bunx eslint \"src/**/*.ts\" --fix`;
		sample.devDependencies.eslint = dependencies.eslint;
		sample.devDependencies["eslint-config-standard-with-typescript"] =
			dependencies["eslint-config-standard-with-typescript"];
		sample.devDependencies["eslint-plugin-promise"] =
			dependencies["eslint-plugin-promise"];
		sample.devDependencies["eslint-plugin-import"] =
			dependencies["eslint-plugin-import"];
		sample.devDependencies["eslint-plugin-n"] = dependencies["eslint-plugin-n"];
		sample.devDependencies["@typescript-eslint/eslint-plugin"] =
			dependencies["@typescript-eslint/eslint-plugin"];
	}

	return JSON.stringify(sample, null, 2);
}
