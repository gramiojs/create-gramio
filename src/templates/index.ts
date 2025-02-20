import dedent from "ts-dedent";
import type { PreferencesType } from "utils.js";
import { getWebhookListen } from "./webhook.js";

export * from "./gramio.js";
export * from "./install.js";
export * from "./package.json.js";
export * from "./tsconfig.json.js";
export * from "./db.js";
export * from "./readme.md.js";
export * from "./env.js";
export * from "./eslint.js";

const dbExportedMap = {
	Prisma: "prisma",
	Drizzle: "client",
};

export function getIndex({
	others,
	orm,
	driver,
	type,
	webhookAdapter,
}: PreferencesType) {
	const isShouldConnectToDB = orm !== "None" && driver === "MySQL 2";
	// orm !== "None" &&
	// driver !== "Postgres.JS" &&
	// driver !== "Bun.sql" &&
	// driver !== "node-postgres" &&
	// driver !== "MySQL 2" &&
	// driver !== "bun:sqlite" &&
	// driver !== "better-sqlite3" &&;

	const gracefulShutdownTasks: string[] = [];
	const imports: string[] = [
		`import { bot } from "./bot.ts"`,
		`import { config } from "./config.ts"`,
	];
	const startUpTasks: string[] = [];

	if (webhookAdapter === "Bun.serve") {
		imports.push(`import { server } from "./webhook.ts"`);
		gracefulShutdownTasks.push("server.stop()");
	}

	if (webhookAdapter === "Elysia") {
		imports.push(`import { app } from "./webhook.ts"`);
		gracefulShutdownTasks.push("await app.stop()");
	}

	if (webhookAdapter === "node:http") {
		imports.push(`import { server } from "./webhook.ts"`);
		gracefulShutdownTasks.push("server.close()");
	}

	if (webhookAdapter === "Fastify") {
		imports.push(`import { fastify } from "./webhook.ts"`);
		gracefulShutdownTasks.push("await fastify.close()");
	}

	gracefulShutdownTasks.push("await bot.stop()");

	if (others.includes("Posthog")) {
		imports.push(`import { posthog } from "./services/posthog.ts"`);
		gracefulShutdownTasks.push("await posthog.shutdown()");
	}

	if (isShouldConnectToDB) {
		imports.push(
			`import { ${dbExportedMap[orm]} } from "${type.includes("monorepo") ? "@monorepo/db" : "./db/index.ts"}"`,
		);
		startUpTasks.push(dedent /* ts */`
            ${orm === "Prisma" ? "await prisma.$connect()" : "await client.connect()"}
            console.log("🗄️ Database was connected!")`);
	}

	if (webhookAdapter !== "None" && webhookAdapter !== "Bun.serve") {
		startUpTasks.push(getWebhookListen({ webhookAdapter }));
		startUpTasks.push(dedent /* tss */`
            if (config.NODE_ENV === "production")
                await bot.start({
                    webhook: {
                        url: \`\${config.API_URL}/\${config.BOT_TOKEN}\`,
                    },
                });
            else await bot.start();`);
	} else startUpTasks.push("await bot.start();");

	return dedent /* sts */`
    ${imports.join("\n")}
    const signals = ["SIGINT", "SIGTERM"];
    
    for (const signal of signals) {
        process.on(signal, async () => {
            console.log(\`Received \${signal}. Initiating graceful shutdown...\`);
            ${gracefulShutdownTasks.join("\n")}
            process.exit(0);
        })
    }
        
    process.on("uncaughtException", (error) => {
        console.error(error);
    })

    process.on("unhandledRejection", (error) => {
        console.error(error);
    })
        
${startUpTasks.join("\n")}`;
}
