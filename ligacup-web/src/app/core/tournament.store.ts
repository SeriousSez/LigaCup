import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { LiveService } from './live.service';
import { LiveUpdate, Match, TournamentDetail } from './models';

/**
 * Single source of truth for the tournament currently on screen. Live pushes patch the
 * cached detail in place so the tables and bracket repaint without another round trip.
 */
@Injectable({ providedIn: 'root' })
export class TournamentStore {
    private readonly api = inject(ApiService);
    private readonly live = inject(LiveService);

    readonly detail = signal<TournamentDetail | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly connectionState = this.live.state;

    readonly groupMatches = computed(
        () => this.detail()?.matches.filter((match) => match.stage === 'Group') ?? [],
    );

    readonly liveMatches = computed(
        () =>
            this.detail()?.matches.filter(
                (match) =>
                    match.status === 'Live' || match.status === 'HalfTime' || match.status === 'Paused',
            ) ?? [],
    );

    async load(slug: string): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            this.detail.set(await firstValueFrom(this.api.getTournament(slug)));
            await this.live.watch(
                slug,
                (update) => this.apply(update),
                async () => this.reload(),
            );
        } catch {
            this.detail.set(null);
            this.error.set('That tournament could not be loaded.');
        } finally {
            this.loading.set(false);
        }
    }

    async reload(): Promise<void> {
        const slug = this.detail()?.tournament.slug;
        if (slug) {
            this.detail.set(await firstValueFrom(this.api.getTournament(slug)));
        }
    }

    /** Applies a locally issued change straight away, ahead of the broadcast arriving. */
    patchMatch(match: Match): void {
        const current = this.detail();
        if (!current) {
            return;
        }

        this.detail.set({
            ...current,
            matches: current.matches.map((existing) => (existing.id === match.id ? match : existing)),
        });
    }

    private apply(update: LiveUpdate): void {
        const current = this.detail();
        if (!current || current.tournament.slug !== update.slug) {
            return;
        }

        const matches = current.matches.some((match) => match.id === update.match.id)
            ? current.matches.map((match) => (match.id === update.match.id ? update.match : match))
            : [...current.matches, update.match];

        this.detail.set({
            ...current,
            matches,
            tables: update.tables,
            bracket: update.bracket,
            topScorers: update.topScorers,
        });
    }
}
