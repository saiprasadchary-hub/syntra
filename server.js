import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pty from 'node-pty';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/preview', (req, res, next) => {
    express.static(workspaceRoot)(req, res, next);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // Allow any origin for maximum compatibility in this IDE project
            callback(null, true);
        },
        methods: ["GET", "POST"]
    }
});

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
// Isolated ROOT_DIR for each connection would be better, but we'll stick to a shared one 
// for now as it's a single-user IDE project and easy to manage projects.
let workspaceRoot = process.cwd();

const getFiles = async (dir) => {
    try {
        const entries = await fs.readdir(dir);
        const result = [];
        for (const entry of entries) {
            if (entry === 'node_modules' || entry === '.git' || entry === '.gemini' || entry === 'dist') continue;
            const fullPath = path.join(dir, entry);
            try {
                const stats = await fs.stat(fullPath);
                result.push({
                    name: entry,
                    path: path.relative(workspaceRoot, fullPath).replace(/\\/g, '/'),
                    isDirectory: stats.isDirectory()
                });
            } catch (e) {
                // skip files that can't be stat'd
            }
        }
        // Sort: folders first, then files alphabetically
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        return result;
    } catch (e) {
        return [];
    }
};

io.on('connection', (socket) => {
    console.log('User connected');
    
    // Send current workspace root to client
    socket.emit('root-path', workspaceRoot);

    // --- Terminal Logic ---
    const terminals = new Map();

    socket.on('terminal-create', ({ id }) => {
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: workspaceRoot,
            env: process.env
        });

        ptyProcess.onData((data) => {
            socket.emit('terminal-data', { id, data });
        });

        terminals.set(id, ptyProcess);
    });

    socket.on('terminal-input', (payload) => {
        const id = typeof payload === 'string' ? null : payload.id;
        const data = typeof payload === 'string' ? payload : payload.data;
        
        if (id) {
            const term = terminals.get(id);
            if (term) term.write(data);
        } else {
            // Legacy support for single terminal
            const first = Array.from(terminals.values())[0];
            if (first) first.write(data);
        }
    });

    socket.on('terminal-resize', (size) => {
        const term = size.id ? terminals.get(size.id) : Array.from(terminals.values())[0];
        if (term) {
            try { term.resize(size.cols, size.rows); } catch(e) {}
        }
    });

    // --- File System Logic ---
    socket.on('get-files', async (dir) => {
        const targetDir = dir ? path.resolve(dir === '.' ? workspaceRoot : path.join(workspaceRoot, dir)) : workspaceRoot;
        const files = await getFiles(targetDir);
        const relativePath = dir || '.';
        socket.emit('files-list', { path: relativePath, files });
    });

    socket.on('read-file', async (relativePath) => {
        try {
            const absolutePath = path.join(workspaceRoot, relativePath);
            const content = await fs.readFile(absolutePath, 'utf-8');
            socket.emit('file-content', { path: relativePath, content });
        } catch (err) {
            socket.emit('file-error', `Could not read file: ${relativePath}`);
        }
    });

    socket.on('save-file', async ({ path: relativePath, content }) => {
        try {
            const absolutePath = path.join(workspaceRoot, relativePath);
            await fs.ensureDir(path.dirname(absolutePath));
            await fs.writeFile(absolutePath, content);
            socket.emit('save-success', relativePath);
        } catch (err) {
            socket.emit('file-error', `Could not save file: ${relativePath}`);
        }
    });

    socket.on('create-file', async ({ path: relativePath }) => {
        try {
            const absolutePath = path.join(workspaceRoot, relativePath || 'Untitled.txt');
            await fs.ensureDir(path.dirname(absolutePath));
            await fs.writeFile(absolutePath, '');
            socket.emit('save-success', relativePath);
        } catch (err) {
            socket.emit('file-error', `Could not create file: ${relativePath}`);
        }
    });

    // Support both event names for better compatibility
    socket.on('delete-file', async (path) => socket.emit('delete-item', path));
    socket.on('rename-file', async (data) => socket.emit('rename-item', data));

    socket.on('create-folder', async ({ path: relativePath }) => {
        try {
            const absolutePath = path.join(workspaceRoot, relativePath || 'New Folder');
            await fs.ensureDir(absolutePath);
            socket.emit('save-success', relativePath);
        } catch (err) {
            socket.emit('file-error', `Could not create folder: ${relativePath}`);
        }
    });

    socket.on('delete-item', async (relativePath) => {
        try {
            const absolutePath = path.join(workspaceRoot, relativePath);
            await fs.remove(absolutePath);
            socket.emit('item-deleted', relativePath);
        } catch (err) {
            socket.emit('file-error', `Could not delete: ${relativePath}`);
        }
    });

    socket.on('rename-item', async ({ oldPath, newPath }) => {
        try {
            const oldAbs = path.join(workspaceRoot, oldPath);
            const newAbs = path.join(workspaceRoot, newPath);
            await fs.move(oldAbs, newAbs);
            socket.emit('item-renamed', { oldPath, newPath });
        } catch (err) {
            socket.emit('file-error', `Could not rename: ${oldPath} to ${newPath}`);
        }
    });

    socket.on('search-files', async ({ query, caseSensitive, wholeWord }) => {
        try {
            const results = [];
            const searchDir = async (dir) => {
                const entries = await fs.readdir(dir);
                for (const entry of entries) {
                    if (entry === 'node_modules' || entry === '.git' || entry === '.gemini' || entry === 'dist') continue;
                    const fullPath = path.join(dir, entry);
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        await searchDir(fullPath);
                    } else {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const flags = wholeWord ? (caseSensitive ? '' : 'i') : (caseSensitive ? 'g' : 'gi');
                        const pattern = wholeWord ? `\\b${query}\\b` : query;
                        const regex = new RegExp(pattern, flags);
                        const matches = [...content.matchAll(regex)];
                        if (matches.length > 0) {
                            results.push({
                                path: path.relative(workspaceRoot, fullPath).replace(/\\/g, '/'),
                                count: matches.length,
                                previews: matches.slice(0, 5).map(m => {
                                    const start = Math.max(0, m.index - 20);
                                    const end = Math.min(content.length, m.index + m.length + 20);
                                    return content.substring(start, end).replace(/\n/g, ' ');
                                })
                            });
                        }
                    }
                }
            };
            await searchDir(workspaceRoot);
            socket.emit('search-results', results);
        } catch (err) {
            socket.emit('file-error', `Search failed: ${err.message}`);
        }
    });

    // --- Open Folder ---
    socket.on('open-folder', async (folderPath) => {
        const resolved = path.resolve(folderPath);
        if (await fs.pathExists(resolved)) {
            workspaceRoot = resolved;
            // restart watcher
            if (watcher) watcher.close();
            setupWatcher();
            // restart pty in new dir
            terminals.forEach(term => term.kill());
            terminals.clear();
            // send new files and path
            const files = await getFiles(workspaceRoot);
            socket.emit('root-path', workspaceRoot);
            socket.emit('files-list', { path: '.', files });
            socket.emit('folder-opened', workspaceRoot);
        } else {
            socket.emit('file-error', `Folder not found: ${folderPath}`);
        }
    });

    // --- Debounced File Watcher ---
    let debounceTimer = null;
    const debouncedRefresh = async () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const files = await getFiles(workspaceRoot);
            socket.emit('files-list', { path: '.', files });
        }, 300);
    };

    let watcher;
    const setupWatcher = () => {
        watcher = chokidar.watch(workspaceRoot, {
            ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/.git/**'],
            persistent: true,
            depth: 0,
            ignoreInitial: true
        });
        watcher.on('all', debouncedRefresh);
    };
    setupWatcher();

    socket.on('disconnect', () => {
        console.log('User disconnected');
        terminals.forEach(t => t.kill());
        terminals.clear();
        watcher.close();
        if (debounceTimer) clearTimeout(debounceTimer);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Antigravity Server running on port ${PORT}`);
});
