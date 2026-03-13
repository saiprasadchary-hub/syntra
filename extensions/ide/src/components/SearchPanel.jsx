import React, { useState, useCallback } from 'react';
import { useIDE } from '../context/IDEContext';

export default function SearchPanel() {
  const { state, dispatch, openTab } = useIDE();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const search = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const found = [];
    Object.values(state.files).forEach(file => {
      const lines = file.content.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(lower)) {
          const idx = line.toLowerCase().indexOf(lower);
          found.push({
            file: file.name,
            line: i + 1,
            text: line,
            matchStart: idx,
            matchEnd: idx + q.length,
          });
        }
      });
    });
    setResults(found.slice(0, 80));
    dispatch({ type: 'SET_SEARCH_RESULTS', results: found, query: q });
  }, [state.files, dispatch]);

  const highlight = (text, start, end) => {
    if (start < 0) return text;
    return (
      <>
        {text.slice(0, start)}
        <span className="search-match">{text.slice(start, end)}</span>
        {text.slice(end)}
      </>
    );
  };

  // Group by file
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.file]) grouped[r.file] = [];
    grouped[r.file].push(r);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="search-widget">
        <div className="search-input-wrap">
          <svg className="search-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search in files…"
            value={query}
            onChange={e => search(e.target.value)}
            autoFocus
          />
        </div>
        {query && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} in {Object.keys(grouped).length} file{Object.keys(grouped).length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {Object.entries(grouped).map(([file, lines]) => (
          <div key={file}>
            <div style={{ padding: '6px 12px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>📄</span>
              <span className="search-result-file">{file}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 8 }}>
                {lines.length}
              </span>
            </div>
            {lines.map((r, i) => (
              <div
                key={i}
                className="search-result-item"
                style={{ paddingLeft: 28 }}
                onClick={() => openTab(r.file)}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 10, marginRight: 6, fontFamily: 'var(--font-mono)' }}>
                  {r.line}
                </span>
                <span className="search-result-line">
                  {highlight(r.text.trim(), r.matchStart - (r.text.length - r.text.trimStart().length), r.matchEnd - (r.text.length - r.text.trimStart().length))}
                </span>
              </div>
            ))}
          </div>
        ))}
        {query && results.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            No results for "{query}"
          </div>
        )}
        {!query && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔎</div>
            Type to search across all files
          </div>
        )}
      </div>
    </div>
  );
}
