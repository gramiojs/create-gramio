import dedent from "ts-dedent";

export function getI18nForLang(isPrimary = false) {
return isPrimary ? dedent/* ts */`
import type { LanguageMap } from "@gramio/i18n";
import { format, bold } from "gramio";

export const en = {
	greeting: (name: string) => format\`Hello, \${bold(name)}!\`,
} satisfies LanguageMap;
 ` : dedent/* ts */`
 import type { ShouldFollowLanguage } from "@gramio/i18n";
 import type { en } from "./en";
 import { format, bold } from "gramio";

 export const ru = {
	greeting: (name: string) => format\`Привет, \${bold(name)}!\`,
} satisfies ShouldFollowLanguage<typeof en>;`
}

export function getI18nIndex() {
    return dedent/* ts */`
import { defineI18n } from "@gramio/i18n";
import { en } from "./en";
import { ru } from "./ru";

export const i18n = defineI18n({
    primaryLanguage: "en",
    languages: {
        en,
        ru,
    },
});`
}