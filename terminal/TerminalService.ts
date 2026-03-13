import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Socket } from 'socket.io-client';

export interface TerminalInstance {
    id: string;
    terminal: Terminal;
    fitAddon: FitAddon;
    container: HTMLElement;
}

export class TerminalService {
    private socket: Socket;
    private terminals: Map<string, TerminalInstance> = new Map();
    private activeTerminalId: string | null = null;
    private container: HTMLElement;

    constructor(socket: Socket, containerId: string) {
        this.socket = socket;
        this.container = document.getElementById(containerId) as HTMLElement;
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on('terminal-data', (data: { id: string, data: string }) => {
            const instance = this.terminals.get(data.id);
            if (instance) {
                instance.terminal.write(data.data);
            } else if (this.terminals.size === 1) {
                 // Fallback for legacy server messages without ID
                 const first = Array.from(this.terminals.values())[0];
                 first.terminal.write(data as any);
            }
        });

        window.addEventListener('resize', () => {
            this.fitAll();
            this.terminals.forEach(t => {
                if (t.container.style.display !== 'none') {
                    this.socket.emit('terminal-resize', { id: t.id, cols: t.terminal.cols, rows: t.terminal.rows });
                }
            });
        });
    }

    public createTerminal(id: string = Math.random().toString(36).substr(2, 9), switchActive: boolean = true): string {
        const termContainer = document.createElement('div');
        termContainer.className = 'terminal-instance';
        termContainer.id = `term-${id}`;
        termContainer.style.width = '100%';
        termContainer.style.height = '100%';
        termContainer.style.display = 'none';
        this.container.appendChild(termContainer);

        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            theme: {
                background: '#0d0d0d',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selectionBackground: '#505050'
            },
            fontFamily: 'JetBrains Mono, monospace'
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(termContainer);
        fitAddon.fit();

        terminal.onData(data => {
            this.socket.emit('terminal-input', { id, data });
        });

        const instance: TerminalInstance = { id, terminal, fitAddon, container: termContainer };
        this.terminals.set(id, instance);
        
        this.socket.emit('terminal-create', { id });
        if (switchActive) {
            this.switchTerminal(id);
        }

        return id;
    }

    public splitTerminal() {
        if (!this.activeTerminalId) return;
        const active = this.terminals.get(this.activeTerminalId);
        if (!active) return;

        // Visual split logic (simplified for browser)
        active.container.style.width = '50%';
        const newId = this.createTerminal(Math.random().toString(36).substr(2, 9), false);
        const newInstance = this.terminals.get(newId);
        if (newInstance) {
            newInstance.container.style.width = '50%';
            newInstance.container.style.display = 'block';
            setTimeout(() => {
                newInstance.fitAddon.fit();
                active.fitAddon.fit();
            }, 50);
        }
    }

    public switchTerminal(id: string) {
        this.terminals.forEach((term, termId) => {
            term.container.style.display = termId === id ? 'block' : 'none';
        });
        this.activeTerminalId = id;
        const instance = this.terminals.get(id);
        if (instance) {
            instance.fitAddon.fit();
            instance.terminal.focus();
        }
    }

    public sendInput(id: string, data: string) {
        this.socket.emit('terminal-input', { id, data });
    }

    public closeTerminal(id: string) {
        const instance = this.terminals.get(id);
        if (instance) {
            instance.terminal.dispose();
            instance.container.remove();
            this.terminals.delete(id);
            this.socket.emit('terminal-close', { id });
            if (this.activeTerminalId === id) {
                const next = Array.from(this.terminals.keys())[0];
                if (next) this.switchTerminal(next);
                else this.activeTerminalId = null;
            }
        }
    }

    public runTask(command: string) {
        const id = this.createTerminal(`task-${Date.now()}`);
        setTimeout(() => this.sendInput(id, `${command}\r`), 500);
    }

    public clear() {
        if (this.activeTerminalId) {
            this.terminals.get(this.activeTerminalId)?.terminal.clear();
        }
    }

    public fitAll() {
        this.terminals.forEach(t => {
            if (t.container.offsetParent !== null) {
                try { t.fitAddon.fit(); } catch (e) {}
            }
        });
    }
}
