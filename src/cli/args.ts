import minimist from "minimist";
import type { PackageManager } from "../utils.js";

export type PresetName = "minimal" | "recommended" | "full";

export interface ParsedArgs {
	_: string[];
	pm?: PackageManager;
	install?: boolean;
	deno?: boolean;
	/** Preset name — skips all prompts */
	preset?: PresetName;
	/** Shorthand for --preset recommended */
	yes?: boolean;
	// Foundation
	type?: string;
	linter?: string;
	orm?: string;
	database?: string;
	driver?: string;
	// Plugins (comma-separated list)
	plugins?: string;
	// Webhook
	webhook?: string;
	// Storage
	storage?: string;
	// Infrastructure flags (boolean)
	docker?: boolean;
	vscode?: boolean;
	git?: boolean;
	locks?: boolean;
	tests?: boolean;
	"github-actions"?: boolean;
	husky?: boolean;
	// Others (comma-separated)
	others?: string;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
	return minimist(argv, {
		boolean: [
			"install",
			"deno",
			"yes",
			"docker",
			"vscode",
			"git",
			"locks",
			"tests",
			"github-actions",
			"husky",
		],
		string: [
			"pm",
			"preset",
			"type",
			"linter",
			"orm",
			"database",
			"driver",
			"plugins",
			"webhook",
			"storage",
			"others",
		],
		default: {
			install: true,
			git: true,
		},
		alias: {
			y: "yes",
			p: "preset",
		},
	}) as ParsedArgs;
}
