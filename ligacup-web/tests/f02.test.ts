import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElementRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

globalThis.window = { location: { hostname: 'localhost' } } as any;
const { AdminSetup } = await import('../src/app/pages/admin/admin-setup');
const { ApiService } = await import('../src/app/core/api.service');
const { TournamentStore } = await import('../src/app/core/tournament.store');
const { I18nService } = await import('../src/app/core/i18n/i18n.service');
const { english } = await import('../src/app/core/i18n/strings');

test('generation sends mixed bye choices unchanged and displays validation without discarding them', async () => {
  const detail = signal<any>({ tournament: { id: 1, slug: 'f02', name: 'Cup', format: 'League', tiebreakers: [] },
    teams: [1, 2, 3, 4, 5].map(id => ({ id, name: `Team ${id}` })), groups: [], matches: [] });
  let request: any[] = [];
  let valid = false;
  let reloads = 0;
  const reason = 'Select each team to sit out at most once per round-robin leg; leave other rounds automatic.';
  const api = { generateFixtures: (...args: any[]) => {
    request = args;
    return valid ? of({ generated: 10 }) : throwError(() => new HttpErrorResponse({ status: 400, error: { message: reason } }));
  } };
  const injector = Injector.create({ providers: [
    { provide: ApiService, useValue: api },
    { provide: TournamentStore, useValue: { detail, load: async () => {}, reload: async () => { reloads++; } } },
    { provide: I18nService, useValue: { t: signal(english), locale: signal('en-GB'), format: (text: string) => text } },
    { provide: ElementRef, useValue: { nativeElement: {} } },
  ] });
  const page = runInInjectionContext(injector, () => new AdminSetup()) as any;
  page.slug = () => 'f02';
  await page.ngOnInit();
  page.byeTeamIds = [3, null, 3, null, null];
  await page.generate();
  assert.deepEqual(request[4], [3, null, 3, null, null]);
  assert.equal(page.fixtureMessage(), reason);
  assert.deepEqual(page.byeTeamIds, [3, null, 3, null, null]);
  assert.equal(reloads, 0);
  assert.equal(page.busy(), false);
  valid = true;
  page.byeTeamIds = [3, null, 1, null, null];
  await page.generate();
  assert.deepEqual(request[4], [3, null, 1, null, null]);
  assert.equal(reloads, 1);
  assert.equal(page.hasUnsavedChanges(), false);
});
