import { registerLocaleData } from '@angular/common';
import localeDa from '@angular/common/locales/da';
import localeEn from '@angular/common/locales/en-GB';
import { Injectable, computed, signal } from '@angular/core';
import { Strings, danish, english } from './strings';

export type Language = 'da' | 'en';

const STORAGE_KEY = 'ligacup.language';

registerLocaleData(localeDa, 'da');
registerLocaleData(localeEn, 'en-GB');

/**
 * Danish is the default. The chosen language is kept in local storage so a
 * returning visitor lands in the same language without a flash of the wrong one.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
    readonly language = signal<Language>(restore());

    /** Reading this in a template registers the language signal, so views repaint on change. */
    readonly t = computed<Strings>(() => (this.language() === 'en' ? english : danish));

    readonly locale = computed(() => (this.language() === 'en' ? 'en-GB' : 'da'));

    constructor() {
        this.applyDocumentLanguage(this.language());
    }

    setLanguage(language: Language): void {
        this.language.set(language);
        localStorage.setItem(STORAGE_KEY, language);
        this.applyDocumentLanguage(language);
    }

    toggle(): void {
        this.setLanguage(this.language() === 'da' ? 'en' : 'da');
    }

    /** Fills {placeholders} in a translated string. */
    format(template: string, values: Record<string, string | number>): string {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
            template,
        );
    }

    /**
     * Bracket slots are stored as English placeholders such as "Winner SF1".
     * A null team id is what marks the name as a placeholder rather than a real team.
     */
    teamName(name: string, teamId: number | null): string {
        if (teamId !== null) {
            return name;
        }

        const strings = this.t().placeholder;

        for (const [pattern, template] of [
            [/^Winner (.+)$/, strings.winner],
            [/^Loser (.+)$/, strings.loser],
            [/^Seed (.+)$/, strings.seed],
        ] as const) {
            const match = pattern.exec(name);
            if (match) {
                return this.format(template, { label: match[1] });
            }
        }

        return name === 'TBD' ? strings.tbd : name;
    }

    private applyDocumentLanguage(language: Language): void {
        document.documentElement.lang = language;
    }
}

function restore(): Language {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'da' ? stored : 'da';
}
