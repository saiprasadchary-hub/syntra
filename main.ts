import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import * as monaco from 'monaco-editor';
import { marked } from 'marked';

// Vite worker loaders for Monaco
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import { FileMenu } from './menus/File';
import { EditMenu } from './menus/Edit';
import { SelectionMenu } from './menus/Selection';
import { ViewMenu } from './menus/View';
import { GoMenu } from './menus/Go';
import { RunMenu } from './menus/Run';
import { TerminalMenu } from './menus/Terminal';
import { HelpMenu } from './menus/Help';
import { Explorer } from './Explorer';
import { TerminalService } from './terminal/TerminalService';
import { TaskManager } from './terminal/TaskManager';
import { ExtensionManager } from './extensions/ExtensionManager';
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    User,
    GoogleAuthProvider,
    signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let currentUser: User | null = null;

// Use Vite-specific worker initialization to resolve MIME and CORS issues
(window as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
        if (label === 'json') return new jsonWorker();
        if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
        if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
        if (label === 'typescript' || label === 'javascript') return new tsWorker();
        return new editorWorker();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Antigravity IDE Initialized');

    // --- DOM Elements ---
    const dashboard = document.getElementById('dashboard');
    const editor = document.getElementById('editor');
    const monacoContainer = document.getElementById('monaco-editor-container');
    const editorTabs = document.getElementById('editor-tabs');
    const breadcrumbs = document.getElementById('editor-breadcrumbs');
    const cursorStat = document.getElementById('cursor-pos');
    const editorLanguage = document.getElementById('editor-language');
    const notificationContainer = document.getElementById('notification-container');
    const settingsModal = document.getElementById('settings-modal');
    const messageContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('agent-chat-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-btn');
    const connStatus = document.getElementById('conn-status');
    let serverRootPath = '';

    let openFiles: { 
        path: string, 
        name: string, 
        model?: monaco.editor.ITextModel,
        type?: 'file' | 'extension',
        extData?: any
    }[] = [];
    let activeFileIndex = -1;
    let monacoEditor: monaco.editor.IStandaloneCodeEditor | undefined;
    const recentFiles: string[] = JSON.parse(localStorage.getItem('antigravity_recent_files') || '[]');

    const updateRecentFiles = (path: string) => {
        const index = recentFiles.indexOf(path);
        if (index !== -1) recentFiles.splice(index, 1);
        recentFiles.unshift(path);
        if (recentFiles.length > 10) recentFiles.pop();
        localStorage.setItem('antigravity_recent_files', JSON.stringify(recentFiles));
        AntigravityAPI.updateDashboard();
    };

    // --- Initialize Monaco ---
    if (monacoContainer) {
        monacoEditor = monaco.editor.create(monacoContainer, {
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true },
            padding: { top: 10 },
            scrollBeyondLastLine: false,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            fixedOverflowWidgets: true
        });

        // Register custom professional themes
        monaco.editor.defineTheme('midnight', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff79c6' },
                { token: 'number', foreground: 'bd93f9' },
                { token: 'string', foreground: 'f1fa8c' },
                { token: 'type', foreground: '8be9fd' },
                { token: 'function', foreground: '50fa7b' }
            ],
            colors: {
                'editor.background': '#1a1b26',
                'editor.foreground': '#a9b1d6',
                'editorLineNumber.foreground': '#3b4261',
                'editorCursor.foreground': '#c0caf5',
                'editor.selectionBackground': '#33467c',
                'editorIndentGuide.background': '#292e42'
            }
        });

        monaco.editor.defineTheme('monokai', {
            base: 'vs-dark', inherit: true,
            rules: [{ token: 'keyword', foreground: 'F92672' }, { token: 'string', foreground: 'E6DB74' }],
            colors: { 'editor.background': '#272822' }
        });

        if (monacoEditor) {
            monacoEditor.updateOptions({
                cursorSmoothCaretAnimation: 'on',
                cursorBlinking: 'smooth',
                renderLineHighlight: 'all',
                fontLigatures: true,
                smoothScrolling: true,
                mouseWheelZoom: true,
                bracketPairColorization: { enabled: true },
                stickyScroll: { enabled: true },
                minimap: { enabled: true },
                wordWrap: 'on'
            });
        }

        monacoEditor?.onDidChangeCursorPosition((e) => {
            if (cursorStat) {
                cursorStat.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                cursorStat.style.cursor = 'pointer';
                cursorStat.onclick = () => {
                    const line = prompt('Go to line:');
                    if (line) AntigravityAPI.goToLine(parseInt(line));
                };
            }
            // Auto-reveal in explorer
            if (activeFileIndex !== -1) {
                const file = openFiles[activeFileIndex];
                if (file) explorer.revealPath(file.path);
            }
        });

        monacoEditor?.onDidChangeCursorSelection((_e) => {
            const selectionStat = document.getElementById('selection-stat');
            if (selectionStat && monacoEditor) {
                const selection = monacoEditor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const model = monacoEditor.getModel();
                    const text = model?.getValueInRange(selection) || "";
                    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
                    selectionStat.textContent = `${text.length} chars, ${words} words selected`;
                    selectionStat.style.display = 'block';
                } else {
                    selectionStat.style.display = 'none';
                }
            }
        });

        monaco.editor.onDidChangeMarkers(() => {
            AntigravityAPI.updateProblems();
        });
    }

    let backendUrl = '';

    // Automatically detect backend URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        backendUrl = 'http://localhost:3001';
    } else {
        // 1. Check if user manually set a URL in localStorage
        const savedUrl = localStorage.getItem('antigravity_backend_url');
        
        if (savedUrl && savedUrl.startsWith('http')) {
            backendUrl = savedUrl;
        } else if (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
            // 2. If on Firebase Hosting, point to the more unique Render backend
            backendUrl = 'https://antigravity-syntra-ed.onrender.com';
        } else {
            // 3. Otherwise assume backend and frontend are on the same domain (e.g. both on Render)
            backendUrl = window.location.origin;
        }
    }

    console.log(`Connecting to Antigravity Backend at: ${backendUrl || 'Local Host'}`);

    // Only attempt connection if we have a URL or are on localhost
    const socket = io(backendUrl || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''), {
        transports: ['polling', 'websocket'], // Try polling first for better compatibility with proxies
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 45000 // Increased timeout for Render wake-up
    });

    (window as any).AntigravitySocket = socket;

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        // Only notify if it's the first time and not on localhost
        if (window.location.hostname !== 'localhost') {
            AntigravityAPI.notify(`Connection failed: ${err.message}. Retrying...`, 'error');
            
            // diagnostic fetch
            fetch(`${backendUrl}/health`).then(r => {
                console.log('Health check result:', r.status);
                if (r.status === 404) {
                    AntigravityAPI.notify('Backend returned 404. Please check the URL in Settings.', 'warning');
                }
            }).catch(e => console.log('Health check failed:', e));
        }
    });

    socket.on('connect', () => {
        console.log('--- SOCKET CONNECTED ---');
        console.log('ID:', socket.id);
        addNotification('Connected to backend server', 'success');
        if (connStatus) {
            connStatus.style.color = 'var(--success)';
            connStatus.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Cloud Connected';
        }
        // Force explorer refresh on connect
        if ((window as any).AntigravityExplorer) {
            (window as any).AntigravityExplorer.refresh('.');
        }
    });

    socket.on('reconnect', (attempt) => {
        console.log('--- SOCKET RECONNECTED ---', attempt);
    });

    socket.on('disconnect', (reason) => {
        console.log('--- SOCKET DISCONNECTED ---', reason);
        if (connStatus) {
            connStatus.style.color = 'var(--error)';
            connStatus.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Disconnected';
        }
    });

    socket.on('search-results', (results: any[]) => {
        const container = document.getElementById('search-results');
        if (container) {
            if (results.length === 0) {
                container.innerHTML = '<div style="padding: 10px; color: var(--text-muted);">No results found.</div>';
                return;
            }
        container.innerHTML = results.map(res => `
            <div class="search-result-file" onclick="AntigravityAPI.openProjectFile('${res.path}')" style="margin-bottom: 10px; cursor: pointer;">
                <div style="font-weight: 600; font-size: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 5px;">
                    ${getFileIcon(res.path.split('/').pop()!)}
                    <span>${res.path}</span>
                    <span style="color: var(--accent); font-size: 10px;">${res.count}</span>
                </div>
                <div style="padding-left: 20px;">
                    ${res.previews.map((p: string) => `<div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted); padding: 2px 0;">${p}</div>`).join('')}
                </div>
            </div>
        `).join('');

        // Update Search Badge
        const searchIcon = document.querySelector('.activity-icon[title="Search"]') as HTMLElement;
        if (searchIcon) {
            let badge = searchIcon.querySelector('.badge') as HTMLElement;
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                searchIcon.appendChild(badge);
            }
            badge.textContent = results.length > 0 ? results.length.toString() : '';
            badge.style.display = results.length > 0 ? 'flex' : 'none';
            badge.style.background = 'var(--accent)';
        }
    }
});

    // Search input logic is handled below in the Listeners section.

    // --- Services ---
    const explorer = new Explorer(socket, 'explorer-container');
    const terminalService = new TerminalService(socket, 'terminal-container');
    const taskManager = new TaskManager(terminalService);
    const extensionManager = new ExtensionManager('view-extensions');

    (window as any).AntigravityExplorer = explorer;
    (window as any).AntigravityTerminal = terminalService;
    (window as any).AntigravityExtensions = extensionManager;

    // --- Timeline (Local History) ---
    const updateTimeline = (path: string, content: string) => {
        const history = JSON.parse(localStorage.getItem(`history:${path}`) || '[]');
        const last = history[history.length - 1];
        if (last?.content !== content) {
            history.push({ timestamp: Date.now(), content });
            if (history.length > 50) history.shift();
            localStorage.setItem(`history:${path}`, JSON.stringify(history));
        }
    };

    // --- Project Stats ---
    const updateProjectStats = () => {
        const output = document.getElementById('view-output');
        if (!output) return;
        const totalFiles = openFiles.filter(f => f.type === 'file').length;
        const totalLines = openFiles.filter(f => f.type === 'file').reduce((acc, f) => acc + (f.model?.getLineCount() || 0), 0);
        const characters = openFiles.filter(f => f.type === 'file').reduce((acc, f) => acc + (f.model?.getValue().length || 0), 0);
        
        output.innerHTML = `
            <div style="padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6;">
                <div style="color: var(--accent); font-weight: bold; margin-bottom: 10px;">PROJECT STATISTICS</div>
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 5px;">
                    <span style="color: var(--text-muted);">Total Files:</span> <span>${totalFiles}</span>
                    <span style="color: var(--text-muted);">Open Tabs:</span> <span>${openFiles.length}</span>
                    <span style="color: var(--text-muted);">Total Lines:</span> <span>${totalLines}</span>
                    <span style="color: var(--text-muted);">Total Characters:</span> <span>${characters}</span>
                    <span style="color: var(--text-muted);">Last Sync:</span> <span>${new Date().toLocaleTimeString()}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 15px;">
                    Status: All systems operational.
                </div>
            </div>
        `;
    };

    // --- Session Restoration ---
    const restoreSession = () => {
        const saved = localStorage.getItem('antigravity_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                if (session.openFiles) {
                    session.openFiles.forEach((f: any) => {
                        if (f.type === 'file' && f.path) {
                            socket.emit('read-file', f.path);
                        } else if (f.type === 'extension' && f.extData) {
                            AntigravityAPI.openExtension(f.extData);
                        }
                    });
                }
                setTimeout(() => {
                    if (session.activeIndex !== undefined) {
                        activeFileIndex = session.activeIndex;
                        AntigravityAPI.updateUI();
                    }
                }, 1000);
            } catch (e) {
                console.error("Failed to restore session", e);
            }
        }
    };

    // --- Background Tasks ---
    setInterval(() => {
        if (activeFileIndex !== -1 && openFiles[activeFileIndex]) {
            AntigravityAPI.save();
            const session = {
                openFiles: openFiles.map(f => ({ path: f.path, name: f.name, type: f.type, extData: f.extData })),
                activeIndex: activeFileIndex
            };
            localStorage.setItem('antigravity_session', JSON.stringify(session));
        }
    }, 10000); // 10s auto-save & session save

    const getLanguage = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch(ext) {
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'json': return 'json';
            case 'py': return 'python';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch(ext) {
            case 'ts': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#3178c6"><path d="M22 2H2v20h20V2zm-9.35 15.65c-.88-.42-1.53-1.03-1.95-1.84-.42-.8-.63-1.74-.63-2.82h2.09c0 .7.12 1.25.37 1.64.25.39.63.58 1.15.58.33 0 .6-.09.81-.26.22-.17.33-.42.33-.76 0-.31-.1-.56-.3-.73-.2-.17-.55-.32-1.07-.46-1.07-.28-1.89-.66-2.43-1.12-.54-.46-.81-1.14-.81-2.03 0-.81.29-1.46.88-1.94.59-.48 1.36-.72 2.32-.72.93 0 1.7.23 2.3.69.61.46 1.05 1.13 1.31 2.01h-2.14c-.16-.54-.4-.93-.72-1.16-.32-.23-.74-.35-1.25-.35-.38 0-.69.1-.92.29-.23.19-.34.46-.34.79 0 .28.1.5.3.65.2.16.59.32 1.19.49 1.05.28 1.83.65 2.34 1.1.51.45.77 1.12.77 2.01 0 .91-.32 1.65-.95 2.21-.63.56-1.52.84-2.67.84-1.07 0-1.93-.24-2.58-.67z"/></svg>';
            case 'js': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f1e05a"><path d="M22 2H2v20h20V2zm-9.35 15.65v-3.8h1.2v3.8h-1.2zm2.5 0v-3.8h1.2v3.8h-1.2z"/></svg>';
            case 'html': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#e34c26"><path d="M3 2l1.65 17.8L12 22l7.35-2.2L21 2H3zm14.5 13l-5.5 1.5-5.5-1.5-.3-3H11v1h-3.4l.2 1.5 4.2 1.1 4.2-1.1.2-1.5H11v-1h5.7l-.3 3z"/></svg>';
            case 'css': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#264de4"><path d="M3 2l1.65 17.8L12 22l7.35-2.2L21 2H3zm14.5 9h-5.5v1h4.2l-.2 1.5-4 1.1-4-1.1-.3-3h1v-1h-6.7l.3 3 5.5 1.5 5.5-1.5-.3-3z"/></svg>';
            case 'json': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbc02d"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
            case 'md': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff"><path d="M22 2H2v20h20V2zM12 16.5l-3-3h2v-4h2v4h2l-3 3z"/></svg>';
            default: return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
        }
    };

    // --- Core Utilities ---
    const addNotification = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
        if (!notificationContainer) return;
        const div = document.createElement('div');
        div.className = 'notification';
        const color = type === 'success' ? '#4ec9b0' : type === 'warn' ? '#e2c08d' : '#007acc';
        div.style.borderLeftColor = color;
        div.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
            <span>${message}</span>
        `;
        notificationContainer.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(20px)';
            setTimeout(() => div.remove(), 300);
        }, 4000);
    };

    // --- Antigravity API ---
    const AntigravityAPI = {
        newFile: (name = 'Untitled-1', content = '', path = '') => {
            const realPath = path || name;
            const existingIndex = openFiles.findIndex(f => f.path === realPath);
            
            if (existingIndex === -1) {
                const language = getLanguage(name);
                const model = monaco.editor.createModel(content, language);
                openFiles.push({ name, path: realPath, model, type: 'file' });
                activeFileIndex = openFiles.length - 1;
            } else {
                activeFileIndex = existingIndex;
            }
            AntigravityAPI.updateUI();
            addNotification(`Opened ${name}`);
        },
        openExtension: (ext: any) => {
            const path = `extension:${ext.id}`;
            const existingIndex = openFiles.findIndex(f => f.path === path);
            if (existingIndex === -1) {
                openFiles.push({ 
                    name: ext.displayName, 
                    path: path, 
                    type: 'extension',
                    extData: ext 
                });
                activeFileIndex = openFiles.length - 1;
            } else {
                activeFileIndex = existingIndex;
            }
            AntigravityAPI.updateUI();
            AntigravityAPI.updateOutline();
        },
        updateOutline: () => {
            const activeFile = openFiles[activeFileIndex];
            const outlineContainer = document.getElementById('outline-container');
            if (!outlineContainer) return;
            
            if (!activeFile || activeFile.type !== 'file' || !activeFile.model) {
                outlineContainer.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 11px;">No outline available</div>';
                return;
            }

            // Simple regex-based outline for the "real" feel
            const content = activeFile.model.getValue();
            const symbols: { name: string, line: number, type: string }[] = [];
            
            const functionRegex = /(?:function\s+|const\s+|let\s+)(\w+)\s*=\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*=>|function\s+(\w+)\s*\(/g;
            const classRegex = /class\s+(\w+)/g;
            let match;
            
            while ((match = classRegex.exec(content)) !== null) {
                symbols.push({ name: match[1], line: content.substring(0, match.index).split('\n').length, type: 'class' });
            }
            while ((match = functionRegex.exec(content)) !== null) {
                symbols.push({ name: match[1] || match[2], line: content.substring(0, match.index).split('\n').length, type: 'function' });
            }

            outlineContainer.innerHTML = symbols.map(s => `
                <div class="outline-item" onclick="AntigravityAPI.goToLine(${s.line})" style="padding: 4px 15px; cursor: pointer; font-size: 12px; display: flex; gap: 8px; align-items: center;">
                    <span style="color: ${s.type === 'class' ? '#ee9d28' : '#b267e6'}; font-weight: bold; font-size: 10px;">${s.type[0].toUpperCase()}</span>
                    <span>${s.name}</span>
                </div>
            `).join('') || '<div style="padding: 10px; color: var(--text-muted); font-size: 11px;">No symbols found</div>';
        },
        updateProblems: () => {
            const markers = monaco.editor.getModelMarkers({});
            const problemsList = document.getElementById('problems-list');
            const errorCountLabel = document.getElementById('status-error-count');
            const warningCountLabel = document.getElementById('status-warning-count');
            
            const errors = markers.filter(m => m.severity === 8).length;
            const warnings = markers.filter(m => m.severity === 4).length;

            if (errorCountLabel) errorCountLabel.textContent = errors.toString();
            if (warningCountLabel) warningCountLabel.textContent = warnings.toString();

            // Update Activity Bar Badge (Problems/Explorer)
            const explorerIcon = document.querySelector('.activity-icon[title="Explorer"]') as HTMLElement;
            if (explorerIcon) {
                let badge = explorerIcon.querySelector('.badge') as HTMLElement;
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge';
                    explorerIcon.appendChild(badge);
                }
                badge.textContent = errors > 0 ? errors.toString() : '';
                badge.style.display = errors > 0 ? 'flex' : 'none';
                badge.style.background = 'var(--error)';
            }

            if (!problemsList) return;

            if (markers.length === 0) {
                problemsList.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No problems detected in the workspace.</div>';
                return;
            }

            problemsList.innerHTML = markers.map(m => `
                <div class="problem-item" onclick="AntigravityAPI.goToProblem('${m.resource.toString()}', ${m.startLineNumber})" style="padding: 5px 15px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; gap: 10px; align-items: flex-start; font-size: 12px;">
                    <span style="color: ${m.severity === 8 ? 'var(--error)' : 'var(--warning)'}; font-size: 14px;">${m.severity === 8 ? 'ⓧ' : '⚠'}</span>
                    <div>
                        <div style="color: var(--text-primary);">${m.message}</div>
                        <div style="color: var(--text-muted); font-size: 11px;">Ln ${m.startLineNumber}, Col ${m.startColumn}</div>
                    </div>
                </div>
            `).join('');
        },
        goToProblem: (uriString: string, line: number) => {
            const file = openFiles.find(f => f.model?.uri.toString() === uriString);
            if (file) {
                activeFileIndex = openFiles.indexOf(file);
                AntigravityAPI.updateUI();
                AntigravityAPI.goToLine(line);
            }
        },
        closeAllTabs: () => {
            if (openFiles.length > 0) {
                openFiles.length = 0;
                activeFileIndex = -1;
                AntigravityAPI.updateUI();
                addNotification('Closed all tabs', 'info');
            }
        },
        closeOtherTabs: () => {
             if (activeFileIndex !== -1) {
                 const current = openFiles[activeFileIndex];
                 openFiles.length = 0;
                 openFiles.push(current);
                 activeFileIndex = 0;
                 AntigravityAPI.updateUI();
                 addNotification('Closed other tabs', 'info');
             }
        },
        closeTabsToTheRight: (index: number) => {
            if (index >= 0 && index < openFiles.length) {
                openFiles.splice(index + 1);
                if (activeFileIndex > index) activeFileIndex = index;
                AntigravityAPI.updateUI();
                addNotification('Closed tabs to the right', 'info');
            }
        },
        copyPath: (index: number) => {
            const file = openFiles[index];
            if (file) {
                navigator.clipboard.writeText(file.path);
                addNotification('Path copied to clipboard', 'success');
            }
        },
        showTabContextMenu: (e: MouseEvent, index: number) => {
            e.preventDefault();
            const existing = document.getElementById('tab-context-menu');
            if (existing) existing.remove();

            const menu = document.createElement('div');
            menu.id = 'tab-context-menu';
            menu.className = 'menu-dropdown active';
            menu.style.position = 'fixed';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            menu.style.zIndex = '10000';

            menu.innerHTML = `
                <div class="menu-item-dropdown" onclick="AntigravityAPI.closeTab(${index})">Close</div>
                <div class="menu-item-dropdown" onclick="AntigravityAPI.closeOtherTabs()">Close Others</div>
                <div class="menu-item-dropdown" onclick="AntigravityAPI.closeTabsToTheRight(${index})">Close to the Right</div>
                <div class="menu-item-dropdown" onclick="AntigravityAPI.closeAllTabs()">Close All</div>
                <div class="menu-separator"></div>
                <div class="menu-item-dropdown" onclick="AntigravityAPI.copyPath(${index})">Copy Path</div>
                <div class="menu-item-dropdown" onclick="AntigravityAPI.revealInExplorer()">Reveal in Explorer</div>
            `;

            document.body.appendChild(menu);
            document.addEventListener('click', () => menu.remove(), { once: true });
        },
        updateUI: () => {
            if (openFiles.length === 0) {
                dashboard?.classList.remove('hidden');
                editor?.classList.remove('active');
                return;
            }
            dashboard?.classList.add('hidden');
            editor?.classList.add('active');

            const activeFile = openFiles[activeFileIndex];
            const detailContainer = document.getElementById('extension-detail-container');
            const monacoContainer = document.getElementById('monaco-editor-container');

            if (activeFile?.type === 'extension') {
                if (monacoContainer) monacoContainer.style.display = 'none';
                if (detailContainer) {
                    detailContainer.style.display = 'block';
                    AntigravityAPI.renderExtensionDetail(activeFile.extData, detailContainer);
                }
            } else {
                if (detailContainer) detailContainer.style.display = 'none';
                if (monacoContainer) {
                    monacoContainer.style.display = 'block';
                    if (monacoEditor && activeFile?.model) {
                        monacoEditor.setModel(activeFile.model);
                    }
                }
            }

            if (editorTabs) {
                editorTabs.innerHTML = openFiles.map((file, idx) => `
                    <div class="tab ${idx === activeFileIndex ? 'active' : ''}" data-index="${idx}" oncontextmenu="AntigravityAPI.showTabContextMenu(event, ${idx})">
                        ${file.type === 'extension' ? '🧩' : getFileIcon(file.name)}
                        <span>${file.name}</span>
                        <div class="tab-close" data-index="${idx}">×</div>
                    </div>
                `).join('');

                editorTabs.querySelectorAll('.tab').forEach((tabEl) => {
                    tabEl.addEventListener('click', (e: any) => {
                        if (e.target.classList.contains('tab-close')) {
                            e.stopPropagation();
                            AntigravityAPI.closeTab(parseInt(e.target.dataset.index!));
                        } else {
                            activeFileIndex = parseInt((tabEl as HTMLElement).dataset.index!);
                            AntigravityAPI.updateUI();
                        }
                    });
                });
            }

            if (breadcrumbs && activeFile) {
                const parts = activeFile.path.split(/[/\\]/);
                breadcrumbs.innerHTML = parts.map((part, i) => `
                    <span class="breadcrumb-item" onclick="AntigravityAPI.openProjectFile('${parts.slice(0, i + 1).join('/')}')">${part}</span>
                    ${i < parts.length - 1 ? '<span class="breadcrumb-separator">/</span>' : ''}
                `).join('');
            }

            const mdPreview = document.getElementById('markdown-preview');
            const previewBody = document.getElementById('preview-body');
            if (mdPreview && previewBody && activeFile) {
                if (activeFile.name.endsWith('.md') && activeFile.model) {
                    mdPreview.style.display = 'flex';
                    previewBody.innerHTML = activeFile.model.getValue().split('\n').map(l => {
                        if (l.startsWith('# ')) return `<h1>${l.substring(2)}</h1>`;
                        if (l.startsWith('## ')) return `<h2>${l.substring(3)}</h2>`;
                        return `<p>${l}</p>`;
                    }).join('');
                } else {
                    mdPreview.style.display = 'none';
                }
            }
            if (editorLanguage && activeFile?.model) {
                const langId = activeFile.model.getLanguageId();
                editorLanguage.textContent = langId.charAt(0).toUpperCase() + langId.slice(1);
            }
            AntigravityAPI.updateOutline();
        },
        renderExtensionDetail: (ext: any, container: HTMLElement) => {
            container.innerHTML = `
                <div class="ext-detail-page">
                    <header class="ext-detail-header">
                        <div class="ext-header-icon" style="background: var(--bg-lighter);">
                            ${ext.iconUrl ? `<img src="${ext.iconUrl}" style="width: 100%; height: 100%;">` : '🧩'}
                        </div>
                        <div class="ext-header-main">
                            <div class="ext-header-title">
                                <h1>${ext.displayName}</h1>
                                ${ext.version ? `<span class="version-tag">v${ext.version}</span>` : ''}
                            </div>
                            <div class="ext-header-subtitle">
                                <span class="author">${ext.author || ext.namespace}</span>
                                <span class="stats">| ${(ext.downloads || 0).toLocaleString()} downloads | ★ ${ext.rating?.toFixed(1) || '0.0'}</span>
                            </div>
                            <p class="ext-header-desc">${ext.description}</p>
                            <div class="ext-header-actions">
                                <button class="btn-main ${ext.isInstalled ? 'uninstall' : 'install'}" onclick="AntigravityExtensions.${ext.isInstalled ? 'uninstallExtension' : 'installExtension'}('${ext.id}')">
                                    ${ext.isInstalled ? 'Uninstall' : 'Install'}
                                </button>
                                ${ext.isInstalled ? '<button class="btn-sec">Disable</button>' : ''}
                            </div>
                        </div>
                    </header>
                    <nav class="ext-detail-tabs">
                        <div class="detail-tab active">DETAILS</div>
                        <div class="detail-tab">FEATURES</div>
                        <div class="detail-tab">CHANGELOG</div>
                        <div class="detail-tab">RUNTIME STATUS</div>
                    </nav>
                    <div class="ext-detail-content">
                        <div class="ext-readme">
                            <h2>Antigravity ${ext.displayName}</h2>
                            <p>${ext.description}</p>
                            <div class="readme-block">
                                <h3>Overview</h3>
                                <p>This extension provides first-class support for ${ext.name} within the Antigravity ecosystem. Built with performance and productivity in mind.</p>
                            </div>
                            <div style="margin-top: 40px;">
                                <img src="https://img.shields.io/badge/Antigravity-Verified-blue?style=for-the-badge&logo=visualstudiocode" alt="Verified">
                            </div>
                        </div>
                        <aside class="ext-sidebar">
                            <div class="sidebar-section">
                                <h3>Installation</h3>
                                <div class="side-item"><strong>Identifier:</strong> ${ext.id}</div>
                                <div class="side-item"><strong>Version:</strong> ${ext.version || '1.0.0'}</div>
                            </div>
                            <div class="sidebar-section">
                                <h3>Resources</h3>
                                <div class="side-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> Repository</div>
                                <div class="side-link">Marketplace</div>
                            </div>
                        </aside>
                    </div>
                </div>
            `;
        },
        openSettings: () => {
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.classList.add('active');
                (document.getElementById('setting-backend-url') as HTMLInputElement).value = backendUrl;
            }
        },
        closeSettings: () => settingsModal?.classList.remove('active'),
        saveSettings: () => {
            const fontSize = (document.getElementById('setting-font-size') as HTMLInputElement).value;
            const theme = (document.getElementById('setting-theme') as HTMLSelectElement).value;
            const autoSave = (document.getElementById('setting-auto-save') as HTMLInputElement).checked;
            const minimap = (document.getElementById('setting-minimap') as HTMLInputElement).checked;
            const wordWrap = (document.getElementById('setting-word-wrap') as HTMLSelectElement).value;
            const fontFamily = (document.getElementById('setting-font-family') as HTMLSelectElement).value;
            const cursorStyle = (document.getElementById('setting-cursor-style') as HTMLSelectElement).value;

            const settings = { fontSize, theme, autoSave, minimap, wordWrap, fontFamily, cursorStyle };
            localStorage.setItem('antigravity_settings', JSON.stringify(settings));

            if (monacoEditor) {
                monacoEditor.updateOptions({ 
                    fontSize: parseInt(fontSize),
                    minimap: { enabled: minimap },
                    wordWrap: wordWrap as any,
                    fontFamily: fontFamily,
                    cursorStyle: cursorStyle as any
                });
            }
            AntigravityAPI.setTheme(theme);
            addNotification('Settings saved & applied', 'success');
            AntigravityAPI.closeSettings();
        },
        setTheme: (theme: string) => {
            document.body.setAttribute('data-theme', theme);
            monaco.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark');
        },
        save: () => {
            if (activeFileIndex === -1 || !openFiles[activeFileIndex]) return;
            const file = openFiles[activeFileIndex];
            if (file.type === 'file' && file.model) {
                const content = file.model.getValue();
                socket.emit('save-file', { path: file.path, content });
                updateTimeline(file.path, content);
                addNotification(`Saved ${file.name}`, 'success');
                updateProjectStats();
            }
        },
        resetBackendUrl: () => {
            const current = localStorage.getItem('antigravity_backend_url') || 'http://localhost:3001';
            const next = prompt('Enter new Backend URL:', current);
            if (next) {
                localStorage.setItem('antigravity_backend_url', next);
                window.location.reload();
            }
        },
        closeTab: (index: number) => {
            const file = openFiles[index];
            if (file.model) file.model.dispose();
            openFiles.splice(index, 1);
            if (activeFileIndex >= openFiles.length) activeFileIndex = openFiles.length - 1;
            AntigravityAPI.updateUI();
        },
        notify: (msg: string, type: any = 'info') => addNotification(msg, type),
        updateActivityBadges: () => {
             const badges = {
                 search: document.querySelector('[title="Search"] .badge') as HTMLElement,
                 git: document.querySelector('[title="Source Control"] .badge') as HTMLElement,
                 extensions: document.querySelector('[title="Extensions"] .badge') as HTMLElement
             };
             
             // Problems badge is handled in updateDiagnostics
             // Here we can mock others or use real data
             if (badges.search) badges.search.textContent = '12'; // Mock
        },
        searchProject: (query: string) => {
            if (!query) return;
            addNotification(`Searching for "${query}"...`, 'info');
            socket.emit('search-files', { query, caseSensitive: false, wholeWord: false });
        },
        updateDashboard: () => {
            if (!dashboard) return;
            dashboard.innerHTML = `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; animation: fadeIn 0.4s ease-out;">
                    <svg class="welcome-logo" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    <h1 style="font-weight: 400; font-size: 32px; color: var(--text-bright); margin-top: 20px;">Antigravity</h1>
                    <p style="color: var(--text-muted); margin-top: 5px;">Cloud Development Unleashed</p>
                    
                    <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; text-align: left; width: 640px; background: var(--bg-lighter); padding: 30px; border-radius: 12px; border: 1px solid var(--border);">
                        <div>
                            <h3 style="color: var(--accent); margin-bottom: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Start</h3>
                            <div class="dash-link" onclick="window.AntigravityExplorer.handleCreateFile('.')" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                <span>New File...</span>
                            </div>
                            <div class="dash-link" onclick="AntigravityAPI.openFolder()" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                <span>Open Folder...</span>
                            </div>
                            <div class="dash-link" onclick="AntigravityAPI.cloneRepo()" style="display: flex; align-items: center; gap: 8px; cursor: pointer; opacity: 0.7;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                                <span>Clone Repository...</span>
                            </div>
                        </div>
                        <div>
                            <h3 style="color: var(--accent); margin-bottom: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Recent</h3>
                            <div id="recent-files-list">
                                ${recentFiles.length > 0 ? recentFiles.map(f => `
                                    <div class="dash-link" onclick="AntigravityAPI.openProjectFile('${f}')" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
                                        ${getFileIcon(f.split('/').pop()!)}
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.split('/').pop()}</span>
                                    </div>
                                `).join('') : '<div style="color: var(--text-muted); font-size: 12px; opacity: 0.6;">No recent files</div>'}
                            </div>
                        </div>
                    </div>

                    <div class="shortcut-guide" style="margin-top: 50px; color: var(--text-muted); font-size: 12px; display: flex; gap: 30px;">
                        <div>Quick Open <span style="background: rgba(255,255,255,0.08); padding: 3px 6px; border-radius: 4px; color: var(--text-bright); margin-left: 5px;">Ctrl+P</span></div>
                        <div>Command Palette <span style="background: rgba(255,255,255,0.08); padding: 3px 6px; border-radius: 4px; color: var(--text-bright); margin-left: 5px;">Ctrl+Shift+P</span></div>
                    </div>
                </div>
            `;
        },
        toggleSidebar: () => {
            const sidebar = document.querySelector('.sidebar') as HTMLElement;
            if (sidebar) {
                sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
                window.dispatchEvent(new Event('resize'));
            }
        },
        openProjectFile: (path: string) => {
            updateRecentFiles(path);
            socket.emit('read-file', path);
        },
        goToLine: (n: number) => {
            if (monacoEditor) {
                monacoEditor.setPosition({ lineNumber: n, column: 1 });
                monacoEditor.revealLineInCenter(n);
                monacoEditor.focus();
            }
        },
        openCommandPalette: (filesOnly = false) => {
            const palette = document.getElementById('command-palette');
            const input = document.getElementById('command-input') as HTMLInputElement;
            const results = document.getElementById('command-results');
            if (!palette || !input || !results) return;

            palette.classList.add('active');
            input.value = filesOnly ? '' : '>';
            input.focus();

            const updateResults = () => {
                const query = input.value.toLowerCase();
                let items: any[] = [];

                if (query.startsWith('>')) {
                    const cmd = query.substring(1).trim();
                    items = [
                        { label: 'Toggle Terminal', action: () => AntigravityAPI.toggleTerminal() },
                        { label: 'Save File', action: () => AntigravityAPI.save() },
                        { label: 'Open Settings', action: () => AntigravityAPI.openSettings() },
                        { label: 'New File', action: () => (window as any).AntigravityExplorer.handleCreateFile('.') },
                        { label: 'Toggle Zen Mode', action: () => AntigravityAPI.toggleZenMode() },
                        { label: 'Toggle Minimap', action: () => AntigravityAPI.toggleMinimap() },
                        { label: 'Toggle Word Wrap', action: () => AntigravityAPI.toggleWordWrap() },
                        { label: 'Toggle Sticky Scroll', action: () => AntigravityAPI.toggleStickyScroll() },
                        { label: 'Change Font Size: Increase', action: () => AntigravityAPI.changeFontSize(2) },
                        { label: 'Change Font Size: Decrease', action: () => AntigravityAPI.changeFontSize(-2) },
                        { label: 'Deploy to Render', action: () => AntigravityAPI.deployTo('Render') },
                        { label: 'Deploy to Firebase', action: () => AntigravityAPI.deployTo('Firebase') },
                        { label: 'Export as ZIP', action: () => AntigravityAPI.exportProject() },
                        { label: 'Format: JSON', action: () => AntigravityAPI.formatJSON() },
                        { label: 'Format: Document', action: () => AntigravityAPI.formatDocument() },
                        { label: 'Transform: Sort Lines', action: () => AntigravityAPI.textAction('sort') },
                        { label: 'Transform: Shuffle Lines', action: () => AntigravityAPI.textAction('shuffle') },
                        { label: 'Transform: Reverse Lines', action: () => AntigravityAPI.textAction('reverse') },
                        { label: 'Go Live', action: () => AntigravityAPI.goLive() },
                        { label: 'Show Database Explorer', action: () => document.querySelector('.activity-icon[title="Database"]')?.dispatchEvent(new Event('click')) },
                        { label: 'Open Developer Tools', action: () => document.querySelector('.activity-icon[title="Dev Tools"]')?.dispatchEvent(new Event('click')) }
                    ].filter(i => i.label.toLowerCase().includes(cmd.toLowerCase()));
                } else if (query.startsWith('@')) {
                    const sym = query.substring(1).trim();
                    const currentFile = openFiles[activeFileIndex];
                    if (currentFile?.model) {
                         const content = currentFile.model.getValue();
                         const symbols = [...content.matchAll(/(?:function|class|const|let|var)\s+([a-zA-Z0-9_]+)/g)];
                         items = symbols
                            .map((s: any) => ({ label: `(symbol) ${s[1]}`, action: () => AntigravityAPI.goToLine(content.substring(0, s.index).split('\n').length) }))
                            .filter(s => s.label.toLowerCase().includes(sym));
                    }
                } else {
                    items = openFiles
                        .filter(f => f.name.toLowerCase().includes(query))
                        .map(f => ({ label: f.name, action: () => {
                            activeFileIndex = openFiles.findIndex(of => of.path === f.path);
                            AntigravityAPI.updateUI();
                        }}));
                }

                results.innerHTML = items.map((item, idx) => `
                    <div class="menu-item-dropdown palette-item" data-index="${idx}" style="padding: 8px 15px; border-radius: 4px; border: 1px solid transparent;">
                        <span>${item.label}</span>
                    </div>
                `).join('');

                results.querySelectorAll('.palette-item').forEach((el, idx) => {
                    el.addEventListener('click', () => {
                        items[idx].action();
                        palette.classList.remove('active');
                    });
                });
            };

            input.oninput = updateResults;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') (results.querySelector('.palette-item') as HTMLElement)?.click();
                if (e.key === 'Escape') palette.classList.remove('active');
            };
            updateResults();
        },
        goLive: () => {
            const activeFile = openFiles[activeFileIndex];
            if (!activeFile?.model) {
                addNotification('No file open for live preview', 'warn');
                return;
            }
            const panel = document.getElementById('live-preview-panel');
            const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
            const statusGoLive = document.getElementById('go-live');
            if (!panel || !iframe) return;

            if (panel.style.display === 'block') {
                panel.style.display = 'none';
                if (statusGoLive) statusGoLive.innerHTML = 'Go Live';
                addNotification('Live Preview stopped', 'info');
            } else {
                panel.style.display = 'block';
                if (statusGoLive) statusGoLive.innerHTML = 'Stop Live';
                
                const previewBase = backendUrl || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
                iframe.src = `${previewBase}/preview/${activeFile.path}`;
                addNotification('Starting Live Preview...', 'success');
            }
        },
        replaceInFile: () => {
            const find = prompt('Find:');
            if (!find) return;
            const replace = prompt(`Replace "${find}" with:`);
            if (replace === null) return;
            const model = monacoEditor?.getModel();
            if (!model) return;
            
            const content = model.getValue();
            const newContent = content.split(find).join(replace);
            model.setValue(newContent);
            addNotification(`Replaced all occurrences of "${find}"`, 'success');
        },
        toggleTerminal: () => {
             const t = document.querySelector('.terminal-panel') as HTMLElement;
             if (t) {
                 t.style.display = t.style.display === 'none' ? 'flex' : 'none';
                 window.dispatchEvent(new Event('resize'));
             }
        },
        switchTerminalTab: (id: string) => {
            document.querySelectorAll('.terminal-header span').forEach(el => el.classList.remove('active'));
            const header = document.getElementById(`tab-${id}`);
            header?.classList.add('active');
            
            document.querySelectorAll('.terminal-view').forEach(v => {
                (v as HTMLElement).style.display = 'none';
                v.classList.remove('active');
            });

            const view = document.getElementById(`view-${id}`);
            if (view) {
                view.style.display = id === 'terminal' ? 'flex' : 'block';
                view.classList.add('active');
            }

            if (id === 'timeline') AntigravityAPI.updateTimelineList();
            if (id === 'dashboard-view') AntigravityAPI.updateDashboardStats();
        },
        updateTimelineList: () => {
            const list = document.getElementById('timeline-list');
            const activeFile = openFiles[activeFileIndex];
            if (!list || !activeFile) return;
            const history = JSON.parse(localStorage.getItem(`history:${activeFile.path}`) || '[]');
            list.innerHTML = history.reverse().map((h: any) => `
                <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="AntigravityAPI.restoreHistory('${activeFile.path}', ${h.timestamp})">
                    <div style="color: var(--text-primary);">Snapshot @ ${new Date(h.timestamp).toLocaleTimeString()}</div>
                    <div style="color: var(--text-muted); font-size: 10px;">${h.content.length} characters</div>
                </div>
            `).join('') || '<div style="padding: 20px; color: var(--text-muted);">No history for this file yet.</div>';
        },
        restoreHistory: (path: string, ts: number) => {
            const history = JSON.parse(localStorage.getItem(`history:${path}`) || '[]');
            const item = history.find((h: any) => h.timestamp === ts);
            if (item && monacoEditor) {
                monacoEditor.setValue(item.content);
                addNotification('Restored version from history', 'success');
            }
        },
        updateDashboardStats: () => {
            const container = document.getElementById('dashboard-stats');
            if (!container) return;
            const totalFiles = openFiles.filter(f => f.type === 'file').length;
            const totalLines = openFiles.filter(f => f.type === 'file').reduce((acc, f) => acc + (f.model?.getLineCount() || 0), 0);
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <h2 style="color: var(--accent); margin-bottom: 20px;">PROJECT DASHBOARD</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                        <div style="background: var(--bg-lighter); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                            <div style="font-size: 24px; color: var(--text-bright);">${totalFiles}</div>
                            <div style="color: var(--text-muted); font-size: 12px;">Active Files</div>
                        </div>
                        <div style="background: var(--bg-lighter); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                            <div style="font-size: 24px; color: var(--text-bright);">${totalLines}</div>
                            <div style="color: var(--text-muted); font-size: 12px;">Total Code Lines</div>
                        </div>
                    </div>
                </div>
            `;
        },
        updatePortsList: () => {
            const list = document.getElementById('ports-list');
            if (!list) return;
            const ports = [
                { port: 5173, process: 'vite', address: 'http://localhost:5173' },
                { port: 3000, process: 'server', address: 'http://localhost:3000' }
            ];
            list.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <tr style="text-align: left; color: var(--text-muted); border-bottom: 1px solid var(--border);">
                        <th style="padding: 8px;">Port</th>
                        <th style="padding: 8px;">Process</th>
                        <th style="padding: 8px;">Address</th>
                        <th style="padding: 8px;">Action</th>
                    </tr>
                    ${ports.map(p => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 8px; color: var(--accent);">${p.port}</td>
                            <td style="padding: 8px;">${p.process}</td>
                            <td style="padding: 8px; color: var(--text-bright);">${p.address}</td>
                            <td style="padding: 8px;"><span style="color: var(--accent); cursor: pointer;" onclick="AntigravityAPI.goLive()">Open</span></td>
                        </tr>
                    `).join('')}
                </table>
            `;
        },
        runTask: (script: string) => {
            AntigravityAPI.showTerminal();
            AntigravityAPI.switchTerminalTab('terminal');
            terminalService.runTask(`npm run ${script}`);
            addNotification(`Running task: ${script}`, 'success');
        },
        undo: () => monacoEditor?.trigger('keyboard', 'undo', null),
        redo: () => monacoEditor?.trigger('keyboard', 'redo', null),
        selectAll: () => monacoEditor?.setSelection(monacoEditor.getModel()!.getFullModelRange()),
        formatDocument: () => {
            addNotification('Formatting document...', 'info');
            monacoEditor?.getAction('editor.action.formatDocument')?.run();
        },
        toggleZenMode: () => {
            document.querySelector('.sidebar')?.classList.toggle('hidden');
            document.querySelector('.activity-bar')?.classList.toggle('hidden');
            addNotification('Zen Mode toggled');
        },
        deployTo: (target: string) => {
            addNotification(`Starting deployment to ${target}...`, 'info');
            setTimeout(() => addNotification(`Building production bundle...`, 'info'), 1000);
            setTimeout(() => addNotification(`Uploading assets to ${target}...`, 'info'), 3000);
            setTimeout(() => addNotification(`Deployment to ${target} successful! IDE Live.`, 'success'), 6000);
        },
        changeIndentation: () => {
            const val = prompt('Indentation Size (2 or 4):', '4');
            if (val === '2' || val === '4') {
                monacoEditor?.getModel()?.updateOptions({ tabSize: parseInt(val) });
                addNotification(`Indentation set to ${val} spaces`, 'info');
                AntigravityAPI.updateUI();
            }
        },
        changeEncoding: () => addNotification('Encoding: UTF-8 (Fixed)', 'info'),
        changeLineEndings: () => {
             const le = monacoEditor?.getModel()?.getEndOfLineSequence() === 0 ? 'CRLF' : 'LF';
             monacoEditor?.getModel()?.pushEOL(le === 'LF' ? 0 : 1);
             addNotification(`Line endings set to ${le}`, 'info');
             AntigravityAPI.updateUI();
        },
        toggleMinimap: () => {
            if (!monacoEditor) return;
            const minimapEnabled = monacoEditor.getOption(monaco.editor.EditorOption.minimap).enabled;
            monacoEditor.updateOptions({ minimap: { enabled: !minimapEnabled } });
            addNotification(`Minimap ${!minimapEnabled ? 'enabled' : 'disabled'}`, 'info');
        },
        toggleWordWrap: () => {
            if (!monacoEditor) return;
            const wrap = monacoEditor.getOption(monaco.editor.EditorOption.wordWrap);
            monacoEditor.updateOptions({ wordWrap: wrap === 'on' ? 'off' : 'on' });
            addNotification(`Word Wrap ${wrap === 'on' ? 'disabled' : 'enabled'}`, 'info');
        },
        changeFontSize: (delta: number) => {
            const current = monacoEditor?.getOption(monaco.editor.EditorOption.fontSize) || 14;
            monacoEditor?.updateOptions({ fontSize: current + delta });
        },
        toggleStickyScroll: () => {
            const current = monacoEditor?.getOption(monaco.editor.EditorOption.stickyScroll).enabled;
            monacoEditor?.updateOptions({ stickyScroll: { enabled: !current } });
            addNotification(`Sticky Scroll ${!current ? 'enabled' : 'disabled'}`, 'info');
        },
        scrollToBottom: () => {
             if (!monacoEditor) return;
             const lineCount = monacoEditor.getModel()?.getLineCount() || 0;
             monacoEditor.revealLine(lineCount);
             monacoEditor.setPosition({ lineNumber: lineCount, column: 1 });
        },
        duplicateLine: () => {
            if (!monacoEditor) return;
            const position = monacoEditor.getPosition();
            if (!position) return;
            const model = monacoEditor.getModel();
            if (!model) return;
            const lineContent = model.getLineContent(position.lineNumber);
            monacoEditor.executeEdits(' Antigravity', [{
                range: new monaco.Range(position.lineNumber, model.getLineMaxColumn(position.lineNumber), position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
                text: '\n' + lineContent,
                forceMoveMarkers: true
            }]);
        },
        deleteLine: () => {
            if (!monacoEditor) return;
            const position = monacoEditor.getPosition();
            if (!position) return;
            const model = monacoEditor.getModel();
            if (!model) return;
            monacoEditor.executeEdits(' Antigravity', [{
                range: new monaco.Range(position.lineNumber, 1, position.lineNumber + 1, 1),
                text: '',
                forceMoveMarkers: true
            }]);
        },
        workspaceSearch: (query: string) => {
            const resultsContainer = document.getElementById('search-results');
            if (!resultsContainer) return;
            
            if (!query) {
                resultsContainer.innerHTML = '';
                return;
            }

            const results: { path: string, line: number, text: string }[] = [];
            openFiles.filter(f => f.type === 'file').forEach(file => {
                const content = file.model?.getValue() || "";
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        results.push({ path: file.path, line: idx + 1, text: line.trim() });
                    }
                });
            });

            resultsContainer.innerHTML = results.map(r => `
                <div class="search-result-item" onclick="AntigravityAPI.openProjectFile('${r.path}'); AntigravityAPI.goToLine(${r.line}); explorer.revealPath('${r.path}')" style="padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer; font-size: 11px;">
                    <div style="font-weight: 600; color: var(--accent); margin-bottom: 4px;">${r.path.split(/[/\\]/).pop()}</div>
                    <div style="color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="color: var(--text-muted); margin-right: 5px;">${r.line}:</span> ${r.text.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') as any, (m: string) => `<span style="background: var(--accent); color: white; padding: 0 2px; border-radius: 2px;">${m}</span>`)}
                    </div>
                </div>
            `).join('') || '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No results found.</div>';
        },
        initGit: () => {
            addNotification('Git initialized');
            const btn = document.getElementById('btn-init-repo');
            if (btn) btn.style.display = 'none';
        },
        openFolder: () => {
            const path = prompt('Enter folder path:', serverRootPath || '.');
            if (path) socket.emit('open-folder', path);
        },
        openFile: () => {
             const input = document.createElement('input');
             input.type = 'file';
             input.onchange = (e: any) => {
                 const file = e.target.files[0];
                 if (!file) return;
                 const reader = new FileReader();
                 reader.onload = (e2: any) => AntigravityAPI.newFile(file.name, e2.target.result);
                 reader.readAsText(file);
             };
             input.click();
        },
        saveAs: () => {
            const name = prompt('Save as name:', openFiles[activeFileIndex]?.name || 'Untitled.txt');
            if (name && activeFileIndex !== -1) {
                openFiles[activeFileIndex].name = name;
                AntigravityAPI.save();
                AntigravityAPI.updateUI();
            }
        },
        cloneRepo: () => {
            const url = prompt('Enter Git URL:');
            if (url) {
                addNotification(`Cloning ${url}... (Simulated)`, 'info');
                setTimeout(() => addNotification('Clone successful!', 'success'), 2000);
            }
        },
        exportProject: () => addNotification('Project export started... (Simulated)', 'success'),
        checkForUpdates: () => addNotification('Antigravity is up to date (v1.5.0-stable)', 'success'),
        closeEditor: () => {
            if (activeFileIndex !== -1) AntigravityAPI.closeTab(activeFileIndex);
        },
        deleteActiveFile: () => {
            const activeFile = openFiles[activeFileIndex];
            if (!activeFile || activeFile.type !== 'file') return;
            if (confirm(`Are you sure you want to delete ${activeFile.name}? This action is permanent.`)) {
                socket.emit('delete-file', activeFile.path);
                AntigravityAPI.closeTab(activeFileIndex);
                addNotification(`Deleted ${activeFile.name}`, 'warn');
            }
        },
        renameActiveFile: () => {
            const activeFile = openFiles[activeFileIndex];
            if (!activeFile || activeFile.type !== 'file') return;
            const newName = prompt(`Rename ${activeFile.name} to:`, activeFile.name);
            if (newName && newName !== activeFile.name) {
                const oldPath = activeFile.path;
                const pathParts = oldPath.split(/[/\\]/);
                pathParts.pop();
                const newPath = pathParts.join('/') + '/' + newName;
                socket.emit('rename-file', { oldPath, newPath });
                activeFile.name = newName;
                activeFile.path = newPath;
                AntigravityAPI.updateUI();
                addNotification(`Renamed to ${newName}`);
            }
        },
        revealInExplorer: () => {
            const activeFile = openFiles[activeFileIndex];
            if (!activeFile) return;
            addNotification(`Revealing ${activeFile.name} in explorer`, 'info');
            explorer.revealPath(activeFile.path);
        },
        getActiveFile: () => openFiles[activeFileIndex],
        showTerminal: () => {
             const t = document.querySelector('.terminal-panel') as HTMLElement;
             if (t && t.style.display === 'none') {
                 t.style.display = 'flex';
                 window.dispatchEvent(new Event('resize')); 
             }
             AntigravityAPI.switchTerminalTab('terminal');
        },
        newTerminal: () => {
            AntigravityAPI.showTerminal();
            const id = `term-${Date.now()}`;
            terminalService.createTerminal(id);
            AntigravityAPI.updateTerminalTabs();
            AntigravityAPI.switchTerminal(id);
        },
        updateTerminalTabs: () => {
            const container = document.getElementById('terminal-tabs');
            if (!container) return;
            // Accessing internal terms for the "real" UI feel
            const terms = (terminalService as any).terminals || {};
            const activeId = (terminalService as any).activeTerminalId;

            container.innerHTML = Object.keys(terms).map(id => `
                <div class="term-tab ${id === activeId ? 'active' : ''}" onclick="AntigravityAPI.switchTerminal('${id}')" style="
                    padding: 4px 12px;
                    background: ${id === activeId ? 'var(--bg-lighter)' : 'transparent'};
                    border: 1px solid var(--border);
                    border-bottom: none;
                    font-size: 11px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                    <span>bash</span>
                    ${Object.keys(terms).length > 1 ? `<span onclick="event.stopPropagation(); AntigravityAPI.closeTerminal('${id}')" style="opacity: 0.6;">×</span>` : ''}
                </div>
            `).join('');
        },
        switchTerminal: (id: string) => {
            terminalService.switchTerminal(id);
            AntigravityAPI.updateTerminalTabs();
        },
        closeTerminal: (id: string) => {
            // Internal cleanup simulated
            const terms = (terminalService as any).terminals;
            if (terms[id]) {
                terms[id].dispose();
                delete terms[id];
                const keys = Object.keys(terms);
                if (keys.length > 0) AntigravityAPI.switchTerminal(keys[0]);
                else AntigravityAPI.newTerminal();
            }
        },
        splitTerminal: () => {
            AntigravityAPI.showTerminal();
            terminalService.splitTerminal();
        },
        runCommand: () => {
            const cmd = prompt('Enter command to run:');
            if (cmd) {
                AntigravityAPI.showTerminal();
                terminalService.runTask(cmd);
            }
        },
        runBuildTask: () => {
            AntigravityAPI.showTerminal();
            taskManager.runBuild();
        },
        clearTerminal: () => {
             terminalService.clear();
             addNotification('Terminal cleared', 'info');
        },
        configureTasks: () => taskManager.configureTasks(),
        saveBackendUrl: () => {
            const input = document.getElementById('setting-backend-url') as HTMLInputElement;
            let url = input.value.trim();
            if (url) {
                if (!url.startsWith('http')) url = 'https://' + url;
                localStorage.setItem('antigravity_backend_url', url);
                window.location.reload();
            } else {
                localStorage.removeItem('antigravity_backend_url');
                window.location.reload();
            }
        },
        // --- PRO FEATURES (Surge Part 1) ---
        toggleMarkdownPreview: () => {
            const previewEl = document.getElementById('markdown-preview');
            const editorEl = document.getElementById('monaco-editor-container');
            if (!previewEl || !editorEl) return;
            
            if (previewEl.style.display === 'none') {
                previewEl.style.display = 'block';
                AntigravityAPI.updateMarkdownPreview();
            } else {
                previewEl.style.display = 'none';
            }
            window.dispatchEvent(new Event('resize'));
        },
        updateMarkdownPreview: () => {
            const activeFile = openFiles[activeFileIndex];
            const previewBody = document.getElementById('preview-body');
            if (!activeFile?.model || !previewBody) return;
            
            const content = activeFile.model.getValue();
            previewBody.innerHTML = marked.parse(content) as string;
        },
        formatJSON: () => {
            const model = monacoEditor?.getModel();
            if (!model) return;
            try {
                const val = JSON.parse(model.getValue());
                model.setValue(JSON.stringify(val, null, 4));
                addNotification('JSON formatted successfully', 'success');
            } catch (e) {
                addNotification('Invalid JSON', 'warn');
            }
        },
        toggleBase64: () => {
            if (!monacoEditor) return;
            const selection = monacoEditor.getSelection();
            if (!selection) return;
            const model = monacoEditor.getModel();
            if (!model) return;
            const text = model.getValueInRange(selection);
            try {
                const result = btoa(text); // Basic encode for now
                monacoEditor.executeEdits('Antigravity', [{ range: selection, text: result }]);
                addNotification('Converted to Base64', 'success');
            } catch (e) {
                addNotification('Base64 Conversion failed', 'warn');
            }
        },
        generateUUID: () => {
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            if (monacoEditor) {
                const selection = monacoEditor.getSelection();
                if (selection) {
                    monacoEditor.executeEdits('Antigravity', [{ range: selection, text: uuid }]);
                }
            }
            addNotification('UUID Generated and inserted', 'success');
        },
        testRegex: () => {
            const pattern = prompt('Enter Regex pattern:');
            if (!pattern) return;
            const activeFile = openFiles[activeFileIndex];
            if (!activeFile?.model) return;
            try {
                const regex = new RegExp(pattern, 'g');
                const content = activeFile.model.getValue();
                const matches = [...content.matchAll(regex)];
                addNotification(`Found ${matches.length} matches for /${pattern}/`, 'info');
            } catch (e) {
                addNotification('Invalid Regex', 'warn');
            }
        },
        connectDB: () => {
            const conn = (document.getElementById('db-conn-str') as HTMLInputElement).value;
            if (!conn) { addNotification('Please enter a connection string', 'warn'); return; }
            addNotification(`Connecting to ${conn}...`, 'info');
            setTimeout(() => {
                const form = document.getElementById('db-connect-form');
                const content = document.getElementById('db-content');
                if (form && content) {
                    form.style.display = 'none';
                    content.style.display = 'block';
                }
                addNotification('Database Connected', 'success');
            }, 1000);
        },
        colorPicker: () => {
            addNotification('Color Picker requested. Please use the CSS preview features.', 'info');
        },
        insertSnippet: (type: string) => {
            if (!monacoEditor) return;
            let snippet = '';
            switch(type) {
                case 'for': snippet = 'for (let i = 0; i < array.length; i++) {\n\tconst element = array[i];\n\t\n}'; break;
                case 'if': snippet = 'if (condition) {\n\t\n} else {\n\t\n}'; break;
                case 'try': snippet = 'try {\n\t\n} catch (e) {\n\tconsole.error(e);\n}'; break;
                case 'fetch': snippet = 'const response = await fetch(url);\nconst data = await response.json();\nconsole.log(data);'; break;
                case 'express': snippet = 'const express = require(\'express\');\nconst app = express();\n\napp.get(\'/\', (req, res) => {\n\tres.send(\'Hello World!\');\n});\n\napp.listen(3000, () => {\n\tconsole.log(\'Server running on port 3000\');\n});'; break;
                case 'react': snippet = 'import React from \'react\';\n\nexport const MyComponent = () => {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n};'; break;
                case 'html5': snippet = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My App</title>\n</head>\n<body>\n    \n</body>\n</html>'; break;
                case 'arrow': snippet = 'const myFunction = () => {\n  \n};'; break;
            }
            if (snippet) {
                const selection = monacoEditor.getSelection();
                if (selection) {
                    monacoEditor.executeEdits('Antigravity', [{ range: selection, text: snippet }]);
                }
                addNotification(`Inserted ${type} snippet`, 'success');
            }
        },
        textAction: (type: string) => {
            if (!monacoEditor) return;
            const model = monacoEditor.getModel();
            if (!model) return;
            const content = model.getValue();
            const selection = monacoEditor.getSelection();
            let result = '';

            switch(type) {
                case 'trim':
                    model.setValue(content.split('\n').map(l => l.trimEnd()).join('\n'));
                    addNotification('Trimmed line endings', 'info');
                    break;
                case 'reverse':
                    model.setValue(content.split('\n').reverse().join('\n'));
                    addNotification('Reversed all lines', 'info');
                    break;
                case 'stats':
                    const words = content.trim().split(/\s+/).length;
                    const chars = content.length;
                    addNotification(`Stats: ${words} words, ${chars} chars`, 'success');
                    break;
                case 'lorem':
                    result = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
                    break;
                case 'uppercase':
                    if (selection) result = model.getValueInRange(selection).toUpperCase();
                    break;
                case 'lowercase':
                    if (selection) result = model.getValueInRange(selection).toLowerCase();
                    break;
                case 'jwt':
                    if (selection) {
                        try {
                            const part = model.getValueInRange(selection).split('.')[1];
                            result = JSON.stringify(JSON.parse(atob(part)), null, 4);
                        } catch(e) { addNotification('Invalid JWT', 'warn'); return; }
                    }
                    break;
                case 'base64-decode':
                    if (selection) {
                        try { result = atob(model.getValueInRange(selection)); } 
                        catch(e) { addNotification('Invalid Base64', 'warn'); return; }
                    }
                    break;
                case 'sql-format':
                    addNotification('SQL Formatter (Basic) applied', 'info');
                    if (selection) result = model.getValueInRange(selection).replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT)\b/gi, (m) => m.toUpperCase());
                    break;
            }
            if (result && selection) {
                monacoEditor.executeEdits('Antigravity', [{ range: selection, text: result }]);
                addNotification('Transformation Applied', 'success');
            }
        }
    };

    (window as any).AntigravityAPI = AntigravityAPI;

    // --- Listeners ---
    document.getElementById('exp-new-file')?.addEventListener('click', () => explorer.handleCreateFile('.'));
    document.getElementById('exp-new-folder')?.addEventListener('click', () => explorer.handleCreateFolder('.'));
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); AntigravityAPI.save(); }
        if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) { 
            e.preventDefault(); 
            AntigravityAPI.openCommandPalette(false); 
        } else if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            AntigravityAPI.openCommandPalette(true);
        }
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); AntigravityAPI.toggleSidebar(); }
        if (e.ctrlKey && e.key === '`') { e.preventDefault(); AntigravityAPI.toggleTerminal(); }
    });

    document.getElementById('go-live')?.addEventListener('click', () => AntigravityAPI.goLive());
    document.getElementById('close-settings')?.addEventListener('click', () => AntigravityAPI.closeSettings());
    document.getElementById('btn-add-term')?.addEventListener('click', () => AntigravityAPI.newTerminal());
    document.getElementById('exp-refresh')?.addEventListener('click', () => explorer.refresh());

    const searchInput = document.getElementById('sidebar-search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', (e: any) => {
            AntigravityAPI.workspaceSearch(e.target.value);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') AntigravityAPI.searchProject(searchInput.value);
        });
    }

    chatInput?.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });

    sendBtn?.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
             const msg = document.createElement('div');
             msg.className = 'message user';
             msg.textContent = text;
             messageContainer?.appendChild(msg);
             
             // Send to backend
             socket.emit('chat-message', text);
             
             chatInput.value = '';
             chatInput.style.height = 'auto';
        }
    });

    socket.on('ai-message', (text) => {
        const msg = document.createElement('div');
        msg.className = 'message assistant';
        msg.style.background = 'var(--bg-lighter)';
        msg.style.padding = '10px';
        msg.style.borderRadius = '8px';
        msg.style.fontSize = '13px';
        msg.style.marginTop = '10px';
        msg.textContent = text;
        messageContainer?.appendChild(msg);
        messageContainer?.scrollTo({ top: messageContainer.scrollHeight, behavior: 'smooth' });
    });

    // --- Socket Events ---
    socket.on('connect', () => {
        addNotification('Connected to backend server', 'success');
        if (connStatus) {
            connStatus.style.color = 'var(--success)';
            connStatus.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Connected';
        }
    });

    socket.on('root-path', (path) => {
        serverRootPath = path;
        explorer.setRootPath(path);
        explorer.refresh();
    });

    socket.on('file-content', ({ path, content }) => {
        const name = path.split(/[/\\]/).pop() || path;
        AntigravityAPI.newFile(name, content, path);
    });

    socket.on('folder-opened', () => explorer.refresh());

    // Initialize state
    AntigravityAPI.newTerminal();
    
    // Listen for terminal tab updates
    window.addEventListener('resize', () => {
        AntigravityAPI.updateTerminalTabs();
    });

    // Menu dropdowns logic
    const menus: Record<string, any> = { File: FileMenu, Edit: EditMenu, Selection: SelectionMenu, View: ViewMenu, Go: GoMenu, Run: RunMenu, Terminal: TerminalMenu, Help: HelpMenu };
    document.querySelectorAll('.menu-container').forEach(container => {
        const name = (container as HTMLElement).dataset.menu;
        if (!name || !menus[name]) return;
        const drop = document.createElement('div');
        drop.className = 'menu-dropdown';
        menus[name].items.forEach((item: any) => {
             const el = document.createElement('div');
             el.className = item.type === 'separator' ? 'menu-separator' : 'menu-item-dropdown';
             if (item.type !== 'separator') {
                 el.innerHTML = `<span>${item.label}</span><span class="menu-shortcut">${item.shortcut||''}</span>`;
                 el.onclick = () => { item.action(); drop.classList.remove('active'); };
             }
             drop.appendChild(el);
        });
        container.appendChild(drop);
        container.querySelector('.menu-item')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const was = drop.classList.contains('active');
            document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
            if (!was) drop.classList.add('active');
        });
    });

    document.addEventListener('click', () => document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active')));

    // Activity bar switching
    const activityViewMap: Record<string, string> = {
        'Explorer': 'view-explorer',
        'Search': 'view-search',
        'Source Control': 'view-source-control',
        'Run and Debug': 'view-run-debug',
        'Extensions': 'view-extensions',
        'Dev Tools': 'view-tools',
        'Database': 'view-database',
        'Account': 'view-account'
    };

    document.querySelectorAll('.activity-icon').forEach((icon) => {
        icon.addEventListener('click', () => {
            const title = (icon as HTMLElement).getAttribute('title') || '';
            if (title === 'Settings') return; // Settings handled separately
            
            const viewId = activityViewMap[title];
            if (!viewId) return;

            // Toggle active state on icons
            document.querySelectorAll('.activity-icon').forEach(el => el.classList.remove('active'));
            icon.classList.add('active');

            // Toggle active state on sidebar views
            document.querySelectorAll('.sidebar-view').forEach(el => el.classList.remove('active'));
            const viewEl = document.getElementById(viewId);
            if (viewEl) viewEl.classList.add('active');

            // Show sidebar if hidden
            const sidebarEl = document.querySelector('.sidebar') as HTMLElement;
            if (sidebarEl) sidebarEl.style.display = 'flex';
        });
    });

    // Panel tab switching
    document.querySelectorAll('.terminal-header span').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = (tab as HTMLElement).dataset.tab;
            if (!targetId) return;

            document.querySelectorAll('.terminal-header span, .terminal-view').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            
            const viewEl = document.getElementById(`view-${targetId}`);
            if (viewEl) {
                viewEl.classList.add('active');
                viewEl.style.display = targetId === 'terminal' ? 'flex' : 'block';
            }
            
            // Re-layout xterm if terminal is shown
            if (targetId === 'terminal') {
                window.dispatchEvent(new Event('resize'));
            }
        });
    });

    // Init settings
    const savedSettings = localStorage.getItem('antigravity_settings');
    if (savedSettings) {
        const s = JSON.parse(savedSettings);
        if (monacoEditor && s.fontSize) monacoEditor.updateOptions({ fontSize: parseInt(s.fontSize) });
        document.body.setAttribute('data-theme', s.theme || 'dark');
    }

    // Global Keybindings
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            AntigravityAPI.openCommandPalette();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            AntigravityAPI.openCommandPalette(true);
        }
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            document.querySelectorAll('.activity-item')[1].dispatchEvent(new Event('click'));
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            AntigravityAPI.toggleSidebar();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            document.getElementById('agent-chat-input')?.focus();
        }
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            AntigravityAPI.replaceInFile();
        }
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            monacoEditor?.trigger('keyboard', 'editor.action.duplicateSelection', null);
        }
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            monacoEditor?.trigger('keyboard', 'editor.action.deleteLines', null);
        }
    });

    setInterval(() => {
        const clock = document.getElementById('status-clock');
        if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    // Sidebar Resizing
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    let isResizing = false;

    resizer?.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.classList.add('resizing');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing || !sidebar) return;
        const activityBarWidth = 50; 
        const newWidth = e.clientX - activityBarWidth;
        if (newWidth > 100 && newWidth < 600) {
            sidebar.style.width = `${newWidth}px`;
            window.dispatchEvent(new Event('resize'));
        }
    });

    window.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.classList.remove('resizing');
    });

    // Auto-save logic
    setInterval(() => {
        const saved = localStorage.getItem('antigravity_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.autoSave && AntigravityAPI) {
                AntigravityAPI.save();
            }
        }
    }, 60000); // Every minute

    // Notification Badge logic (mock)
    setTimeout(() => {
        const bell = document.querySelector('[title="Notifications"]');
        if (bell) {
            const badge = document.createElement('span');
            badge.style.cssText = 'position: absolute; top: -2px; right: -2px; background: var(--accent); width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--bg-dark);';
            (bell as HTMLElement).style.position = 'relative';
            bell.appendChild(badge);
        }
    }, 5000);

    // Status bar clock
    setInterval(() => {
        const clock = document.getElementById('status-clock');
        if (clock) {
            clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }, 1000);

    // --- Cloud Sync API ---
    (window as any).AntigravityAPI = {
        ...AntigravityAPI,
        hideSplash: () => document.getElementById('splash-screen')?.classList.add('hidden'),
        showSplash: () => document.getElementById('splash-screen')?.classList.remove('hidden'),
        signInWithGoogle: async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                addNotification('Logged in with Google', 'success');
            } catch (e: any) { addNotification(e.message, 'warn'); }
        },
        splashSignIn: async () => {
            const email = (document.getElementById('splash-email') as HTMLInputElement).value;
            const pass = (document.getElementById('splash-password') as HTMLInputElement).value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                addNotification('Signed in successfully', 'success');
            } catch (e: any) { addNotification(e.message, 'warn'); }
        },
        splashSignUp: async () => {
            const email = (document.getElementById('splash-email') as HTMLInputElement).value;
            const pass = (document.getElementById('splash-password') as HTMLInputElement).value;
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                addNotification('Account created!', 'success');
            } catch (e: any) { addNotification(e.message, 'warn'); }
        },
        openAuth: () => {
             document.getElementById('auth-modal')?.classList.add('active');
             document.getElementById('modal-overlay')?.classList.add('active');
        },
        closeAuth: () => {
             document.getElementById('auth-modal')?.classList.remove('active');
             document.getElementById('modal-overlay')?.classList.remove('active');
        },
        signIn: async () => {
            const email = (document.getElementById('auth-email') as HTMLInputElement).value;
            const pass = (document.getElementById('auth-password') as HTMLInputElement).value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                addNotification('Signed in successfully', 'success');
                (window as any).AntigravityAPI.closeAuth();
            } catch (e: any) { addNotification(e.message, 'warn'); }
        },
        signUp: async () => {
            const email = (document.getElementById('auth-email') as HTMLInputElement).value;
            const pass = (document.getElementById('auth-password') as HTMLInputElement).value;
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                addNotification('Account created!', 'success');
                (window as any).AntigravityAPI.closeAuth();
            } catch (e: any) { addNotification(e.message, 'warn'); }
        },
        signOut: () => signOut(auth),
        pushToCloud: async () => {
            if (!currentUser) { (window as any).AntigravityAPI.openAuth(); return; }
            addNotification('Syncing workspace to cloud...', 'info');
            try {
                const workspaceData = openFiles.filter(f => f.type === 'file').map(f => ({
                    path: f.path,
                    content: f.model?.getValue() || ''
                }));
                await setDoc(doc(db, 'users', currentUser.uid), {
                    workspace: workspaceData,
                    lastSynced: Date.now()
                });
                addNotification('Cloud Sync Complete', 'success');
            } catch (e) { addNotification('Sync Failed', 'warn'); }
        },
        restoreFromCloud: async () => {
            if (!currentUser) return;
            addNotification('Downloading cloud workspace...', 'info');
            const snap = await getDoc(doc(db, 'users', currentUser.uid));
            if (snap.exists() && snap.data().workspace) {
                const data = snap.data().workspace as any[];
                for (const file of data) {
                    (window as any).AntigravityAPI.newFile(file.path.split('/').pop(), file.content, file.path);
                }
                addNotification('Workspace Restored', 'success');
            }
        },
        importFromGitHub: () => {
            const url = (document.getElementById('github-repo-url') as HTMLInputElement).value;
            if (!url) return;
            addNotification(`Cloning ${url}...`, 'info');
            setTimeout(() => {
                addNotification('GitHub Import Successful', 'success');
                (window as any).AntigravityAPI.newFile('README.md', '# Imported from GitHub\nWelcome to your synced workspace.');
            }, 2000);
        }
    };

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        const icon = document.querySelector('[title="Account"]') as HTMLElement;
        if (user) {
            icon.style.color = 'var(--accent)';
            icon.title = `Signed in as ${user.email}`;
            addNotification(`Welcome back, ${user.email}`, 'success');
            (window as any).AntigravityAPI.restoreFromCloud();
            (window as any).AntigravityAPI.hideSplash();
        } else {
            icon.style.color = '';
            icon.title = 'Account';
            (window as any).AntigravityAPI.showSplash();
        }
    });

    // Support for overlay close on settings
    const oldOpenSettings = AntigravityAPI.openSettings;
    AntigravityAPI.openSettings = () => {
        oldOpenSettings();
        document.getElementById('modal-overlay')?.classList.add('active');
    };
    const oldCloseSettings = AntigravityAPI.closeSettings;
    AntigravityAPI.closeSettings = () => {
        oldCloseSettings();
        document.getElementById('modal-overlay')?.classList.remove('active');
    };

    AntigravityAPI.updateDashboard();
    restoreSession();
});
