import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Socket } from 'socket.io-client';

export class TerminalManager {
    private terminal: Terminal;
    private fitAddon: FitAddon;
    private socket: Socket;
    private container: HTMLElement;

    constructor(socket: Socket, containerId: string) {
        this.socket = socket;
        this.container = document.getElementById(containerId) as HTMLElement;
        
        this.terminal = new Terminal({
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

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        
        if (this.container) {
            this.terminal.open(this.container);
            this.fitAddon.fit();
        }

        this.setupListeners();
    }

    private setupListeners() {
        this.terminal.onData(data => {
            this.socket.emit('terminal-input', data);
        });

        this.socket.on('terminal-data', (data: string) => {
            this.terminal.write(data);
        });

        window.addEventListener('resize', () => {
            this.fitAddon.fit();
            this.socket.emit('terminal-resize', {
                cols: this.terminal.cols,
                rows: this.terminal.rows
            });
        });

        // Initial resize
        setTimeout(() => {
            this.fitAddon.fit();
            this.socket.emit('terminal-resize', {
                cols: this.terminal.cols,
                rows: this.terminal.rows
            });
        }, 500);
    }

    public write(text: string) {
        this.terminal.write(text);
    }

    public writeln(text: string) {
        this.terminal.writeln(text);
    }

    public clear() {
        this.terminal.clear();
    }

    public fit() {
        this.fitAddon.fit();
    }
}
