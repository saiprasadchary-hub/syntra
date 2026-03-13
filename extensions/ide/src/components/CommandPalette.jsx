import React, { useState, useEffect, useRef } from 'react';
import { useIDE } from '../context/IDEContext';
import { getFileIcon } from '../utils/langUtils';

const COMMANDS = [
  { id: 'toggle-terminal',   label: 'View: Toggle Terminal',         shortcut: 'Ctrl+`',    icon: '🖥️',  action: (d) => d({ type: 'TOGGLE_TERMINAL' }) },
  { id: 'toggle-sidebar',    label: 'View: Toggle Sidebar',          shortcut: 'Ctrl+B',    icon: '📋',  action: (d) => d({ type: 'TOGGLE_SIDEBAR' }) },
  { id: 'theme-dark',        label: 'Preferences: Dark Theme',       shortcut: '',          icon: '🌙',  theme: 'dark' },
  { id: 'theme-light',       label: 'Preferences: Light Theme',      shortcut: '',          icon: '☀️',  theme: 'light' },
  { id: 'theme-midnight',    label: 'Preferences: Midnight Theme',   shortcut: '',          icon: '🔮',  theme: 'midnight' },
  { id: 'explorer',          label: 'View: Explorer',                shortcut: 'Ctrl+Shift+E', icon: '📁', view: 'explorer' },
  { id: 'search',            label: 'View: Search',                  shortcut: 'Ctrl+Shift+F', icon: '🔍', view: 'search' },
  { id: 'git',               label: 'View: Source Control',          shortcut: 'Ctrl+Shift+G', icon: '🔀', view: 'git' },
  { id: 'extensions',        label: 'View: Extensions',              shortcut: 'Ctrl+Shift+X', icon: '🔌', view: 'extensions' },
  { id: 'settings',          label: 'Preferences: Open Settings',   shortcut: 'Ctrl+,',    icon: '⚙️',  view: 'settings' },
  { id: 'toggle-preview',    label: 'View: Toggle Live Preview',     shortcut: '',          icon: '👁️',  action: (d) => d({ type: 'TOGGLE_PREVIEW' }) },
  { id: 'toggle-minimap',    label: 'View: Toggle Minimap',         shortcut: '',          icon: '🗺️',  action: (d) => d({ type: 'TOGGLE_MINIMAP' }) },
  { id: 'toggle-wordwrap',   label: 'View: Toggle Word Wrap',       shortcut: 'Alt+Z',     icon: '↩️',  action: (d) => d({ type: 'TOGGLE_WORDWRAP' }) },
];

export default function CommandPalette() {
  const { state, dispatch, openTab, notify } = useIDE();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setQuery('');
    setFocused(0);
  }, [state.commandPaletteOpen]);

  const fileResults = query && !query.startsWith('>')
    ? Object.keys(state.files).filter(f => f.toLowerCase().includes(query.toLowerCase()))
    : [];

  const cmdResults = (query.startsWith('>') ? query.slice(1) : query.startsWith('>') ? '' : '')
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.slice(1).toLowerCase().trim()))
    : query === '' || query === '>'
      ? COMMANDS
      : !query.startsWith('>')
        ? []
        : COMMANDS.filter(c => c.label.toLowerCase().includes(query.slice(1).toLowerCase().trim()));

  const allItems = [
    ...fileResults.map(f => ({ type: 'file', id: f, label: f })),
    ...cmdResults.map(c => ({ type: 'cmd', ...c })),
  ];

  function execute(item) {
    dispatch({ type: 'CLOSE_COMMAND_PALETTE' });
    if (item.type === 'file') {
      openTab(item.id);
      return;
    }
    if (item.theme) {
      dispatch({ type: 'SET_THEME', theme: item.theme });
      document.documentElement.setAttribute('data-theme', item.theme);
      notify(`Theme: ${item.theme}`, 'info');
    } else if (item.view) {
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: item.view });
    } else if (item.action) {
      item.action(dispatch);
    }
  }

  function handleKey(e) {
    if (e.key === 'Escape') { dispatch({ type: 'CLOSE_COMMAND_PALETTE' }); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && allItems[focused]) { execute(allItems[focused]); }
  }

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.children[focused];
    el?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  if (!state.commandPaletteOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => dispatch({ type: 'CLOSE_COMMAND_PALETTE' })}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          placeholder="Type '>' for commands, or file name to open…"
          value={query}
          onChange={e => { setQuery(e.target.value); setFocused(0); }}
          onKeyDown={handleKey}
        />
        <div className="command-list" ref={listRef}>
          {allItems.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results found
            </div>
          )}

          {fileResults.length > 0 && (
            <div className="command-section-title">Recently Opened Files</div>
          )}
          {allItems.map((item, i) => {
            if (item.type === 'file' && i === fileResults.length) return null;
            const showCmdHeader = i === fileResults.length && cmdResults.length > 0;
            return (
              <React.Fragment key={item.id}>
                {showCmdHeader && <div className="command-section-title">Commands</div>}
                <div
                  className={`command-item ${i === focused ? 'focused' : ''}`}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setFocused(i)}
                >
                  <span className="command-item-icon">
                    {item.type === 'file'
                      ? <span style={{ fontSize: 16 }}>{getFileIcon(item.id)}</span>
                      : <span style={{ fontSize: 16 }}>{item.icon || '⚡'}</span>
                    }
                  </span>
                  <span className="command-item-label">{item.label}</span>
                  {item.shortcut && <span className="command-item-shortcut">{item.shortcut}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Dismiss</span>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
            {'>'} for commands
          </span>
        </div>
      </div>
    </div>
  );
}
