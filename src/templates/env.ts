import dedent from "ts-dedent";
import type { Preferences, PreferencesType } from "../utils.js";

const connectionURLExamples: Record<
	InstanceType<typeof Preferences>["database"],
	string
> = {
	PostgreSQL: "postgresql://root:mypassword@localhost:5432/mydb",
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
	MySQL: "mysql",
	SQLServer: "localhost",
	CockroachDB: "localhost",
	MongoDB: "localhost",
	SQLite: "file:./sqlite.db",
};

export function getEnvFile(
	{ database, orm, storage, projectName, meta }: Preferences,
	isComposed = false,
	keys?: string[],
) {
	const envs = ["BOT_TOKEN=Insert:token"];

	if (orm !== "None") {
		let url = connectionURLExamples[database]
			.replace("mydb", projectName)
			.replace("root", projectName)
			.replace("mypassword", meta.databasePassword);

		// rename localhost to docker compose service name in network
		if (isComposed)
			url = url.replace("localhost", composeServiceNames[database]);

		envs.push(`DATABASE_URL="${url}"`);
	}

	if (isComposed && storage === "Redis") envs.push("REDIS_HOST=redis");

	return envs
		.filter((x) => keys?.some((key) => x.startsWith(key)) ?? true)
		.join("\n");
}

export function getConfigFile({
	orm,
	storage,
	others,
	webhookAdapter,
	locks,
}: PreferencesType) {
	const envs: string[] = [];

	if (webhookAdapter !== "None") {
		envs.push(`PORT: env.get("PORT").default(3000).asPortNumber()`);
		// envs.push(`PUBLIC_DOMAIN: env.get("PUBLIC_DOMAIN").asString()`);
		envs.push(
			`API_URL: env.get("API_URL").default(\`https://\${env.get("PUBLIC_DOMAIN").asString()}\`).asString()`,
		);
	}

	if (orm !== "None")
		envs.push(`DATABASE_URL: env.get("DATABASE_URL").required().asString()`);

	if (storage === "Redis") {
		envs.push(
			`REDIS_HOST: env.get("REDIS_HOST").default("localhost").asString()`,
		);
	}

	if (others.includes("Posthog")) {
		envs.push(
			`POSTHOG_API_KEY: env.get("POSTHOG_API_KEY").default("it's a secret").asString()`,
		);
		envs.push(
			`POSTHOG_HOST: env.get("POSTHOG_HOST").default("localhost").asString()`,
		);
	}

	if (locks) {
		const stores = ["memory"];
		if (storage === "Redis") stores.push("redis");

		envs.push(
			`LOCK_STORE: env.get("LOCK_STORE").default("memory").asEnum(${JSON.stringify(stores)})`,
		);
	}

	return dedent /* ts */`
	import env from "env-var";
	
	export const config = {
		NODE_ENV: env
		.get("NODE_ENV")
		.default("development")
		.asEnum(["production", "test", "development"]),
		BOT_TOKEN: env.get("BOT_TOKEN").required().asString(),
		

		${envs.join(",\n")}
	}`;
}

export function getDatabaseConfigFile({ database }: Preferences) {
	return dedent /* ts */`
	import env from "env-var";

	export const config = {
		DATABASE_URL: env.get("DATABASE_URL").required().asString(),
	}`;
}
