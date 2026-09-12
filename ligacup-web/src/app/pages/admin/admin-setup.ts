import { AfterViewChecked, Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { defaultTournamentRulesWithoutDate, removeLegacyDefaultDateTime } from '../../core/default-rules';
import { TournamentStore } from '../../core/tournament.store';
import { FormSkeleton, HeadingSkeleton } from '../../shared/loading-skeletons';
import { SelectField, SelectOption } from '../../shared/select-field';
import { DateTimePicker } from '../../shared/date-time-picker';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { Group, Match, SaveTournamentRequest, Team, TiebreakerRule, TournamentFormat, TournamentStatus } from '../../core/models';

@Component({
  selector: 'app-admin-setup',
  imports: [FormsModule, RouterLink, FontAwesomeModule, HeadingSkeleton, FormSkeleton, SelectField, DateTimePicker, ConfirmDialog],
  template: `
    @if (detail(); as data) {
      <section class="spread heading">
        <div>
          <h1>{{ data.tournament.name }}</h1>
          <p class="muted">{{ t().setup.subtitle }}</p>
        </div>
        <div class="row">
          <a [routerLink]="['/admin', data.tournament.slug, 'live']">
            <button class="primary" type="button">{{ t().tournament.liveConsole }}</button>
          </a>
          <a [routerLink]="['/', data.tournament.slug]">
            <button class="ghost" type="button">{{ t().setup.publicPage }}</button>
          </a>
        </div>
      </section>

      <nav class="admin-tabs" role="tablist" aria-label="Admin setup sections">
        <button
          type="button"
          role="tab"
          data-guide-tab="rules"
          [class.active]="activeTab() === 'rules'"
          [attr.aria-selected]="activeTab() === 'rules'"
          (click)="activeTab.set('rules')"
        >
          {{ t().setup.rules }}
        </button>
        <button
          type="button"
          role="tab"
          data-guide-tab="structure"
          [class.active]="activeTab() === 'structure'"
          [attr.aria-selected]="activeTab() === 'structure'"
          (click)="activeTab.set('structure')"
        >
          {{ t().setup.groups }} &amp; {{ t().setup.teams }}
        </button>
        @if (data.tournament.trackPlayers) {
          <button
            type="button"
            role="tab"
            data-guide-tab="squads"
            [class.active]="activeTab() === 'squads'"
            [attr.aria-selected]="activeTab() === 'squads'"
            (click)="activeTab.set('squads')"
          >
            {{ t().setup.squads }}
          </button>
        }
        <button
          type="button"
          role="tab"
          data-guide-tab="fixtures"
          [class.active]="activeTab() === 'fixtures'"
          [attr.aria-selected]="activeTab() === 'fixtures'"
          (click)="activeTab.set('fixtures')"
        >
          {{ t().setup.fixtures }}
        </button>
      </nav>

      @if (fixturesNeedReview()) {
        <aside class="fixture-warning" role="status">
          <div>
            <strong>{{ t().setup.fixturesNeedReviewTitle }}</strong>
            <p>{{ t().setup.fixturesNeedReviewMessage }}</p>
          </div>
          <button type="button" (click)="activeTab.set('fixtures')">{{ t().setup.reviewFixtures }}</button>
        </aside>
      }

      @if (activeTab() === 'rules') {
        <section class="card stack rules-section" data-guide-target="admin-rules">
        <div class="rules-header">
          <h3>{{ t().setup.rules }}</h3>
          <div class="rules-actions">
            @if (message()) {
              <span class="muted">{{ message() }}</span>
            }
            <button class="primary" type="button" (click)="saveSettings()" [disabled]="busy() || !hasUnsavedSettingsChanges()">
              {{ t().setup.saveRules }}
            </button>
          </div>
        </div>
        <details class="collapsible default-settings" data-guide-target="admin-rule-settings" open>
        <summary class="section-summary">{{ t().setup.defaultSettings }}</summary>
        <div class="form-grid">
          <label>
            {{ t().common.name }}
            <input [(ngModel)]="settings.name" />
          </label>
          <label>
            {{ t().common.tournamentDateTime }}
            <app-date-time-picker [(ngModel)]="settings.tournamentDateUtc" />
          </label>
          <label>
            {{ t().setup.location }}
            <input
              [(ngModel)]="settings.location"
              [placeholder]="t().setup.locationPlaceholder"
              maxlength="160"
            />
          </label>
          <label>
            {{ t().setup.status }}
            <app-select [options]="statusOptions()" [(ngModel)]="settings.status" />
          </label>
          <label>
            {{ t().setup.format }}
            <app-select [options]="formatOptions()" [(ngModel)]="settings.format" />
          </label>
          <label>
            {{ t().setup.pointsWin }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForWin" />
          </label>
          <label>
            {{ t().setup.pointsDraw }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForDraw" />
          </label>
          <label>
            {{ t().setup.pointsLoss }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForLoss" />
          </label>
          <label>
            {{ t().setup.groupRounds }}
            <input type="number" inputmode="numeric" min="1" max="4" [(ngModel)]="settings.groupRounds" />
          </label>
          <label>
            {{ t().setup.advancing }}
            <input
              type="number"
              inputmode="numeric"
              min="0"
              [(ngModel)]="settings.teamsAdvancingPerGroup"
            />
          </label>
        </div>

        <div class="row toggles">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackPlayers" />
            {{ t().setup.trackPlayers }}
          </label>
          @if (settings.trackPlayers) {
            <label>
              {{ t().setup.playerRegistration }}
              <app-select [options]="playerRegistrationOptions()" [(ngModel)]="settings.playerRegistrationMode" />
            </label>
          }
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackCards" />
            {{ t().setup.trackCards }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.hasThirdPlacePlayOff" />
            {{ t().setup.thirdPlace }}
          </label>
        </div>
        <div class="stack rules-content-panel">
          <h4>{{ t().setup.rulesContent }}</h4>
          <div class="rules-editor">
            <div class="rules-toolbar" role="toolbar" [attr.aria-label]="t().setup.rulesContent" (mousedown)="$event.preventDefault()">
              <button type="button" [title]="t().setup.rulesBold" [attr.aria-label]="t().setup.rulesBold" (click)="formatRules('bold')"><strong>B</strong></button>
              <button type="button" [title]="t().setup.rulesItalic" [attr.aria-label]="t().setup.rulesItalic" (click)="formatRules('italic')"><em>I</em></button>
              <button type="button" [title]="t().setup.rulesList" [attr.aria-label]="t().setup.rulesList" (click)="formatRules('insertUnorderedList')">&#8226;</button>
              <button type="button" [title]="t().setup.rulesNumberedList" [attr.aria-label]="t().setup.rulesNumberedList" (click)="formatRules('insertOrderedList')">&#35;</button>
              <button type="button" [title]="t().setup.rulesHeading" [attr.aria-label]="t().setup.rulesHeading" (click)="formatRules('formatBlock', 'h3')">H</button>
              <button type="button" [title]="t().setup.rulesUnderline" [attr.aria-label]="t().setup.rulesUnderline" (click)="formatRules('underline')"><u>U</u></button>
              <button type="button" [title]="t().setup.rulesQuote" [attr.aria-label]="t().setup.rulesQuote" (click)="formatRules('formatBlock', 'blockquote')">&ldquo;</button>
              <button type="button" [title]="t().setup.rulesUndo" [attr.aria-label]="t().setup.rulesUndo" (click)="formatRules('undo')">&larr;</button>
              <button type="button" [title]="t().setup.rulesRedo" [attr.aria-label]="t().setup.rulesRedo" (click)="formatRules('redo')">&rarr;</button>
              <button type="button" [title]="t().setup.rulesClear" [attr.aria-label]="t().setup.rulesClear" (click)="formatRules('removeFormat')">&times;</button>
            </div>
            <div #rulesContent class="rules-content" contenteditable="true" (mouseup)="saveRulesSelection()" (keyup)="saveRulesSelection()" (input)="updateRules($event)"></div>
          </div>
          <span class="muted">{{ t().setup.rulesContentHelp }}</span>
        </div>
        </details>

        <details class="collapsible" data-guide-target="admin-clock-settings">
          <summary>{{ t().setup.clockSection }}</summary>
          <div class="stack collapsible-content">
          <p class="muted">{{ t().setup.clockHelp }}</p>
          <div class="form-grid">
            <label>
              {{ t().setup.periodCount }}
              <input
                type="number"
                inputmode="numeric"
                min="1"
                max="4"
                [(ngModel)]="settings.periodCount"
              />
            </label>
            <label>
              {{ t().setup.periodDuration }}
              <input
                type="number"
                inputmode="numeric"
                min="1"
                max="90"
                [(ngModel)]="settings.periodDurationMinutes"
              />
            </label>
            <label>
              {{ t().setup.breakDuration }}
              <input
                type="number"
                inputmode="numeric"
                min="0"
                max="60"
                [(ngModel)]="settings.breakDurationMinutes"
              />
            </label>
            <label>
              {{ t().setup.matchInterval }}
              <input
                type="number"
                inputmode="numeric"
                min="0"
                max="180"
                [(ngModel)]="settings.matchIntervalMinutes"
              />
            </label>
            <label>
              {{ t().setup.matchesPerTimeSlot }}
              <input type="number" inputmode="numeric" min="1" max="16" [(ngModel)]="settings.matchesPerTimeSlot" />
            </label>
          </div>
          <p class="muted interval-help">{{ t().setup.matchIntervalHelp }}</p>
          <div class="row toggles">
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.trackMatchClock" />
              {{ t().setup.trackMatchClock }}
            </label>
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.useStoppageTime" />
              {{ t().setup.useStoppageTime }}
            </label>
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.allowTimeouts" />
              {{ t().setup.allowTimeouts }}
            </label>
          </div>
          </div>
        </details>

        <details class="collapsible" data-guide-target="admin-tiebreakers">
          <summary>{{ t().setup.tiebreakersTitle }}</summary>
          <div class="stack collapsible-content">
          <p class="muted">{{ t().setup.tiebreakersHelp }}</p>
          <div class="tiebreakers">
            @for (rule of tiebreakers(); track rule; let index = $index) {
              <div class="rule">
                <span>{{ index + 1 }}. {{ t().tiebreaker[rule] }}</span>
                <button
                  type="button"
                  class="ghost"
                  [attr.aria-label]="t().setup.moveUp"
                  (click)="moveRule(index, -1)"
                  [disabled]="index === 0"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  class="ghost"
                  [attr.aria-label]="t().setup.moveDown"
                  (click)="moveRule(index, 1)"
                  [disabled]="index === tiebreakers().length - 1"
                >
                  &darr;
                </button>
                <button type="button" class="danger" (click)="confirmRemoveRule(index, t().tiebreaker[rule])">
                  {{ t().common.remove }}
                </button>
              </div>
            }
          </div>
          <div class="add-rule">
            <app-select
              [options]="availableRuleOptions()"
              [ngModel]="ruleToAdd ?? availableRules()[0]"
              (ngModelChange)="ruleToAdd = $event"
            />
            <button type="button" (click)="addRule()" [disabled]="!availableRules().length">
              {{ t().common.add }}
            </button>
          </div>
          </div>
        </details>

        </section>
      }

      @if (activeTab() === 'structure') {
        <section class="card stack" data-guide-target="admin-structure">
        <h3>{{ t().setup.groups }}</h3>
        <div class="row">
          @for (group of data.groups; track group.id) {
            <span class="badge">
              {{ group.name }}
              <button type="button" class="danger tiny" (click)="confirmRemoveGroup(group.id, group.name)">&times;</button>
            </span>
          } @empty {
            <span class="muted">{{ t().setup.noGroups }}</span>
          }
        </div>
        <div class="add-player">
          <input [(ngModel)]="newGroupName" [placeholder]="t().setup.groupPlaceholder" />
          <button type="button" (click)="addGroup()">{{ t().setup.addGroup }}</button>
        </div>
        </section>

        <section class="card stack" data-guide-target="admin-squads">
        <h3>{{ t().setup.teams }}</h3>
        <div class="team-rows">
          @for (team of data.teams; track team.id) {
            <div class="team-row">
              <div class="team-main">
                @if (editingTeamId() === team.id) {
                  <input [(ngModel)]="team.name" [placeholder]="t().setup.teamPlaceholder" />
                  <div class="team-meta">
                    <input
                      class="tiny-input"
                      [(ngModel)]="team.shortName"
                      [placeholder]="t().setup.shortPlaceholder"
                      maxlength="10"
                    />
                    @if (team.pointsAdjustment !== 0) {
                      &middot; {{ team.pointsAdjustment > 0 ? '+' : '' }}{{ team.pointsAdjustment }}
                      {{ t().setup.pointsSuffix }}
                    }
                  </div>
                } @else {
                  <strong>{{ team.name }}</strong>
                  <span class="muted">
                    {{ team.shortName ?? t().setup.noShortName }}
                    @if (team.pointsAdjustment !== 0) {
                      &middot; {{ team.pointsAdjustment > 0 ? '+' : '' }}{{ team.pointsAdjustment }}
                      {{ t().setup.pointsSuffix }}
                    }
                  </span>
                }
              </div>
              <div class="controls">
                <app-select
                  [options]="groupOptions(data.groups)"
                  [ngModel]="team.groupId"
                  (ngModelChange)="assignGroup(team.id, team.name, team.shortName, $event)"
                />
                @if (editingTeamId() === team.id) {
                  <button
                    class="primary icon-button"
                    type="button"
                    [attr.aria-label]="t().common.save"
                    [title]="t().common.save"
                    (click)="saveTeam(team)"
                  >
                    &#10003;
                  </button>
                  <button
                    class="icon-button"
                    type="button"
                    [attr.aria-label]="t().common.cancel"
                    [title]="t().common.cancel"
                    (click)="cancelTeamEdit()"
                  >
                    &times;
                  </button>
                } @else {
                  <button
                    class="icon-button"
                    type="button"
                    [attr.aria-label]="t().common.edit"
                    [title]="t().common.edit"
                    (click)="editTeam(team.id)"
                  >
                    &#9998;
                  </button>
                  <button
                    type="button"
                    class="danger icon-button"
                    [attr.aria-label]="t().common.remove"
                    [title]="t().common.remove"
                    (click)="confirmRemoveTeam(team.id, team.name)"
                  >
                    &#128465;
                  </button>
                }
              </div>
            </div>
          } @empty {
            <p class="muted">{{ t().setup.teams }}: 0</p>
          }
        </div>

        <div class="add-team">
          <input [(ngModel)]="newTeamName" [placeholder]="t().setup.teamPlaceholder" />
          <input
            class="tiny-input"
            [(ngModel)]="newTeamShort"
            [placeholder]="t().setup.shortPlaceholder"
            maxlength="10"
          />
          <app-select [options]="groupOptions(data.groups)" [(ngModel)]="newTeamGroupId" />
          <button type="button" (click)="addTeam()">{{ t().setup.addTeam }}</button>
        </div>
        </section>
      }

      @if (data.tournament.trackPlayers && activeTab() === 'squads') {
        <section class="card stack">
          <h3>{{ t().setup.squads }}</h3>
          @for (team of data.teams; track team.id) {
            <div class="squad">
              <strong>{{ team.name }}</strong>
              <div class="row players">
                @for (player of team.players; track player.id) {
                  <span class="badge">
                    @if (player.shirtNumber !== null) {
                      {{ player.shirtNumber }}
                    }
                    {{ player.name }}
                    <button type="button" class="danger tiny" (click)="confirmRemovePlayer(player.id, player.name)">
                      &times;
                    </button>
                  </span>
                } @empty {
                  <span class="muted">{{ t().setup.noPlayers }}</span>
                }
              </div>
              <div class="add-player">
                @if (data.tournament.playerRegistrationMode !== 'Numbers') {
                  <input [(ngModel)]="playerDrafts[team.id]" [placeholder]="t().setup.playerPlaceholder" />
                }
                @if (data.tournament.playerRegistrationMode !== 'Names') {
                  <input class="number-input" [(ngModel)]="playerNumberDrafts[team.id]" [placeholder]="t().setup.shirtNumberPlaceholder" inputmode="numeric" />
                }
                <button type="button" (click)="addPlayer(team.id)">{{ t().common.add }}</button>
              </div>
            </div>
          }
        </section>
      }

      @if (activeTab() === 'fixtures') {
        <section class="card stack" data-guide-target="admin-fixtures">
        <h3>{{ t().setup.fixtures }}</h3>
        <p class="muted">{{ t().setup.fixturesHelp }}</p>
        <div class="row" data-guide-target="admin-fixture-generator">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateGroups" />
            {{ t().setup.groupStage }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateKnockout" />
            {{ t().setup.knockoutBracket }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="replaceExisting" />
            {{ t().setup.replaceExisting }}
          </label>
        </div>
        <div class="row">
          <button class="primary" type="button" (click)="generate()" [disabled]="busy()">
            {{ t().setup.generate }}
          </button>
          <button type="button" (click)="addMatch()" [disabled]="busy()">
            {{ t().setup.addMatch }}
          </button>
          <button type="button" (click)="seedKnockout()" [disabled]="busy()">
            {{ t().setup.seedKnockout }}
          </button>
        </div>
        @if (fixtureMessage()) {
          <p class="muted">{{ fixtureMessage() }}</p>
        }
        @if (data.matches.length) {
          <div class="schedule-list" data-guide-target="admin-schedule-list">
            <div class="schedule-heading">
              <h4>{{ t().setup.schedule }}</h4>
              <button
                type="button"
                class="primary"
                [disabled]="busy() || !hasUnsavedScheduleChanges()"
                (click)="saveAllSchedules()"
              >
                <fa-icon [icon]="faFloppyDisk" aria-hidden="true" />
                {{ t().setup.saveAllSchedule }}
              </button>
            </div>
            @for (match of scheduleMatches(data.matches); track match.id) {
              <div class="schedule-row">
                @if (match.stage === 'Group') {
                  <label>
                    {{ t().setup.homeTeam }}
                    <app-select [options]="teamOptions(data.teams, match.awayTeamId)" [(ngModel)]="match.homeTeamId" />
                  </label>
                  <label>
                    {{ t().setup.awayTeam }}
                    <app-select [options]="teamOptions(data.teams, match.homeTeamId)" [(ngModel)]="match.awayTeamId" />
                  </label>
                } @else {
                  <strong>{{ match.homeTeamName }} - {{ match.awayTeamName }}</strong>
                }
                <label>
                  {{ t().setup.kickoff }}
                  <app-date-time-picker [(ngModel)]="match.kickoffUtc" />
                </label>
                <label>
                  {{ t().setup.pitchNumber }}
                  <input type="number" min="1" [(ngModel)]="match.pitchNumber" />
                </label>
                <label>
                  {{ t().setup.location }}
                  <input
                    [(ngModel)]="match.venue"
                    [placeholder]="t().setup.locationOverridePlaceholder"
                    maxlength="160"
                  />
                </label>
                <div class="schedule-actions">
                  <button
                    type="button"
                    class="icon-button"
                    [disabled]="busy() || !hasScheduleChanges(match)"
                    [attr.aria-label]="t().setup.saveSchedule"
                    [title]="t().setup.saveSchedule"
                    (click)="saveSchedule(match)"
                  >
                    <fa-icon [icon]="faFloppyDisk" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="danger icon-button"
                    [attr.aria-label]="t().common.remove"
                    [title]="t().common.remove"
                    (click)="confirmDeleteSchedule(match)"
                  >
                    <fa-icon [icon]="faTrashCan" aria-hidden="true" />
                  </button>
                </div>
              </div>
            }
          </div>
        }
        </section>
      }

      <app-confirm-dialog
        [open]="pendingConfirmation() !== null"
        [title]="t().common.remove"
        [message]="pendingConfirmation()?.message ?? ''"
        [confirmLabel]="t().common.remove"
        [cancelLabel]="t().common.cancel"
        (confirmed)="confirmPendingAction()"
        (cancelled)="pendingConfirmation.set(null)"
      />
      <app-confirm-dialog
        [open]="leaveConfirmation() !== null"
        [title]="t().setup.unsavedScheduleTitle"
        [message]="t().setup.unsavedScheduleMessage"
        [confirmLabel]="t().setup.discardScheduleChanges"
        [cancelLabel]="t().setup.stayOnPage"
        [alternateLabel]="t().setup.saveScheduleChanges"
        (confirmed)="resolveLeave(true)"
        (cancelled)="resolveLeave(false)"
        (alternate)="saveAllAndLeave()"
      />
      <app-confirm-dialog
        [open]="fixtureReviewConfirmation() !== null"
        [title]="t().setup.fixturesNeedReviewTitle"
        [message]="t().setup.fixturesNeedReviewMessage"
        [confirmLabel]="t().setup.leaveAnyway"
        [cancelLabel]="t().setup.reviewFixtures"
        (confirmed)="resolveFixtureReview(true)"
        (cancelled)="reviewFixturesBeforeLeaving()"
      />
    } @else {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-heading-skeleton />
      <app-form-skeleton [sections]="2" [fields]="4" />
    }
  `,
  styles: `
    .heading {
      margin-bottom: 1.25rem;
    }

    .heading p {
      margin: 0;
    }

    .admin-tabs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      margin-bottom: 1rem;
      padding: 0.3rem;
      background: var(--surface-raised);
      border: 1px solid var(--surface-line);
      border-radius: 12px;
    }

    .admin-tabs button {
      min-height: var(--tap);
      padding: 0.55rem 0.65rem;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      font-weight: 600;
    }

    .admin-tabs button.active {
      background: var(--pitch-800);
      color: var(--text);
      box-shadow: 0 1px 3px rgb(0 0 0 / 16%);
    }

    section.card {
      margin-bottom: 1rem;
    }

    .fixture-warning {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 0.8rem 1rem;
      border: 1px solid var(--warning);
      border-radius: 10px;
      background: color-mix(in srgb, var(--warning) 8%, var(--surface-raised));
    }

    .fixture-warning p {
      margin: 0.2rem 0 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .fixture-warning button { flex: none; }

    .toggles {
      gap: 0.5rem;
      display: grid;
    }

    .narrow {
      width: 100%;
    }

    .add-team {
      display: grid;
      grid-template-columns: 1fr 90px;
      gap: 0.5rem;
    }

    .add-team button,
    .add-team select {
      grid-column: 1 / -1;
    }

    .add-player {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 0.5rem;
    }

    .number-input {
      max-width: 5rem;
    }

    .team-rows {
      display: grid;
    }

    .team-row {
      display: grid;
      gap: 0.5rem;
      padding-block: 0.7rem;
      border-bottom: 1px solid var(--surface-line);
    }

    .team-main {
      display: grid;
      gap: 0.5rem;
      min-width: 0;
    }

    .team-main strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .team-main span {
      font-size: 0.8rem;
    }

    .controls {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 0.5rem;
    }

    .icon-button {
      width: var(--tap);
      padding-inline: 0;
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      line-height: 1;
    }

    .tiny-input {
      max-width: 100%;
    }

    .team-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      min-width: 0;
      margin-left: 0.35rem;
    }

    .team-meta .tiny-input {
      width: 100%;
    }

    .rules-editor {
      border: 1px solid var(--surface-line);
      border-radius: 10px;
      overflow: hidden;
      background: var(--pitch-800);
    }

    .rules-content-panel {
      margin-top: 0.5rem;
    }

    .rules-header,
    .rules-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .rules-header {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .rules-header h3 { margin: 0; }

    .rules-actions {
      justify-content: flex-end;
      margin-left: auto;
    }

    .rules-toolbar {
      display: flex;
      gap: 0.25rem;
      padding: 0.35rem;
      border-bottom: 1px solid var(--surface-line);
      background: var(--surface-raised);
    }

    .rules-toolbar button {
      width: 2.25rem;
      min-height: 2.25rem;
      padding: 0;
    }

    .rules-content {
      min-height: 220px;
      padding: 0.7rem;
      outline: none;
    }

    .rules-content:focus {
      box-shadow: inset 0 0 0 2px var(--accent);
    }

    .collapsible {
      border-top: 1px solid var(--surface-line);
      padding-top: 0.75rem;
    }

    .collapsible summary {
      cursor: pointer;
      color: var(--text);
      font-weight: 700;
      list-style-position: inside;
    }

    .rules-section > .section-summary {
      cursor: pointer;
      color: var(--text);
      font-size: 1.25rem;
      font-weight: 700;
      list-style-position: inside;
    }

    .collapsible-content {
      margin-top: 0.75rem;
    }

    .default-settings > .form-grid {
      margin-top: 0.75rem;
    }

    .interval-help {
      margin: -0.45rem 0 0;
      font-size: 0.8rem;
    }

    .schedule-list {
      display: grid;
      gap: 0.6rem;
    }

    .schedule-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .schedule-heading h4 { margin: 0; }

    .schedule-heading button {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .schedule-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.5rem;
      align-items: center;
      padding: 0.65rem 0.75rem;
      border: 1px solid var(--surface-line);
      border-radius: 10px;
      background: var(--surface-raised);
    }

    .schedule-row input {
      width: 100%;
    }

    .schedule-row label {
      font-size: 0.75rem;
    }

    .schedule-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      align-self: end;
    }

    .schedule-actions button {
      white-space: nowrap;
    }

    @media (min-width: 1000px) {
      .schedule-row {
        grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 1fr) 13rem 6rem minmax(12rem, 1fr) auto;
      }

      .schedule-row > strong {
        grid-column: 1 / -1;
      }
    }

    .tiny {
      padding: 0 0.35rem;
      min-height: 0;
      border: none;
      background: transparent;
      line-height: 1;
    }

    .tiebreakers {
      display: grid;
      gap: 0.4rem;
    }

    .rule {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--surface-raised);
      border-radius: 10px;
      padding: 0.35rem 0.5rem;
    }

    .rule span {
      flex: 1;
      font-size: 0.9rem;
    }

    .rule button {
      min-height: 38px;
      padding-inline: 0.6rem;
    }

    .add-rule {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
    }

    .squad {
      border-top: 1px solid var(--surface-line);
      padding-top: 0.75rem;
      display: grid;
      gap: 0.5rem;
    }

    .players {
      gap: 0.4rem;
    }

    h4 {
      margin: 0;
    }

    @media (min-width: 700px) {
      .admin-tabs {
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      }

      section.card {
        margin-bottom: 1.25rem;
      }

      .toggles {
        display: flex;
        gap: 1.25rem;
      }

      .narrow {
        max-width: 220px;
      }

      .add-team {
        display: flex;
        flex-wrap: wrap;
      }

      .add-team input,
      .add-team select {
        max-width: 220px;
      }

      .add-team .tiny-input {
        max-width: 90px;
      }

      .add-team button,
      .add-team select {
        grid-column: auto;
      }

      .add-player {
        max-width: 420px;
      }

      .add-rule {
        max-width: 420px;
      }

      .team-row {
        grid-template-columns: minmax(0, 1fr) 200px auto auto auto;
        align-items: center;
        gap: 1rem;
      }

      .team-main {
        grid-template-columns: minmax(0, 1fr) 90px;
        align-items: center;
      }

      .team-meta {
        grid-column: 2;
        grid-row: 1;
      }

      /* display: contents lets the select and button join the parent grid on wide screens. */
      .controls {
        display: contents;
      }
    }
  `,
})
export class AdminSetup implements OnInit, AfterViewChecked {
  protected readonly faFloppyDisk = faFloppyDisk;
  protected readonly faTrashCan = faTrashCan;
  readonly slug = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly store = inject(TournamentStore);
  protected readonly detail = this.store.detail;
  protected readonly activeTab = signal<'rules' | 'structure' | 'squads' | 'fixtures'>('rules');

  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly fixtureMessage = signal<string | null>(null);
  protected readonly pendingConfirmation = signal<{ message: string; action: () => Promise<void> | void } | null>(null);
  protected readonly leaveConfirmation = signal<{ resolve: (canLeave: boolean) => void } | null>(null);
  protected readonly fixtureReviewConfirmation = signal<{ resolve: (canLeave: boolean) => void } | null>(null);
  private readonly structuralFixtureChange = signal(false);
  protected readonly tiebreakers = signal<TiebreakerRule[]>([]);
  @ViewChild('rulesContent') private rulesContent?: ElementRef<HTMLElement>;
  private initializedRulesEditor: HTMLElement | null = null;
  private rulesSelection: Range | null = null;
  private settingsSnapshot: string | null = null;
  private readonly scheduleSnapshots = new WeakMap<Match, string>();
  protected readonly editingTeamId = signal<number | null>(null);

  protected readonly allRules: TiebreakerRule[] = [
    'GoalDifference',
    'GoalsScored',
    'GoalsConceded',
    'Wins',
    'HeadToHeadPoints',
    'HeadToHeadGoalDifference',
    'HeadToHeadGoalsScored',
    'DisciplinaryPoints',
    'TeamName',
    'Lottery',
  ];

  protected readonly availableRules = computed(() =>
    this.allRules.filter((rule) => !this.tiebreakers().includes(rule)),
  );

  protected readonly availableRuleOptions = computed<SelectOption<TiebreakerRule>[]>(() =>
    this.availableRules().map((rule) => ({ value: rule, label: this.t().tiebreaker[rule] })),
  );

  protected readonly statusOptions = computed<SelectOption<TournamentStatus>[]>(() => {
    const labels = this.t().tournamentStatus;
    return [
      { value: 'Draft', label: labels.Draft },
      { value: 'InProgress', label: labels.InProgress },
      { value: 'Completed', label: labels.Completed },
      { value: 'Archived', label: labels.Archived },
    ];
  });

  protected readonly formatOptions = computed<SelectOption<TournamentFormat>[]>(() => {
    const labels = this.t().format;
    return [
      { value: 'League', label: labels.League },
      { value: 'GroupsThenKnockout', label: labels.GroupsThenKnockout },
      { value: 'GroupsOnly', label: labels.GroupsOnly },
      { value: 'KnockoutOnly', label: labels.KnockoutOnly },
    ];
  });

  groupOptions(groups: Group[]): SelectOption<number | null>[] {
    return [
      { value: null, label: this.t().common.unassigned },
      ...groups.map((group) => ({ value: group.id as number | null, label: group.name })),
    ];
  }

  protected readonly playerRegistrationOptions = computed<SelectOption<'Names' | 'Numbers' | 'NamesAndNumbers'>[]>(() => [
    { value: 'Names', label: this.t().setup.playerRegistrationNames },
    { value: 'Numbers', label: this.t().setup.playerRegistrationNumbers },
    { value: 'NamesAndNumbers', label: this.t().setup.playerRegistrationBoth },
  ]);

  protected ruleToAdd: TiebreakerRule | null = null;
  protected newGroupName = '';
  protected newTeamName = '';
  protected newTeamShort = '';
  protected newTeamGroupId: number | null = null;
  protected playerDrafts: Record<number, string> = {};
  protected playerNumberDrafts: Record<number, string> = {};
  protected generateGroups = true;
  protected generateKnockout = true;
  protected replaceExisting = false;

  protected settings: SaveTournamentRequest = {
    name: '',
    slug: null,
    description: null,
    rules: defaultTournamentRulesWithoutDate,
    location: null,
    tournamentDateUtc: '2026-09-06T15:00',
    season: new Date().getFullYear(),
    format: 'League',
    status: 'Draft',
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    groupRounds: 1,
    teamsAdvancingPerGroup: 2,
    includeBestThirdPlaced: false,
    hasThirdPlacePlayOff: false,
    trackPlayers: false,
    playerRegistrationMode: 'NamesAndNumbers',
    trackCards: false,
    periodCount: 1,
    periodDurationMinutes: 10,
    breakDurationMinutes: 5,
    matchIntervalMinutes: 5,
    matchesPerTimeSlot: 4,
    trackMatchClock: true,
    allowTimeouts: false,
    useStoppageTime: true,
    tiebreakers: null,
  };

  async ngOnInit(): Promise<void> {
    await this.store.load(this.slug());
    const data = this.detail();
    if (!data) {
      return;
    }

    this.settings = {
      ...this.settings,
      name: data.tournament.name,
      slug: data.tournament.slug,
      description: data.tournament.description,
      rules: data.tournament.rules
        ? removeLegacyDefaultDateTime(data.tournament.rules)
        : defaultTournamentRulesWithoutDate,
      location: data.tournament.location,
      tournamentDateUtc: data.tournament.tournamentDateUtc
        ? data.tournament.tournamentDateUtc.slice(0, 16)
        : null,
      season: data.tournament.tournamentDateUtc
        ? new Date(data.tournament.tournamentDateUtc).getFullYear()
        : data.tournament.season,
      format: data.tournament.format,
      status: data.tournament.status,
      pointsForWin: data.tournament.pointsForWin,
      pointsForDraw: data.tournament.pointsForDraw,
      pointsForLoss: data.tournament.pointsForLoss,
      groupRounds: data.tournament.groupRounds,
      teamsAdvancingPerGroup: data.tournament.teamsAdvancingPerGroup,
      includeBestThirdPlaced: data.tournament.includeBestThirdPlaced,
      hasThirdPlacePlayOff: data.tournament.hasThirdPlacePlayOff,
      trackPlayers: data.tournament.trackPlayers,
      playerRegistrationMode: data.tournament.playerRegistrationMode,
      trackCards: data.tournament.trackCards,
      periodCount: data.tournament.periodCount,
      periodDurationMinutes: data.tournament.periodDurationMinutes,
      breakDurationMinutes: data.tournament.breakDurationMinutes,
      matchIntervalMinutes: data.tournament.matchIntervalMinutes,
      matchesPerTimeSlot: data.tournament.matchesPerTimeSlot,
      trackMatchClock: data.tournament.trackMatchClock,
      allowTimeouts: data.tournament.allowTimeouts,
      useStoppageTime: data.tournament.useStoppageTime,
    };

    this.tiebreakers.set(data.tournament.tiebreakers);
  this.settingsSnapshot = this.settingsState();
  }

  ngAfterViewChecked(): void {
    const editor = this.rulesContent?.nativeElement;
    if (editor && editor !== this.initializedRulesEditor && document.activeElement !== editor) {
      editor.innerHTML = this.settings.rules ?? '';
      this.initializedRulesEditor = editor;
      this.rulesSelection = null;
    }
  }

  addRule(): void {
    const rule = this.ruleToAdd ?? this.availableRules()[0];
    if (rule && !this.tiebreakers().includes(rule)) {
      this.tiebreakers.update((rules) => [...rules, rule]);
      this.ruleToAdd = null;
    }
  }

  confirmRemoveRule(index: number, ruleName: string): void {
    this.requestConfirmation(ruleName, () => this.removeRule(index));
  }

  removeRule(index: number): void {
    this.tiebreakers.update((rules) => rules.filter((_, position) => position !== index));
  }

  moveRule(index: number, offset: number): void {
    this.tiebreakers.update((rules) => {
      const next = [...rules];
      const target = index + offset;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async saveSettings(): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);
    this.message.set(null);
    const hasDirtySchedules = this.hasUnsavedScheduleChanges();

    try {
      await this.saveSettingsRequest(data.tournament.id);
      this.settingsSnapshot = this.settingsState();
      if (!hasDirtySchedules) await this.store.reload();
      this.message.set(this.t().common.saved);
    } catch {
      this.message.set(this.t().setup.saveFailed);
    } finally {
      this.busy.set(false);
    }
  }

  formatRules(command: string, value?: string): void {
    const selection = window.getSelection();
    if (this.rulesSelection && selection) {
      selection.removeAllRanges();
      selection.addRange(this.rulesSelection);
    }
    this.rulesContent?.nativeElement.focus();
    document.execCommand(command, false, value);
    this.saveRulesSelection();
    this.updateRules({ target: this.rulesContent?.nativeElement } as unknown as Event);
  }

  saveRulesSelection(): void {
    const selection = window.getSelection();
    const editor = this.rulesContent?.nativeElement;
    if (!selection || !editor || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      this.rulesSelection = range.cloneRange();
    }
  }

  updateRules(event: Event): void {
    this.settings.rules = (event.target as HTMLElement).innerHTML;
  }

  localKickoff(value: string | null): string {
    return value ? value.slice(0, 16) : '';
  }

  teamOptions(teams: Team[], excludedTeamId: number | null): SelectOption<number | null>[] {
    return teams
      .filter((team) => team.id !== excludedTeamId)
      .map((team) => ({ value: team.id, label: team.name }));
  }

  setKickoff(match: Match, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    match.kickoffUtc = value || null;
  }

  protected hasScheduleChanges(match: Match): boolean {
    const current = this.scheduleState(match);
    const initial = this.scheduleSnapshots.get(match);

    if (initial === undefined) {
      this.scheduleSnapshots.set(match, current);
      return false;
    }
    return initial !== current;
  }

  protected hasUnsavedSettingsChanges(): boolean {
    return this.settingsSnapshot !== null && this.settingsSnapshot !== this.settingsState();
  }

  protected hasUnsavedChanges(): boolean {
    return this.hasUnsavedSettingsChanges() || this.hasUnsavedScheduleChanges();
  }

  protected fixturesNeedReview(): boolean {
    if (this.structuralFixtureChange()) return true;

    const data = this.detail();
    const groupMatches = data?.matches.filter((match) => match.stage === 'Group') ?? [];
    if (!data || !groupMatches.length) return false;

    const league = data.tournament.format === 'League' || data.groups.length === 0;
    const scheduledTeamIds = new Set(
      groupMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId]).filter((id): id is number => id !== null),
    );
    if (data.teams.some((team) => !scheduledTeamIds.has(team.id))) return true;

    return !league && groupMatches.some((match) => {
      const home = data.teams.find((team) => team.id === match.homeTeamId);
      const away = data.teams.find((team) => team.id === match.awayTeamId);
      return home?.groupId !== match.groupId || away?.groupId !== match.groupId;
    });
  }

  private settingsState(): string {
    return JSON.stringify({ ...this.settings, tiebreakers: this.tiebreakers() });
  }

  private scheduleState(match: Match): string {
    return JSON.stringify([
      match.homeTeamId,
      match.awayTeamId,
      match.kickoffUtc,
      match.pitchNumber,
      match.venue,
    ]);
  }

  protected hasUnsavedScheduleChanges(): boolean {
    return this.detail()?.matches.some((match) => this.hasScheduleChanges(match)) ?? false;
  }

  async saveSchedule(match: Match): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);
    try {
      const saved = await this.saveScheduleRequest(data.tournament.id, match);
      this.scheduleSnapshots.set(saved, this.scheduleState(saved));
      this.store.patchMatch(saved);
      this.structuralFixtureChange.set(false);
      this.message.set(this.t().common.saved);
    } finally {
      this.busy.set(false);
    }
  }

  protected async saveAllSchedules(): Promise<boolean> {
    const data = this.detail();
    if (!data) return false;

    const changedMatches = data.matches.filter((match) => this.hasScheduleChanges(match));
    if (!changedMatches.length) return true;

    this.busy.set(true);
    try {
      for (const match of changedMatches) {
        const saved = await this.saveScheduleRequest(data.tournament.id, match);
        this.scheduleSnapshots.set(saved, this.scheduleState(saved));
        this.store.patchMatch(saved);
      }
      this.structuralFixtureChange.set(false);
      this.message.set(this.t().common.saved);
      return true;
    } catch {
      this.message.set(this.t().common.somethingWentWrong);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private saveScheduleRequest(tournamentId: number, match: Match) {
    return firstValueFrom(this.api.saveMatch(tournamentId, match.id, {
      groupId: match.groupId,
      stage: match.stage,
      round: match.round,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homePlaceholder: match.homeTeamId === null ? match.homeTeamName : null,
      awayPlaceholder: match.awayTeamId === null ? match.awayTeamName : null,
      kickoffUtc: match.kickoffUtc,
      pitchNumber: match.pitchNumber,
      venue: match.venue,
    }));
  }

  private saveSettingsRequest(tournamentId: number) {
    return firstValueFrom(this.api.updateTournament(tournamentId, {
      ...this.settings,
      tiebreakers: this.tiebreakers(),
    }));
  }

  public canDeactivate(): boolean | Promise<boolean> {
    if (this.hasUnsavedChanges()) {
      return new Promise<boolean>((resolve) => this.leaveConfirmation.set({ resolve }));
    }
    if (this.fixturesNeedReview()) {
      return new Promise<boolean>((resolve) => this.fixtureReviewConfirmation.set({ resolve }));
    }
    return true;
  }

  protected resolveFixtureReview(canLeave: boolean): void {
    const confirmation = this.fixtureReviewConfirmation();
    this.fixtureReviewConfirmation.set(null);
    confirmation?.resolve(canLeave);
  }

  protected reviewFixturesBeforeLeaving(): void {
    this.activeTab.set('fixtures');
    this.resolveFixtureReview(false);
  }

  protected resolveLeave(canLeave: boolean): void {
    const confirmation = this.leaveConfirmation();
    this.leaveConfirmation.set(null);
    confirmation?.resolve(canLeave);
  }

  protected async saveAllAndLeave(): Promise<void> {
    if (await this.saveAllChanges()) this.resolveLeave(true);
  }

  private async saveAllChanges(): Promise<boolean> {
    const data = this.detail();
    if (!data) return false;

    const settingsChanged = this.hasUnsavedSettingsChanges();
    const changedMatches = data.matches.filter((match) => this.hasScheduleChanges(match));
    if (!settingsChanged && !changedMatches.length) return true;

    this.busy.set(true);
    try {
      if (settingsChanged) await this.saveSettingsRequest(data.tournament.id);
      for (const match of changedMatches) {
        await this.saveScheduleRequest(data.tournament.id, match);
      }
      this.settingsSnapshot = this.settingsState();
      await this.store.reload();
      this.message.set(this.t().common.saved);
      return true;
    } catch {
      this.message.set(this.t().common.somethingWentWrong);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnAboutUnsavedChanges(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges() && !this.fixturesNeedReview()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async addGroup(): Promise<void> {
    const data = this.detail();
    if (!data || !this.newGroupName.trim()) {
      return;
    }

    await firstValueFrom(
      this.api.createGroup(data.tournament.id, this.newGroupName.trim(), data.groups.length),
    );
    this.newGroupName = '';
    await this.store.reload();
  }

  async removeGroup(groupId: number): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    await firstValueFrom(this.api.deleteGroup(data.tournament.id, groupId));
    await this.store.reload();
  }

  confirmRemoveGroup(groupId: number, groupName: string): void {
    this.requestConfirmation(groupName, () => this.removeGroup(groupId));
  }

  async addTeam(): Promise<void> {
    const data = this.detail();
    if (!data || !this.newTeamName.trim()) {
      return;
    }

    await firstValueFrom(
      this.api.saveTeam(data.tournament.id, null, {
        name: this.newTeamName.trim(),
        shortName: this.newTeamShort.trim() || null,
        groupId: this.newTeamGroupId,
      }),
    );

    this.newTeamName = '';
    this.newTeamShort = '';
    this.structuralFixtureChange.set(true);
    await this.store.reload();
  }

  async assignGroup(
    teamId: number,
    name: string,
    shortName: string | null,
    groupId: number | null,
  ): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    await firstValueFrom(this.api.saveTeam(data.tournament.id, teamId, { name, shortName, groupId }));
    this.structuralFixtureChange.set(true);
    await this.store.reload();
  }

  editTeam(teamId: number): void {
    this.editingTeamId.set(teamId);
  }

  async cancelTeamEdit(): Promise<void> {
    this.editingTeamId.set(null);
    await this.store.reload();
  }

  async saveTeam(team: Team): Promise<void> {
    const data = this.detail();
    const name = team.name.trim();
    if (!data || !name) {
      return;
    }

    team.name = name;
    team.shortName = team.shortName?.trim() || null;

    try {
      await firstValueFrom(this.api.saveTeam(data.tournament.id, team.id, team));
      await this.store.reload();
      this.editingTeamId.set(null);
      this.message.set(this.t().common.saved);
    } catch {
      this.message.set(this.t().common.somethingWentWrong);
    }
  }

  async removeTeam(teamId: number): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteTeam(data.tournament.id, teamId));
      this.structuralFixtureChange.set(true);
      await this.store.reload();
    } catch (failure) {
      const serverMessage = (failure as { error?: { message?: string } })?.error?.message;
      this.message.set(serverMessage ?? this.t().setup.removeTeamBlocked);
    }
  }

  confirmRemoveTeam(teamId: number, teamName: string): void {
    this.requestConfirmation(teamName, () => this.removeTeam(teamId));
  }

  async addPlayer(teamId: number): Promise<void> {
    const mode = this.detail()?.tournament.playerRegistrationMode ?? 'NamesAndNumbers';
    const name = (this.playerDrafts[teamId] ?? '').trim();
    const numberText = (this.playerNumberDrafts[teamId] ?? '').trim();
    const shirtNumber = numberText ? Number(numberText) : null;
    if ((mode !== 'Numbers' && !name) || (mode !== 'Names' && (!Number.isInteger(shirtNumber) || shirtNumber! < 0))) {
      return;
    }

    await firstValueFrom(this.api.savePlayer(null, {
      teamId,
      name: mode === 'Numbers' ? '' : name,
      shirtNumber: mode === 'Names' ? null : shirtNumber,
    }));
    this.playerDrafts[teamId] = '';
    this.playerNumberDrafts[teamId] = '';
    await this.store.reload();
  }

  async removePlayer(playerId: number): Promise<void> {
    await firstValueFrom(this.api.deletePlayer(playerId));
    await this.store.reload();
  }

  confirmRemovePlayer(playerId: number, playerName: string): void {
    this.requestConfirmation(playerName, () => this.removePlayer(playerId));
  }

  async generate(): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);
    this.fixtureMessage.set(null);

    try {
      const result = await firstValueFrom(
        this.api.generateFixtures(
          data.tournament.id,
          this.generateGroups,
          this.generateKnockout,
          this.replaceExisting,
        ),
      );
      await this.store.reload();
      this.structuralFixtureChange.set(false);
      this.fixtureMessage.set(
        this.i18n.format(this.t().setup.generated, { count: result.generated }),
      );
    } catch {
      this.fixtureMessage.set(this.t().setup.generateBlocked);
    } finally {
      this.busy.set(false);
    }
  }

  async addMatch(): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);
    try {
      const groupRounds = data.matches
        .filter((match) => match.stage === 'Group')
        .map((match) => match.round);
      const round = groupRounds.length ? Math.max(...groupRounds) + 1 : 1;
      await firstValueFrom(this.api.saveMatch(data.tournament.id, null, {
        groupId: null,
        stage: 'Group',
        round,
        homeTeamId: null,
        awayTeamId: null,
        homePlaceholder: null,
        awayPlaceholder: null,
        kickoffUtc: null,
        pitchNumber: null,
        venue: null,
      }));
      await this.store.reload();
    } finally {
      this.busy.set(false);
    }
  }

  scheduleMatches(matches: Match[]): Match[] {
    return [...matches].sort((left, right) => {
      if (!left.kickoffUtc && right.kickoffUtc) {
        return -1;
      }

      if (left.kickoffUtc && !right.kickoffUtc) {
        return 1;
      }

      if (!left.kickoffUtc && !right.kickoffUtc) {
        return right.id - left.id;
      }

      return left.kickoffUtc!.localeCompare(right.kickoffUtc!);
    });
  }

  async deleteSchedule(match: Match): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.deleteMatch(data.tournament.id, match.id));
      await this.store.reload();
    } finally {
      this.busy.set(false);
    }
  }

  confirmDeleteSchedule(match: Match): void {
    this.requestConfirmation(`${match.homeTeamName} - ${match.awayTeamName}`, () => this.deleteSchedule(match));
  }

  async confirmPendingAction(): Promise<void> {
    const pending = this.pendingConfirmation();
    this.pendingConfirmation.set(null);
    if (pending) {
      await pending.action();
    }
  }

  private requestConfirmation(name: string, action: () => Promise<void> | void): void {
    this.pendingConfirmation.set({
      message: `${this.t().common.confirmDelete}\n\n${name}`,
      action,
    });
  }

  async seedKnockout(): Promise<void> {
    const data = this.detail();
    if (!data) {
      return;
    }

    this.busy.set(true);

    try {
      const result = await firstValueFrom(this.api.seedKnockout(data.tournament.id));
      await this.store.reload();
      this.fixtureMessage.set(this.i18n.format(this.t().setup.seeded, { count: result.seeded }));
    } catch {
      this.fixtureMessage.set(this.t().setup.seedFailed);
    } finally {
      this.busy.set(false);
    }
  }
}
