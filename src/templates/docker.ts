import dedent from "ts-dedent";
import {
	type Preferences,
	type PreferencesType,
	pmExecuteMap,
	pmInstallFrozenLockfile,
	pmInstallFrozenLockfileProduction,
	pmLockFilesMap,
	pmRunMap,
} from "../utils.js";

const ormDockerCopy: Record<Exclude<PreferencesType["orm"], "None">, string> = {
	Prisma: "COPY --from=prerelease /usr/src/app/prisma ./prisma",
	Drizzle: dedent`
    COPY --from=prerelease /usr/src/app/drizzle ./drizzle
    COPY --from=prerelease /usr/src/app/drizzle.config.ts .`,
};

export function getDockerfile({ packageManager, orm }: Preferences) {
	if (packageManager === "bun")
		return dedent /* Dockerfile */`
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:${process.versions.bun ?? "1.2.5"} AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN ${pmExecuteMap[packageManager]} tsc --noEmit

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/.env .
COPY --from=prerelease /usr/src/app/.env.production .
RUN mkdir -p /usr/src/app/src
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .
${orm !== "None" ? ormDockerCopy[orm] : ""}

ENTRYPOINT [ "bun", "start" ]`;

	return dedent /* Dockerfile */`
# Use the official Node.js image.
# See https://hub.docker.com/_/node for more information.
FROM node:${process?.versions?.node ?? "22.12"} AS base

# Create app directory
WORKDIR /usr/src/app

RUN ${packageManager !== "npm" ? "npm install ${packageManager} -g" : ""}
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

RUN ${pmExecuteMap[packageManager]} tsc --noEmit

# Copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/.env .
COPY --from=prerelease /usr/src/app/.env.production .
RUN mkdir -p /usr/src/app/src
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .
${orm !== "None" ? ormDockerCopy[orm] : ""}


# TODO:// should be downloaded not at ENTRYPOINT
ENTRYPOINT [ "${pmRunMap[packageManager]}", "start" ]`;
}

// TODO: generate redis+postgres
export function getDockerCompose({
	database,
	storage,
	projectName,
	meta,
}: PreferencesType) {
	const volumes: string[] = [];

	if (database === "PostgreSQL") volumes.push("postgres_data:");
	if (database === "MySQL") volumes.push("mysql_data:");
	if (database === "MongoDB") volumes.push("mongodb_data:");
	if (storage === "Redis") volumes.push("redis_data:");

	const services: string[] = [
		/* yaml */ `bot:
			container_name: ${projectName}-bot
			restart: unless-stopped
			build:
				context: .
				dockerfile: Dockerfile
			environment:
			- NODE_ENV=production`,
		database === "PostgreSQL"
			? /* yaml */ `postgres:
			container_name: ${projectName}-postgres
			image: postgres:latest
			restart: unless-stopped
			environment:
				- POSTGRES_USER=${projectName}
				- POSTGRES_PASSWORD=${meta.databasePassword}
				- POSTGRES_DB=${projectName}
			volumes:
				- postgres_data:/var/lib/postgresql/data`
			: "",
		database === "MySQL"
			? /* yaml */ `mysql:
			container_name: ${projectName}-mysql
			image: mysql:latest
			restart: unless-stopped
			environment:
				- MYSQL_ROOT_PASSWORD=${meta.databasePassword}
				- MYSQL_DATABASE=${projectName}
				- MYSQL_USER=${projectName}
				- MYSQL_PASSWORD=${meta.databasePassword}
			volumes:
				- mysql_data:/var/lib/mysql`
			: "",
		database === "MongoDB"
			? /* yaml */ `mongodb:
        container_name: ${projectName}-mongodb
        image: mongo:latest
        restart: unless-stopped
        environment:
            - MONGO_INITDB_ROOT_USERNAME=${projectName}
            - MONGO_INITDB_ROOT_PASSWORD=${meta.databasePassword}
        volumes:
            - mongodb_data:/data/db`
			: "",
		storage === "Redis"
			? /* yaml */ `redis:
			container_name: ${projectName}-redis
			image: redis:latest
			command: [ "redis-server", "--maxmemory-policy", "noeviction" ]
			restart: unless-stopped
			volumes:
				- redis_data:/data`
			: "",
	];

	return dedent /* yaml */`
services:
    ${services.filter(Boolean).join("\n    ")}
volumes:
    ${volumes.join("\n")}
    
networks:
    default: {}
`;
}

export function getDevelopmentDockerCompose({
	database,
	storage,
	projectName,
	meta,
}: PreferencesType) {
	const volumes: string[] = [];

	if (database === "PostgreSQL") volumes.push("postgres_data:");
	if (database === "MySQL") volumes.push("mysql_data:");
	if (storage === "Redis") volumes.push("redis_data:");

	const services: string[] = [
		database === "PostgreSQL"
			? /* yaml */ `postgres:
        container_name: ${projectName}-postgres
        image: postgres:latest
        restart: unless-stopped
        environment:
            - POSTGRES_USER=${projectName}
            - POSTGRES_PASSWORD=${meta.databasePassword}
            - POSTGRES_DB=${projectName}
        ports:
            - 5432:5432
        volumes:
            - postgres_data:/var/lib/postgresql/data`
			: "",
		database === "MySQL"
			? /* yaml */ `mysql:
        container_name: ${projectName}-mysql
        image: mysql:latest
        restart: unless-stopped
        environment:
            - MYSQL_ROOT_PASSWORD=${meta.databasePassword}
            - MYSQL_DATABASE=${projectName}
            - MYSQL_USER=${projectName}
            - MYSQL_PASSWORD=${meta.databasePassword}
        ports:
            - 3306:3306
        volumes:
            - mysql_data:/var/lib/mysql`
			: "",
		storage === "Redis"
			? /* yaml */ `redis:
        container_name: ${projectName}-redis
        image: redis:latest
        command: [ "redis-server", "--maxmemory-policy", "noeviction" ]
        restart: unless-stopped
        ports:
            - 6379:6379
        volumes:
            - redis_data:/data`
			: "",
		database === "MongoDB"
			? /* yaml */ `mongodb:
        container_name: ${projectName}-mongodb
        image: mongo:latest
        restart: unless-stopped
        environment:
            - MONGO_INITDB_ROOT_USERNAME=${projectName}
            - MONGO_INITDB_ROOT_PASSWORD=${meta.databasePassword}
        ports:
            - 27017:27017
        volumes:
            - mongodb_data:/data/db`
			: "",
	];

	return dedent /* yaml */`
services:
    ${services.filter(Boolean).join("\n    ")}
volumes:
    ${volumes.join("\n")}
    
networks:
    default: {}
`;
}
