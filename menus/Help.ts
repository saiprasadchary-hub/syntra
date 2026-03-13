export const HelpMenu = {
    name: 'Help',
    items: [
        { label: 'Welcome', action: () => alert('Welcome to Antigravity!') },
        { label: 'Documentation', action: () => window.open('https://code.visualstudio.com/docs', '_blank') },
        { label: 'Release Notes', action: () => alert('Check out the latest features in v1.0.0!') },
        { type: 'separator' },
        { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+S', action: () => alert('Showing Shortcuts Reference...') },
        { label: 'Introductory Videos', action: () => alert('Opening video tutorials...') },
        { type: 'separator' },
        { label: 'Report Issue', action: () => alert('Opening issue reporter...') },
        { label: 'About', action: () => (window as any).AntigravityAPI.about() },
    ]
};
