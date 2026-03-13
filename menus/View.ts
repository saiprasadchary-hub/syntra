export const ViewMenu = {
    name: 'View',
    items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => (window as any).AntigravityAPI.openCommandPalette() },
        { label: 'Open View...', action: () => console.log('Open View') },
        { type: 'separator' },
        { label: 'Appearance', action: () => console.log('Appearance') },
        { label: 'Editor Layout', action: () => console.log('Editor Layout') },
        { type: 'separator' },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => (window as any).AntigravityAPI.toggleSidebar('Explorer') },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => (window as any).AntigravityAPI.toggleSidebar('Search') },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => (window as any).AntigravityAPI.toggleSidebar('Source') },
        { type: 'separator' },
        { label: 'Set Theme: Dark', action: () => (window as any).AntigravityAPI.setTheme('dark') },
        { label: 'Set Theme: Light', action: () => (window as any).AntigravityAPI.setTheme('light') },
        { label: 'Set Theme: Midnight', action: () => (window as any).AntigravityAPI.setTheme('midnight') },
        { type: 'separator' },
        { label: 'Output', shortcut: 'Ctrl+Shift+U', action: () => alert('Showing Output View...') },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: () => (window as any).AntigravityAPI.toggleTerminal() },
    ]
};
