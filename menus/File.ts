export const FileMenu = {
    name: 'File',
    items: [
        { label: 'New Text File', shortcut: 'Ctrl+N', action: () => (window as any).AntigravityAPI.newFile() },
        { label: 'New File...', shortcut: 'Alt+Ctrl+N', action: () => {
            const name = prompt('File name:');
            if (name) (window as any).AntigravityAPI.newFile(name);
        }},
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: () => window.open(window.location.href) },
        { type: 'separator' },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: () => (window as any).AntigravityAPI.openFile() },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: () => (window as any).AntigravityAPI.openFolder() },
        { label: 'Open Recent', action: () => console.log('Open Recent') },
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => (window as any).AntigravityAPI.save() },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => (window as any).AntigravityAPI.saveAs() },
        { label: 'Save All', action: () => alert('All files saved!') },
        { type: 'separator' },
        { label: 'Preferences', shortcut: 'Ctrl+,', action: () => (window as any).AntigravityAPI.openSettings() },
        { type: 'separator' },
        { label: 'Close Editor', shortcut: 'Ctrl+F4', action: () => (window as any).AntigravityAPI.closeEditor() },
        { label: 'Close Window', shortcut: 'Ctrl+Shift+W', action: () => window.close() },
    ]
};
