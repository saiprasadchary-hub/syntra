import React, { useState, useRef, useEffect } from 'react';
import { useIDE } from '../context/IDEContext';

const COMMANDS = {
  help: {
    run: () => [
      { type: 'info', text: 'Antigravity IDE Terminal v1.0' },
      { type: 'info', text: '' },
      { type: 'output', text: 'Available commands:' },
      { type: 'output', text: '  help     — show this help' },
      { type: 'output', text: '  clear    — clear terminal' },
      { type: 'output', text: '  ls       — list files' },
      { type: 'output', text: '  echo     — print text' },
      { type: 'output', text: '  date     — current date' },
      { type: 'output', text: '  node     — Node.js version info' },
      { type: 'output', text: '  npm      — npm version info' },
      { type: 'output', text: '  whoami   — current user' },
      { type: 'output', text: '  pwd      — working directory' },
    ]
  },
  date: { run: () => [{ type: 'output', text: new Date().toLocaleString() }] },
  whoami: { run: () => [{ type: 'output', text: 'developer@antigravity-ide' }] },
  pwd: { run: () => [{ type: 'output', text: '/home/developer/project' }] },
  node: { run: () => [{ type: 'output', text: 'v20.11.0' }] },
  npm: { run: () => [{ type: 'output', text: '10.4.0' }] },
};

export default function TerminalPanel() {
  const { state, dispatch } = useIDE();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState(state.terminalHistory);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (state.terminalVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.terminalVisible]);

  function runCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newHistory = [...history,
      { type: 'prompt', path: '~/project', cmd: trimmed }
    ];

    if (trimmed === 'clear') {
      setHistory([]);
      setCmdHistory(h => [trimmed, ...h]);
      setInput('');
      setCmdIdx(-1);
      return;
    }

    const parts = trimmed.split(' ');
    const base = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (base === 'ls') {
      const lines = Object.keys(state.files).map(f => ({ type: 'output', text: `  📄 ${f}` }));
      setHistory([...newHistory, ...lines]);
    } else if (base === 'echo') {
      setHistory([...newHistory, { type: 'output', text: args.join(' ') }]);
    } else if (base === 'cat') {
      const file = args[0];
      const f = state.files[file];
      if (f) {
        const lines = f.content.split('\n').slice(0, 20).map(l => ({ type: 'output', text: l }));
        if (f.content.split('\n').length > 20) lines.push({ type: 'info', text: '... (truncated)' });
        setHistory([...newHistory, ...lines]);
      } else {
        setHistory([...newHistory, { type: 'error', text: `cat: ${file}: No such file or directory` }]);
      }
    } else if (COMMANDS[base]) {
      const result = COMMANDS[base].run(args);
      setHistory([...newHistory, ...result]);
    } else {
      setHistory([...newHistory, {
        type: 'error',
        text: `${base}: command not found. Type 'help' for available commands.`,
      }]);
    }

    setCmdHistory(h => [trimmed, ...h]);
    setInput('');
    setCmdIdx(-1);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { runCommand(input); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(cmdIdx + 1, cmdHistory.length - 1);
      setCmdIdx(next);
      setInput(cmdHistory[next] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(cmdIdx - 1, -1);
      setCmdIdx(prev);
      setInput(prev === -1 ? '' : cmdHistory[prev]);
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  }

  const typeColor = {
    output: '#cdd6f4',
    error: '#f38ba8',
    success: '#a6e3a1',
    info: '#89b4fa',
    prompt: '#cdd6f4',
  };

  return (
    <div
      className="terminal-mock"
      ref={bodyRef}
      onClick={() => inputRef.current?.focus()}
      style={{ cursor: 'text' }}
    >
      {history.map((line, i) => (
        <div key={i} style={{ color: typeColor[line.type] || '#cdd6f4', marginBottom: 1 }}>
          {line.type === 'prompt' ? (
            <span>
              <span className="terminal-prompt">developer</span>
              <span style={{ color: '#9399b2' }}>@</span>
              <span className="terminal-path">antigravity</span>
              <span style={{ color: '#9399b2' }}>:</span>
              <span className="terminal-path">{line.path}</span>
              <span className="terminal-dollar"> $ </span>
              <span className="terminal-cmd">{line.cmd}</span>
            </span>
          ) : (
            <span style={{ color: typeColor[line.type] }}>{line.text}</span>
          )}
        </div>
      ))}

      {/* Input line */}
      <div className="terminal-input-line">
        <span className="terminal-prompt">developer</span>
        <span style={{ color: '#9399b2' }}>@</span>
        <span className="terminal-path">antigravity</span>
        <span style={{ color: '#9399b2' }}>:</span>
        <span className="terminal-path">~/project</span>
        <span className="terminal-dollar"> $ </span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="Terminal input"
        />
      </div>
    </div>
  );
}
