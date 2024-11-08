import type { Preferences } from "../utils.js";

const connectionURLExamples: Record<
	InstanceType<typeof Preferences>["database"],
	string
> = {
	PostgreSQL: "postgresql://root:mypassword@localhost:5432/mydb?schema=sample",
	MySQL: "mysql://root:mypassword@localhost:3306/mydb",
	SQLServer:
		"sqlserver://localhost:1433;database=mydb;user=root;password=mypassword;",
	CockroachDB:
		"postgresql://root:mypassword@localhost:26257/mydb?schema=public",
	MongoDB:
		"mongodb+srv://root:mypassword@cluster0.ab1cd.mongodb.net/mydb?retryWrites=true&w=majority",
	SQLite: "file:./sqlite.db",
};

const composeServiceNames: Record<
	InstanceType<typeof Preferences>["database"],
	string
> = {
	PostgreSQL: "postgres",
	MySQL: "localhost",
	SQLServer: "localhost",
	CockroachDB: "localhost",
	MongoDB: "localhost",
	SQLite: "file:./sqlite.db",
};

export function getEnvFile(
	{ database, orm, storage }: Preferences,
	isComposed = false,
	keys?: string[],
) {
	const envs = ["TOKEN=Insert:token"];

	if (orm !== "None") {
		let url = connectionURLExamples[database];

		// rename localhost to docker compose service name in network
		if (isComposed)
			url = url.replace("localhost", composeServiceNames[database]);

		envs.push(`DATABASE_URL="${url}"`);
	}

	if (isComposed && storage === "Redis") envs.push(`REDIS_HOST=redis`);

	return envs
		.filter((x) => keys?.some((key) => x.startsWith(key)) ?? true)
		.join("\n");
}
