import type { PreferencesType } from "../utils.js";

export type PresetName = "minimal" | "recommended" | "full";

type PresetConfig = Partial<
	Pick<
		PreferencesType,
		| "linter"
		| "orm"
		| "database"
		| "driver"
		| "plugins"
		| "storage"
		| "i18nType"
		| "webhookAdapter"
		| "others"
		| "docker"
		| "vscode"
		| "locks"
		| "git"
		| "tests"
		| "githubActions"
		| "aiSkills"
	> & {
		i18n: { languages: string[]; primaryLanguage: string };
	}
>;

export const presets: Record<PresetName, PresetConfig> = {
	minimal: {
		linter: "None",
		orm: "None",
		plugins: [],
		others: [],
		docker: false,
		vscode: false,
		locks: false,
		git: true,
		tests: false,
		githubActions: false,
		aiSkills: false,
	},
	recommended: {
		linter: "Biome",
		orm: "Drizzle",
		database: "PostgreSQL",
		driver: "Postgres.JS",
		plugins: ["Scenes", "Auto answer callback query", "Auto-retry", "I18n"],
		storage: "Redis",
		i18nType: "I18n-in-TS",
		i18n: { languages: ["en", "ru"], primaryLanguage: "en" },
		docker: true,
		vscode: true,
		locks: true,
		git: true,
		tests: true,
		githubActions: false,
		others: ["Husky"],
		aiSkills: true,
	},
	full: {
		linter: "Biome",
		orm: "Drizzle",
		database: "PostgreSQL",
		driver: "Postgres.JS",
		plugins: [
			"Autoload",
			"Auto-retry",
			"Session",
			"Scenes",
			"I18n",
			"Prompt",
			"Media-group",
			"Media-cache",
			"Auto answer callback query",
			"Pagination",
			"Views",
		],
		storage: "Redis",
		i18nType: "I18n-in-TS",
		i18n: { languages: ["en", "ru"], primaryLanguage: "en" },
		docker: true,
		vscode: true,
		locks: true,
		git: true,
		tests: true,
		githubActions: true,
		others: ["Husky", "Jobify"],
		aiSkills: true,
	},
};

export function applyPreset(
	preferences: PreferencesType,
	presetName: PresetName,
): void {
	const preset = presets[presetName];
	for (const [key, value] of Object.entries(preset)) {
		if (key === "i18n" && value && typeof value === "object") {
			Object.assign(preferences.i18n, value);
		} else {
			(preferences as unknown as Record<string, unknown>)[key] = value;
		}
	}
}
