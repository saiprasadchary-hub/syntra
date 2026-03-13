import React from 'react';
import { useIDE } from '../context/IDEContext';

const THEMES = [
  { id: 'dark',     label: 'Dark (Default)',   preview: '#0d0d0f' },
  { id: 'light',    label: 'Light',            preview: '#f5f5f7' },
  { id: 'midnight', label: 'Midnight Blue',    preview: '#070711' },
];

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];

export default function SettingsPanel() {
  const { state, dispatch, notify } = useIDE();

  const Toggle = ({ on, onToggle }) => (
    <button className={`settings-toggle ${on ? 'on' : ''}`} onClick={onToggle} aria-pressed={on} />
  );

  function setTheme(theme) {
    dispatch({ type: 'SET_THEME', theme });
    document.documentElement.setAttribute('data-theme', theme);
    notify(`Theme changed to "${theme}"`, 'info');
  }

  return (
    <div className="settings-panel">
      {/* Theme */}
      <div>
        <div className="settings-section-title">Appearance</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {THEMES.map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${state.theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                background: state.theme === t.id ? 'var(--accent-dim)' : 'var(--bg-hover)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 4, background: t.preview, border: '1px solid var(--border-light)' }} />
              <span style={{ fontSize: 12, flex: 1 }}>{t.label}</span>
              {state.theme === t.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <div className="settings-section-title">Editor</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Font Size</div>
            <div className="settings-desc">{state.fontSize}px</div>
          </div>
          <div className="settings-control">
            <select
              value={state.fontSize}
              onChange={e => dispatch({ type: 'SET_FONT_SIZE', size: Number(e.target.value) })}
            >
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Word Wrap</div>
            <div className="settings-desc">Wrap long lines</div>
          </div>
          <Toggle on={state.wordWrap} onToggle={() => dispatch({ type: 'TOGGLE_WORDWRAP' })} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Minimap</div>
            <div className="settings-desc">Show code overview</div>
          </div>
          <Toggle on={state.minimap} onToggle={() => dispatch({ type: 'TOGGLE_MINIMAP' })} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Auto Save</div>
            <div className="settings-desc">Save on focus change</div>
          </div>
          <Toggle on={state.autoSave} onToggle={() => {
            dispatch({ type: 'TOGGLE_AUTOSAVE' });
            notify(`Auto Save ${state.autoSave ? 'disabled' : 'enabled'}`, 'info');
          }} />
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div>
        <div className="settings-section-title">Keyboard Shortcuts</div>
        {[
          ['Ctrl+P', 'Quick Open File'],
          ['Ctrl+Shift+P', 'Command Palette'],
          ['Ctrl+`', 'Toggle Terminal'],
          ['Ctrl+B', 'Toggle Sidebar'],
          ['Ctrl+S', 'Save File'],
          ['Ctrl+Shift+F', 'Find in Files'],
          ['Ctrl+/', 'Toggle Comment'],
          ['Ctrl+D', 'Select Next Match'],
        ].map(([key, label]) => (
          <div key={key} className="settings-row" style={{ gap: 8 }}>
            <span className="settings-label" style={{ flex: 1 }}>{label}</span>
            <span className="shortcut-key">{key}</span>
          </div>
        ))}
      </div>

      {/* About */}
      <div style={{ padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>🚀</div>
        <div style={{ fontWeight: 600, color: 'var(--text-bright)', marginBottom: 2 }}>Antigravity IDE</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monaco Web Editor v1.0</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Powered by Monaco + Open VSX</div>
      </div>
    </div>
  );
}
