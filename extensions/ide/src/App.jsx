import React, { useEffect, useCallback } from 'react';
import { IDEProvider, useIDE } from './context/IDEContext';
import { getLangMeta, getFileIcon } from './utils/langUtils';

// Components
import MonacoEditorPane from './components/MonacoEditorPane';
import ExplorerPanel    from './components/ExplorerPanel';
import SearchPanel      from './components/SearchPanel';
import ExtensionsPanel  from './components/ExtensionsPanel';
import GitPanel         from './components/GitPanel';
import SettingsPanel    from './components/SettingsPanel';
import TerminalPanel    from './components/TerminalPanel';
import CommandPalette   from './components/CommandPalette';
import Notifications    from './components/Notifications';
import LivePreview      from './components/LivePreview';
import WelcomeScreen    from './components/WelcomeScreen';

// ─── Activity Bar ─────────────────────────────────────────────────────────────
function ActivityBar() {
  const { state, dispatch } = useIDE();

  const items = [
    { id: 'explorer',    icon: ExplorerIcon,    title: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search',      icon: SearchIcon,      title: 'Search (Ctrl+Shift+F)' },
    { id: 'git',         icon: GitIcon,         title: 'Source Control (Ctrl+Shift+G)' },
    { id: 'extensions',  icon: ExtIcon,         title: 'Extensions (Ctrl+Shift+X)' },
  ];

  function toggleView(id) {
    if (state.sidebarView === id && state.sidebarVisible) {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    } else {
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: id });
    }
  }

  return (
    <nav className="activity-bar">
      {items.map(item => (
        <button
          key={item.id}
          className={`act-icon ${state.sidebarView === item.id && state.sidebarVisible ? 'active' : ''}`}
          onClick={() => toggleView(item.id)}
          title={item.title}
        >
          <item.icon />
          <span className="act-icon-tooltip">{item.title.split(' (')[0]}</span>
        </button>
      ))}

      <div className="act-bottom">
        <button
          className={`act-icon ${!state.sidebarVisible || state.sidebarView === 'settings' ? '' : ''}`}
          onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'settings' })}
          title="Settings"
        >
          <SettingsIcon />
          <span className="act-icon-tooltip">Settings</span>
        </button>
      </div>
    </nav>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { state, dispatch } = useIDE();

  const titles = {
    explorer:   'Explorer',
    search:     'Search',
    git:        'Source Control',
    extensions: 'Extensions',
    settings:   'Settings',
  };

  const panels = {
    explorer:   <ExplorerPanel />,
    search:     <SearchPanel />,
    git:        <GitPanel />,
    extensions: <ExtensionsPanel />,
    settings:   <SettingsPanel />,
  };

  return (
    <aside className={`sidebar ${state.sidebarVisible ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <span>{titles[state.sidebarView] || 'Explorer'}</span>
        <div className="sidebar-header-actions">
          <button
            className="sidebar-icon-btn"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            title="Close Sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        {panels[state.sidebarView]}
      </div>
    </aside>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
function TabBar() {
  const { state, dispatch, openTab, closeTab, notify } = useIDE();

  function handleClose(e, file) {
    e.stopPropagation();
    if (state.files[file]?.unsaved) {
      notify(`Closed ${file} (unsaved changes)`, 'warning');
    }
    closeTab(file);
  }

  function handleSave(file) {
    dispatch({ type: 'SAVE_FILE', file });
    notify(`Saved ${file}`, 'success');
  }

  if (state.openTabs.length === 0) return null;

  return (
    <div className="tabs-bar">
      {state.openTabs.map(tab => {
        const file = state.files[tab];
        if (!file) return null;
        const meta = getLangMeta(file.language);
        return (
          <div
            key={tab}
            className={`tab ${state.activeTab === tab ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', file: tab })}
            onDoubleClick={() => file.unsaved && handleSave(tab)}
            title={`${tab}${file.unsaved ? ' (unsaved)' : ''}\nDouble-click to save`}
          >
            <span style={{ fontSize: 14 }}>{getFileIcon(tab)}</span>
            <span className="truncate" style={{ maxWidth: 120 }}>{tab}</span>
            {file.unsaved
              ? <span className="tab-dot" title="Unsaved changes" />
              : null
            }
            <button
              className="tab-close"
              onClick={e => handleClose(e, tab)}
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────
function Breadcrumbs() {
  const { state } = useIDE();
  if (!state.activeTab) return null;
  return (
    <div className="breadcrumbs">
      <span>project</span>
      <span className="breadcrumb-sep">›</span>
      <span style={{ color: 'var(--text-primary)' }}>{state.activeTab}</span>
    </div>
  );
}

// ─── Editor Content ───────────────────────────────────────────────────────────
function EditorContent() {
  const { state } = useIDE();
  const file = state.activeTab ? state.files[state.activeTab] : null;
  const isHtml = file?.language === 'html';

  if (!file) return <WelcomeScreen />;

  return (
    <div className="editor-area">
      {state.previewVisible && isHtml ? (
        <div className="editor-split">
          <div className="monaco-wrap" style={{ flex: 1, overflow: 'hidden' }}>
            <MonacoEditorPane
              key={file.name}
              file={file.name}
              content={file.content}
              language={file.language}
            />
          </div>
          <LivePreview />
        </div>
      ) : (
        <MonacoEditorPane
          key={file.name}
          file={file.name}
          content={file.content}
          language={file.language}
        />
      )}
    </div>
  );
}

// ─── Terminal Panel ───────────────────────────────────────────────────────────
function TerminalPanelWrapper() {
  const { state, dispatch } = useIDE();

  const PANEL_TABS = ['terminal', 'problems', 'debug'];

  return (
    <div className={`terminal-panel ${state.terminalVisible ? '' : 'collapsed'}`}>
      <div className="panel-tabs">
        {PANEL_TABS.map(tab => (
          <div
            key={tab}
            className={`panel-tab ${state.terminalPanel === tab ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TERMINAL_PANEL', panel: tab })}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'problems' && (
              <span style={{ marginLeft: 4, background: 'var(--warning)', color: '#000', padding: '0 4px', borderRadius: 8, fontSize: 10 }}>
                {state.problems.length}
              </span>
            )}
          </div>
        ))}
        <div className="panel-actions">
          <button
            className="panel-icon-btn"
            title="Clear"
            onClick={() => {}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button
            className="panel-icon-btn"
            title="Close Panel"
            onClick={() => dispatch({ type: 'TOGGLE_TERMINAL' })}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="terminal-body">
        {state.terminalPanel === 'terminal' && <TerminalPanel />}
        {state.terminalPanel === 'problems' && (
          <div style={{ overflowY: 'auto', height: '100%' }}>
            {state.problems.map(p => (
              <div key={p.id} className="problems-item">
                <span className="problems-icon">
                  {p.type === 'warning'
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                  }
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {p.file}:{p.line}:{p.col}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {state.terminalPanel === 'debug' && (
          <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            No debugger is attached. Start debugging with F5.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  const { state, dispatch, notify } = useIDE();
  const file = state.activeTab ? state.files[state.activeTab] : null;
  const meta = file ? getLangMeta(file.language) : null;

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item" onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'git' })} title="Git Branch">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          main
        </div>
        <div className="statusbar-item" onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'search' })} title="Problems">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          0
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          {state.problems.length}
        </div>
      </div>

      <div className="statusbar-right">
        {file && (
          <>
            <div className="statusbar-item" onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })} title="Toggle Live Preview">
              {state.previewVisible ? '👁️ Preview On' : '👁️ Preview'}
            </div>
            <div className="statusbar-item" title="Language">
              {meta?.label} {file.language}
            </div>
            <div className="statusbar-item" title="Encoding">UTF-8</div>
            <div className="statusbar-item" title="Indentation">Spaces: 2</div>
          </>
        )}
        <div className="statusbar-item" onClick={() => dispatch({ type: 'TOGGLE_TERMINAL' })} title="Toggle Terminal (Ctrl+`)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Terminal
        </div>
        <div className="statusbar-item" onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })} title="Command Palette">
          ⌘
        </div>
      </div>
    </footer>
  );
}

// ─── Title Bar ────────────────────────────────────────────────────────────────
function TitleBar() {
  const { state, dispatch } = useIDE();
  const [openMenu, setOpenMenu] = React.useState(null);

  const menus = {
    File: [
      { label: 'New File',        shortcut: 'Ctrl+N',       action: () => dispatch({ type: 'CREATE_FILE', name: 'untitled.txt' }) },
      { label: 'Save',            shortcut: 'Ctrl+S',       action: () => state.activeTab && dispatch({ type: 'SAVE_FILE', file: state.activeTab }) },
      { separator: true },
      { label: 'Close Tab',       shortcut: 'Ctrl+W',       action: () => state.activeTab && dispatch({ type: 'CLOSE_TAB', file: state.activeTab }) },
    ],
    View: [
      { label: 'Explorer',        shortcut: 'Ctrl+Shift+E', action: () => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'explorer' }) },
      { label: 'Search',          shortcut: 'Ctrl+Shift+F', action: () => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'search' }) },
      { label: 'Extensions',      shortcut: 'Ctrl+Shift+X', action: () => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'extensions' }) },
      { separator: true },
      { label: 'Toggle Sidebar',  shortcut: 'Ctrl+B',       action: () => dispatch({ type: 'TOGGLE_SIDEBAR' }) },
      { label: 'Toggle Terminal', shortcut: 'Ctrl+`',       action: () => dispatch({ type: 'TOGGLE_TERMINAL' }) },
      { label: 'Toggle Preview',  shortcut: '',             action: () => dispatch({ type: 'TOGGLE_PREVIEW' }) },
    ],
    Terminal: [
      { label: 'New Terminal',    shortcut: '',             action: () => dispatch({ type: 'TOGGLE_TERMINAL' }) },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', shortcut: '',         action: () => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'settings' }) },
      { label: 'About Antigravity',  shortcut: '',         action: () => {} },
    ],
  };

  return (
    <header className="titlebar" onClick={() => setOpenMenu(null)}>
      {/* Logo */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ marginRight: 8, flexShrink: 0 }}>
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>

      <div className="titlebar-menu" onClick={e => e.stopPropagation()}>
        {Object.entries(menus).map(([name, items]) => (
          <div key={name} style={{ position: 'relative' }}>
            <button
              className="menu-btn"
              onClick={() => setOpenMenu(openMenu === name ? null : name)}
            >
              {name}
            </button>
            {openMenu === name && (
              <div className="menu-dropdown">
                {items.map((item, i) =>
                  item.separator
                    ? <div key={i} className="menu-separator" />
                    : (
                      <div
                        key={i}
                        className="menu-item"
                        onClick={() => { item.action(); setOpenMenu(null); }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="titlebar-title">
        {state.activeTab ? `${state.activeTab} — Antigravity IDE` : 'Antigravity IDE'}
      </div>

      <div className="titlebar-actions">
        <button
          className="titlebar-btn"
          onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button
          className="titlebar-btn"
          onClick={() => dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'settings' })}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

// ─── SVG Icon Components ──────────────────────────────────────────────────────
function ExplorerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function GitIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    </svg>
  );
}
function ExtIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

// ─── IDE Root ─────────────────────────────────────────────────────────────────
function IDERoot() {
  const { state, dispatch } = useIDE();

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    }
    if (e.ctrlKey && e.key === 'p' && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    }
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_TERMINAL' });
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'explorer' });
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'search' });
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'extensions' });
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      dispatch({ type: 'SET_SIDEBAR_VIEW', view: 'git' });
    }
    if (e.key === 'Escape' && state.commandPaletteOpen) {
      dispatch({ type: 'CLOSE_COMMAND_PALETTE' });
    }
  }, [dispatch, state.commandPaletteOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="ide-shell">
      <TitleBar />

      <div className="workbench">
        <ActivityBar />
        <Sidebar />

        <main className="main-content">
          <TabBar />
          <Breadcrumbs />
          <EditorContent />
          <TerminalPanelWrapper />
        </main>
      </div>

      <StatusBar />
      <CommandPalette />
      <Notifications />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <IDEProvider>
      <IDERoot />
    </IDEProvider>
  );
}
