export const SelectionMenu = {
    name: 'Selection',
    items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => (window as any).AntigravityAPI.selectAll() },
        { label: 'Expand Selection', shortcut: 'Shift+Alt+Right', action: () => (window as any).AntigravityAPI.selectAll() },
        { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', action: () => console.log('Shrink Selection') },
        { type: 'separator' },
        { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', action: () => (window as any).AntigravityAPI.copyLineDown() },
        { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: () => (window as any).AntigravityAPI.copyLineDown() },
        { label: 'Move Line Up', shortcut: 'Alt+Up', action: () => (window as any).AntigravityAPI.moveLineUp() },
        { label: 'Move Line Down', shortcut: 'Alt+Down', action: () => (window as any).AntigravityAPI.moveLineDown() },
    ]
};
