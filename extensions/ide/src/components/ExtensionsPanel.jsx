import React, { useState, useMemo } from 'react';
import { useIDE } from '../context/IDEContext';

const CATEGORIES = [
  'All', 'Languages', 'Formatters', 'Themes', 'SCM', 'AI', 'Snippets', 'Debuggers', 'Remote', 'Web', 'Keymaps', 'Tools', 'Installed'
];

export default function ExtensionsPanel() {
  const { state, dispatch, notify } = useIDE();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('downloads'); // downloads | rating | name

  const filteredExtensions = useMemo(() => {
    return state.extensions.filter(ext => {
      const q = query.toLowerCase();
      const matchesQuery = !query || 
                          ext.name.toLowerCase().includes(q) || 
                          ext.id.toLowerCase().includes(q) ||
                          ext.description.toLowerCase().includes(q) ||
                          ext.author.toLowerCase().includes(q);
      
      const matchesCategory = activeCategory === 'All' || 
                             (activeCategory === 'Installed' ? ext.installed : ext.category === activeCategory);
      
      return matchesQuery && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rating') return b.rating - a.rating;
      // For downloads, we need to parse things like '72.4M'
      const parseVal = (str) => {
        const num = parseFloat(str);
        if (typeof str !== 'string') return 0;
        if (str.includes('M')) return num * 1000000;
        if (str.includes('K')) return num * 1000;
        return num;
      };
      return parseVal(b.downloads) - parseVal(a.downloads);
    });
  }, [state.extensions, query, activeCategory, sortBy]);

  function handleInstall(e, ext) {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_EXTENSION', id: ext.id });
    notify(
      ext.installed ? `Uninstalled ${ext.name}` : `Installed ${ext.name}`, 
      'success'
    );
  }

  return (
    <div className="extensions-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="extensions-search-wrap" style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <div className="search-input-wrap" style={{ marginBottom: 10 }}>
          <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="sidebar-input"
            placeholder="Search Extensions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ 
              background: 'var(--bg-lighter)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 4px',
              cursor: 'pointer'
            }}
          >
            <option value="downloads">Most Downloads</option>
            <option value="rating">Top Rated</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="extensions-categories" style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 10,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-lighter)',
              color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="extensions-list" style={{ flex: 1, overflowY: 'auto' }}>
        {filteredExtensions.length > 0 ? (
          filteredExtensions.map(ext => (
            <div key={ext.id} className="extension-item" style={{ 
              padding: 12, 
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              transition: 'background 0.2s ease',
              cursor: 'default'
            }}>
              <div 
                className="ext-icon-large" 
                style={{ 
                  width: 42, 
                  height: 42, 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 'bold',
                  flexShrink: 0,
                  backgroundColor: ext.iconColor || 'var(--accent-dim)',
                  color: ['#f5da55', '#f7df1e', '#fbbf24', '#f7df1e'].includes(ext.iconColor) ? '#000' : '#fff'
                }}
              >
                {ext.iconText || ext.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ext.name}</span>
                  {ext.installed && <span style={{ fontSize: 9, background: 'var(--success-dim)', color: 'var(--success)', padding: '1px 4px', borderRadius: 4 }}>Installed</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>{ext.author}</div>
                <div style={{ 
                  fontSize: 11, 
                  color: 'var(--text-muted)', 
                  marginBottom: 8,
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }} title={ext.description}>
                  {ext.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {ext.downloads}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {ext.rating}
                  </span>
                  <span style={{ 
                    fontSize: 9, 
                    background: 'var(--bg-lighter)', 
                    color: 'var(--text-muted)', 
                    padding: '1px 5px', 
                    borderRadius: 4,
                    border: '1px solid var(--border)' 
                  }}>{ext.category}</span>
                </div>
                <button
                  onClick={(e) => handleInstall(e, ext)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: ext.installed ? 'var(--bg-lighter)' : 'var(--accent)',
                    color: ext.installed ? 'var(--text-primary)' : '#fff',
                    transition: 'all 0.2s ease',
                    width: 'fit-content'
                  }}
                  onMouseEnter={e => !ext.installed && (e.target.style.opacity = 0.9)}
                  onMouseLeave={e => !ext.installed && (e.target.style.opacity = 1)}
                >
                  {ext.installed ? 'Uninstall' : 'Install'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: 12 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <div style={{ fontSize: 13, fontWeight: 500 }}>No extensions found</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Try a different search or category</div>
          </div>
        )}
      </div>
      
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-panel)' }}>
        Marketplace powered by <span style={{ color: 'var(--accent)' }}>Open VSX</span>
      </div>
    </div>
  );
}
