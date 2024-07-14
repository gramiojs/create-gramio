import type { PreferencesType } from "utils";

export function generateEslintConfig({ orm }: PreferencesType) {
	return [
		`import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import love from "eslint-config-love";`,
		orm === "Drizzle" && `import drizzle from "eslint-plugin-drizzle";`,
		`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	...love,
	...compat.extends("standard-with-typescript"${orm === "Drizzle" && `, "plugin:drizzle/recommended"`}),
	{
        files: ["**/*.js", "**/*.ts"],`,
		orm === "Drizzle" &&
			`plugins: {
			drizzle,
		},
	},`,
		`
];
`,
	].join("\n");
}
