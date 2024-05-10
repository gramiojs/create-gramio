import type { Preferences, PreferencesType } from "../utils";

const links: Record<
	Exclude<
		| "GramIO"
		| PreferencesType["linter"]
		| PreferencesType["orm"]
		| PreferencesType["plugins"][0]
		| PreferencesType["others"][0]
		| PreferencesType["database"]
		| "Fluent2ts",
		"None"
	>,
	string
> = {
	GramIO: "[GramIO](https://gramio.netlify.app/)",
	ESLint: "[ESLint](https://eslint.org/)",
	Biome: "[Biome](https://biomejs.dev/)",
	Prisma: "[Prisma](https://www.prisma.io/)",
	Drizzle: "[Drizzle](https://orm.drizzle.team/)",
	Husky: "[Husky](https://typicode.github.io/husky/)",
	PostgreSQL: "[PostgreSQL](https://www.postgresql.org/)",
	MySQL: "[MySQL](https://www.mysql.com/)",
	MongoDB: "[MongoDB](https://www.mongodb.com/)",
	SQLite: "[SQLite](https://sqlite.org/)",
	SQLServer: "[SQLServer](https://www.microsoft.com/sql-server)",
	CockroachDB: "[CockroachDB](https://www.cockroachlabs.com/)",
	Session:
		"[Session](https://gramio.netlify.app/plugins/official/session.html)",
	Autoload:
		"[Autoload](https://gramio.netlify.app/plugins/official/autoload.html)",
	Prompt: "[Prompt](https://gramio.netlify.app/plugins/official/prompt.html)",
	"Auto-retry":
		"[Auto-retry](https://gramio.netlify.app/plugins/official/auto-retry.html)",
	"Media-cache":
		"[Media-cache](https://gramio.netlify.app/plugins/official/media-cache.html)",
	I18n: "[I18n](https://gramio.netlify.app/plugins/official/i18n.html)",
	Fluent2ts: "[Fluent2ts](https://github.com/kravetsone/fluent2ts)",
};

export function getReadme({
	dir,
	linter,
	orm,
	database,
	plugins,
	others,
}: Preferences) {
	const stack = [];

	stack.push(`- Telegram Bot API framework - ${links.GramIO}`);
	if (linter !== "None") stack.push(`- Linter - ${links[linter]}`);
	if (orm !== "None") stack.push(`- ORM - ${links[orm]} (${links[database]})`);
	if (plugins.length)
		stack.push(`- GramIO plugins - ${plugins.map((x) => links[x]).join(", ")}`);
	if (others.length || plugins.includes("I18n"))
		stack.push(
			`- Others tools - ${[
				...others.map((x) => links[x]),
				plugins.includes("I18n") ? links.Fluent2ts : undefined,
			]
				.filter(Boolean)
				.join(", ")}`,
		);

	return [
		`# ${dir}`,
		"",
		"This template autogenerated by [create-gramio](https://github.com/gramiojs/create-gramio)",
		"",
		"### Stack",
		...stack,
	].join("\n");
}
