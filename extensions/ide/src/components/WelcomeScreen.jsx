import React from 'react';
import { useIDE } from '../context/IDEContext';

export default function WelcomeScreen() {
  const { openTab, dispatch } = useIDE();

  const starters = [
    { icon: '🌐', name: 'index.html', desc: 'HTML with live preview' },
    { icon: '🎨', name: 'style.css',  desc: 'CSS styles' },
    { icon: '📜', name: 'app.js',     desc: 'JavaScript app' },
    { icon: '🐍', name: 'main.py',    desc: 'Python script' },
  ];

  return (
    <div className="welcome-screen">
      {/* Logo */}
      <div className="welcome-logo-wrap">
        <div className="welcome-logo-glow" />
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ position: 'relative', zIndex: 1 }}>
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>

      <div>
        <div className="welcome-title">Antigravity IDE</div>
        <div className="welcome-subtitle">
          A professional browser-based IDE powered by <strong>Monaco Editor</strong> —
          the same engine that drives VS Code.
        </div>
      </div>

      {/* Quick open */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Open File
        </div>
        {starters.map(s => (
          <div
            key={s.name}
            onClick={() => openTab(s.name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
          >
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
            <svg style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="welcome-actions">
        <button
          className="welcome-btn primary"
          onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Command Palette
          <span style={{ fontSize: 11, opacity: 0.8, fontFamily: 'var(--font-mono)' }}>Ctrl+Shift+P</span>
        </button>
        <button
          className="welcome-btn secondary"
          onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'extensions' })}
        >
          🔌 Extensions
        </button>
      </div>

      {/* Keyboard shortcuts */}
      <div className="welcome-shortcuts">
        {[
          ['Ctrl+P', 'Quick Open'],
          ['Ctrl+Shift+P', 'Commands'],
          ['Ctrl+`', 'Terminal'],
          ['Ctrl+B', 'Sidebar'],
        ].map(([key, label]) => (
          <div key={key} className="shortcut-card">
            <span className="shortcut-key">{key}</span>
            <span className="shortcut-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
