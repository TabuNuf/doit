/** An in-memory ContactSource. */
export class MemoryContacts {
  constructor() { this.rows = []; this.refs = new Set(); }
  all() { return this.rows.map(r => structuredClone(r)); }
  get(id) { const r = this.rows.find(x => x.id === id); return r ? structuredClone(r) : null; }
  insert(c) { const id = this.rows.length + 1; this.rows.push({ ...structuredClone(c), id, fit: [], touches: [] }); return id; }
  update(id, c) { Object.assign(this.rows.find(x => x.id === id), structuredClone(c)); }
  setFit(id, game, reason) {
    const r = this.rows.find(x => x.id === id);
    r.fit = [...r.fit.filter(f => f.game !== game), { game, reason }];
  }
  removeFit(id, game) { const r = this.rows.find(x => x.id === id); r.fit = r.fit.filter(f => f.game !== game); }
  addTouch(id, t) {
    if (t.ref && this.refs.has(t.ref)) return;
    if (t.ref) this.refs.add(t.ref);
    const r = this.rows.find(x => x.id === id);
    const { ref, ...rest } = t;
    r.touches = [{ note: "", ...rest }, ...r.touches];
  }
}
