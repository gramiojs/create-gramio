# create-gramio

Scaffolding your [GramIO](https://gramio.dev/) project with the environment with easy!

-   Npm

```bash
npm create gramio@latest ./bot
```

-   Yarn

```bash
yarn create gramio@latest ./bot
```

-   Pnpm

```bash
pnpm create gramio@latest ./bot
```

-   Bun

```bash
bun create gramio@latest ./bot
```

## Supported environment

-   [Telegram apps](https://github.com/Telegram-Mini-Apps/telegram-apps/tree/master/packages/create-mini-app)
-   [Elysia](https://elysiajs.com/) (by [create-elysiajs](https://github.com/kravetsone/create-elysiajs))
-   Linters
-   -   [Biome](https://biomejs.dev/)
-   -   [ESLint](https://eslint.org/) with some plugins
-   ORM/Query builders
-   -   [Prisma](https://www.prisma.io/)
-   -   [Drizzle](https://orm.drizzle.team/)
-   Plugins
-   -   [Scenes](https://gramio.dev/plugins/official/scenes.html)
-   -   [Session](https://gramio.dev/plugins/official/session.html)
-   -   [Autoload](https://gramio.dev/plugins/official/autoload.html)
-   -   [Prompt](https://gramio.dev/plugins/official/prompt.html)
-   -   [Auto-retry](https://gramio.dev/plugins/official/auto-retry.html)
-   -   [Media-cache](https://gramio.dev/plugins/official/media-cache.html)
-   -   [I18n](https://gramio.dev/plugins/official/i18n.html)
-   -   [Media-group](https://gramio.dev/plugins/official/media-group.html)
-   Others
-   -   [Husky](https://typicode.github.io/husky/) (Git hooks)
-   -   [Fluent2ts](https://github.com/kravetsone/fluent2ts)
-   -   [GramIO storages](https://gramio.dev/storages/)

> The environment can work `together`
>
> When you select [ESLint](https://eslint.org/) and [Drizzle](https://orm.drizzle.team/), you get [eslint-plugin-drizzle](https://orm.drizzle.team/docs/eslint-plugin)
>
> When you select [Husky](https://typicode.github.io/husky/) and one of the [linters](#supported-environment) - the `pre-commit` hook will contain the command `lint:fix`
