import { useState, useEffect } from 'react';
import { api } from '../api';
import { THEMES, FONTS } from '../App';

export default function ConfigPage({ T, themeKey, setThemeKey, globalPrefs, setGlobalPrefs }) {
  const [saved, setSaved] = useState(null);
  const [editing, setEditing] = useState(false);
  const [dbName, setDbName] = useState('');
  const [connStr, setConnStr] = useState('');
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTables, setSavingTables] = useState(false);
  const [error, setError] = useState('');
  const [scanDone, setScanDone] = useState(false);

  const s = {
    label: { display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' },
    select: { padding: '8px 12px', background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, outline: 'none', width: '100%' },
    input: (disabled) => ({ display: 'block', width: '100%', padding: '9px 12px', background: disabled ? (T.id === 'light' ? '#f1f5f9' : '#0a111e') : T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: disabled ? T.muted : T.text, fontSize: 13, boxSizing: 'border-box' }),
    card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, marginBottom: 16 },
    btn: (bg, disabled) => ({ padding: '9px 18px', background: disabled ? T.border : bg, border: 'none', borderRadius: 6, color: disabled ? T.muted : '#fff', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' }),
  };

  useEffect(() => {
    api.get('/config').then(d => {
      const conn = d.connections?.[0] || null;
      setSaved(conn);
      if (conn) {
        setDbName(conn.databaseName);
        setConnStr(conn.connectionString);
        setSelected(conn.selectedTables || []);
      }
    });
  }, []);

  const scan = async () => {
    if (!connStr.trim() || !dbName.trim()) return setError('Fields are required.');
    setError(''); setScanning(true); setTables([]); setScanDone(false);
    const res = await api.post('/connect', { connectionString: connStr, databaseName: dbName });
    setScanning(false);
    if (res.success) {
        setTables(res.tables);
        setScanDone(true);
        const saveRes = await api.post('/save-tables', {
        connectionString: connStr,
        databaseName: dbName,
        selectedTables: res.tables,
        });
        if (saveRes.success) {
        setSaved({ connectionString: connStr, databaseName: dbName, selectedTables: res.tables });
        setSelected(res.tables);
        } else {
        setError(saveRes.error || 'Scan succeeded but failed to save.');
        }
    } else {
        setError(res.error);
    }
    };

  const saveTables = async () => {
    setSavingTables(true);
    const res = await api.post('/save-tables', {
      connectionString: connStr,
      databaseName: dbName,
      selectedTables: selected,
    });
    setSavingTables(false);
    if (res.success) {
      setSaved({ connectionString: connStr, databaseName: dbName, selectedTables: selected });
      setScanDone(false);
      setTables([]);
    } else {
      setError(res.error || 'Failed to save tables.');
    }
  };

  const toggleTable = (t) => {
    setSelected(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const updatePref = (key, value) => {
    setGlobalPrefs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ padding: 32, maxWidth: 720, color: T.text }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.textHi }}>System Management</h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Configure the centralized interface constraints and database connections.</p>
      </div>

      {/* BLOCK 1: GLOBAL LAYOUT PANEL */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: T.muted }}>
          Global Styles & Visual Combinations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {Object.values(THEMES).map(theme => (
            <button key={theme.id} onClick={() => setThemeKey(theme.id)} style={{ padding: '12px', borderRadius: 8, background: theme.surface, border: `2px solid ${themeKey === theme.id ? T.accent : theme.border}`, color: theme.text, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: theme.textHi }}>{theme.name}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.bg }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent }} />
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={s.label}>Global Scale (Font Size)</label>
            <select style={s.select} value={globalPrefs.fontSize} onChange={e => updatePref('fontSize', e.target.value)}>
              <option value="11px">Compact (11px)</option>
              <option value="13px">Default (13px)</option>
              <option value="15px">Large (15px)</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Typography Profile</label>
            <select style={s.select} value={globalPrefs.fontFamily} onChange={e => updatePref('fontFamily', e.target.value)}>
              <option value="sans">System Sans-Serif</option>
              <option value="mono">Developer JetBrains Mono</option>
              <option value="serif">Classic Editorial Serif</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Standard Data Density (Row Heights)</label>
            <select style={s.select} value={globalPrefs.rowHeight} onChange={e => updatePref('rowHeight', e.target.value)}>
              <option value="compact">Tight (Compact)</option>
              <option value="normal">Standard (Comfortable)</option>
              <option value="relaxed">Relaxed (Spacious)</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Grid Structural Dividers</label>
            <select style={s.select} value={globalPrefs.borderStyle} onChange={e => updatePref('borderStyle', e.target.value)}>
              <option value="solid">Visible Borders</option>
              <option value="none">Clean Seamless (None)</option>
            </select>
          </div>
        </div>
      </div>

      {/* BLOCK 2: ENGINE CONNECTION STRINGS */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Database Target</div>
          {saved && (
            <div style={{ display: 'flex', gap: 8 }}>
              {editing && (
                <button
                  style={{ padding: '5px 12px', background: '#22c55e', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                  onClick={async () => {
                    setSaving(true);
                    const res = await api.post('/save-tables', {
                      connectionString: connStr,
                      databaseName: dbName,
                      selectedTables: selected, // preserve existing selected tables
                    });
                    setSaving(false);
                    if (res.success) {
                      setSaved({ connectionString: connStr, databaseName: dbName, selectedTables: selected });
                      setEditing(false);
                    } else {
                      setError(res.error || 'Failed to save.');
                    }
                  }}
                >
                  {saving ? 'Saving…' : '✓ Save'}
                </button>
              )}
              <button
                style={{ padding: '5px 12px', background: editing ? T.border : 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: editing ? T.text : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  if (editing) {
                    setDbName(saved.databaseName);
                    setConnStr(saved.connectionString);
                    setSelected(saved.selectedTables || []);
                    setScanDone(false);
                    setError('');
                  }
                  setEditing(prev => !prev);
                }}
              >
                {editing ? '✕ Cancel' : '✎ Edit'}
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Database Label</label>
          <input style={s.input(saved && !editing)} value={dbName} onChange={e => setDbName(e.target.value)} placeholder="e.g. Production_DB" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={s.label}>Connection String</label>
          <input style={s.input(saved && !editing)} value={connStr} onChange={e => setConnStr(e.target.value)} placeholder="Server=host;Database=db;..." />
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <button style={s.btn(T.accent, scanning)} onClick={scan}>
          {scanning ? 'Scanning…' : 'Scan Structural Tables'}
        </button>

        {/* TABLE SELECTION — shown after scan */}
        {scanDone && tables.length > 0 && (
        <div style={{ marginTop: 20 }}>
            <label style={s.label}>Tables Found ({tables.length})</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, marginTop: 8 }}>
            {tables.map(t => (
                <div key={t} style={{ padding: '6px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, color: T.text }}>
                {t}
                </div>
            ))}
            </div>
        </div>
        )}
      </div>
    </div>
  );
}