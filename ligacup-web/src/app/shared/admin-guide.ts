import { Component, HostListener, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBookOpen,
  faBullhorn,
  faCalendarCheck,
  faCalendarDays,
  faEye,
  faFutbol,
  faGear,
  faListUl,
  faPlay,
  faPlus,
  faScaleBalanced,
  faSignal,
  faTrophy,
  faUsers,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n/i18n.service';

type GuideId =
  | 'overview'
  | 'fixtures'
  | 'knockout'
  | 'match'
  | 'create'
  | 'setup'
  | 'live'
  | 'events'
  | 'squads'
  | 'rules'
  | 'schedule'
  | 'users'
  | 'connectivity';

interface AdminGuideStep {
  target: string;
  route: string;
  title: () => string;
  text: () => string;
  action?: 'click';
  /** Skip auto-scrolling the target into view on this viewport; useful when scrolling would hide the step's content. */
  noScroll?: 'mobile' | 'desktop' | 'both';
}

@Component({
  selector: 'app-admin-guide',
  imports: [FontAwesomeModule],
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
          @if (canSeeOrganizerGuides()) {
            <div class="guide-tabs" role="tablist" [attr.aria-label]="t().adminGuide.libraryTitle">
              <button
                type="button"
                role="tab"
                [class.active]="guideCategory() === 'visitor'"
                [attr.aria-selected]="guideCategory() === 'visitor'"
                (click)="guideCategory.set('visitor')"
              >
                <fa-icon [icon]="faEye" aria-hidden="true" />
                {{ t().adminGuide.visitorGuides }}
              </button>
              <button
                type="button"
                role="tab"
                [class.active]="guideCategory() === 'organizer'"
                [attr.aria-selected]="guideCategory() === 'organizer'"
                (click)="guideCategory.set('organizer')"
              >
                <fa-icon [icon]="faBullhorn" aria-hidden="true" />
                {{ t().adminGuide.organizerGuides }}
              </button>
            </div>
          }
          <div class="guide-list">
            @for (guide of visibleGuideIds(); track guide) {
              <article class="guide-card">
                <div>
                  <fa-icon class="guide-icon" [icon]="guideIcon(guide)" aria-hidden="true" />
                  <h3>{{ guideTitle(guide) }}</h3>
                  <p>{{ guideText(guide) }}</p>
                  @if (isGuideCompleted(guide)) {
                    <span class="guide-complete">&#10003; {{ t().adminGuide.completed }}</span>
                  } @else if (unavailableText(guide); as reason) {
                    <span class="guide-complete">{{ reason }}</span>
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
              <h3>{{ current.title() }} <span class="guide-step-mobile">({{ step() + 1 }}/{{ currentSteps().length }})</span></h3>
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
    .guide-step-mobile { display: none; }
    h2, h3, p { margin: 0; } h2 { margin-top: 0.15rem; font-size: 1.3rem; } h3 { margin-top: 0.9rem; font-size: 1.05rem; }
    .guide-dialog > header p, .guide-card p, .guide-body p { margin-top: 0.4rem; color: var(--text-muted); line-height: 1.5; font-size: 0.85rem; }
    .guide-close { width: 2.25rem; min-height: 2.25rem; padding: 0; border: 0; background: transparent; color: var(--text-muted); font-size: 1.35rem; }
    .guide-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.3rem; margin-top: 1rem; padding: 0.25rem; border: 1px solid var(--surface-line); border-radius: 8px; background: var(--pitch-800); }
    .guide-tabs button { display: inline-flex; justify-content: center; align-items: center; gap: 0.45rem; min-height: 40px; padding: 0.45rem 0.7rem; border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; }
    .guide-tabs button.active { background: var(--surface-raised); color: var(--text); }
    .guide-list { display: grid; gap: 0.8rem; margin-top: 1.25rem; } .guide-card { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid var(--surface-line); border-radius: 10px; background: var(--surface-raised); }
    .guide-card h3 { grid-column: 2; margin: 0; align-self: start; font-size: 1rem; } .guide-icon { grid-column: 1; grid-row: 1 / span 3; align-self: center; display: grid; place-items: center; width: 2.25rem; height: 2.25rem; margin-top: 0.05rem; border-radius: 7px; background: rgb(53 208 127 / 16%); color: var(--accent); font-size: 1.05rem; }
    .guide-card > div { display: grid; grid-template-columns: 2.25rem minmax(0, 1fr); column-gap: 0.7rem; row-gap: 0.1rem; align-items: start; min-width: 0; } .guide-card p { grid-column: 2; margin: 0; } .guide-progress { display: flex; gap: 0.35rem; margin-top: 1rem; } .guide-progress span { height: 0.25rem; flex: 1; border-radius: 999px; background: var(--surface-line); } .guide-progress span.active, .guide-progress span.complete { background: var(--accent-strong); }
    .guide-complete { grid-column: 2; display: block; margin-top: 0.35rem; color: var(--accent); font-size: 0.72rem; font-weight: 700; }
    footer { margin-top: 1.4rem; } .guide-primary, .guide-secondary { min-height: 38px; padding: 0.45rem 0.7rem; border-radius: 8px; font-size: 0.85rem; } .guide-primary { border: 1px solid var(--accent-strong); background: var(--accent-strong); color: var(--pitch-900); font-weight: 700; } .guide-secondary { border: 1px solid var(--surface-line); background: transparent; color: var(--text-muted); }
    @media (max-width: 560px) {
      .guide-hint { right: 1rem; bottom: calc(4.5rem + var(--safe-bottom)); width: auto; max-width: calc(100vw - 2rem); flex-direction: column; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; }
      .guide-hint-actions { width: 100%; justify-content: space-between; gap: 0.5rem; }
      .guide-progress { display: none; }
      .guide-step { display: none; }
      .guide-step-mobile { display: inline-block; color: var(--accent); font-size: 0.85rem; font-weight: 700; margin-left: 0.35rem; letter-spacing: normal; text-transform: none; }
      .guide-dialog { display: flex; flex-direction: column; max-height: calc(100vh - 2rem); overflow: hidden; }
      .guide-dialog header { flex: 0 0 auto; }
      .guide-dialog:not(.guide-library) { top: auto; left: 1rem; right: 1rem; bottom: calc(1rem + var(--safe-bottom)); width: auto; max-height: min(24rem, calc(100vh - 3rem)); padding: 0.9rem; }
      .guide-dialog.guide-library { top: 50%; left: 1rem; right: 1rem; bottom: auto; width: auto; transform: translateY(-50%); max-height: calc(100vh - 2.5rem); padding: 1rem; }
      .guide-dialog header h2 { font-size: 1.15rem; }
      .guide-dialog header p { font-size: 0.8rem; margin-top: 0.2rem; }
      .guide-list { margin-top: 0.85rem; gap: 0.6rem; overflow-y: auto; flex: 1; min-height: 0; padding-right: 0.15rem; }
      .guide-card { grid-template-columns: 1fr; gap: 0.65rem; padding: 0.75rem; }
      .guide-card .guide-primary { width: 100%; min-height: 36px; font-size: 0.82rem; }
      .guide-card h3 { font-size: 0.95rem; }
      .guide-card p { font-size: 0.8rem; line-height: 1.4; }
      .guide-icon { width: 2rem; height: 2rem; font-size: 0.95rem; }
      .guide-card > div { grid-template-columns: 2rem minmax(0, 1fr); column-gap: 0.6rem; }
      .guide-body { overflow-y: auto; flex: 1; min-height: 0; margin-top: 0.35rem; padding-right: 0.15rem; }
      .guide-body h3 { font-size: 0.95rem; margin-top: 0.35rem; }
      .guide-body p { font-size: 0.82rem; line-height: 1.4; margin-top: 0.3rem; }
      footer { margin-top: 0.85rem; gap: 0.5rem; flex: 0 0 auto; }
      footer .guide-primary, footer .guide-secondary { min-height: 36px; padding: 0.35rem 0.6rem; font-size: 0.8rem; }
    }
  `,
})
export class AdminGuide {
  protected readonly faBullhorn = faBullhorn;
  protected readonly faEye = faEye;
  readonly slug = input<string | null>(null);
  protected readonly t = inject(I18nService).t;
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly isOpen = signal(false);
  protected readonly showHint = signal(this.loadHintVisibility());
  protected readonly activeGuide = signal<GuideId | null>(null);
  protected readonly step = signal(0);
  protected readonly guideCategory = signal<'visitor' | 'organizer'>('visitor');
  protected readonly targetRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);
  private readonly visitorGuideIds: GuideId[] = ['overview', 'fixtures', 'knockout', 'match', 'connectivity'];
  private readonly organizerGuideIds: GuideId[] = ['create', 'setup', 'rules', 'squads', 'schedule', 'live', 'events', 'users'];
  protected readonly guideIds: GuideId[] = [...this.visitorGuideIds, ...this.organizerGuideIds];
  protected readonly completedGuides = signal<GuideId[]>(this.loadCompletedGuides());
  private readonly guideSlug = signal<string | null>(null);
  private readonly defaultSlug = signal<string | null | undefined>(undefined);
  private readonly knockoutSlug = signal<string | null | undefined>(undefined);
  private readonly squadSlug = signal<string | null | undefined>(undefined);
  private readonly eventSlug = signal<string | null | undefined>(undefined);
  private readonly fixtureSlug = signal<string | null | undefined>(undefined);
  private readonly matchRoute = signal<string | null | undefined>(undefined);
  private contextPromise: Promise<void> | null = null;

  private readonly guideSteps: Record<GuideId, Omit<AdminGuideStep, 'route'>[]> = {
    overview: [
      { target: '[data-guide-target="tournament-header"]', title: () => this.t().guide.headerTitle, text: () => this.t().guide.headerText },
      { target: '[data-guide-target="tournament-status"]', title: () => this.t().guide.statusTitle, text: () => this.t().guide.statusText },
      { target: '[data-guide-target="tournament-tabs"]', title: () => this.t().guide.tabsTitle, text: () => this.t().guide.tabsText },
      { target: '[data-guide-target="tournament-table"]', title: () => this.t().guide.tableTitle, text: () => this.t().guide.tableText },
    ],
    fixtures: [
      { target: '[data-guide-tab="fixtures"]', title: () => this.t().guide.fixturesTabsTitle, text: () => this.t().guide.fixturesTabsText, action: 'click' },
      { target: '[data-guide-target="tournament-fixtures"]', title: () => this.t().guide.fixturesListTitle, text: () => this.t().guide.fixturesListText, noScroll: 'both' },
      { target: '[data-guide-target="tournament-match"]', title: () => this.t().guide.fixturesMatchTitle, text: () => this.t().guide.fixturesMatchText },
    ],
    knockout: [
      { target: '[data-guide-tab="bracket"]', title: () => this.t().guide.knockoutTabsTitle, text: () => this.t().guide.knockoutTabsText, action: 'click' },
      { target: '[data-guide-target="tournament-bracket"]', title: () => this.t().guide.knockoutBracketTitle, text: () => this.t().guide.knockoutBracketText },
      { target: '[data-guide-target="tournament-match"]', title: () => this.t().guide.knockoutMatchTitle, text: () => this.t().guide.knockoutMatchText },
    ],
    match: [
      { target: '[data-guide-target="match-scoreboard"]', title: () => this.t().adminGuide.matchScoreTitle, text: () => this.t().adminGuide.matchScoreText },
      { target: '[data-guide-target="match-events"]', title: () => this.t().adminGuide.matchEventsTitle, text: () => this.t().adminGuide.matchEventsText },
      { target: '[data-guide-target="match-details"]', title: () => this.t().adminGuide.matchDetailsTitle, text: () => this.t().adminGuide.matchDetailsText },
    ],
    create: [
      { target: '[data-guide-target="admin-create"]', title: () => this.t().adminGuide.createNameTitle, text: () => this.t().adminGuide.createNameText },
      { target: '[data-guide-target="admin-create-format"]', title: () => this.t().adminGuide.createFormatTitle, text: () => this.t().adminGuide.createFormatText },
      { target: '[data-guide-target="admin-create-submit"]', title: () => this.t().adminGuide.createSubmitTitle, text: () => this.t().adminGuide.createSubmitText },
    ],
    setup: [
      { target: '[data-guide-target="admin-rules"]', title: () => this.t().adminGuide.setupRulesTitle, text: () => this.t().adminGuide.setupRulesText, noScroll: 'both' },
      { target: '[data-guide-tab="structure"]', title: () => this.t().adminGuide.setupTeamsTitle, text: () => this.t().adminGuide.setupTeamsText, action: 'click' },
      { target: '[data-guide-target="admin-structure"]', title: () => this.t().adminGuide.setupTeamsTitle, text: () => this.t().adminGuide.setupTeamsText },
      { target: '[data-guide-tab="fixtures"]', title: () => this.t().adminGuide.setupFixturesTitle, text: () => this.t().adminGuide.setupFixturesText, action: 'click' },
      { target: '[data-guide-target="admin-fixtures"]', title: () => this.t().adminGuide.setupFixturesTitle, text: () => this.t().adminGuide.setupFixturesText, noScroll: 'both' },
    ],
    live: [
      { target: '[data-guide-target="admin-match-picker"]', title: () => this.t().adminGuide.livePickerTitle, text: () => this.t().adminGuide.livePickerText },
      { target: '[data-guide-target="admin-score-control"]', title: () => this.t().adminGuide.liveScoreTitle, text: () => this.t().adminGuide.liveScoreText },
      { target: '[data-guide-target="admin-status-control"]', title: () => this.t().adminGuide.liveStatusTitle, text: () => this.t().adminGuide.liveStatusText },
    ],
    events: [
      { target: '[data-guide-target="admin-match-picker"]', title: () => this.t().adminGuide.eventsPickerTitle, text: () => this.t().adminGuide.eventsPickerText },
      { target: '[data-guide-target="admin-event-form"]', title: () => this.t().adminGuide.eventsFormTitle, text: () => this.t().adminGuide.eventsFormText },
    ],
    squads: [
      { target: '[data-guide-tab="squads"]', title: () => this.t().adminGuide.squadsTabTitle, text: () => this.t().adminGuide.squadsTabText, action: 'click' },
      { target: '[data-guide-target="admin-squads"]', title: () => this.t().adminGuide.squadsManageTitle, text: () => this.t().adminGuide.squadsManageText },
    ],
    rules: [
      { target: '[data-guide-target="admin-rule-settings"]', title: () => this.t().adminGuide.rulesBasicsTitle, text: () => this.t().adminGuide.rulesBasicsText, noScroll: 'both' },
      { target: '[data-guide-target="admin-clock-settings"]', title: () => this.t().adminGuide.rulesClockTitle, text: () => this.t().adminGuide.rulesClockText },
      { target: '[data-guide-target="admin-tiebreakers"]', title: () => this.t().adminGuide.rulesTiebreakersTitle, text: () => this.t().adminGuide.rulesTiebreakersText },
    ],
    schedule: [
      { target: '[data-guide-tab="fixtures"]', title: () => this.t().adminGuide.scheduleTabTitle, text: () => this.t().adminGuide.scheduleTabText, action: 'click' },
      { target: '[data-guide-target="admin-fixture-generator"]', title: () => this.t().adminGuide.scheduleGenerateTitle, text: () => this.t().adminGuide.scheduleGenerateText },
      { target: '[data-guide-target="admin-schedule-list"]', title: () => this.t().adminGuide.scheduleEditTitle, text: () => this.t().adminGuide.scheduleEditText },
    ],
    users: [
      { target: '[data-guide-target="admin-user-create"]', title: () => this.t().adminGuide.usersCreateTitle, text: () => this.t().adminGuide.usersCreateText },
      { target: '[data-guide-target="admin-user-list"]', title: () => this.t().adminGuide.usersManageTitle, text: () => this.t().adminGuide.usersManageText },
    ],
    connectivity: [
      { target: '[data-guide-target="tournament-status"]', title: () => this.t().adminGuide.connectivityStatusTitle, text: () => this.t().adminGuide.connectivityStatusText },
      { target: '[data-guide-tab="fixtures"]', title: () => this.t().adminGuide.connectivityUpdatesTitle, text: () => this.t().adminGuide.connectivityUpdatesText, action: 'click' },
      { target: '[data-guide-target="tournament-match"]', title: () => this.t().adminGuide.connectivityUpdatesTitle, text: () => this.t().adminGuide.connectivityUpdatesText },
    ],
  };

  protected currentSteps(): AdminGuideStep[] {
    const guide = this.activeGuide();
    if (!guide) return [];
    const slug = this.slug() ?? this.guideSlug() ?? this.currentSlug();
    const route = guide === 'create' ? '/admin'
      : guide === 'users' ? '/admin/users'
        : guide === 'match' ? this.matchRoute() ?? ''
          : ['overview', 'fixtures', 'knockout', 'connectivity'].includes(guide) ? `/${slug ?? ''}`
            : `/admin/${slug ?? ''}${['live', 'events'].includes(guide) ? '/live' : ''}`;
    return this.guideSteps[guide].map((step) => ({ ...step, route }));
  }

  protected currentStep(): AdminGuideStep | undefined { return this.currentSteps()[this.step()]; }
  protected guideTitle(id: GuideId | null): string {
    if (!id) return this.t().adminGuide.title;
    return ['overview', 'fixtures', 'knockout'].includes(id)
      ? this.t().guide[`${id}Title` as 'overviewTitle' | 'fixturesTitle' | 'knockoutTitle']
      : this.t().adminGuide[`${id}Title` as 'createTitle' | 'setupTitle' | 'liveTitle' | 'matchTitle' | 'eventsTitle' | 'squadsTitle' | 'rulesTitle' | 'scheduleTitle' | 'usersTitle' | 'connectivityTitle'];
  }
  protected guideText(id: GuideId): string {
    return ['overview', 'fixtures', 'knockout'].includes(id)
      ? this.t().guide[`${id}Text` as 'overviewText' | 'fixturesText' | 'knockoutText']
      : this.t().adminGuide[`${id}Text` as 'createText' | 'setupText' | 'liveText' | 'matchText' | 'eventsText' | 'squadsText' | 'rulesText' | 'scheduleText' | 'usersText' | 'connectivityText'];
  }
  protected guideIcon(id: GuideId): IconDefinition {
    return id === 'overview'
      ? faBookOpen
      : id === 'fixtures'
        ? faCalendarDays
        : id === 'knockout'
          ? faTrophy
          : id === 'match'
            ? faFutbol
            : id === 'connectivity'
              ? faSignal
              : id === 'create'
                ? faPlus
                : id === 'setup'
                  ? faGear
                  : id === 'rules'
                    ? faScaleBalanced
                    : id === 'squads'
                      ? faUsers
                      : id === 'schedule'
                        ? faCalendarCheck
                        : id === 'events'
                          ? faListUl
                          : id === 'users'
                            ? faUserShield
                            : faPlay;
  }
  protected canStart(id: GuideId): boolean {
    if (this.organizerGuideIds.includes(id) && !this.canSeeOrganizerGuides()) return false;
    if (id === 'knockout') return !!this.knockoutSlug();
    if (id === 'match') return !!this.matchRoute();
    if (id === 'events') return !!this.eventSlug();
    if (id === 'squads') return !!this.squadSlug();
    if (id === 'schedule') return !!this.fixtureSlug();
    if (id === 'users') return this.auth.isAdmin();
    return true;
  }
  protected unavailableText(id: GuideId): string | null {
    if (this.canStart(id)) return null;
    if (this.organizerGuideIds.includes(id) && !this.canSeeOrganizerGuides()) return this.t().adminGuide.organizerOnly;
    if (id === 'knockout') return this.t().adminGuide.noKnockout;
    if (id === 'match' || id === 'schedule') return this.t().adminGuide.noMatches;
    if (id === 'events' || id === 'squads') return this.t().adminGuide.noPlayerTracking;
    if (id === 'users') return this.t().adminGuide.adminOnly;
    return null;
  }
  protected isGuideCompleted(id: GuideId): boolean { return this.completedGuides().includes(id); }
  protected canSeeOrganizerGuides(): boolean {
    const role = this.auth.user()?.role;
    return role === 'Editor' || role === 'Admin';
  }
  protected visibleGuideIds(): GuideId[] {
    return this.guideCategory() === 'organizer' && this.canSeeOrganizerGuides()
      ? this.organizerGuideIds
      : this.visitorGuideIds;
  }
  private currentSlug(): string | null {
    const segments = this.router.url.split(/[/?]/).filter(Boolean);
    if (segments[0] === 'admin') return segments[1] && segments[1] !== 'users' ? segments[1] : null;
    return segments[0] && segments[0] !== 'login' ? segments[0] : null;
  }

  protected dialogPosition(): { top?: number; left?: number } {
    if (typeof window === 'undefined' || window.innerWidth <= 560) return {};
    const target = this.targetRect(); const width = Math.min(430, window.innerWidth - 32);
    if (!target) return { top: 16, left: Math.max(16, (window.innerWidth - width) / 2) };
    const left = target.left + target.width + 16 + width <= window.innerWidth ? target.left + target.width + 16 : Math.max(16, target.left - width - 16);
    return { top: Math.min(Math.max(16, target.top), Math.max(16, window.innerHeight - 300)), left };
  }

  @HostListener('window:resize') @HostListener('window:scroll') refreshTarget(): void { if (this.isOpen()) this.measureTarget(0, false); }
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Enter' && this.activeGuide()) {
      event.preventDefault();
      this.next();
    }
  }
  openLibrary(): void {
    this.dismissHint(); this.activeGuide.set(null); this.step.set(0); this.targetRect.set(null);
    this.guideCategory.set(this.router.url.startsWith('/admin') && this.canSeeOrganizerGuides() ? 'organizer' : 'visitor');
    this.isOpen.set(true);
    this.contextPromise = this.resolveGuideContexts();
  }
  private loadGuideContexts(): Promise<void> {
    this.contextPromise ??= this.resolveGuideContexts();
    return this.contextPromise;
  }
  private async resolveGuideContexts(): Promise<void> {
    try {
      const tournaments = await firstValueFrom(this.api.getTournaments());
      const withBracket = tournaments.find((tournament) => tournament.format === 'GroupsThenKnockout' || tournament.format === 'KnockoutOnly');
      const withPlayers = tournaments.find((tournament) => tournament.trackPlayers);
      const withPlayerMatches = tournaments.find((tournament) => tournament.trackPlayers && tournament.matchCount > 0);
      const withFixtures = tournaments.find((tournament) => tournament.matchCount > 0);
      this.defaultSlug.set(tournaments[0]?.slug ?? null);
      this.knockoutSlug.set(withBracket?.slug ?? null);
      this.squadSlug.set(withPlayers?.slug ?? null);
      this.eventSlug.set(withPlayerMatches?.slug ?? null);
      this.fixtureSlug.set(withFixtures?.slug ?? null);

      if (withFixtures) {
        const detail = await firstValueFrom(this.api.getTournament(withFixtures.slug));
        const match = detail.matches[0];
        this.matchRoute.set(match ? `/${withFixtures.slug}/matches/${match.id}` : null);
      } else {
        this.matchRoute.set(null);
      }
    } catch {
      this.defaultSlug.set(null);
      this.knockoutSlug.set(null);
      this.squadSlug.set(null);
      this.eventSlug.set(null);
      this.fixtureSlug.set(null);
      this.matchRoute.set(null);
    }
  }
  dismissHint(): void { this.showHint.set(false); localStorage.setItem('ligacup-guide-hint-dismissed', 'true'); }
  async startGuide(id: GuideId): Promise<void> {
    this.activeGuide.set(id);
    this.step.set(0);
    await this.loadGuideContexts();

    if (id === 'knockout') {
      // The current page's tournament may not have a bracket, so always jump to one that does.
      this.guideSlug.set(this.knockoutSlug() ?? null);
    } else if (id === 'events') {
      this.guideSlug.set(this.eventSlug() ?? null);
    } else if (id === 'squads') {
      this.guideSlug.set(this.squadSlug() ?? null);
    } else if (['match', 'schedule', 'live', 'fixtures', 'connectivity'].includes(id)) {
      this.guideSlug.set(this.fixtureSlug() ?? null);
    } else if (!['create', 'users'].includes(id) && !this.slug() && !this.currentSlug()) {
      this.guideSlug.set(this.defaultSlug() ?? null);
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
  private measureTarget(attempt = 0, allowScroll = true): void {
    const step = this.currentStep();
    const target = step?.target;
    if (!target || typeof document === 'undefined') {
      this.targetRect.set(null);
      return;
    }

    window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(target);
      if (!element) {
        if (attempt < 20 && this.isOpen()) {
          this.measureTarget(attempt + 1, allowScroll);
        } else {
          this.targetRect.set(null);
        }
        return;
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 560;
      const skipScroll = !allowScroll || step?.noScroll === 'both' || step?.noScroll === (isMobile ? 'mobile' : 'desktop');

      // Tabs scroll horizontally on mobile, so the target can sit outside the visible area until scrolled into view.
      // Only do this when a step is first shown; re-running it on the user's own scroll/resize would fight their input.
      if (!skipScroll) element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        this.targetRect.set({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        });
      }, 0);
    }, attempt === 0 ? 0 : 50);
  }
  private loadHintVisibility(): boolean { return typeof localStorage === 'undefined' || localStorage.getItem('ligacup-guide-hint-dismissed') !== 'true'; }
}
