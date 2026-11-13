import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

// No resources or scripts are enabled; hostile markup is inspected, never executed.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, HTMLImageElement: dom.window.HTMLImageElement,
  Node: dom.window.Node, Event: dom.window.Event });
const { sanitizeRichHtml } = await import('../src/app/core/rich-html');
const { AdminSetup } = await import('../src/app/pages/admin/admin-setup');
const { ApiService } = await import('../src/app/core/api.service');
const { TournamentStore } = await import('../src/app/core/tournament.store');
const { LiveService } = await import('../src/app/core/live.service');
const { I18nService } = await import('../src/app/core/i18n/i18n.service');
const { english } = await import('../src/app/core/i18n/strings');

for (const markup of [
  '<img src="/good.png" onerror="alert(1)"><script>alert(2)</script>',
  '<a href="jav&#x61;script:alert(1)">bad</a><img src="data:image/svg+xml,evil">',
  '<svg><a href="javascript:alert(1)">bad</a></svg><math><mtext><img src=x onerror=alert(1)></mtext></math>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe><form id="attributes"><input name="innerHTML"></form>',
  '<span style="position:fixed; background-image:url(javascript:alert(1)); color:red" onclick="alert(1)">x</span>',
]) {
  test(`rich HTML rejects active markup: ${markup.slice(0, 35)}`, () => {
    const fragment = document.createElement('div');
    fragment.innerHTML = sanitizeRichHtml(markup);
    assert.equal(fragment.querySelector('script,iframe,svg,math,form,input'), null);
    for (const element of fragment.querySelectorAll('*')) {
      for (const attr of element.attributes) {
        assert.equal(/^on/i.test(attr.name), false);
        assert.equal(/javascript:|data:|expression\(|position:|background-image/i.test(attr.value), false);
      }
    }
  });
}

test('rich HTML preserves headings, lists, links, tables and supported image formatting', () => {
  const content = '<h2>Custom ÆØÅ</h2><p style="text-align:center;color:rgb(1, 2, 3)"><b>Bold</b><i>Italic</i><u>Underlined</u></p>'
    + '<ul><li>Rule</li></ul><a href="https://example.test/rules">Link</a>'
    + '<table><tbody><tr><td colspan="2">Parking</td></tr></tbody></table>'
    + '<img class="rte-image-medium is-selected evil" src="/uploads/rules/test.png" alt="Map" style="width:50%">';
  const fragment = document.createElement('div');
  fragment.innerHTML = sanitizeRichHtml(content);
  assert.equal(fragment.querySelector('h2')?.textContent, 'Custom ÆØÅ');
  assert.equal(fragment.querySelector('li')?.textContent, 'Rule');
  assert.equal(fragment.querySelector('p')?.style.textAlign, 'center');
  assert.equal(fragment.querySelector('img')?.className, 'rte-image-medium');
  assert.equal(fragment.querySelector('img')?.style.width, '50%');
  assert.equal(fragment.querySelector('td')?.getAttribute('colspan'), '2');
  assert.equal(fragment.querySelector('a')?.href, 'https://example.test/rules');
  assert.equal(sanitizeRichHtml(sanitizeRichHtml(content)), sanitizeRichHtml(content));
});

test('group reassignment uses only the dedicated membership API body', () => {
  const calls: any[] = [];
  const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: {
    put: (url: string, body: any) => { calls.push({ url, body }); return of(null); },
  } }] });
  const api = runInInjectionContext(injector, () => new ApiService());
  api.assignTeamGroup(10, 11, 12);
  api.assignTeamGroup(10, 11, null);
  assert.match(calls[0].url, /\/tournaments\/10\/teams\/11\/group$/);
  assert.deepEqual(calls.map((c) => c.body), [{ groupId: 12 }, { groupId: null }]);
});

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
test('rendered editor waits for settings, loads saved rules/parking and preserves edits on tab recreation', async () => {
  let connected!: () => void;
  const connection = new Promise<void>((resolve) => connected = resolve);
  const calls: any[] = [];
  const data: any = { tournament: {
    id: 10, name: 'Local', slug: 'local', rules: '<h3>Liga Cup 2026 - U9 custom</h3><p><strong>Dato:</strong> My date</p><p><strong>Tidspunkt:</strong> My time</p><p>Ved stadion 5, 4600 Køge</p>',
    parking: '<p>Existing parking</p>', tournamentDateUtc: null, format: 'League',
    tiebreakers: [], groupRounds: 1, matchesPerTimeSlot: 4, playerRegistrationMode: 'NamesAndNumbers',
  }, teams: [], groups: [], matches: [], tables: [], bracket: [], topScorers: [] };
  TestBed.configureTestingModule({ imports: [AdminSetup], providers: [
    provideRouter([]),
    { provide: ApiService, useValue: { getTournament: () => of(data), assignTeamGroup: (...args: any[]) => { calls.push(args); return of(null); } } },
    { provide: LiveService, useValue: { state: signal('connecting'), watch: () => connection } },
    { provide: I18nService, useValue: { t: signal(english), locale: signal('en-US'), format: (s: string) => s } },
  ] });
  const fixture = TestBed.createComponent(AdminSetup);
  const component = fixture.componentInstance as any;
  fixture.componentRef.setInput('slug', 'local');
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();
  assert.ok(TestBed.inject(TournamentStore).detail(), 'detail is already visible before live watch finishes');
  assert.equal(fixture.nativeElement.querySelector('[contenteditable]'), null, 'editing must remain disabled');
  connected();
  // Angular does not await async lifecycle hooks; allow their promise chain to finish.
  await new Promise<void>((resolve) => setImmediate(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
  let editor = fixture.nativeElement.querySelector('[contenteditable]') as HTMLElement;
  assert.equal(editor.innerHTML, data.tournament.rules);
  let prevented = false;
  const inserted: string[] = [];
  document.execCommand = (command, _show, value) => {
    assert.equal(command, 'insertHTML');
    inserted.push(value!);
    editor.insertAdjacentHTML('beforeend', value!);
    return true;
  };
  const hostile = '<p><b>Pasted</b><img src="/image.png" onerror="alert(1)"></p><script>alert(2)</script>';
  await component.pasteRulesImage({ clipboardData: { items: [], files: [], getData: () => hostile },
    preventDefault: () => prevented = true });
  assert.equal(prevented, true);
  await component.dropRichContent({ dataTransfer: { files: [], getData: () => hostile }, preventDefault: () => {} }, 'rules');
  assert.equal(inserted.length, 2);
  assert.ok(inserted.every((html) => html.includes('<b>Pasted</b>') && !/onerror|<script/i.test(html)));
  delete (document as any).execCommand;
  editor.innerHTML = '<p>My edited rules</p>';
  editor.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  fixture.detectChanges();
  assert.equal(editor.innerHTML, '<p>My edited rules</p>', 'change detection must not reset typing');
  component.activeTab.set('parking');
  await fixture.whenStable();
  fixture.detectChanges();
  assert.equal(fixture.nativeElement.querySelector('[contenteditable]').innerHTML, data.tournament.parking);
  component.activeTab.set('rules');
  await fixture.whenStable();
  fixture.detectChanges();
  assert.equal(fixture.nativeElement.querySelector('[contenteditable]').innerHTML, '<p>My edited rules</p>');
  await component.assignGroup(11, 12);
  assert.deepEqual(calls, [[10, 11, 12]]);
  fixture.destroy();
  TestBed.resetTestingModule();
});

test('deployment FTP paths require TLS without plaintext fallback', async () => {
  const workflow = await readFile('../.github/workflows/deploy-to-simply.yml', 'utf8');
  const protocols = [...workflow.matchAll(/^\s+protocol:\s*(.+)$/gm)].map((m) => m[1]);
  assert.ok(protocols.length >= 5);
  assert.ok(protocols.every((p) => p.trim() === 'ftps'));
  assert.equal([...workflow.matchAll(/^\s+security: strict$/gm)].length, protocols.length);
  assert.match(workflow, /\$request\.EnableSsl = \$true/);
  assert.doesNotMatch(workflow, /--ftp-ssl(?:\s|$)|--ssl(?:\s|$)|--insecure|FTP_PROTOCOL/);
  const curlFtp = [...workflow.matchAll(/curl[^\n]+--user[^\n]+/g)];
  assert.ok(curlFtp.length >= 4);
  assert.ok(curlFtp.every((m) => m[0].includes('--ssl-reqd')));
});
