import dedent from "ts-dedent";

export function getI18nForLang(
	isPrimary = false,
	language?: string,
	primaryLanguage?: string,
) {
	return isPrimary
		? dedent /* ts */`
import type { LanguageMap } from "@gramio/i18n";
import { format, bold } from "gramio";

export const ${language || "en"} = {
	greeting: (name: string) => format\`Hello, \${bold(name)}!\`,
} satisfies LanguageMap;
 `
		: dedent /* ts */`
 import type { ShouldFollowLanguage } from "@gramio/i18n";
 import type { ${primaryLanguage} } from "./${primaryLanguage}.ts";
 import { format, bold } from "gramio";

 export const ${language || "ru"} = {
	greeting: (name: string) => format\`Привет, \${bold(name)}!\`,
} satisfies ShouldFollowLanguage<typeof ${primaryLanguage}>;`;
}

export function getI18nIndex(primaryLanguage: string, languages: string[]) {
	const imports = languages.map(
		(lang) => `import { ${lang} } from "./${lang}.ts"`,
	);

	return dedent /* ts */`
import { defineI18n } from "@gramio/i18n";
${imports.join("\n")}

export const i18n = defineI18n({
    primaryLanguage: "${primaryLanguage}",
    languages: {
        ${languages.join(",\n")}
    },
});

${languages.length === 1 ? `export const getText = i18n.buildT("${primaryLanguage}")` : ""}
`;
}
