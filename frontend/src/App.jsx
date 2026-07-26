// import { useState, useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
// import ConfigPage from './pages/ConfigPage';
// import TablesDashboard from './pages/TablesDashboard';
// import RelationshipPage from './pages/RelationshipPage';

// // Standardized Website Theme Combinations
// export const THEMES = {
//   slate: {
//     id: 'slate', name: 'Slate Dark', bg: '#0f172a', surface: '#1e293b', 
//     border: '#2d3f55', borderHi: '#475569', text: '#e2e8f0', textHi: '#f8fafc', 
//     muted: '#64748b', accent: '#38bdf8', headerBg: '#111827', cellBg: '#1e293b'
//   },
//   ocean: {
//     id: 'ocean', name: 'Deep Ocean', bg: '#0a1128', surface: '#1c2541', 
//     border: '#1d2d44', borderHi: '#5bc0be', text: '#e0e1dd', textHi: '#ffffff', 
//     muted: '#8d99ae', accent: '#00b4d8', headerBg: '#0f1423', cellBg: '#1c2541'
//   },
//   cyber: {
//     id: 'cyber', name: 'Cyber Matrix', bg: '#050505', surface: '#111111', 
//     border: '#22c55e33', borderHi: '#22c55e88', text: '#22c55e', textHi: '#86efac', 
//     muted: '#15803d', accent: '#22c55e', headerBg: '#161616', cellBg: '#111111'
//   },
//   light: {
//     id: 'light', name: 'Minimal Light', bg: '#f8fafc', surface: '#ffffff', 
//     border: '#e2e8f0', borderHi: '#cbd5e1', text: '#334155', textHi: '#0f172a', 
//     muted: '#94a3b8', accent: '#4f46e5', headerBg: '#f1f5f9', cellBg: '#ffffff'
//   }
// };

// export default function App() {
//   const [themeKey, setThemeKey] = useState(() => localStorage.getItem('core_theme') || 'slate');
//   const T = THEMES[themeKey] || THEMES.slate;

//   useEffect(() => {
//     localStorage.setItem('core_theme', themeKey);
//   }, [themeKey]);

//   return (
//     <Router>
//       <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, color: T.text, transition: 'all 0.2s ease' }}>
//         {/* Sidebar */}
//         <nav style={{
//           width: 220, flexShrink: 0,
//           background: T.id === 'light' ? '#ffffff' : '#090d16',
//           borderRight: `1px solid ${T.border}`,
//           display: 'flex', flexDirection: 'column',
//           padding: '24px 0',
//           transition: 'all 0.2s ease'
//         }}>
//           <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${T.border}` }}>
//             <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: T.accent, textTransform: 'uppercase' }}>CoreDB</div>
//             <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Studio Workspace</div>
//           </div>
//           <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
//             {[
//               { to: '/config', icon: '⚙️', label: 'Configuration' },
//               { to: '/tables', icon: '📊', label: 'Tables' },
//               { to: '/relationships', icon: '🔗', label: 'Relationships' },
//             ].map(({ to, icon, label }) => (
//               <NavLink key={to} to={to} style={({ isActive }) => ({
//                 display: 'flex', alignItems: 'center', gap: 10,
//                 padding: '9px 12px', borderRadius: 7, textDecoration: 'none',
//                 fontSize: 13, fontWeight: 500,
//                 color: isActive ? T.textHi : T.muted,
//                 background: isActive ? T.surface : 'transparent',
//                 border: `1px solid ${isActive ? T.border : 'transparent'}`,
//                 transition: 'all 0.15s'
//               })}>
//                 <span style={{ fontSize: 15 }}>{icon}</span>
//                 {label}
//               </NavLink>
//             ))}
//           </div>
//         </nav>

//         {/* Main Content Viewport */}
//         <main style={{ flex: 1, overflow: 'auto', background: T.bg, padding: 0, transition: 'all 0.2s ease' }}>
//           <Routes>
//             <Route path="/" element={<Navigate to="/config" replace />} />
//             <Route path="/config" element={<ConfigPage T={T} themeKey={themeKey} setThemeKey={setThemeKey} />} />
//             <Route path="/tables" element={<TablesDashboard T={T} />} />
//             <Route path="/relationships" element={<RelationshipPage T={T} />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// }

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ConfigPage from './pages/ConfigPage';
import TablesDashboard from './pages/TablesDashboard';
import RelationshipPage from './pages/RelationshipPage';

export const THEMES = {
  slate: {
    id: 'slate', name: 'Slate Dark', bg: '#0f172a', surface: '#1e293b',
    border: '#2d3f55', borderHi: '#475569', text: '#e2e8f0', textHi: '#f8fafc',
    muted: '#64748b', accent: '#38bdf8', headerBg: '#111827', cellBg: '#1e293b'
  },
  ocean: {
    id: 'ocean', name: 'Deep Ocean', bg: '#0a1128', surface: '#1c2541',
    border: '#1d2d44', borderHi: '#5bc0be', text: '#e0e1dd', textHi: '#ffffff',
    muted: '#8d99ae', accent: '#00b4d8', headerBg: '#0f1423', cellBg: '#1c2541'
  },
  cyber: {
    id: 'cyber', name: 'Cyber Matrix', bg: '#050505', surface: '#111111',
    border: '#22c55e33', borderHi: '#22c55e88', text: '#22c55e', textHi: '#86efac',
    muted: '#15803d', accent: '#22c55e', headerBg: '#161616', cellBg: '#111111'
  },
  light: {
    id: 'light', name: 'Minimal Light', bg: '#f8fafc', surface: '#ffffff',
    border: '#e2e8f0', borderHi: '#cbd5e1', text: '#334155', textHi: '#0f172a',
    muted: '#94a3b8', accent: '#4f46e5', headerBg: '#f1f5f9', cellBg: '#ffffff'
  }
};

export const FONTS = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  serif: 'Georgia, Cambria, serif'
};

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('core_theme') || 'slate');

  const [globalPrefs, setGlobalPrefs] = useState(() => {
    const saved = localStorage.getItem('core_global_prefs');
    return saved ? JSON.parse(saved) : {
      fontSize: '13px',
      fontFamily: 'sans',
      rowHeight: 'normal',
      borderStyle: 'solid'
    };
  });

  useEffect(() => { localStorage.setItem('core_theme', themeKey); }, [themeKey]);
  useEffect(() => { localStorage.setItem('core_global_prefs', JSON.stringify(globalPrefs)); }, [globalPrefs]);

  const T = THEMES[themeKey] || THEMES.slate;
  const currentFont = FONTS[globalPrefs.fontFamily] || FONTS.sans;

  return (
    <Router>
      <div style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        background: T.bg, color: T.text, fontFamily: currentFont, fontSize: globalPrefs.fontSize,
        transition: 'all 0.2s ease'
      }}>
        {/* Sidebar */}
        <nav style={{
          width: 230, flexShrink: 0,
          background: T.id === 'light' ? '#ffffff' : '#090d16',
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', padding: '24px 0'
        }}>
          <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: T.accent, textTransform: 'uppercase' }}>CoreDB</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Workspace Console</div>
          </div>
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { to: '/config', icon: '⚙️', label: 'Configuration' },
              { to: '/tables', icon: '📊', label: 'Tables' },
              { to: '/relationships', icon: '🔗', label: 'Relationships' },
            ].map(({ to, icon, label }) => (
              <NavLink key={to} to={to} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7,
                textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                color: isActive ? T.textHi : T.muted,
                background: isActive ? T.surface : 'transparent',
                border: `1px solid ${isActive ? T.border : 'transparent'}`
              })}>
                <span>{icon}</span> {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main */}
        <main style={{ flex: 1, overflow: 'auto', background: T.bg }}>
          <Routes>
            <Route path="/" element={<Navigate to="/config" replace />} />
            <Route path="/config" element={
              <ConfigPage
                T={T} themeKey={themeKey} setThemeKey={setThemeKey}
                globalPrefs={globalPrefs} setGlobalPrefs={setGlobalPrefs}
              />
            } />
            <Route path="/tables" element={
              <TablesDashboard
                T={T} globalPrefs={globalPrefs}
                themeKey={themeKey} THEMES={THEMES}
              />
            } />
            <Route path="/relationships" element={
              <RelationshipPage
                T={T} globalPrefs={globalPrefs}
              />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}