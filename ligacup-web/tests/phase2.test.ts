import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElementRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { of, throwError, Subject, firstValueFrom } from 'rxjs';
import { EditDrafts, scheduleFields, teamFields } from '../src/app/core/edit-drafts';
import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { CommandRetries, commandRetryInterceptor } from '../src/app/core/command-retry';

globalThis.window = { location: { hostname: 'localhost' }, confirm: () => false } as any;
const { AdminSetup } = await import('../src/app/pages/admin/admin-setup');
const { AdminUsers } = await import('../src/app/pages/admin/admin-users');
const { ApiService } = await import('../src/app/core/api.service');
const { AuthService } = await import('../src/app/core/auth.service');
const { TournamentStore } = await import('../src/app/core/tournament.store');
const { LiveService } = await import('../src/app/core/live.service');
const { I18nService } = await import('../src/app/core/i18n/i18n.service');
const { english } = await import('../src/app/core/i18n/strings');
const { routes } = await import('../src/app/app.routes');
const original = { id: 1, revision: 'r1', stage: 'Group', round: 1, groupId: null, homeTeamId: 1, awayTeamId: 2,
  kickoffUtc: '2026-11-13T12:00:00Z', pitchNumber: 1, venue: 'Field', sortOrder: 0, homeScore: 0, awayScore: 0 };

function setup() {
  let server: any = { tournament: { id: 1, revision: 't1', name: 'Cup', slug: 'cup', format: 'League', tiebreakers: [], rules: '<p>Saved</p>' },
    teams: [{ id: 1, revision: 'team1', name: 'Home' }, { id: 2, revision: 'team2', name: 'Away' }], groups: [], matches: [structuredClone(original)] };
  let push: (update: any) => void = () => {};
  let reconnect: () => Promise<void> = async () => {};
  const calls: any[] = [];
  const api: any = {
    getTournament: () => of(structuredClone(server)),
    saveMatches: (_id: number, rows: any[]) => { calls.push(rows); return of(rows.map(row => ({ ...row, revision: 'saved' }))); },
    copyRound: (...args: any[]) => { calls.push(args); server.matches.push({ ...original, id: 2, round: 2 }); return of([]); },
    assignTeamGroup: () => of(null),
  };
  const injector = Injector.create({ providers: [TournamentStore,
    { provide: ApiService, useValue: api },
    { provide: LiveService, useValue: { state: signal('connected'), watch: async (_slug: string, apply: any, reload: any) => { push = apply; reconnect = reload; } } },
    { provide: I18nService, useValue: { t: signal(english), locale: signal('en-GB'), format: (text: string) => text } },
    { provide: ElementRef, useValue: { nativeElement: {} } },
  ] });
  const component = runInInjectionContext(injector, () => new AdminSetup()) as any;
  component.slug = () => 'cup';
  return { component, api, calls, server, store: injector.get(TournamentStore),
    push: (match: any) => push({ slug: 'cup', match, tables: [], bracket: [], topScorers: [] }), reconnect: () => reconnect() };
}

test('actual setup drafts survive live scores, reconnect, membership reload and copy without mutating canonical store', async () => {
  const x = setup(); await x.component.ngOnInit();
  const draft = x.component.detail().matches[0]; draft.pitchNumber = 7;
  x.component.detail().teams[0].name = 'My team draft';
  assert.equal(x.store.detail()!.matches[0].pitchNumber, 1);
  x.push({ ...original, homeScore: 3 });
  assert.equal(x.component.detail().matches[0].pitchNumber, 7);
  assert.equal(x.component.detail().matches[0].homeScore, 3);
  await x.reconnect(); await x.component.assignGroup(1, null); await x.component.copyRound(1);
  assert.equal(x.component.detail().matches[0].pitchNumber, 7);
  assert.equal(x.component.detail().teams[0].name, 'My team draft');
  assert.equal(x.component.hasUnsavedChanges(), true);
  assert.deepEqual(x.calls, [[1, 1, 2]]);
});

test('overlapping remote edits and deleted dirty rows remain visible until explicit resolution', () => {
  const drafts = new EditDrafts<any>(scheduleFields);
  const row = drafts.reconcile([original])[0]; row.pitchNumber = 7;
  drafts.reconcile([{ ...original, pitchNumber: 4, revision: 'r2' }]);
  assert.deepEqual(drafts.conflicts()[0].fields, ['pitchNumber']);
  assert.equal(row.pitchNumber, 7); assert.equal(row.revision, 'r1');
  drafts.resolve(1, true); assert.equal(row.revision, 'r2'); assert.equal(drafts.dirty(), true);
  drafts.reconcile([]); assert.equal(drafts.conflicts()[0].fields[0], 'deleted');
  drafts.resolve(1, false); assert.equal(drafts.dirty(), false); assert.deepEqual(drafts.reconcile([]), []);
});

test('non-overlapping server team edits merge around a name draft and preserve points', () => {
  const drafts = new EditDrafts<any>(teamFields);
  const row = drafts.reconcile([{ id: 1, revision: 'a', name: 'A', groupId: 1, pointsAdjustment: -4 }])[0];
  row.name = 'Draft';
  drafts.reconcile([{ id: 1, revision: 'b', name: 'A', groupId: 2, pointsAdjustment: -4 }]);
  assert.equal(row.name, 'Draft'); assert.equal(row.groupId, 2); assert.equal(row.pointsAdjustment, -4);
  assert.equal(row.revision, 'b'); assert.deepEqual(drafts.conflicts(), []);
});

test('bulk save is one request; failure and HTTP 409 preserve all match drafts', async () => {
  const x = setup(); await x.component.ngOnInit();
  x.component.detail().matches[0].pitchNumber = 7;
  x.api.saveMatches = () => throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'stale match' } }));
  x.server.matches[0].pitchNumber = 4; x.server.matches[0].revision = 'r2';
  assert.equal(await x.component.saveAllSchedules(), false);
  assert.equal(x.component.detail().matches[0].pitchNumber, 7);
  assert.equal(x.component.matchDrafts.conflicts().length, 1);
  x.component.resolveDraft('matches', 1, true);
  const requests: any[] = [];
  x.api.saveMatches = (_id: number, rows: any[]) => { requests.push(rows); return of(rows.map(r => ({ ...r, revision: 'r3' }))); };
  assert.equal(await x.component.saveAllSchedules(), true);
  assert.equal(requests.length, 1); assert.equal(requests[0][0].revision, 'r2');
  assert.equal(x.component.hasUnsavedScheduleChanges(), false);
});

test('edits made during a pending save remain unsaved after its acknowledgement', async () => {
  const x = setup(); await x.component.ngOnInit(); const draft = x.component.detail().matches[0];
  draft.pitchNumber = 7; const response = new Subject<any>();
  let sent: any; x.api.saveMatches = (_id: number, rows: any[]) => { sent = rows; return response; };
  const save = x.component.saveAllSchedules(); draft.pitchNumber = 9;
  response.next([{ ...sent[0], revision: 'r2' }]); response.complete(); await save;
  assert.equal(x.component.detail().matches[0].pitchNumber, 9);
  assert.equal(x.component.hasUnsavedScheduleChanges(), true);
});

test('navigation cancel and unload protect new roster/team inputs as well as schedule drafts', async () => {
  const x = setup(); await x.component.ngOnInit(); x.component.playerDrafts[1] = 'Unsaved player';
  const leave = x.component.canDeactivate(); x.component.resolveLeave(false); assert.equal(await leave, false);
  let prevented = false; const event = { preventDefault: () => prevented = true, returnValue: undefined };
  x.component.warnAboutUnsavedChanges(event); assert.equal(prevented, true);
  for (const path of ['admin', 'admin/users', 'admin/:slug', 'admin/:slug/live'])
    assert.ok(routes.find(route => route.path === path)?.canDeactivate?.length);
});

test('account refresh and another successful row save preserve failed and unsaved row edits', async () => {
  const server: any[] = [1, 2].map(id => ({ id, revision: 'r1', username: 'user' + id, email: null, role: 'Editor', isActive: true }));
  const api: any = { getUsers: () => of(structuredClone(server)), updateUser: (id: number, body: any) => {
    server[id - 1] = { ...server[id - 1], ...body, revision: 'r2' }; return of(server[id - 1]); } };
  const injector = Injector.create({ providers: [
    { provide: ApiService, useValue: api }, { provide: AuthService, useValue: { user: signal(null) } },
    { provide: I18nService, useValue: { t: signal(english), locale: signal('en-GB') } },
  ] });
  const page = runInInjectionContext(injector, () => new AdminUsers()) as any;
  await page.refresh(); page.users()[0].email = 'draft@local'; page.users()[1].email = 'saved@local';
  await page.save(page.users()[1]); assert.equal(page.users()[0].email, 'draft@local');
  api.updateUser = () => throwError(() => new HttpErrorResponse({ status: 500 }));
  await page.save(page.users()[0]); assert.equal(page.users()[0].email, 'draft@local'); assert.equal(page.dirty(), true);
  assert.equal(page.canDeactivate(), false);
});

test('ambiguous command failure retains operation ID, success permits a new intentional action', async () => {
  const injector = Injector.create({ providers: [CommandRetries] }); const keys: string[] = [];
  const request = new HttpRequest('POST', '/api/live/matches/1/score/home/1', {});
  const send = (fail: boolean) => runInInjectionContext(injector, () => firstValueFrom(commandRetryInterceptor(request, req => {
    keys.push(req.headers.get('Idempotency-Key')!);
    return fail ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(new HttpResponse({ status: 200, body: {} }));
  })));
  await assert.rejects(send(true)); await send(false); await send(false);
  assert.equal(keys[0], keys[1]); assert.notEqual(keys[1], keys[2]);
});

test('settings save acknowledges its own revision and detects a second administrator changing it before reload', async () => {
  const x = setup(); await x.component.ngOnInit();
  x.component.settings.rules = '<p>My rules</p>';
  x.api.updateTournament = (_id: number, request: any) => {
    x.server.tournament = { ...x.server.tournament, ...request, rules: '<p>Other admin</p>', revision: 't3' };
    return of({ ...request, revision: 't2' });
  };
  await x.component.saveSettings();
  assert.equal(x.component.settings.revision, 't2');
  assert.equal(x.component.settings.rules, '<p>My rules</p>');
  assert.equal(x.component.settingsConflict(), true);
  x.component.resolveSettings(false);
  assert.equal(x.component.settings.rules, '<p>Other admin</p>');
  assert.equal(x.component.hasUnsavedSettingsChanges(), false);
});

test('failed structure commands keep creation inputs and display a reason', async () => {
  const x = setup(); await x.component.ngOnInit(); x.component.newGroupName = 'New group';
  x.api.createGroup = () => throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Temporarily unavailable' } }));
  await x.component.addGroup();
  assert.equal(x.component.newGroupName, 'New group'); assert.equal(x.component.message(), 'Temporarily unavailable');
  assert.equal(x.component.busy(), false); assert.equal(x.component.hasUnsavedChanges(), true);
});

test('confirmation Enter follows the focused native button rather than forcing save or discard', async () => {
  const { ConfirmDialog } = await import('../src/app/shared/confirm-dialog');
  const injector = Injector.create({ providers: [] });
  const dialog = runInInjectionContext(injector, () => new ConfirmDialog()) as any;
  dialog.open = () => true;
  let forced = false; dialog.confirmed.subscribe(() => forced = true); dialog.alternate.subscribe(() => forced = true);
  dialog.onKeydown({ key: 'Enter', preventDefault: () => forced = true });
  assert.equal(forced, false);
});

test('copy retry retains its target even when reconnect discovers the committed round', async () => {
  const x = setup(); await x.component.ngOnInit(); const attempts: number[] = [];
  x.api.copyRound = (_id: number, _source: number, target: number) => {
    attempts.push(target);
    if (attempts.length === 1) return throwError(() => new HttpErrorResponse({ status: 0 }));
    return of([]);
  };
  await x.component.copyRound(1);
  x.server.matches.push({ ...original, id: 2, round: 2 }); await x.reconnect();
  await x.component.copyRound(1);
  assert.deepEqual(attempts, [2, 2]);
});

test('live form failures preserve inputs, prevent overlapping actions and protect match switching', async () => {
  const { LiveConsole } = await import('../src/app/pages/admin/live-console');
  const { ActivatedRoute } = await import('@angular/router');
  const { MatchClockService } = await import('../src/app/core/match-clock.service');
  const match = { ...original, liveRevision: 'live1', clock: { stoppageMinutes: 0 }, homePenalties: null, awayPenalties: null };
  const detail = signal<any>({ matches: [match], teams: [] });
  let requests = 0; const pending = new Subject<any>();
  const injector = Injector.create({ providers: [
    { provide: ApiService, useValue: { adjustScore: () => { requests++; return pending; }, setScore: () => throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Score changed' } })) } },
    { provide: ActivatedRoute, useValue: {} }, { provide: MatchClockService, useValue: {} },
    { provide: TournamentStore, useValue: { detail, patchMatch: () => {} } },
    { provide: I18nService, useValue: { t: signal(english) } },
  ] });
  const page = runInInjectionContext(injector, () => new LiveConsole()) as any;
  page.selectMatch(1); page.homePenalties = 3;
  assert.equal(page.canDeactivate(), false); page.selectMatch(2); assert.equal(page.selectedId(), 1);
  await page.savePenalties(match); assert.equal(page.homePenalties, 3); assert.equal(page.commandError(), 'Score changed');
  const first = page.adjust(1, 'home', 1); await page.adjust(1, 'home', 1); assert.equal(requests, 1);
  pending.next(match); pending.complete(); await first; assert.equal(page.commandBusy(), false);
});
