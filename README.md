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

-   Linters
-   -   [Biome](https://biomejs.dev/)
-   -   [ESLint](https://eslint.org/) with some plugins
-   ORM/Query builders
-   -   [Prisma](https://www.prisma.io/)
-   -   [Drizzle](https://orm.drizzle.team/)
-   Plugins
-   -   [Session](https://gramio.dev/plugins/official/session.html)
-   -   [Autoload](https://gramio.dev/plugins/official/autoload.html)
-   -   [Prompt](https://gramio.dev/plugins/official/prompt.html)
-   Others
-   -   [Husky](https://typicode.github.io/husky/) (Git hooks)

> The environment can work `together`
>
> When you select [ESLint](https://eslint.org/) and [Drizzle](https://orm.drizzle.team/), you get [eslint-plugin-drizzle](https://orm.drizzle.team/docs/eslint-plugin)
>
> When you select [Husky](https://typicode.github.io/husky/) and one of the [linters](#supported-environment) - the `pre-commit` hook will contain the command `lint:fix`
