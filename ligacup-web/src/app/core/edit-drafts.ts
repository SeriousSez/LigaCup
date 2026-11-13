/** A server baseline and a separate editable object per ID. No live object is edited. */
export class EditDrafts<T extends { id: number; revision?: string }> {
  private entries = new Map<number, { base: T; value: T; server: T | null; conflicts: string[] }>();
  constructor(private readonly fields: readonly string[]) {}
  reconcile(records: T[]): T[] {
    const ids = new Set(records.map(row => row.id));
    for (const server of records) {
      let entry = this.entries.get(server.id);
      if (!entry) {
        entry = { base: structuredClone(server), value: structuredClone(server), server: structuredClone(server), conflicts: [] };
        this.entries.set(server.id, entry);
        continue;
      }
      entry.server = structuredClone(server);
      entry.conflicts = [];
      for (const key of Object.keys(server)) {
        if (key === 'revision') continue;
        const local = (entry.value as any)[key], base = (entry.base as any)[key], remote = (server as any)[key];
        if (!this.fields.includes(key) || equal(local, base) || equal(local, remote)) {
          (entry.value as any)[key] = structuredClone(remote);
          (entry.base as any)[key] = structuredClone(remote);
        } else if (!equal(base, remote)) entry.conflicts.push(key);
      }
      if (!entry.conflicts.length) entry.value.revision = entry.base.revision = server.revision;
    }
    for (const [id, entry] of this.entries) {
      if (!ids.has(id)) {
        if (this.dirty(id)) { entry.server = null; entry.conflicts = ['deleted']; }
        else this.entries.delete(id);
      }
    }
    return [...this.entries.values()].map(entry => entry.value);
  }
  dirty(id?: number): boolean {
    return [...this.entries].some(([key, entry]) => (id === undefined || key === id)
      && this.fields.some(field => !equal((entry.value as any)[field], (entry.base as any)[field])));
  }
  conflicts() { return [...this.entries].filter(([, e]) => e.conflicts.length).map(([id, e]) => ({ id, fields: e.conflicts, local: e.value, server: e.server })); }
  resolve(id: number, keepDraft: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (!entry.server) { if (!keepDraft) this.entries.delete(id); return; }
    if (!keepDraft) Object.assign(entry.value, structuredClone(entry.server));
    entry.base = structuredClone(entry.server);
    entry.value.revision = entry.server.revision;
    entry.conflicts = [];
  }
  /** Acknowledges only the submitted values, preserving edits made while the request was pending. */
  saved(id: number, submitted: T, server: T): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    for (const field of this.fields) {
      if (equal((entry.value as any)[field], (submitted as any)[field])) (entry.value as any)[field] = structuredClone((server as any)[field]);
    }
    entry.base = structuredClone(server);
    entry.server = structuredClone(server);
    entry.value.revision = server.revision;
    entry.conflicts = [];
  }
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const scheduleFields = ['groupId', 'stage', 'round', 'sortOrder', 'homeTeamId', 'awayTeamId', 'kickoffUtc', 'pitchNumber', 'venue'];
export const teamFields = ['name', 'shortName', 'colorHex', 'logoUrl', 'manager', 'groupId', 'pointsAdjustment'];
