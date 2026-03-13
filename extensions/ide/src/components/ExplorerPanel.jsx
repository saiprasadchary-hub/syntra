import React, { useState } from 'react';
import { useIDE } from '../context/IDEContext';
import { getFileIcon, getFileLanguage } from '../utils/langUtils';

const FolderIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={open ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    {open
      ? <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#fbbf24" stroke="none"/></>
      : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    }
  </svg>
);

const ChevronRight = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(90deg)' : '', transition: 'transform 0.15s' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function ExplorerPanel() {
  const { state, dispatch, openTab, notify } = useIDE();
  const [folderOpen, setFolderOpen] = useState(true);
  const [renaming, setRenaming] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const files = Object.values(state.files);

  function handleCreate() {
    if (!newFileName.trim()) { setCreating(false); return; }
    const name = newFileName.trim();
    if (state.files[name]) {
      notify(`File "${name}" already exists`, 'error');
    } else {
      dispatch({ type: 'CREATE_FILE', name });
      notify(`Created ${name}`, 'success');
    }
    setCreating(false);
    setNewFileName('');
  }

  function handleDelete(file) {
    dispatch({ type: 'DELETE_FILE', file });
    notify(`Deleted ${file}`, 'info');
    setContextMenu(null);
  }

  function handleContextMenu(e, file) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }

  return (
    <div className="file-tree" onClick={() => setContextMenu(null)}>
      {/* Workspace root */}
      <div
        className="file-tree-item folder"
        style={{ fontWeight: 600, fontSize: 12, paddingLeft: 8 }}
        onClick={() => setFolderOpen(f => !f)}
      >
        <ChevronRight open={folderOpen} />
        <FolderIcon open={folderOpen} />
        <span style={{ marginLeft: 2 }}>ANTIGRAVITY</span>
      </div>

      {folderOpen && (
        <div className="file-tree-indent">
          {files.map(file => (
            <div
              key={file.name}
              className={`file-tree-item ${state.activeTab === file.name ? 'selected' : ''}`}
              onClick={() => openTab(file.name)}
              onContextMenu={e => handleContextMenu(e, file.name)}
              title={file.name}
            >
              <span style={{ fontSize: 14 }}>{getFileIcon(file.name)}</span>
              <span className="truncate">{file.name}</span>
              {file.unsaved && (
                <span className="tab-dot" style={{ marginLeft: 'auto', flexShrink: 0, width: 5, height: 5 }} />
              )}
            </div>
          ))}

          {creating && (
            <div className="file-tree-item">
              <span style={{ fontSize: 14 }}>📄</span>
              <input
                className="new-file-input"
                autoFocus
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewFileName(''); }
                }}
                onBlur={handleCreate}
                placeholder="filename.ext"
              />
            </div>
          )}
        </div>
      )}

      {/* New File Button */}
      <div style={{ padding: '8px 12px' }}>
        <button
          onClick={() => setCreating(true)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 8px',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New File
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2000,
          padding: 4,
          minWidth: 160,
          animation: 'slideDown 0.12s ease',
        }}>
          {[
            { label: '📂 Open', action: () => { openTab(contextMenu.file); setContextMenu(null); } },
            { label: '✏️ Rename', action: () => { setRenaming(contextMenu.file); setContextMenu(null); } },
            { label: '🗑️ Delete', action: () => handleDelete(contextMenu.file), danger: true },
          ].map(item => (
            <div
              key={item.label}
              className="menu-item"
              style={item.danger ? { color: 'var(--error)' } : {}}
              onClick={item.action}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
