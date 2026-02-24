import type { PreferencesType } from "../utils.js";

export function getCIWorkflow({
	packageManager,
	linter,
	tests,
}: PreferencesType) {
	const isBun = packageManager === "bun";

	const setupStep = isBun
		? `      - uses: oven-sh/setup-bun@v2`
		: `      - uses: actions/setup-node@v4
        with:
          node-version: "22"`;

	const installCmd = isBun ? "bun install" : "npm ci";
	const lintCmd = isBun ? "bun run lint" : "npm run lint";
	const tscCmd = isBun ? "bun x tsc --noEmit" : "npx tsc --noEmit";
	const testCmd = isBun ? "bun test" : "node --test";

	const steps: string[] = [
		`      - uses: actions/checkout@v4`,
		setupStep,
		`      - run: ${installCmd}`,
	];

	if (linter !== "None") {
		steps.push(`      - run: ${lintCmd}`);
	}

	steps.push(`      - run: ${tscCmd}`);

	if (tests) {
		steps.push(`      - run: ${testCmd}`);
	}

	return `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
${steps.join("\n")}
`;
}
