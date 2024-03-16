export function getPackageJson() {
	const sample = {
		scripts: {
			dev: "npx src/index.ts --watch",
		} as Record<string, string>,
		dependencies: {
			gramio: "latest",
		} as Record<string, string>,
		devDependencies: {
			typescript: "^5.4.2",
		} as Record<string, string>,
	};

	return JSON.stringify(sample, null, 2);
}
