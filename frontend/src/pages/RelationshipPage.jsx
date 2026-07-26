import { useState, useEffect } from 'react';
import { api } from '../api';

const RelationshipPage = ({ T, globalPrefs }) => {
  const [config, setConfig] = useState({ connections: [], relationships: [] });
  const [newRel, setNewRel] = useState({ fromTable: '', fromKey: '', toTable: '', toKey: '' });
  const [pkColumns, setPkColumns] = useState([]);
  const [fkColumns, setFkColumns] = useState([]);

  // Derive font from globalPrefs if provided
  const fontMap = {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    serif: 'Georgia, Cambria, serif'
  };
  const fontFamily = fontMap[globalPrefs?.fontFamily] || fontMap.sans;
  const fontSize = globalPrefs?.fontSize || '13px';

  useEffect(() => {
    api.get('/config').then(data => setConfig(data));
  }, []);

  const allTables = config.connections?.flatMap(c => c.selectedTables) || [];

  const handleTableSelection = async (type, tableName) => {
    if (!tableName) {
      if (type === 'pk') { setPkColumns([]); setNewRel(prev => ({ ...prev, fromTable: '', fromKey: '' })); }
      else               { setFkColumns([]); setNewRel(prev => ({ ...prev, toTable: '', toKey: '' })); }
      return;
    }
    try {
      const data = await api.get(`/columns?tableName=${tableName}`);
      if (data.success) {
        if (type === 'pk') { setPkColumns(data.columns); setNewRel(prev => ({ ...prev, fromTable: tableName, fromKey: '' })); }
        else               { setFkColumns(data.columns); setNewRel(prev => ({ ...prev, toTable: tableName, toKey: '' })); }
      }
    } catch {
      alert('Error connecting to local asset parsing streams.');
    }
  };

  const addRelationship = async () => {
    if (!newRel.fromTable || !newRel.fromKey || !newRel.toTable || !newRel.toKey) {
      return alert('Complete link alignment paths first!');
    }
    const updatedRelationships = [...(config.relationships || []), newRel];
    await api.post('/relationships', { relationships: updatedRelationships });
    setConfig({ ...config, relationships: updatedRelationships });
    setNewRel({ fromTable: '', fromKey: '', toTable: '', toKey: '' });
    setPkColumns([]);
    setFkColumns([]);
  };

  const deleteRelationship = async (idx) => {
    const updated = config.relationships.filter((_, i) => i !== idx);
    await api.post('/relationships', { relationships: updated });
    setConfig({ ...config, relationships: updated });
  };

  const inputStyle = {
    padding: '9px 12px',
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: T.bg,
    color: T.text,
    fontSize,
    fontFamily,
    minWidth: 160,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600, color: T.muted,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em'
  };

  return (
    <div style={{
      padding: 32, minHeight: '100vh',
      background: T.bg, color: T.text,
      fontFamily, fontSize,
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.textHi }}>
          Virtual Relationships Builder
        </h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
          Map schema connections seamlessly inside the virtual layout runtime workspace.
        </p>
      </div>

      {/* Builder card */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: 24, marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 18px 0', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: T.muted }}>
          New Relationship
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 8 }}>
          {/* PK Table */}
          <div>
            <label style={labelStyle}>PK Table</label>
            <select value={newRel.fromTable} style={inputStyle} onChange={e => handleTableSelection('pk', e.target.value)}>
              <option value="">Select table…</option>
              {allTables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* PK Column */}
          <div>
            <label style={labelStyle}>PK Column</label>
            <select
              value={newRel.fromKey}
              style={{ ...inputStyle, opacity: pkColumns.length === 0 ? 0.5 : 1 }}
              disabled={pkColumns.length === 0}
              onChange={e => setNewRel({ ...newRel, fromKey: e.target.value })}
            >
              <option value="">{pkColumns.length === 0 ? '← choose table first' : 'Select column…'}</option>
              {pkColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div style={{ color: T.accent, fontWeight: 700, fontSize: 18, paddingBottom: 2 }}>→</div>

          {/* FK Table */}
          <div>
            <label style={labelStyle}>FK Table</label>
            <select value={newRel.toTable} style={inputStyle} onChange={e => handleTableSelection('fk', e.target.value)}>
              <option value="">Select table…</option>
              {allTables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* FK Column */}
          <div>
            <label style={labelStyle}>FK Column</label>
            <select
              value={newRel.toKey}
              style={{ ...inputStyle, opacity: fkColumns.length === 0 ? 0.5 : 1 }}
              disabled={fkColumns.length === 0}
              onChange={e => setNewRel({ ...newRel, toKey: e.target.value })}
            >
              <option value="">{fkColumns.length === 0 ? '← choose table first' : 'Select column…'}</option>
              {fkColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <button
            onClick={addRelationship}
            style={{
              padding: '9px 20px', background: T.accent,
              color: T.id === 'cyber' ? '#000' : T.id === 'light' ? '#fff' : '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontWeight: 600, fontSize, fontFamily,
              paddingBottom: 2
            }}
          >
            Commit Link
          </button>
        </div>
      </div>

      {/* Relationships table */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, overflow: 'hidden'
      }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: T.muted }}>
            Active Relationships
            {config.relationships?.length > 0 && (
              <span style={{
                marginLeft: 8, fontSize: 11, background: `${T.accent}22`,
                color: T.accent, padding: '1px 8px', borderRadius: 8,
                border: `1px solid ${T.accent}44`, fontWeight: 400, textTransform: 'none'
              }}>
                {config.relationships.length}
              </span>
            )}
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
          <thead>
            <tr style={{ background: T.headerBg, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}>
              {['Primary Source (PK)', 'Foreign Key Target (FK)', ''].map((h, i) => (
                <th key={i} style={{ padding: '11px 16px', color: T.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!config.relationships || config.relationships.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '24px 16px', color: T.muted, fontStyle: 'italic', textAlign: 'center' }}>
                  No relationships defined yet.
                </td>
              </tr>
            ) : config.relationships.map((r, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 0 ? 'transparent' : `${T.headerBg}88` }}
              >
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ color: T.accent, fontWeight: 600 }}>{r.fromTable}</span>
                  <span style={{ color: T.muted, marginLeft: 6 }}>({r.fromKey})</span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ color: T.textHi, fontWeight: 500 }}>{r.toTable}</span>
                  <span style={{ color: T.muted, marginLeft: 6 }}>({r.toKey})</span>
                </td>
                <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => deleteRelationship(idx)}
                    style={{
                      background: 'none', border: `1px solid ${T.border}`,
                      borderRadius: 4, color: '#f87171', cursor: 'pointer',
                      fontSize: 11, padding: '3px 10px', fontFamily
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RelationshipPage;