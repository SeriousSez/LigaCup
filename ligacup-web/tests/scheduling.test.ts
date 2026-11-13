import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElementRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { of } from 'rxjs';

// The development environment only reads the hostname at module initialization.
globalThis.window = { location: { hostname: 'localhost' } } as any;
const { AdminSetup } = await import('../src/app/pages/admin/admin-setup');
const { DateTimePicker } = await import('../src/app/shared/date-time-picker');
const { ApiService } = await import('../src/app/core/api.service');
const { TournamentStore } = await import('../src/app/core/tournament.store');
const { I18nService } = await import('../src/app/core/i18n/i18n.service');
const { english } = await import('../src/app/core/i18n/strings');

function setup() {
  const calls: string[] = [];
  const match = { id: 1, stage: 'Group', round: 1, homeTeamId: 1, awayTeamId: 2,
    kickoffUtc: '2026-10-25T12:00:00Z', pitchNumber: 4, venue: 'Custom pitch', sortOrder: 3 };
  const detail = signal<any>({ tournament: { id: 1, name: 'Local regression', slug: 'local',
    tournamentDateUtc: '2026-10-25T12:00:00Z', format: 'League', tiebreakers: [],
    showMatchTimesOnly: true, hideMatchAddresses: false }, teams: Array.from({length: 8}, (_, i) => ({id: i+1})), groups: [], matches: [match] });
  const api = {
    updateTournament: (_id: number, request: any) => { calls.push('settings'); return of({ ...request }); },
    generateFixtures: () => { calls.push('generate'); return of({generated: 28}); },
  };
  const store = { detail, load: async () => {}, reload: async () => { calls.push('reload'); } };
  const injector = Injector.create({ providers: [
    { provide: ApiService, useValue: api }, { provide: TournamentStore, useValue: store },
    { provide: I18nService, useValue: { t: signal(english), locale: signal('en-GB'), format: (s: string) => s } },
    { provide: ElementRef, useValue: {nativeElement: {}} },
  ] });
  const component = runInInjectionContext(injector, () => new AdminSetup()) as any;
  component.slug = () => 'local';
  return { component, match: component.detail().matches[0], calls, api, injector };
}

test('admin match times use the same local time as public cards', () => {
  const { component, match } = setup();
  assert.equal(component.matchTime(match), '13:00');
});

test('editing a kickoff preserves the local date and sends UTC', () => {
  const { component, match } = setup();
  match.kickoffUtc = '2026-07-01T22:30:00Z'; // July 2 in Copenhagen
  component.setMatchTime(match, '01:15');
  assert.equal(match.kickoffUtc, '2026-07-01T23:15:00.000Z');
});

test('date picker displays local time and emits an explicit UTC timestamp', () => {
  const { injector } = setup();
  const picker = runInInjectionContext(injector, () => new DateTimePicker());
  let emitted = '';
  picker.registerOnChange(value => emitted = value);
  picker.writeValue('2026-10-25T12:00:00Z');
  assert.match(picker.displayValue(), /13:00$/);
  picker.updateTime('14:00');
  assert.equal(emitted, '2026-10-25T13:00:00.000Z');
});

test('saving address visibility preserves the timestamp and unsaved schedule edits', async () => {
  const { component, match, calls, api } = setup();
  let savedDate: string;
  api.updateTournament = (_id, request) => { savedDate = request.tournamentDateUtc; calls.push('settings'); return of({ ...request }); };
  await component.ngOnInit();
  component.hasScheduleChanges(match);
  match.pitchNumber = 7;
  component.settings.hideMatchAddresses = true;
  await component.saveSettings();
  assert.equal(savedDate!, '2026-10-25T12:00:00Z');
  assert.deepEqual(calls, ['settings', 'reload']);
  assert.equal(match.pitchNumber, 7);
  assert.equal(component.hasScheduleChanges(match), true);
});

test('generation does not discard unsaved schedule edits', async () => {
  const { component, match, calls } = setup();
  await component.ngOnInit();
  component.hasScheduleChanges(match);
  match.pitchNumber = 7;
  await component.generate();
  assert.deepEqual(calls, []);
  assert.ok(component.fixtureMessage());
});

test('generation saves changed rules before using the saved start time', async () => {
  const { component, calls } = setup();
  await component.ngOnInit();
  component.settings.tournamentDateUtc = '2026-10-25T13:00:00Z';
  await component.generate();
  assert.deepEqual(calls, ['settings', 'generate', 'reload']);
});

test('replacing saved fixtures requires confirmation and resets the replace option', async () => {
  const { component, calls } = setup();
  await component.ngOnInit();
  component.replaceExisting = true;
  await component.generate();
  assert.deepEqual(calls, []);
  assert.equal(component.replaceFixturesConfirmation(), true);
  await component.generate(true);
  assert.deepEqual(calls, ['generate', 'reload']);
  assert.equal(component.replaceExisting, false);
  assert.equal(component.replaceFixturesConfirmation(), false);
});

test('visibility settings can be saved even if the generator has an invalid bye count', async () => {
  const { component, calls } = setup();
  await component.ngOnInit();
  component.settings.hideMatchAddresses = true;
  component.teamsSittingOut = 99;
  await component.saveSettings();
  assert.deepEqual(calls, ['settings', 'reload']);
});

test('API normalizes local inputs and preserves already zoned inputs', async () => {
  const { HttpClient } = await import('@angular/common/http');
  const bodies: any[] = [];
  const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: {
    post: (_url: string, body: any) => { bodies.push(body); return of({ ...body }); },
    put: (_url: string, body: any) => { bodies.push(body); return of({ ...body }); },
  } }] });
  const api = runInInjectionContext(injector, () => new ApiService());
  api.createTournament({ tournamentDateUtc: '2026-07-01T13:00' } as any);
  api.updateTournament(1, { tournamentDateUtc: '2026-10-25T12:00:00Z' } as any);
  api.saveMatch(1, 1, { kickoffUtc: '2026-10-25T13:00' } as any);
  assert.equal(bodies[0].tournamentDateUtc, '2026-07-01T11:00:00.000Z');
  assert.equal(bodies[1].tournamentDateUtc, '2026-10-25T12:00:00.000Z');
  assert.equal(bodies[2].kickoffUtc, '2026-10-25T12:00:00.000Z');
});
