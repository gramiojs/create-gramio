# create-gramio

Scaffolding your [GramIO](https://gramio.netlify.app/) project with the environment with easy!

-   Npm

```bash
npm create gramio ./bot
```

-   Yarn

```bash
yarn create gramio ./bot
```

-   Pnpm

```bash
pnpm create gramio ./bot
```

-   Bun

```bash
bun create gramio ./bot
```

## Supported environment

-   Linters
-   -   [Biome](https://biomejs.dev/)
-   -   [ESLint](https://eslint.org/) with some plugins
-   ORM/Query builders
-   -   [Prisma](https://www.prisma.io/)
-   -   [Drizzle](https://orm.drizzle.team/)
-   Plugins
-   -   [Session](https://gramio.netlify.app/plugins/official/session.html)
-   -   [Autoload](https://gramio.netlify.app/plugins/official/autoload.html)
-   -   [Prompt](https://gramio.netlify.app/plugins/official/prompt.html)
-   Others
-   -   [Husky](https://typicode.github.io/husky/) (Git hooks)

> The environment can work `together`
>
> When you select [ESLint](https://eslint.org/) and [Drizzle](https://orm.drizzle.team/), you get [eslint-plugin-drizzle](https://orm.drizzle.team/docs/eslint-plugin)
>
> When you select [Husky](https://typicode.github.io/husky/) and one of the [linters](#supported-environment) - the `pre-commit` hook will contain the command `lint:fix`
