import React from 'react';
import { useIDE } from '../context/IDEContext';

export default function GitPanel() {
  const { state, notify } = useIDE();
  const [commitMsg, setCommitMsg] = React.useState('');

  function handleCommit() {
    if (!commitMsg.trim()) { notify('Please enter a commit message', 'warning'); return; }
    notify(`Committed: "${commitMsg}"`, 'success');
    setCommitMsg('');
  }

  const statusColor = { M: '#fbbf24', A: '#4ade80', D: '#f87171' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Commit input */}
      <div className="git-section">
        <div className="settings-section-title" style={{ marginBottom: 8 }}>Source Control</div>
        <textarea
          className="git-commit-input"
          placeholder="Message (Ctrl+Enter to commit)"
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleCommit(); }}
        />
        <button className="btn-commit" onClick={handleCommit}>
          ✓ Commit
        </button>
      </div>

      {/* Changes */}
      <div className="git-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div className="settings-section-title" style={{ marginBottom: 6 }}>
          Changes ({state.gitChanges.length})
        </div>
        {state.gitChanges.map(ch => (
          <div key={ch.file} className="git-file-item">
            <span className={`git-status ${ch.status}`} style={{ color: statusColor[ch.status] }}>
              {ch.status}
            </span>
            <span style={{ fontSize: 12, flex: 1 }}>📄 {ch.file}</span>
            <button
              title="Stage"
              onClick={() => notify(`Staged ${ch.file}`, 'success')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
            >
              +
            </button>
          </div>
        ))}
      </div>

      {/* Branch info */}
      <div className="git-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 'auto' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          <span style={{ color: 'var(--accent)' }}>main</span>
          <span>↑1 ↓0</span>
        </div>
      </div>
    </div>
  );
}
