import dedent from "ts-dedent";
import {
	type Preferences,
	type PreferencesType,
	pmExecuteMap,
	pmInstallFrozenLockfile,
	pmInstallFrozenLockfileProduction,
	pmLockFilesMap,
} from "utils.js";

// TODO: node support
export function getDockerfile({ packageManager }: Preferences) {
	if (packageManager === "bun")
		return dedent /* Dockerfile */`
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/.env .
COPY --from=prerelease /usr/src/app/.env.production .
RUN mkdir -p /usr/src/app/src
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
ENTRYPOINT [ "bun", "run", "src/index.ts" ]`;
console.log(packageManager);
	// TODO: support to package managers
	return dedent /* Dockerfile */`
# Use the official Node.js 22 image.
# See https://hub.docker.com/_/node for more information.
FROM node:22 AS base

# Create app directory
WORKDIR /usr/src/app

${packageManager !== "npm" ? "npm install ${packageManager} -g" : ""}
# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json ${pmLockFilesMap[packageManager]} /temp/dev/
RUN cd /temp/dev && ${pmInstallFrozenLockfile[packageManager]}

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json ${pmLockFilesMap[packageManager]} /temp/prod/
RUN cd /temp/prod && ${pmInstallFrozenLockfileProduction[packageManager]}

# Copy node_modules from temp directory
# Then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production

# Copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/.env .
COPY --from=prerelease /usr/src/app/.env.production .
RUN mkdir -p /usr/src/app/src
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .

# Run the app
USER node
# TODO:// should be downloaded not at ENTRYPOINT
ENTRYPOINT [ "${pmExecuteMap[packageManager]}", "tsx", "--env-file=.env --env-file=.env.production", "src/index.ts" ]`;
}

// TODO: generate redis+postgres
export function getDockerCompose({ database, storage }: PreferencesType) {
    const volumes:string[] = [];

    if(database === "PostgreSQL") volumes.push("postgres_data:")
        if(storage === "Redis") volumes.push("redis_data:");

	return dedent /* yaml */`
services:
    bot:
        container_name: project-bot
        restart: unless-stopped
        build:
            context: .
            dockerfile: Dockerfile
        environment:
        - NODE_ENV=production
    ${
			database === "PostgreSQL"
				? /* yaml */ `postgres:
        container_name: project-postgres
        image: postgres:latest
        restart: unless-stopped
        environment:
            - POSTGRES_USER=project
            - POSTGRES_PASSWORD=Please-change-password
            - POSTGRES_DB=project
        volumes:
            - postgres_data:/var/lib/postgresql/data`
				: ""
		}
    ${
			storage === "Redis"
				? /* yaml */ `redis:
        container_name: project-redis
        image: redis:latest
        command: [ "redis-server", "--maxmemory-policy", "noeviction" ]
        restart: unless-stopped
        volumes:
            - redis_data:/data`
				: ""
		}
volumes:
    ${volumes.join("\n")}
    
networks:
    default: {}
`;
}

 export function getDevelopmentDockerCompose({ database, storage }: PreferencesType) {
    const volumes:string[] = [];

    if(database === "PostgreSQL") volumes.push("postgres_data:")
        if(storage === "Redis") volumes.push("redis_data:");

	return dedent /* yaml */`
services:
    ${
			database === "PostgreSQL"
				? /* yaml */ `postgres:
        container_name: project-postgres
        image: postgres:latest
        restart: unless-stopped
        environment:
            - POSTGRES_USER=project
            - POSTGRES_PASSWORD=Please-change-password
            - POSTGRES_DB=project
        ports:
            - 5432:5432
        volumes:
            - postgres_data:/var/lib/postgresql/data`
				: ""
		}
    ${
			storage === "Redis"
				? /* yaml */ `redis:
        container_name: project-redis
        image: redis:latest
        command: [ "redis-server", "--maxmemory-policy", "noeviction" ]
        restart: unless-stopped
        ports:
            - 6379:6379
        volumes:
            - redis_data:/data`
				: ""
		}
volumes:
    ${volumes.join("\n")}
    
networks:
    default: {}
`;
 }