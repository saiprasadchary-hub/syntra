// Language metadata utility
export const LANG_META = {
  javascript: { label: 'JS',  color: '#f7df1e', bg: '#2a2500' },
  typescript: { label: 'TS',  color: '#007acc', bg: '#001a2e' },
  python:     { label: 'Py',  color: '#3776ab', bg: '#001a2a' },
  html:       { label: 'H',   color: '#e34c26', bg: '#2a0800' },
  css:        { label: 'C',   color: '#264de4', bg: '#00082a' },
  json:       { label: '{}',  color: '#fbbf24', bg: '#1f1700' },
  markdown:   { label: 'M',   color: '#9898b0', bg: '#1a1a22' },
  rust:       { label: 'Rs',  color: '#dea584', bg: '#1a0a00' },
  go:         { label: 'Go',  color: '#00add8', bg: '#001a20' },
  java:       { label: 'Jv',  color: '#f89820', bg: '#1a1000' },
  plaintext:  { label: 'Tx',  color: '#9898b0', bg: '#1a1a22' },
};

export function getLangMeta(lang) {
  return LANG_META[lang] || LANG_META.plaintext;
}

export function getFileLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    html: 'html', htm: 'html',
    css: 'css', scss: 'css', less: 'css',
    json: 'json',
    md: 'markdown', mdx: 'markdown',
    rs: 'rust',
    go: 'go',
    java: 'java',
    txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

export function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', jsx: '⚛️', ts: '📘', tsx: '⚛️',
    py: '🐍', html: '🌐', css: '🎨',
    json: '📋', md: '📝', rs: '🦀',
    go: '🐹', java: '☕', txt: '📄',
    sh: '🖥️', env: '⚙️', yml: '⚙️', yaml: '⚙️',
    toml: '⚙️', lock: '🔒',
  };
  return icons[ext] || '📄';
}

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getMonacoLanguage(lang) {
  const map = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'markdown',
    rust: 'rust',
    go: 'go',
    java: 'java',
    plaintext: 'plaintext',
  };
  return map[lang] || 'plaintext';
}
