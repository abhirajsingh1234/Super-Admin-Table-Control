
import { useState, useEffect, useCallback, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { api } from '../api';

const ResponsiveGridLayout = WidthProvider(Responsive);

const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const LS_KEYS = {
  visible: 'cdb_visible',
  layout:  'cdb_layout',
  hidden:  'cdb_hidden_cols',
  filters: 'cdb_filters',
  prefs:   'cdb_prefs',
  colWidths: 'cdb_col_widths',
};

// ── 8 table-specific preset themes ────────────────────────────────────────────
export const TABLE_THEMES = {
  midnight: { id: 'midnight', name: 'Midnight',  accentColor: '#0d9488', headerBg: '#0e1623', cellBg: '#141d2b', stripedRows: true,  borderStyle: 'subtle' },
  obsidian: { id: 'obsidian', name: 'Obsidian',  accentColor: '#6366f1', headerBg: '#0f0f1a', cellBg: '#12121f', stripedRows: true,  borderStyle: 'full'   },
  forest:   { id: 'forest',   name: 'Forest',    accentColor: '#22c55e', headerBg: '#071a0f', cellBg: '#0a1f12', stripedRows: true,  borderStyle: 'subtle' },
  crimson:  { id: 'crimson',  name: 'Crimson',   accentColor: '#ef4444', headerBg: '#1a0707', cellBg: '#1f0a0a', stripedRows: false, borderStyle: 'full'   },
  slate:    { id: 'slate',    name: 'Slate',     accentColor: '#94a3b8', headerBg: '#0f172a', cellBg: '#1e293b', stripedRows: true,  borderStyle: 'none'   },
  amber:    { id: 'amber',    name: 'Amber',     accentColor: '#f59e0b', headerBg: '#1a1000', cellBg: '#1f1500', stripedRows: true,  borderStyle: 'subtle' },
  cyber:    { id: 'cyber',    name: 'Cyber',     accentColor: '#00ffe7', headerBg: '#020a12', cellBg: '#030d18', stripedRows: false, borderStyle: 'full'   },
  rose:     { id: 'rose',     name: 'Rose',      accentColor: '#f43f5e', headerBg: '#1a0813', cellBg: '#1f0a17', stripedRows: true,  borderStyle: 'subtle' },
};

const FONT_FAMILIES = {
  mono:  "'JetBrains Mono','Fira Mono',monospace",
  sans:  "'Inter',system-ui,sans-serif",
  serif: "'Georgia','Times New Roman',serif",
};

const ROW_HEIGHTS = { compact: 24, normal: 34, relaxed: 46 };

// ── Build table prefs from the global T + globalPrefs ────────────────────────
function prefsFromGlobal(T, globalPrefs) {
  const fontMap = { sans: 'sans', mono: 'mono', serif: 'serif' };
  const rhMap   = { compact: 'compact', normal: 'normal', relaxed: 'relaxed' };
  return {
    fontSize:    parseInt(globalPrefs?.fontSize ?? '12') || 12,
    fontFamily:  fontMap[globalPrefs?.fontFamily] ?? 'mono',
    rowHeight:   rhMap[globalPrefs?.rowHeight]    ?? 'normal',
    accentColor: T?.accent     ?? '#0d9488',
    headerBg:    T?.headerBg   ?? '#0e1623',
    cellBg:      T?.cellBg     ?? '#141d2b',
    stripedRows: true,
    borderStyle: globalPrefs?.borderStyle === 'none' ? 'none' : 'subtle',
    source: 'config',
  };
}

export default function TablesDashboard({ T: globalT, globalPrefs, themeKey, THEMES }) {
  // ── Derive a sensible default from global config ──────────────────────────
  const configDefaults = prefsFromGlobal(globalT, globalPrefs);

  const [prefs, setPrefsState] = useState(() => {
    const saved = LS.get(LS_KEYS.prefs, null);
    // If never customised, fall through to live config defaults
    return saved ?? configDefaults;
  });
  const [syncBanner,       setSyncBanner]       = useState(false);
  const [activeTableTheme, setActiveTableTheme] = useState(null);

  const setPrefs = (update) => {
    setPrefsState(prev => {
      const next = { ...prev, ...update };
      LS.set(LS_KEYS.prefs, next);
      return next;
    });
  };

  // Re-sync whenever the global theme/prefs change, unless the user has
  // manually customised (source === 'local') or applied a table preset.
  useEffect(() => {
    setPrefsState(prev => {
      if (prev.source === 'local' || prev.source?.startsWith('theme:')) return prev;
      const next = prefsFromGlobal(globalT, globalPrefs);
      LS.set(LS_KEYS.prefs, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalT, globalPrefs]);

  const syncFromConfig = () => {
    const synced = prefsFromGlobal(globalT, globalPrefs);
    setPrefsState(synced);
    LS.set(LS_KEYS.prefs, synced);
    setActiveTableTheme(null);
    setSyncBanner(true);
    setTimeout(() => setSyncBanner(false), 2500);
  };

  const applyTableTheme = (themeId) => {
    const t = TABLE_THEMES[themeId];
    if (!t) return;
    const next = { ...prefs, ...t, source: `theme:${themeId}` };
    setPrefsState(next);
    LS.set(LS_KEYS.prefs, next);
    setActiveTableTheme(themeId);
  };

  // ── Persisted table state ─────────────────────────────────────────────────
  const [visible,    setVisibleState] = useState(() => LS.get(LS_KEYS.visible, []));
  const [layout,     setLayoutState]  = useState(() => LS.get(LS_KEYS.layout, []));
  const [hiddenCols, setHiddenState]  = useState(() => LS.get(LS_KEYS.hidden, {}));
  const [colSearch,  setFiltersState] = useState(() => LS.get(LS_KEYS.filters, {}));

  const setVisible = (v) => { const n = typeof v === 'function' ? v(visible) : v;    LS.set(LS_KEYS.visible, n); setVisibleState(n); };
  const setLayout  = (v) => { const n = typeof v === 'function' ? v(layout) : v;     LS.set(LS_KEYS.layout, n);  setLayoutState(n); };
  const setHidden  = (v) => { const n = typeof v === 'function' ? v(hiddenCols) : v; LS.set(LS_KEYS.hidden, n);  setHiddenState(n); };
  const setFilters = (v) => { const n = typeof v === 'function' ? v(colSearch) : v;  LS.set(LS_KEYS.filters, n); setFiltersState(n); };

  const [colWidths,  setColWidthsState] = useState(() => LS.get(LS_KEYS.colWidths, {}));
  const setColWidths = (v) => { const n = typeof v === 'function' ? v(colWidths) : v; LS.set(LS_KEYS.colWidths, n); setColWidthsState(n); };

  const resizingRef = useRef(null);

  const startResize = (tableName, col, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[tableName + ':' + col] ?? 120;
    resizingRef.current = { tableName, col, startX, startW };

    const onMove = (me) => {
      const delta = me.clientX - resizingRef.current.startX;
      const newW  = Math.max(40, resizingRef.current.startW + delta);
      setColWidths(prev => ({ ...prev, [resizingRef.current.tableName + ':' + resizingRef.current.col]: newW }));
    };
    document.body.classList.add('col-resizing');
    const onUp = () => {
      resizingRef.current = null;
      document.body.classList.remove('col-resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Ephemeral state ───────────────────────────────────────────────────────
  const [allTables,     setAllTables]     = useState([]);
  const [tableData,     setTableData]     = useState({});
  const [formInputs,    setFormInputs]    = useState({});
  const [editingRow,    setEditingRow]    = useState({});
  const [editInputs,    setEditInputs]    = useState({});
  const [dropOpen,      setDropOpen]      = useState(false);
  const [dropSel,       setDropSel]       = useState([]);
  const [logs,          setLogs]          = useState([]);
  const [logsOpen,      setLogsOpen]      = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState({});
  const [prefsOpen,     setPrefsOpen]     = useState(false);
  const dropRef  = useRef(null);
  const prefsRef = useRef(null);

  // ── Derived style tokens ──────────────────────────────────────────────────
  const accent  = prefs.accentColor;
  const ff      = FONT_FAMILIES[prefs.fontFamily] || FONT_FAMILIES.sans;
  const fs      = prefs.fontSize;
  const rh      = ROW_HEIGHTS[prefs.rowHeight];
  const cellPad = prefs.rowHeight === 'compact' ? '2px 6px' : prefs.rowHeight === 'relaxed' ? '12px 14px' : '6px 10px';
  const border  = prefs.borderStyle === 'none' ? 'transparent' : prefs.borderStyle === 'full' ? '#374151' : '#1e2d3d';

  // Blend global T background with table-level panel colors
  const T = {
    bg:       globalT?.bg       ?? '#0a0f1a',
    surface:  globalT?.surface  ?? '#111827',
    text:     globalT?.text     ?? '#d1d5db',
    textHi:   globalT?.textHi   ?? '#f1f5f9',
    muted:    globalT?.muted    ?? '#4b5a6e',
    panel:    prefs.cellBg,
    panelHdr: prefs.headerBg,
    border,
    teal:     accent,
    tealDim:  `${accent}20`,
  };

  const iBtn = (c) => ({ background: 'none', border: 'none', color: c, cursor: 'pointer', fontSize: 12, padding: '3px 6px', lineHeight: 1, borderRadius: 4, fontFamily: ff });
  const pillBtn = (active, color) => ({ padding: '2px 8px', borderRadius: 4, fontSize: 11, border: `1px solid ${active ? color : border}`, background: active ? `${color}18` : 'transparent', color: active ? color : T.muted, cursor: 'pointer', fontFamily: ff, transition: 'all 0.12s' });

  const log = useCallback((text, type = 'ok') => {
    setLogs(p => [{ id: Date.now(), ts: new Date().toLocaleTimeString(), text, type }, ...p.slice(0, 99)]);
    if (type === 'err') setLogsOpen(true);
  }, []);

  const fetchTable = useCallback(async (name) => {
    const res = await api.get(`/table-data?tableName=${name}`);
    if (res.success) setTableData(p => ({ ...p, [name]: { columns: res.columns, rows: res.rows } }));
    else log(`${name}: ${res.error}`, 'err');
  }, [log]);

  useEffect(() => {
    api.get('/config').then(d => {
      const tables = (d.connections || []).flatMap(c => c.selectedTables);
      setAllTables(tables);
      setVisible(prev => prev.filter(t => tables.includes(t)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    visible.forEach(name => fetchTable(name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLayout(cur => {
      const existing = new Set(cur.map(l => l.i));
      const missing  = visible.filter(t => !existing.has(t));
      if (!missing.length) return cur;
      return [...cur, ...missing.map((t, i) => ({ i: t, x: ((cur.length + i) % 2) * 6, y: Infinity, w: 6, h: 9, minW: 3, minH: 5 }))];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const close = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  { setDropOpen(false); setDropSel([]); }
      if (prefsRef.current && !prefsRef.current.contains(e.target)) { setPrefsOpen(false); }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  // ── Table selection ───────────────────────────────────────────────────────
  const openDrop      = () => { setDropSel([...visible]); setDropOpen(true); };
  const toggleDropSel = (t) => setDropSel(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleDropAll = () => setDropSel(dropSel.length === allTables.length ? [] : [...allTables]);
  const applySelection = () => {
    const toAdd    = dropSel.filter(t => !visible.includes(t));
    const toRemove = visible.filter(t => !dropSel.includes(t));
    setVisible(prev => [...prev.filter(t => !toRemove.includes(t)), ...toAdd]);
    setLayout(cur => {
      let next = cur.filter(l => !toRemove.includes(l.i));
      toAdd.forEach((t, i) => { if (!next.some(l => l.i === t)) next.push({ i: t, x: ((next.length + i) % 2) * 6, y: Infinity, w: 6, h: 9, minW: 3, minH: 5 }); });
      return next;
    });
    toAdd.forEach(t => { if (!tableData[t]) fetchTable(t); });
    setDropOpen(false); setDropSel([]);
  };

  // ── Panel actions ─────────────────────────────────────────────────────────
  const removePanel  = (name) => { setVisible(p => p.filter(x => x !== name)); setLayout(p => p.filter(l => l.i !== name)); };
  const toggleCol    = (tn, col) => setHidden(p => { const cur = p[tn] || []; return { ...p, [tn]: cur.includes(col) ? cur.filter(c => c !== col) : [...cur, col] }; });
  const setRowFilter = (tn, col, val) => setFilters(p => ({ ...p, [tn]: { ...(p[tn] || {}), [col]: val } }));
  const clearFilters = (tn) => { setFilters(p => ({ ...p, [tn]: {} })); setHidden(p => ({ ...p, [tn]: [] })); };

  const insert = async (tableName) => {
    const rowData = formInputs[tableName] || {};
    const res = await api.post('/table-row', { tableName, rowData });
    if (res.success) { log(`Inserted into ${tableName}`); setFormInputs(p => ({ ...p, [tableName]: {} })); fetchTable(tableName); }
    else log(`Insert failed: ${res.error}`, 'err');
  };

  const saveUpdate = async (tableName, originalRow) => {
    const res = await api.post('/table-row-update', { tableName, originalData: originalRow, updatedData: editInputs[tableName] || {} });
    if (res.success) { log(`Updated ${tableName}`); setEditingRow(p => ({ ...p, [tableName]: null })); fetchTable(tableName); }
    else log(`Update failed: ${res.error}`, 'err');
  };

  const deleteRow = async (tableName, row) => {
    if (!confirm('Delete this row?')) return;
    const res = await api.post('/table-row-delete', { tableName, rowData: row });
    if (res.success) { log(`Deleted from ${tableName}`); fetchTable(tableName); }
    else log(`Delete failed: ${res.error}`, 'err');
  };

  const errCount = logs.filter(l => l.type === 'err').length;

  const sourceLabel = prefs.source === 'config'
    ? '⟳ synced from config'
    : prefs.source?.startsWith('theme:')
      ? `◈ ${TABLE_THEMES[prefs.source.replace('theme:', '')]?.name ?? 'theme'}`
      : '◎ custom';

  return (
    // <div style={{ padding: 20, minHeight: '100vh', background: T.bg, paddingBottom: 140, fontFamily: ff, fontSize: fs, transition: 'all 0.2s ease' }}>
    <div style={{ padding: 20, minHeight: '100vh', paddingBottom: 140, fontFamily: ff, fontSize: fs, transition: 'all 0.2s ease', position: 'relative',
      background: `
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,100,220,0.18) 0%, transparent 70%),
        ${T.bg}`,
      backgroundImage: `
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,100,220,0.18) 0%, transparent 70%),
        linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px),
        linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)`,
      backgroundSize: `100% 100%, 60px 60px, 60px 60px, 12px 12px, 12px 12px`,
      backgroundPosition: `0 0, -1px -1px, -1px -1px, -1px -1px, -1px -1px`
    }}><style>{`
      .grid-dot-overlay::before {
        content: '';
        position: absolute; inset: 0; pointer-events: none; z-index: 0;
        background-image: radial-gradient(circle, rgba(56,189,248,0.35) 1px, transparent 1px);
        background-size: 60px 60px;
        background-position: -1px -1px;
      }
    `}</style><div className="grid-dot-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} /><div style={{ position: 'relative', zIndex: 1 }}></div>
      {/* ── Sync success banner ── */}
      {syncBanner && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: `${accent}ee`, color: '#fff', padding: '10px 24px', borderRadius: 8, zIndex: 9999, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          ✓ Table display synced from global config
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: T.textHi, margin: 0, fontFamily: ff }}>Tables Workspace</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{visible.length} panel{visible.length !== 1 ? 's' : ''} open</p>
            <span style={{ fontSize: 10, color: accent, background: `${accent}15`, padding: '1px 7px', borderRadius: 8, border: `1px solid ${accent}30`, fontFamily: ff }}>{sourceLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Sync button */}
          <button
            onClick={syncFromConfig}
            style={{ padding: '6px 13px', background: 'transparent', border: `1px solid ${accent}`, borderRadius: 6, color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}
          >
            ⟳ Sync Config
          </button>

          {/* Logs toggle */}
          <button onClick={() => setLogsOpen(o => !o)} style={{ padding: '6px 12px', background: logsOpen ? `${accent}22` : T.surface, border: `1px solid ${errCount > 0 ? '#7f1d1d' : logsOpen ? accent : border}`, borderRadius: 6, color: errCount > 0 ? '#f87171' : logsOpen ? accent : T.muted, fontSize: 12, cursor: 'pointer', fontFamily: ff }}>
            {errCount > 0 ? `⚠ ${errCount} errors` : '▣ logs'}
          </button>

          {/* Display panel */}
          <div ref={prefsRef} style={{ position: 'relative' }}>
            <button onClick={() => setPrefsOpen(o => !o)} style={{ padding: '6px 12px', background: prefsOpen ? `${accent}22` : T.surface, border: `1px solid ${prefsOpen ? accent : border}`, borderRadius: 6, color: prefsOpen ? accent : T.muted, fontSize: 12, cursor: 'pointer', fontFamily: ff }}>
              ⚙ display
            </button>

            {prefsOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: T.bg, border: `1px solid ${globalT?.borderHi ?? '#475569'}`, borderRadius: 10, zIndex: 300, width: 340, padding: '14px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', maxHeight: '80vh', overflowY: 'auto' }}>

                {/* Table preset themes */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Table Preset Themes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.values(TABLE_THEMES).map(th => {
                      const isActive = activeTableTheme === th.id;
                      return (
                        <button key={th.id} onClick={() => applyTableTheme(th.id)} style={{ padding: '8px 10px', borderRadius: 6, background: th.cellBg, border: `2px solid ${isActive ? th.accentColor : '#1e2d3d'}`, color: '#d1d5db', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: th.accentColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: isActive ? th.accentColor : '#94a3b8', fontFamily: ff }}>{th.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${globalT?.border ?? '#2d3f55'}`, marginBottom: 12 }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Fine-Tune</div>

                {/* Font Family */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${globalT?.border ?? '#2d3f55'}` }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Font family</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['mono','sans','serif'].map(f => (
                      <button key={f} onClick={() => setPrefs({ fontFamily: f, source: 'local' })} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, border: `1px solid ${prefs.fontFamily === f ? accent : border}`, background: prefs.fontFamily === f ? `${accent}22` : 'transparent', color: prefs.fontFamily === f ? accent : T.muted, cursor: 'pointer', fontFamily: ff }}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${globalT?.border ?? '#2d3f55'}` }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Font size</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[10,11,12,13,14].map(s => (
                      <button key={s} onClick={() => setPrefs({ fontSize: s, source: 'local' })} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, border: `1px solid ${prefs.fontSize === s ? accent : border}`, background: prefs.fontSize === s ? `${accent}22` : 'transparent', color: prefs.fontSize === s ? accent : T.muted, cursor: 'pointer', fontFamily: ff }}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Row Density */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${globalT?.border ?? '#2d3f55'}` }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Row density</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['compact','normal','relaxed'].map(r => (
                      <button key={r} onClick={() => setPrefs({ rowHeight: r, source: 'local' })} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, border: `1px solid ${prefs.rowHeight === r ? accent : border}`, background: prefs.rowHeight === r ? `${accent}22` : 'transparent', color: prefs.rowHeight === r ? accent : T.muted, cursor: 'pointer', fontFamily: ff }}>{r}</button>
                    ))}
                  </div>
                </div>

                {/* Striped Rows */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${globalT?.border ?? '#2d3f55'}` }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Striped rows</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[true,false].map(v => (
                      <button key={String(v)} onClick={() => setPrefs({ stripedRows: v, source: 'local' })} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, border: `1px solid ${prefs.stripedRows === v ? accent : border}`, background: prefs.stripedRows === v ? `${accent}22` : 'transparent', color: prefs.stripedRows === v ? accent : T.muted, cursor: 'pointer', fontFamily: ff }}>{v ? 'on' : 'off'}</button>
                    ))}
                  </div>
                </div>

                {/* Cell Borders */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${globalT?.border ?? '#2d3f55'}` }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Cell borders</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['none','subtle','full'].map(b => (
                      <button key={b} onClick={() => setPrefs({ borderStyle: b, source: 'local' })} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, border: `1px solid ${prefs.borderStyle === b ? accent : border}`, background: prefs.borderStyle === b ? `${accent}22` : 'transparent', color: prefs.borderStyle === b ? accent : T.muted, cursor: 'pointer', fontFamily: ff }}>{b}</button>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Accent color</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#0d9488','#2563eb','#6366f1','#db2777','#ea580c','#22c55e','#f59e0b','#00ffe7'].map(c => (
                      <button key={c} onClick={() => setPrefs({ accentColor: c, source: 'local' })} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${prefs.accentColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', outline: 'none' }} />
                    ))}
                    <input type="color" value={prefs.accentColor} onChange={e => setPrefs({ accentColor: e.target.value, source: 'local' })} style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${border}`, cursor: 'pointer', padding: 0, background: 'none' }} />
                  </div>
                </div>

                {/* Header BG */}
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Header background</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#0e1623','#0f172a','#1e1b4b','#1c1917','#042f2e','#020a12'].map(c => (
                      <button key={c} onClick={() => setPrefs({ headerBg: c, source: 'local' })} style={{ width: 22, height: 22, borderRadius: 4, background: c, border: `2px solid ${prefs.headerBg === c ? '#fff' : border}`, cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={prefs.headerBg} onChange={e => setPrefs({ headerBg: e.target.value, source: 'local' })} style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${border}`, cursor: 'pointer', padding: 0, background: 'none' }} />
                  </div>
                </div>

                {/* Cell BG */}
                <div style={{ paddingTop: 10, paddingBottom: 4 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Cell background</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['#141d2b','#111827','#1e293b','#12121f','#0a1f12','#1f0a0a'].map(c => (
                      <button key={c} onClick={() => setPrefs({ cellBg: c, source: 'local' })} style={{ width: 22, height: 22, borderRadius: 4, background: c, border: `2px solid ${prefs.cellBg === c ? '#fff' : border}`, cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={prefs.cellBg} onChange={e => setPrefs({ cellBg: e.target.value, source: 'local' })} style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${border}`, cursor: 'pointer', padding: 0, background: 'none' }} />
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${globalT?.border ?? '#2d3f55'}`, marginTop: 12, paddingTop: 10, display: 'flex', gap: 6 }}>
                  <button onClick={syncFromConfig} style={{ flex: 1, padding: '6px', background: `${accent}18`, border: `1px solid ${accent}`, borderRadius: 6, color: accent, fontSize: 11, cursor: 'pointer', fontFamily: ff, fontWeight: 600 }}>
                    ⟳ Sync from Config
                  </button>
                  <button onClick={() => { const d = prefsFromGlobal(globalT, globalPrefs); setPrefsState(d); LS.set(LS_KEYS.prefs, d); setActiveTableTheme(null); }} style={{ flex: 1, padding: '6px', background: 'transparent', border: `1px solid ${globalT?.border ?? '#2d3f55'}`, borderRadius: 6, color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: ff }}>
                    Reset to config
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table selector */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button onClick={openDrop} style={{ padding: '6px 14px', background: accent, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: ff }}>
              Tables {visible.length > 0 ? `(${visible.length})` : ''}
            </button>
            {dropOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: T.bg, border: `1px solid ${globalT?.borderHi ?? '#475569'}`, borderRadius: 8, zIndex: 200, minWidth: 240, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ padding: '9px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Tables</span>
                  <button onClick={toggleDropAll} style={{ background: 'none', border: 'none', color: accent, fontSize: 11, cursor: 'pointer' }}>{dropSel.length === allTables.length ? 'Deselect all' : 'Select all'}</button>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {allTables.length === 0
                    ? <div style={{ padding: 16, fontSize: 12, color: T.muted }}>No tables configured.</div>
                    : allTables.map(t => (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid ${border}`, background: dropSel.includes(t) ? T.tealDim : 'transparent' }}>
                        <input type="checkbox" checked={dropSel.includes(t)} onChange={() => toggleDropSel(t)} style={{ accentColor: accent, cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: dropSel.includes(t) ? T.textHi : T.text, fontFamily: ff }}>{t}</span>
                      </label>
                    ))}
                </div>
                <div style={{ padding: '9px 14px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{dropSel.length} selected</span>
                  <button onClick={applySelection} style={{ padding: '5px 16px', background: accent, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 32px', color: T.muted, border: `1px dashed ${border}`, borderRadius: 12, fontSize: 13 }}>
          No tables open. Click <strong style={{ color: T.text }}>Tables</strong> to pick some.
        </div>
      ) : (
        <ResponsiveGridLayout
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={rh}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          onLayoutChange={(nl) => setLayout(nl)}
          draggableHandle=".drag-handle"
          resizeHandles={['se', 'sw', 'e', 's']}
          compactType="vertical"
        >
          {visible.map(tableName => {
            const { columns = [], rows = [] } = tableData[tableName] || {};
            const hidden       = hiddenCols[tableName] || [];
            const filters      = colSearch[tableName]  || {};
            const visCols      = columns.filter(c => !hidden.includes(c));
            const activeFCount = Object.values(filters).filter(Boolean).length;
            const filteredRows = rows.filter(row =>
              Object.entries(filters).every(([col, val]) => !val || String(row[col] ?? '').toLowerCase().includes(val.toLowerCase()))
            );
            const draft      = formInputs[tableName] || {};
            const activeEdit = editingRow[tableName];
            const editRow    = editInputs[tableName] || {};
            const isLoading  = !tableData[tableName];
            const pickerOpen = colPickerOpen[tableName];
            const hasState   = hidden.length > 0 || activeFCount > 0;

            return (
              <div key={tableName}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.panel, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>

                  {/* Panel header */}
                  <div style={{ flexShrink: 0 }}>
                    <div className="drag-handle" style={{ padding: '8px 12px', background: T.panelHdr, cursor: 'grab', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                        <span style={{ fontSize: fs, fontWeight: 700, color: T.textHi, fontFamily: ff }}>{tableName}</span>
                        {!isLoading && (
                          <span style={{ fontSize: 10, color: T.muted, background: T.bg, padding: '1px 6px', borderRadius: 8, border: `1px solid ${border}`, fontFamily: ff }}>
                            {filteredRows.length}{filteredRows.length !== rows.length ? `/${rows.length}` : ''} rows
                          </span>
                        )}
                        {hasState && <span style={{ fontSize: 10, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '1px 6px', borderRadius: 8, border: '1px solid rgba(217,119,6,0.3)' }}>filtered</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {hasState && (
                          <button onClick={() => clearFilters(tableName)} style={{ ...iBtn('#d97706'), fontSize: 10, padding: '2px 7px', border: '1px solid rgba(217,119,6,0.35)', borderRadius: 4, background: 'rgba(217,119,6,0.08)' }}>✕ clear</button>
                        )}
                        <button onClick={() => setColPickerOpen(p => ({ ...p, [tableName]: !p[tableName] }))} style={{ ...iBtn(pickerOpen ? accent : T.muted), padding: '3px 8px', border: `1px solid ${pickerOpen ? accent : border}`, borderRadius: 4, background: pickerOpen ? T.tealDim : 'transparent', fontSize: 11 }}>⊞ cols</button>
                        <button onClick={() => fetchTable(tableName)} style={iBtn(T.muted)} title="Refresh">↻</button>
                        <button onClick={() => removePanel(tableName)} style={iBtn(T.muted)} title="Close">✕</button>
                      </div>
                    </div>

                    {pickerOpen && columns.length > 0 && (
                      <div style={{ padding: '7px 12px', background: T.surface, borderBottom: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        <span style={{ fontSize: 10, color: T.muted, marginRight: 4, alignSelf: 'center' }}>COLS:</span>
                        {columns.map(col => (
                          <button key={col} onClick={() => toggleCol(tableName, col)} style={pillBtn(!hidden.includes(col), accent)}>{col}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table body */}
                  {isLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: fs, gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, border: `2px solid ${border}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Loading…
                    </div>
                  ) : (
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: fs, tableLayout: 'fixed', minWidth: '100%' }}>
                        <colgroup>
                          <col style={{ width: 56, minWidth: 56 }} />
                          {visCols.map(col => {
                            const w = colWidths[tableName + ':' + col];
                            return <col key={col} style={w ? { width: w, minWidth: w } : { minWidth: 80 }} />;
                          })}
                        </colgroup>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
                          <tr style={{ background: T.panelHdr }}>
                            <th style={{ padding: cellPad, borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }} />
                            {visCols.map(col => (
                              <th key={col} style={{ padding: cellPad, borderBottom: `1px solid ${border}`, textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: Math.max(fs - 2, 9), textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: ff, position: 'relative', userSelect: 'none' }}>
                                {col}{filters[col] && <span style={{ color: '#d97706', marginLeft: 4 }}>▼</span>}
                                <span
                                  onMouseDown={(e) => startResize(tableName, col, e)}
                                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', background: 'transparent', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Drag to resize"
                                >
                                  <span style={{ width: 2, height: '60%', borderRadius: 1, background: accent, opacity: 0.35, transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}
                                    onDoubleClick={(e) => { e.stopPropagation(); setColWidths(prev => { const next = { ...prev }; delete next[tableName + ':' + col]; return next; }); }}
                                  />
                                </span>
                              </th>
                            ))}
                          </tr>
                          <tr style={{ background: T.panelHdr }}>
                            <td style={{ padding: '3px 8px', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }} />
                            {visCols.map(col => (
                              <td key={col} style={{ padding: '3px 5px', borderBottom: `1px solid ${border}` }}>
                                <input value={filters[col] || ''} onChange={e => setRowFilter(tableName, col, e.target.value)} placeholder="filter…" style={{ width: '100%', padding: '2px 6px', background: filters[col] ? 'rgba(217,119,6,0.08)' : T.bg, border: `1px solid ${filters[col] ? 'rgba(217,119,6,0.6)' : (globalT?.borderHi ?? '#475569')}`, borderRadius: 4, color: filters[col] ? '#d97706' : T.muted, fontSize: Math.max(fs - 2, 9), fontFamily: ff, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }} />
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.length === 0 ? (
                            <tr><td colSpan={visCols.length + 1} style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: fs }}>No rows match filters.</td></tr>
                          ) : filteredRows.map((row, idx) => {
                            const isEditing = activeEdit === idx;
                            const rowBg = isEditing ? `${accent}15` : prefs.stripedRows && idx % 2 !== 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
                            return (
                              <tr key={idx} style={{ background: rowBg, transition: 'background 0.08s' }}
                                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = rowBg; }}
                              >
                                <td style={{ padding: cellPad, borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, width: 56, whiteSpace: 'nowrap' }}>
                                  {isEditing ? (
                                    <><button style={iBtn('#16a34a')} onClick={() => saveUpdate(tableName, row)} title="Save">✓</button><button style={iBtn(T.muted)} onClick={() => setEditingRow(p => ({ ...p, [tableName]: null }))} title="Cancel">✕</button></>
                                  ) : (
                                    <><button style={iBtn(accent)} onClick={() => { setEditingRow(p => ({ ...p, [tableName]: idx })); setEditInputs(p => ({ ...p, [tableName]: { ...row } })); }} title="Edit">✎</button><button style={iBtn('#dc2626')} onClick={() => deleteRow(tableName, row)} title="Delete">⌫</button></>
                                  )}
                                </td>
                                {visCols.map(col => (
                                  <td key={col} style={{ padding: cellPad, borderBottom: `1px solid ${border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isEditing
                                      ? <input value={editRow[col] ?? ''} onChange={e => setEditInputs(p => ({ ...p, [tableName]: { ...p[tableName], [col]: e.target.value } }))} style={{ width: '100%', padding: '2px 6px', background: T.bg, border: `1px solid ${accent}`, borderRadius: 3, color: T.textHi, fontSize: fs, fontFamily: ff, outline: 'none', boxSizing: 'border-box' }} />
                                      : row[col] !== null && row[col] !== undefined
                                        ? <span style={{ fontFamily: ff, fontSize: fs, color: T.text }}>{String(row[col])}</span>
                                        : <em style={{ color: border, fontSize: fs }}>null</em>}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          {/* Insert row */}
                          <tr style={{ position: 'sticky', bottom: 0, background: T.panelHdr, borderTop: `1px solid ${border}`, zIndex: 2 }}>
                            <td style={{ padding: cellPad, borderRight: `1px solid ${border}` }}>
                              <button onClick={() => insert(tableName)} style={{ background: '#16a34a', border: 'none', borderRadius: 4, color: '#fff', width: 20, height: 20, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>+</button>
                            </td>
                            {visCols.map(col => (
                              <td key={col} style={{ padding: '3px 5px' }}>
                                <input placeholder={col} value={draft[col] || ''} onChange={e => setFormInputs(p => ({ ...p, [tableName]: { ...p[tableName], [col]: e.target.value } }))} style={{ width: '100%', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, borderRadius: 3, color: T.text, fontSize: fs, fontFamily: ff, outline: 'none', boxSizing: 'border-box' }} />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

      {/* ── Floating logs ── */}
      {logsOpen && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, width: 460, maxHeight: 300, background: T.bg, border: `1px solid ${globalT?.borderHi ?? '#475569'}`, borderRadius: 12, zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: ff, boxShadow: '0 24px 60px rgba(0,0,0,0.8)', pointerEvents: 'all' }}>
          <div style={{ padding: '9px 14px', background: T.surface, borderBottom: `1px solid ${border}`, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Activity Log</span>
              {errCount > 0 && <span style={{ fontSize: 10, background: 'rgba(220,38,38,0.15)', color: '#f87171', padding: '1px 7px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)' }}>{errCount} errors</span>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 11, fontFamily: ff }}>clear</button>
              <button onClick={() => setLogsOpen(false)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.length === 0
              ? <span style={{ color: T.muted, fontSize: 11 }}>No activity yet.</span>
              : logs.map(l => (
                <div key={l.id} style={{ fontSize: 11, display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ color: T.muted, flexShrink: 0, fontFamily: ff }}>{l.ts}</span>
                  <span style={{ color: l.type === 'err' ? '#f87171' : '#34d399', fontFamily: ff }}>{l.text}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        body.col-resizing, body.col-resizing * { cursor: col-resize !important; user-select: none !important; }
        .react-grid-item { transition: none !important; }
        .react-grid-item.cssTransforms { transition-property: transform !important; }
        .react-grid-item.resizing, .react-grid-item.react-draggable-dragging { z-index: 10; }
        .react-grid-placeholder { background: ${accent}12 !important; border-radius: 10px; border: 1px dashed ${accent} !important; }
        .react-resizable-handle { opacity: 0; }
        .react-grid-item:hover .react-resizable-handle { opacity: 1; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}