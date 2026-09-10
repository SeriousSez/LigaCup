import { Component, HostListener, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';

interface GuideStep {
    target: string;
    title: () => string;
    text: () => string;
    action?: 'click';
}

type GuideId = 'overview' | 'fixtures' | 'knockout';

@Component({
    selector: 'app-tournament-guide',
    template: `
    <button
      class="guide-help"
      type="button"
      [attr.aria-label]="t().guide.open"
      [title]="t().guide.open"
      (click)="openLibrary()"
    >
      ?
    </button>

    @if (isOpen()) {
      <div class="guide-backdrop" [class.has-target]="!!targetRect()" (click)="close()"></div>
      @if (targetRect(); as target) {
        <div
          class="guide-spotlight"
          [style.top.px]="target.top"
          [style.left.px]="target.left"
          [style.width.px]="target.width"
          [style.height.px]="target.height"
        ></div>
      }
      @if (!activeGuide()) {
        <section class="guide-dialog guide-library" role="dialog" aria-modal="true" [attr.aria-label]="t().guide.libraryTitle">
          <header>
            <div>
              <span class="guide-kicker">{{ t().guide.kicker }}</span>
              <h2>{{ t().guide.libraryTitle }}</h2>
              <p>{{ t().guide.libraryText }}</p>
            </div>
            <button class="guide-close" type="button" [attr.aria-label]="t().guide.close" (click)="close()">&times;</button>
          </header>
          <div class="guide-library-list">
            @for (guide of guideIds; track guide) {
              <article class="guide-card">
                <div>
                  <span class="guide-card-icon">{{ guide === 'overview' ? '◎' : guide === 'fixtures' ? '≡' : '◇' }}</span>
                  <h3>{{ guideTitle(guide) }}</h3>
                  <p>{{ guideText(guide) }}</p>
                </div>
                <button class="guide-primary" type="button" (click)="startGuide(guide)">{{ t().guide.start }}</button>
              </article>
            }
          </div>
        </section>
      } @else {
      <section
        class="guide-dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="t().guide.title"
        [style.top.px]="dialogPosition().top"
        [style.left.px]="dialogPosition().left"
      >
        <header>
          <div>
            <span class="guide-kicker">{{ t().guide.kicker }}</span>
            <h2>{{ guideTitle(activeGuide()) }}</h2>
          </div>
          <button
            class="guide-close"
            type="button"
            [attr.aria-label]="t().guide.close"
            [title]="t().guide.close"
            (click)="close()"
          >
            &times;
          </button>
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
          <button class="guide-secondary" type="button" (click)="close()">
            {{ t().guide.skip }}
          </button>
          <div>
            @if (step() > 0) {
              <button class="guide-secondary" type="button" (click)="previous()">
                {{ t().guide.back }}
              </button>
            }
            <button class="guide-primary" type="button" (click)="next()">
              {{ step() === currentSteps().length - 1 ? t().guide.done : t().guide.next }}
            </button>
          </div>
        </footer>
      </section>
      }
    }
  `,
    styles: `
    :host {
      position: relative;
      z-index: 20;
    }

    .guide-help {
      position: fixed;
      right: 1rem;
      bottom: calc(1rem + var(--safe-bottom));
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: 1px solid var(--surface-line);
      border-radius: 50%;
      background: var(--surface-raised);
      color: var(--accent);
      font-size: 1.2rem;
      font-weight: 700;
      box-shadow: var(--shadow);
      z-index: 25;
    }

    .guide-backdrop {
      position: fixed;
      inset: 0;
      background: rgb(0 8 4 / 62%);
      backdrop-filter: blur(3px);
      z-index: 30;
    }

    .guide-backdrop.has-target {
      background: transparent;
      backdrop-filter: none;
    }

    .guide-spotlight {
      position: fixed;
      border: 2px solid var(--accent);
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgb(0 8 4 / 62%), 0 0 0 5px rgb(53 208 127 / 20%);
      pointer-events: none;
      z-index: 31;
    }

    .guide-dialog {
      position: fixed;
      width: min(430px, calc(100vw - 2rem));
      padding: 1.1rem;
      border: 1px solid var(--surface-line);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: 0 22px 70px rgb(0 0 0 / 55%);
      z-index: 32;
    }

    .guide-library {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    header,
    footer,
    footer > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .guide-kicker,
    .guide-step {
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    h2 {
      margin-top: 0.15rem;
      font-size: 1.3rem;
    }

    h3 {
      margin-top: 0.9rem;
      font-size: 1.05rem;
    }

    .guide-dialog > header p,
    .guide-card p {
      margin-top: 0.35rem;
      color: var(--text-muted);
      line-height: 1.45;
      font-size: 0.85rem;
    }

    .guide-library-list {
      display: grid;
      gap: 0.65rem;
      margin-top: 1rem;
    }

    .guide-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.8rem;
      border: 1px solid var(--surface-line);
      border-radius: 10px;
      background: var(--surface-raised);
    }

    .guide-card h3 {
      display: inline;
      margin: 0;
    }

    .guide-card-icon {
      display: inline-grid;
      place-items: center;
      width: 1.7rem;
      height: 1.7rem;
      margin-right: 0.4rem;
      border-radius: 50%;
      background: var(--pitch-700);
      color: var(--accent);
      font-weight: 700;
    }

    .guide-body p {
      margin-top: 0.45rem;
      color: var(--text-muted);
      line-height: 1.55;
    }

    .guide-close {
      width: 2.25rem;
      min-height: 2.25rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--text-muted);
      font-size: 1.35rem;
    }

    .guide-progress {
      display: flex;
      gap: 0.35rem;
      margin-top: 1rem;
    }

    .guide-progress span {
      height: 0.25rem;
      flex: 1;
      border-radius: 999px;
      background: var(--surface-line);
    }

    .guide-progress span.active,
    .guide-progress span.complete {
      background: var(--accent-strong);
    }

    footer {
      margin-top: 1.4rem;
    }

    .guide-primary,
    .guide-secondary {
      min-height: 38px;
      padding: 0.45rem 0.7rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }

    .guide-primary {
      border: 1px solid var(--accent-strong);
      background: var(--accent-strong);
      color: var(--pitch-900);
      font-weight: 700;
    }

    .guide-secondary {
      border: 1px solid var(--surface-line);
      background: transparent;
      color: var(--text-muted);
    }

    @media (max-width: 560px) {
      .guide-dialog {
        top: auto;
        left: 1rem;
        right: 1rem;
        width: auto;
        bottom: calc(1rem + var(--safe-bottom));
      }

      .guide-dialog.guide-library {
        top: 50%;
        left: 1rem;
        right: 1rem;
        bottom: auto;
        transform: translateY(-50%);
      }
    }
  `,
})
export class TournamentGuide {
    protected readonly t = inject(I18nService).t;
    protected readonly isOpen = signal(false);
    protected readonly step = signal(0);
    protected readonly activeGuide = signal<GuideId | null>(null);
    protected readonly targetRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);
    protected readonly guideIds: GuideId[] = ['overview', 'fixtures', 'knockout'];

    private readonly guideSteps: Record<GuideId, GuideStep[]> = {
        overview: [
            {
                target: '[data-guide-target="tournament-header"]',
                title: () => this.t().guide.headerTitle,
                text: () => this.t().guide.headerText,
            },
            {
                target: '[data-guide-target="tournament-status"]',
                title: () => this.t().guide.statusTitle,
                text: () => this.t().guide.statusText,
            },
            {
                target: '[data-guide-target="tournament-tabs"]',
                title: () => this.t().guide.tabsTitle,
                text: () => this.t().guide.tabsText,
            },
            {
                target: '[data-guide-target="tournament-table"]',
                title: () => this.t().guide.tableTitle,
                text: () => this.t().guide.tableText,
            },
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
    };

    protected currentSteps(): GuideStep[] {
        return this.activeGuide() ? this.guideSteps[this.activeGuide()!] : [];
    }

    protected currentStep(): GuideStep | undefined {
        return this.currentSteps()[this.step()];
    }

    protected dialogPosition(): { top?: number; left?: number } {
        if (typeof window === 'undefined' || window.innerWidth <= 560) {
            return {};
        }

        const target = this.targetRect();
        const width = Math.min(430, window.innerWidth - 32);
        if (!target) {
            return { top: 16, left: Math.max(16, (window.innerWidth - width) / 2) };
        }

        const gap = 16;
        const left = target.left + target.width + gap + width <= window.innerWidth
            ? target.left + target.width + gap
            : Math.max(16, target.left - width - gap);
        const top = Math.min(
            Math.max(16, target.top),
            Math.max(16, window.innerHeight - 300),
        );
        return { top, left };
    }

    @HostListener('window:resize')
    @HostListener('window:scroll')
    refreshTarget(): void {
        if (this.isOpen()) {
            this.measureTarget();
        }
    }

    protected guideTitle(guideId: GuideId | null): string {
        return guideId ? this.t().guide[`${guideId}Title` as 'overviewTitle' | 'fixturesTitle' | 'knockoutTitle'] : this.t().guide.title;
    }

    protected guideText(guideId: GuideId): string {
        return this.t().guide[`${guideId}Text` as 'overviewText' | 'fixturesText' | 'knockoutText'];
    }

    openLibrary(): void {
        this.activeGuide.set(null);
        this.step.set(0);
        this.targetRect.set(null);
        this.isOpen.set(true);
    }

    startGuide(guideId: GuideId): void {
        this.activeGuide.set(guideId);
        this.step.set(0);
        this.measureTarget();
    }

    close(): void {
        this.isOpen.set(false);
        this.activeGuide.set(null);
        this.targetRect.set(null);
    }

    previous(): void {
        this.step.update((value) => Math.max(0, value - 1));
        this.measureTarget();
    }

    next(): void {
        if (this.step() < this.currentSteps().length - 1) {
            const current = this.currentStep();
            if (current?.action === 'click') {
                const element = document.querySelector<HTMLElement>(current.target);
                element?.click();
            }
            this.step.update((value) => value + 1);
            this.measureTarget();
            return;
        }

        this.close();
    }

    private measureTarget(): void {
        const target = this.currentStep()?.target;
        if (!target || typeof document === 'undefined') {
            this.targetRect.set(null);
            return;
        }

        window.setTimeout(() => {
            const element = document.querySelector<HTMLElement>(target);
            if (!element) {
                this.targetRect.set(null);
                return;
            }

            const rect = element.getBoundingClientRect();
            this.targetRect.set({
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
            });
        });
    }
}
