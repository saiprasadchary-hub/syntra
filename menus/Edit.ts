export const EditMenu = {
    name: 'Edit',
    items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => (window as any).AntigravityAPI.undo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => (window as any).AntigravityAPI.redo() },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => (window as any).AntigravityAPI.cut() },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => (window as any).AntigravityAPI.copy() },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => (window as any).AntigravityAPI.paste() },
        { type: 'separator' },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => (window as any).AntigravityAPI.find() },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => (window as any).AntigravityAPI.replace() },
    ]
};
