// Antigravity Explorer Component
import { Socket } from 'socket.io-client';

export class Explorer {
    private socket: Socket;
    private container: HTMLElement;
    private filter: string = '';
    private expandedFolders: Set<string> = new Set();
    private fileTree: Map<string, any[]> = new Map();
    private isLoading: Set<string> = new Set();
    private rootPath: string = '';

    private loadTimeouts: Map<string, any> = new Map();

    constructor(socket: Socket, containerId: string) {
        this.socket = socket;
        this.container = document.getElementById(containerId) as HTMLElement;
        this.setupListeners();
        this.setupFilter();
    }

    private setupFilter() {
        const filterInput = document.getElementById('explorer-filter') as HTMLInputElement;
        if (filterInput) {
            filterInput.addEventListener('input', (e: any) => {
                this.filter = e.target.value.toLowerCase();
                this.render();
            });
        }
    }

    private setupListeners() {
        this.socket.on('files-list', (data: { path: string, files: any[] }) => {
            const { path, files } = data;
            this.fileTree.set(path, files);
            this.isLoading.delete(path);
            if (this.loadTimeouts.has(path)) {
                clearTimeout(this.loadTimeouts.get(path));
                this.loadTimeouts.delete(path);
            }
            this.render();
        });
    }

    public refresh(path: string = '.') {
        if (this.isLoading.has(path)) return;
        this.isLoading.add(path);
        this.socket.emit('get-files', path);
        
        // Timeout to prevent infinite "Loading..."
        const timeout = setTimeout(() => {
            if (this.isLoading.has(path)) {
                this.isLoading.delete(path);
                this.render();
                console.warn(`Explorer refresh timed out for path: ${path}`);
            }
        }, 8000);
        this.loadTimeouts.set(path, timeout);
    }

    public setRootPath(path: string) {
        this.rootPath = path;
    }

    public setVirtualFiles(path: string, files: any[]) {
        this.fileTree.set(path, files);
        this.render();
    }

    public toggleFolder(path: string) {
        if (this.expandedFolders.has(path)) {
            this.expandedFolders.delete(path);
        } else {
            this.expandedFolders.add(path);
            this.refresh(path);
        }
        this.render();
    }

    private getIcon(file: any) {
        if (file.isDirectory) {
            const isExpanded = this.expandedFolders.has(file.path);
            return `<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #dcb67a; transform: ${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}; transition: transform 0.1s;"><path d="M7 10l5 5 5-5"/></svg>
                    <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #dcb67a"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        let color = '#858585';
        if (ext === 'ts') color = '#3178c6';
        if (ext === 'js') color = '#f1e05a';
        if (ext === 'html') color = '#e34c26';
        if (ext === 'css') color = '#264de4';
        if (ext === 'md') color = '#007acc';
        if (ext === 'json') color = '#fbc02d';

        return `<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
    }

    public revealPath(path: string) {
        const parts = path.split(/[/\\]/);
        let current = '';
        for (let i = 0; i < parts.length - 1; i++) {
            current = current ? `${current}/${parts[i]}` : parts[i];
            if (current !== '.') this.expandedFolders.add(current);
        }
        this.render();
        // Scroll into view logic could be added here
    }

    public render() {
        if (!this.container) return;
        this.container.innerHTML = this.renderLevel('.');
    }

    private renderLevel(path: string, depth: number = 0): string {
        const files = this.fileTree.get(path);
        const isCloudMode = window.location.hostname !== 'localhost';
        
        if (!this.socket.connected && !isCloudMode) {
            return `<div style="padding: 4px 15px 4px ${depth * 12 + 25}px; color: var(--error); font-size: 11px;">Disconnected</div>`;
        }

        if (this.isLoading.has(path) || !files) {
            if (!files) this.refresh(path);
            return `<div style="padding: 4px 15px 4px ${depth * 12 + 25}px; color: var(--text-muted); font-size: 11px;">Loading...</div>`;
        }

        if (files.length === 0) {
            return `<div style="padding: 4px 15px 4px ${depth * 12 + 25}px; color: var(--text-muted); font-size: 11px; font-style: italic; opacity: 0.5;">Empty</div>`;
        }

        let sorted = [...files].sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));

        if (this.filter) {
            sorted = sorted.filter(f => {
                const matches = f.name.toLowerCase().includes(this.filter);
                // If it's a directory and expanded, or matches, keep it
                return matches || (f.isDirectory && this.expandedFolders.has(f.path));
            });
        }

        return sorted.map(file => {
            const isExpanded = this.expandedFolders.has(file.path);
            const indent = depth * 12;
            const activeFile = (window as any).AntigravityAPI?.getActiveFile?.();
            const isActive = activeFile && activeFile.path === file.path;
            
            let html = `
                <div class="file-item ${isActive ? 'active' : ''}" style="padding-left: ${indent + 15}px; display: flex; align-items: center; gap: 6px;" 
                     onclick="${file.isDirectory ? `window.AntigravityExplorer.toggleFolder('${file.path}')` : `window.AntigravityAPI.openProjectFile('${file.path}')`}"
                     oncontextmenu="window.AntigravityExplorer.showContextMenu(event, '${file.path}', ${file.isDirectory})">
                    ${this.getIcon(file)}
                    <span class="file-name" style="color: ${isActive ? 'var(--accent)' : 'inherit'}">${file.name}</span>
                </div>
            `;

            if (file.isDirectory && (isExpanded || (this.filter && files.some(f => f.name.toLowerCase().includes(this.filter))))) {
                html += this.renderLevel(file.path, depth + 1);
            }
            return html;
        }).join('');
    }

    public showContextMenu(e: MouseEvent, path: string, isFolder: boolean) {
        e.preventDefault();
        const existing = document.getElementById('explorer-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'explorer-context-menu';
        menu.className = 'menu-dropdown active';
        menu.style.position = 'fixed';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.style.zIndex = '10000';
        
        menu.innerHTML = `
            <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.handleRename('${path}')">Rename</div>
            <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.handleDelete('${path}')" style="color: var(--error)">Delete</div>
            <div class="menu-separator"></div>
            <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.copyPath('${path}')">Copy Path</div>
            <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.copyRelativePath('${path}')">Copy Relative Path</div>
            ${isFolder ? `
                <div class="menu-separator"></div>
                <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.handleCreateFile('${path}')">New File...</div>
                <div class="menu-item-dropdown" onclick="window.AntigravityExplorer.handleCreateFolder('${path}')">New Folder...</div>
            ` : ''}
        `;

        document.body.appendChild(menu);
        document.addEventListener('click', () => menu.remove(), { once: true });
    }

    public handleCreateFile(parentPath: string) {
        const name = prompt('File Name:');
        if (name) {
            const fullPath = parentPath === '.' ? name : `${parentPath}/${name}`;
            this.socket.emit('create-file', { path: fullPath });
        }
    }

    public handleCreateFolder(parentPath: string) {
        const name = prompt('Folder Name:');
        if (name) {
            const fullPath = parentPath === '.' ? name : `${parentPath}/${name}`;
            this.socket.emit('create-folder', { path: fullPath });
        }
    }

    public handleDelete(path: string) {
        if (confirm(`Are you sure you want to delete ${path}?`)) {
            this.socket.emit('delete-item', path);
        }
    }

    public handleRename(path: string) {
        const newName = prompt('New Name:', path.split('/').pop());
        if (newName) {
            const parts = path.split('/');
            parts.pop();
            const newPath = parts.length > 0 ? `${parts.join('/')}/${newName}` : newName;
            this.socket.emit('rename-item', { oldPath: path, newPath });
        }
    }

    public copyPath(path: string) {
        const fullPath = this.rootPath ? `${this.rootPath}/${path}` : path;
        navigator.clipboard.writeText(fullPath);
        (window as any).AntigravityAPI?.notify?.('Path copied to clipboard');
    }

    public copyRelativePath(path: string) {
        navigator.clipboard.writeText(path);
        (window as any).AntigravityAPI?.notify?.('Relative path copied to clipboard');
    }
}
