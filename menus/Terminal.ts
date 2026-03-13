export const TerminalMenu = {
    name: 'Terminal',
    items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => (window as any).AntigravityAPI.newTerminal() },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5', action: () => (window as any).AntigravityAPI.splitTerminal() },
        { type: 'separator' },
        { label: 'Run Task...', action: () => (window as any).AntigravityAPI.runTask() },
        { label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: () => (window as any).AntigravityAPI.runBuildTask() },
        { type: 'separator' },
        { label: 'Configure Tasks...', action: () => (window as any).AntigravityAPI.configureTasks() },
    ]
};
