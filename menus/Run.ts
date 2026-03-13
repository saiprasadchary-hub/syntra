export const RunMenu = {
    name: 'Run',
    items: [
        { label: 'Start Debugging', shortcut: 'F5', action: () => (window as any).AntigravityAPI.startDebug() },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: () => alert('Running Project...') },
        { label: 'Stop Debugging', shortcut: 'Shift+F5', action: () => (window as any).AntigravityAPI.stopDebug() },
        { label: 'Restart Debugging', shortcut: 'Ctrl+Shift+F5', action: () => { (window as any).AntigravityAPI.stopDebug(); (window as any).AntigravityAPI.startDebug(); } },
        { type: 'separator' },
        { label: 'New Breakpoint', action: () => alert('Breakpoint added.') },
        { label: 'Clear All Breakpoints', action: () => alert('All breakpoints cleared.') },
    ]
};
