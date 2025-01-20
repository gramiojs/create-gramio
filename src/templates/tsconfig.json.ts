export function getTSConfig() {
	return JSON.stringify(
		{
			compilerOptions: {
				lib: ["ESNext"],
				module: "ESNext",
				target: "ESNext",
				esModuleInterop: true,

				/* Bundler mode */
				moduleResolution: "Bundler",
				noEmit: true,
				allowImportingTsExtensions: true,
				/* Linting */
				skipLibCheck: true,
				strict: true,
				noFallthroughCasesInSwitch: true,
				forceConsistentCasingInFileNames: true,
				noUncheckedIndexedAccess: true,
				baseUrl: "./src",
				rootDir: "./src",
			},
			include: ["src"],
		},
		null,
		2,
	);
}
