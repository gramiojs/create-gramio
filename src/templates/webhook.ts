import dedent from "ts-dedent";
import type { PreferencesType } from "utils";

export function getWebhookIndex({ webhookAdapter }: PreferencesType) {
	if (webhookAdapter === "Elysia")
		return dedent /* tss */`
import { Elysia } from "elysia"
import { config } from "./config.ts"
import { bot } from "./bot.ts"
import { webhookHandler } from "gramio"

export const app = new Elysia()
        .post(\`/\${config.BOT_TOKEN}\`, webhookHandler(bot, "elysia"))
        `;

	if (webhookAdapter === "Fastify")
		return dedent /* tss */`
import Fastify from "fastify"
import { config } from "./config.ts"
import { bot } from "./bot.ts"
import { webhookHandler } from "gramio"

export const fastify = Fastify()

fastify.post(\`/\${config.BOT_TOKEN}\`, webhookHandler(bot, "fastify"))

`;

	return dedent /* tss */`
import { createServer } from "node:http"
import { config } from "./config.ts"
import { bot } from "./bot.ts"
import { webhookHandler } from "gramio"

export const server = createServer((req, res) => {
	if (req.url === \`/\${config.BOT_TOKEN}\`) {
		return webhookHandler(bot, "http")(req, res);
	}
})`;
}

export function getWebhookListen({
	webhookAdapter,
}: Pick<PreferencesType, "webhookAdapter">) {
	if (webhookAdapter === "Elysia")
		return /* ts */ "app.listen(config.PORT, () => console.log(`Listening on port ${config.PORT}`))";
	if (webhookAdapter === "Fastify")
		return dedent`
	await fastify.listen({ port: config.PORT })
	console.log(\`Listening on port \${config.PORT}\`)`;
	return /* ts */ "server.listen(config.PORT, () => console.log(`Listening on port ${config.PORT}`))";
}
