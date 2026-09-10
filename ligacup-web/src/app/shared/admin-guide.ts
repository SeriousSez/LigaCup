import { Component, HostListener, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';

type GuideId = 'overview' | 'fixtures' | 'knockout' | 'create' | 'setup' | 'live';

interface AdminGuideStep {
    target: string;
    route: string;
    title: () => string;
    text: () => string;
    action?: 'click';
}

@Component({
    selector: 'app-admin-guide',
    template: `
    @if (showHint() && !isOpen()) {
      <aside class="guide-hint" aria-live="polite">
        <div>
          <strong>{{ t().adminGuide.hintTitle }}</strong>
          <p>{{ t().adminGuide.hintText }}</p>
        </div>
        <div class="guide-hint-actions">
          <button class="guide-primary" type="button" (click)="openLibrary()">{{ t().adminGuide.show }}</button>
          <button class="guide-dismiss" type="button" [attr.aria-label]="t().adminGuide.dismiss" [title]="t().adminGuide.dismiss" (click)="dismissHint()">&times;</button>
        </div>
      </aside>
    }
    <button class="guide-help" type="button" [attr.aria-label]="t().adminGuide.open" [title]="t().adminGuide.open" (click)="openLibrary()">?</button>

    @if (isOpen()) {
      <div class="guide-backdrop" [class.has-target]="!!targetRect()"></div>
      @if (targetRect(); as target) {
        <div class="guide-spotlight" [style.top.px]="target.top" [style.left.px]="target.left" [style.width.px]="target.width" [style.height.px]="target.height"></div>
      }

      @if (!activeGuide()) {
        <section class="guide-dialog guide-library" role="dialog" aria-modal="true" [attr.aria-label]="t().adminGuide.libraryTitle">
          <header>
            <div>
              <span class="guide-kicker">{{ t().adminGuide.kicker }}</span>
              <h2>{{ t().adminGuide.libraryTitle }}</h2>
              <p>{{ t().adminGuide.libraryText }}</p>
            </div>
            <button class="guide-close" type="button" [attr.aria-label]="t().adminGuide.close" (click)="close()">&times;</button>
          </header>
          <div class="guide-list">
            @for (guide of guideIds; track guide) {
              <article class="guide-card">
                <div>
                  <i class="fa-duotone fa-solid guide-icon {{ guideIcon(guide) }}" aria-hidden="true"></i>
                  <h3>{{ guideTitle(guide) }}</h3>
                  <p>{{ guideText(guide) }}</p>
                  @if (isGuideCompleted(guide)) {
                    <span class="guide-complete">&#10003; {{ t().adminGuide.completed }}</span>
                  }
                </div>
                <button class="guide-primary" type="button" [disabled]="!canStart(guide)" (click)="startGuide(guide)">{{ isGuideCompleted(guide) ? t().adminGuide.restart : t().adminGuide.start }}</button>
              </article>
            }
          </div>
        </section>
      } @else {
        <section class="guide-dialog" role="dialog" aria-modal="true" [attr.aria-label]="t().adminGuide.title" [style.top.px]="dialogPosition().top" [style.left.px]="dialogPosition().left">
          <header>
            <div>
              <span class="guide-kicker">{{ t().adminGuide.kicker }}</span>
              <h2>{{ guideTitle(activeGuide()) }}</h2>
            </div>
            <button class="guide-close" type="button" [attr.aria-label]="t().adminGuide.close" (click)="close()">&times;</button>
          </header>
          <div class="guide-progress" aria-hidden="true">
            @for (item of currentSteps(); track item.target; let index = $index) {
              <span [class.active]="index === step()" [class.complete]="index < step()"></span>
            }
          </div>
          @if (currentStep(); as current) {
            <div class="guide-body">
              <span class="guide-step">{{ step() + 1 }} / {{ currentSteps().length }}</span>
              <h3>{{ current.title() }}</h3>
              <p>{{ current.text() }}</p>
            </div>
          }
          <footer>
            <button class="guide-secondary" type="button" (click)="openLibrary()">{{ t().adminGuide.allGuides }}</button>
            <div>
              @if (step() > 0) { <button class="guide-secondary" type="button" (click)="previous()">{{ t().adminGuide.back }}</button> }
              <button class="guide-primary" type="button" (click)="next()">{{ step() === currentSteps().length - 1 ? t().adminGuide.done : t().adminGuide.next }}</button>
            </div>
          </footer>
        </section>
      }
    }
  `,
    styles: `
    :host { position: relative; z-index: 20; }
    .guide-help { position: fixed; right: 1rem; bottom: calc(1rem + var(--safe-bottom)); width: 2.75rem; height: 2.75rem; padding: 0; border: 1px solid var(--surface-line); border-radius: 50%; background: var(--surface-raised); color: var(--accent); font-size: 1.2rem; font-weight: 700; box-shadow: var(--shadow); z-index: 25; }
    .guide-hint { position: fixed; right: 4.5rem; bottom: calc(1rem + var(--safe-bottom)); display: flex; align-items: center; gap: 1rem; width: fit-content; max-width: calc(100vw - 6rem); padding: 0.8rem 0.35rem 0.8rem 1rem; border: 1px solid var(--surface-line); border-radius: 10px; background: var(--surface); box-shadow: var(--shadow); z-index: 26; }
    .guide-hint strong { font-size: 0.9rem; }
    .guide-hint p { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.78rem; line-height: 1.35; }
    .guide-hint-actions { display: flex; align-items: center; gap: 0.4rem; flex: 0 0 auto; }
    .guide-dismiss { position: static; width: 2rem; min-height: 2rem; padding: 0; border: 0; background: transparent; color: var(--text-muted); font-size: 1.2rem; }
    .guide-backdrop { position: fixed; inset: 0; background: rgb(0 8 4 / 62%); backdrop-filter: blur(3px); z-index: 30; }
    .guide-backdrop.has-target { background: transparent; backdrop-filter: none; }
    .guide-spotlight { position: fixed; border: 2px solid var(--accent); border-radius: 10px; box-shadow: 0 0 0 9999px rgb(0 8 4 / 62%), 0 0 0 5px rgb(53 208 127 / 20%); pointer-events: none; z-index: 31; }
    .guide-dialog { position: fixed; width: min(38rem, calc(100vw - 2rem)); padding: 1.1rem; border: 1px solid var(--surface-line); border-radius: var(--radius); background: var(--surface); box-shadow: 0 22px 70px rgb(0 0 0 / 55%); z-index: 32; }
    .guide-library { inset: 50% auto auto 50%; width: min(46rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow-y: auto; padding: 1.5rem; transform: translate(-50%, -50%); }
    header, footer, footer > div { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .guide-kicker, .guide-step { color: var(--accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h2, h3, p { margin: 0; } h2 { margin-top: 0.15rem; font-size: 1.3rem; } h3 { margin-top: 0.9rem; font-size: 1.05rem; }
    .guide-dialog > header p, .guide-card p, .guide-body p { margin-top: 0.4rem; color: var(--text-muted); line-height: 1.5; font-size: 0.85rem; }
    .guide-close { width: 2.25rem; min-height: 2.25rem; padding: 0; border: 0; background: transparent; color: var(--text-muted); font-size: 1.35rem; }
    .guide-list { display: grid; gap: 0.8rem; margin-top: 1.25rem; } .guide-card { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid var(--surface-line); border-radius: 10px; background: var(--surface-raised); }
    .guide-card h3 { grid-column: 2; margin: 0; align-self: start; font-size: 1rem; } .guide-icon { grid-column: 1; grid-row: 1 / span 3; align-self: center; display: grid; place-items: center; width: 2.25rem; height: 2.25rem; margin-top: 0.05rem; border-radius: 7px; background: rgb(53 208 127 / 16%); color: var(--accent); font-size: 1.05rem; }
    .guide-card > div { display: grid; grid-template-columns: 2.25rem minmax(0, 1fr); column-gap: 0.7rem; row-gap: 0.1rem; align-items: start; min-width: 0; } .guide-card p { grid-column: 2; margin: 0; } .guide-progress { display: flex; gap: 0.35rem; margin-top: 1rem; } .guide-progress span { height: 0.25rem; flex: 1; border-radius: 999px; background: var(--surface-line); } .guide-progress span.active, .guide-progress span.complete { background: var(--accent-strong); }
    .guide-complete { grid-column: 2; display: block; margin-top: 0.35rem; color: var(--accent); font-size: 0.72rem; font-weight: 700; }
    footer { margin-top: 1.4rem; } .guide-primary, .guide-secondary { min-height: 38px; padding: 0.45rem 0.7rem; border-radius: 8px; font-size: 0.85rem; } .guide-primary { border: 1px solid var(--accent-strong); background: var(--accent-strong); color: var(--pitch-900); font-weight: 700; } .guide-secondary { border: 1px solid var(--surface-line); background: transparent; color: var(--text-muted); }
    @media (max-width: 560px) { .guide-hint { right: 1rem; bottom: calc(4.5rem + var(--safe-bottom)); width: fit-content; max-width: calc(100vw - 2rem); } .guide-dialog:not(.guide-library) { top: auto; left: 1rem; right: 1rem; bottom: calc(1rem + var(--safe-bottom)); width: auto; } .guide-dialog.guide-library { top: 50%; left: 1rem; right: 1rem; bottom: auto; width: auto; transform: translateY(-50%); } }
  `,
})
export class AdminGuide {
    readonly slug = input<string | null>(null);
    protected readonly t = inject(I18nService).t;
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);
    protected readonly isOpen = signal(false);
    protected readonly showHint = signal(this.loadHintVisibility());
    protected readonly activeGuide = signal<GuideId | null>(null);
    protected readonly step = signal(0);
    protected readonly targetRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);
    protected readonly completedGuides = signal<GuideId[]>(this.loadCompletedGuides());
    private readonly guideSlug = signal<string | null>(null);
    protected readonly guideIds: GuideId[] = ['overview', 'fixtures', 'knockout', 'create', 'setup', 'live'];

    private readonly guideSteps: Record<GuideId, Omit<AdminGuideStep, 'route'>[]> = {
        overview: [
            { target: '[data-guide-target="tournament-header"]', title: () => this.t().guide.headerTitle, text: () => this.t().guide.headerText },
            { target: '[data-guide-target="tournament-status"]', title: () => this.t().guide.statusTitle, text: () => this.t().guide.statusText },
            { target: '[data-guide-target="tournament-tabs"]', title: () => this.t().guide.tabsTitle, text: () => this.t().guide.tabsText },
            { target: '[data-guide-target="tournament-table"]', title: () => this.t().guide.tableTitle, text: () => this.t().guide.tableText },
        ],
        fixtures: [
            { target: '[data-guide-tab="fixtures"]', title: () => this.t().guide.fixturesTabsTitle, text: () => this.t().guide.fixturesTabsText, action: 'click' },
            { target: '[data-guide-target="tournament-fixtures"]', title: () => this.t().guide.fixturesListTitle, text: () => this.t().guide.fixturesListText },
            { target: '[data-guide-target="tournament-match"]', title: () => this.t().guide.fixturesMatchTitle, text: () => this.t().guide.fixturesMatchText },
        ],
        knockout: [
            { target: '[data-guide-tab="bracket"]', title: () => this.t().guide.knockoutTabsTitle, text: () => this.t().guide.knockoutTabsText, action: 'click' },
            { target: '[data-guide-target="tournament-bracket"]', title: () => this.t().guide.knockoutBracketTitle, text: () => this.t().guide.knockoutBracketText },
            { target: '[data-guide-target="tournament-match"]', title: () => this.t().guide.knockoutMatchTitle, text: () => this.t().guide.knockoutMatchText },
        ],
        create: [
            { target: '[data-guide-target="admin-create"]', title: () => this.t().adminGuide.createNameTitle, text: () => this.t().adminGuide.createNameText },
            { target: '[data-guide-target="admin-create-format"]', title: () => this.t().adminGuide.createFormatTitle, text: () => this.t().adminGuide.createFormatText },
            { target: '[data-guide-target="admin-create-submit"]', title: () => this.t().adminGuide.createSubmitTitle, text: () => this.t().adminGuide.createSubmitText },
        ],
        setup: [
            { target: '[data-guide-target="admin-rules"]', title: () => this.t().adminGuide.setupRulesTitle, text: () => this.t().adminGuide.setupRulesText },
            { target: '[data-guide-tab="structure"]', title: () => this.t().adminGuide.setupTeamsTitle, text: () => this.t().adminGuide.setupTeamsText, action: 'click' },
            { target: '[data-guide-target="admin-structure"]', title: () => this.t().adminGuide.setupTeamsTitle, text: () => this.t().adminGuide.setupTeamsText },
            { target: '[data-guide-tab="fixtures"]', title: () => this.t().adminGuide.setupFixturesTitle, text: () => this.t().adminGuide.setupFixturesText, action: 'click' },
            { target: '[data-guide-target="admin-fixtures"]', title: () => this.t().adminGuide.setupFixturesTitle, text: () => this.t().adminGuide.setupFixturesText },
        ],
        live: [
            { target: '[data-guide-target="admin-match-picker"]', title: () => this.t().adminGuide.livePickerTitle, text: () => this.t().adminGuide.livePickerText },
            { target: '[data-guide-target="admin-score-control"]', title: () => this.t().adminGuide.liveScoreTitle, text: () => this.t().adminGuide.liveScoreText },
            { target: '[data-guide-target="admin-status-control"]', title: () => this.t().adminGuide.liveStatusTitle, text: () => this.t().adminGuide.liveStatusText },
        ],
    };

    protected currentSteps(): AdminGuideStep[] {
        const guide = this.activeGuide();
        if (!guide) return [];
        const slug = this.slug() ?? this.guideSlug() ?? this.currentSlug();
        const route = guide === 'create' ? '/admin'
            : ['overview', 'fixtures', 'knockout'].includes(guide) ? `/${slug ?? ''}`
                : `/admin/${slug ?? ''}${guide === 'live' ? '/live' : ''}`;
        return this.guideSteps[guide].map((step) => ({ ...step, route }));
    }

    protected currentStep(): AdminGuideStep | undefined { return this.currentSteps()[this.step()]; }
    protected guideTitle(id: GuideId | null): string {
        if (!id) return this.t().adminGuide.title;
        return ['overview', 'fixtures', 'knockout'].includes(id)
            ? this.t().guide[`${id}Title` as 'overviewTitle' | 'fixturesTitle' | 'knockoutTitle']
            : this.t().adminGuide[`${id}Title` as 'createTitle' | 'setupTitle' | 'liveTitle'];
    }
    protected guideText(id: GuideId): string {
        return ['overview', 'fixtures', 'knockout'].includes(id)
            ? this.t().guide[`${id}Text` as 'overviewText' | 'fixturesText' | 'knockoutText']
            : this.t().adminGuide[`${id}Text` as 'createText' | 'setupText' | 'liveText'];
    }
    protected guideIcon(id: GuideId): string {
        return id === 'overview'
            ? 'fa-book-open'
            : id === 'fixtures'
                ? 'fa-calendar-days'
                : id === 'knockout'
                    ? 'fa-trophy'
                    : id === 'create'
                        ? 'fa-plus'
                        : id === 'setup'
                            ? 'fa-gear'
                            : 'fa-play';
    }
    protected canStart(_id: GuideId): boolean { return true; }
    protected isGuideCompleted(id: GuideId): boolean { return this.completedGuides().includes(id); }
    private currentSlug(): string | null {
        const match = this.router.url.match(/^\/(?:admin\/)?([^/?]+)/);
        return match && match[1] !== 'admin' ? match[1] : null;
    }

    protected dialogPosition(): { top?: number; left?: number } {
        if (typeof window === 'undefined' || window.innerWidth <= 560) return {};
        const target = this.targetRect(); const width = Math.min(430, window.innerWidth - 32);
        if (!target) return { top: 16, left: Math.max(16, (window.innerWidth - width) / 2) };
        const left = target.left + target.width + 16 + width <= window.innerWidth ? target.left + target.width + 16 : Math.max(16, target.left - width - 16);
        return { top: Math.min(Math.max(16, target.top), Math.max(16, window.innerHeight - 300)), left };
    }

    @HostListener('window:resize') @HostListener('window:scroll') refreshTarget(): void { if (this.isOpen()) this.measureTarget(); }
    openLibrary(): void { this.dismissHint(); this.activeGuide.set(null); this.step.set(0); this.targetRect.set(null); this.isOpen.set(true); }
    dismissHint(): void { this.showHint.set(false); localStorage.setItem('ligacup-guide-hint-dismissed', 'true'); }
    async startGuide(id: GuideId): Promise<void> {
        this.activeGuide.set(id);
        this.step.set(0);

        if (id !== 'create' && !this.slug() && !this.guideSlug() && !this.currentSlug()) {
            const tournaments = await firstValueFrom(this.api.getTournaments());
            this.guideSlug.set(tournaments[0]?.slug ?? null);
        }

        const route = this.currentSteps()[0]?.route;
        if (!route || route === '/admin/' || route === '//') {
            this.close();
            return;
        }

        if (this.router.url !== route) {
            await this.router.navigateByUrl(route);
        }
        this.measureTarget();
    }
    close(): void { this.isOpen.set(false); this.activeGuide.set(null); this.targetRect.set(null); }
    previous(): void { this.step.update((value) => Math.max(0, value - 1)); this.measureTarget(); }
    next(): void { if (this.step() < this.currentSteps().length - 1) { const current = this.currentStep(); if (current?.action === 'click') document.querySelector<HTMLElement>(current.target)?.click(); this.step.update((value) => value + 1); this.measureTarget(); } else { const guide = this.activeGuide(); if (guide) this.markGuideCompleted(guide); this.close(); } }
    private markGuideCompleted(id: GuideId): void {
        const completed = this.completedGuides().includes(id) ? this.completedGuides() : [...this.completedGuides(), id];
        this.completedGuides.set(completed);
        localStorage.setItem('ligacup.completed-guides', JSON.stringify(completed));
    }
    private loadCompletedGuides(): GuideId[] {
        if (typeof localStorage === 'undefined') return [];
        try {
            const saved = JSON.parse(localStorage.getItem('ligacup.completed-guides') ?? '[]');
            return Array.isArray(saved) ? saved.filter((id): id is GuideId => this.guideIds.includes(id)) : [];
        } catch { return []; }
    }
    private measureTarget(attempt = 0): void {
        const target = this.currentStep()?.target;
        if (!target || typeof document === 'undefined') {
            this.targetRect.set(null);
            return;
        }

        window.setTimeout(() => {
            const element = document.querySelector<HTMLElement>(target);
            if (!element) {
                if (attempt < 20 && this.isOpen()) {
                    this.measureTarget(attempt + 1);
                } else {
                    this.targetRect.set(null);
                }
                return;
            }

            const rect = element.getBoundingClientRect();
            this.targetRect.set({
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
            });
        }, attempt === 0 ? 0 : 50);
    }
    private loadHintVisibility(): boolean { return typeof localStorage === 'undefined' || localStorage.getItem('ligacup-guide-hint-dismissed') !== 'true'; }
}
