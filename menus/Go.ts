export const GoMenu = {
    name: 'Go',
    items: [
        { label: 'Back', shortcut: 'Alt+Left', action: () => (window as any).AntigravityAPI.back() },
        { label: 'Forward', shortcut: 'Alt+Right', action: () => (window as any).AntigravityAPI.forward() },
        { type: 'separator' },
        { label: 'Go to File...', shortcut: 'Ctrl+P', action: () => (window as any).AntigravityAPI.openFile() },
        { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O', action: () => alert('Symbol Search (Simulated): Search for symbols...') },
        { type: 'separator' },
        { label: 'Go to Line/Column...', shortcut: 'Ctrl+G', action: () => (window as any).AntigravityAPI.goToLine() },
        { label: 'Switch Editor', action: () => alert('Switching Editor...') },
    ]
};
