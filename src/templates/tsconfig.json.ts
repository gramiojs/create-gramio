export function getTSConfig() {
	return JSON.stringify(
		{
			compilerOptions: {
				lib: ["ESNext"],
				target: "ES2022",
				module: "NodeNext",
				moduleDetection: "force",

				/* Bundler mode */
				moduleResolution: "NodeNext",
				/* Linting */
				skipLibCheck: true,
				strict: true,
				noFallthroughCasesInSwitch: true,
				forceConsistentCasingInFileNames: true,
				baseUrl: "./src",
				rootDir: "./src",
				outDir: "./dist",
			},
			include: ["src"],
		},
		null,
		2,
	);
}
