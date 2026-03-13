import React, { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useIDE } from '../context/IDEContext';
import { getMonacoLanguage } from '../utils/langUtils';

const MONACO_DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'class', foreground: '4EC9B0' },
  ],
  colors: {
    'editor.background': '#0e0e12',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#1a1a25',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorLineNumber.foreground': '#404060',
    'editorLineNumber.activeForeground': '#858585',
    'editorGutter.background': '#0e0e12',
    'editorCursor.foreground': '#4a9eff',
    'editorWhitespace.foreground': '#3B3A32',
    'editorIndentGuide.background': '#1e1e28',
    'editorIndentGuide.activeBackground': '#3a3a50',
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#314365',
    'editorWidget.background': '#141418',
    'editorWidget.border': '#2a2a38',
    'input.background': '#1c1c24',
    'input.foreground': '#e8e8f0',
    'input.border': '#2a2a38',
    'focusBorder': '#4a9eff',
    'scrollbar.shadow': '#0000',
    'scrollbarSlider.background': '#2a2a38',
    'scrollbarSlider.hoverBackground': '#3a3a50',
    'scrollbarSlider.activeBackground': '#4a9eff80',
  },
};

const MONACO_LIGHT_THEME = {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#ffffff',
    'editor.lineHighlightBackground': '#f0f0f5',
    'editorLineNumber.foreground': '#a0a0b0',
    'editorCursor.foreground': '#4a9eff',
  },
};

const MONACO_MIDNIGHT_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'a78bfa', fontStyle: 'bold' },
    { token: 'string', foreground: 'e879f9' },
    { token: 'number', foreground: '818cf8' },
    { token: 'function', foreground: 'c084fc' },
    { token: 'type', foreground: '67e8f9' },
    { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#07070f',
    'editor.foreground': '#d8d8e8',
    'editor.lineHighlightBackground': '#10101c',
    'editor.selectionBackground': '#3b1f6b',
    'editorLineNumber.foreground': '#2a2a40',
    'editorLineNumber.activeForeground': '#6a6a90',
    'editorGutter.background': '#07070f',
    'editorCursor.foreground': '#8b5cf6',
    'editorWidget.background': '#0a0a18',
    'editorWidget.border': '#1e1e32',
    'focusBorder': '#8b5cf6',
  },
};

export default function MonacoEditorPane({ file, content, language }) {
  const { state, dispatch, notify } = useIDE();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const themeMap = {
    dark: 'antigravity-dark',
    light: 'antigravity-light',
    midnight: 'antigravity-midnight',
  };

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom themes
    monaco.editor.defineTheme('antigravity-dark', MONACO_DARK_THEME);
    monaco.editor.defineTheme('antigravity-light', MONACO_LIGHT_THEME);
    monaco.editor.defineTheme('antigravity-midnight', MONACO_MIDNIGHT_THEME);
    monaco.editor.setTheme(themeMap[state.theme] || 'antigravity-dark');

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      dispatch({ type: 'SAVE_FILE', file });
      notify(`Saved ${file}`, 'success');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
      dispatch({ type: 'TOGGLE_TERMINAL' });
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    });

    // Format on Shift+Alt+F
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
      notify('Document formatted', 'success');
    });

    // TypeScript/JavaScript completions enhancements
    if (language === 'javascript' || language === 'typescript') {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        allowJs: true,
      });
    }

    // Focus
    editor.focus();
  }

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(themeMap[state.theme] || 'antigravity-dark');
    }
  }, [state.theme]);

  // Update editor options
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: state.fontSize,
        wordWrap: state.wordWrap ? 'on' : 'off',
        minimap: { enabled: state.minimap },
      });
    }
  }, [state.fontSize, state.wordWrap, state.minimap]);

  const handleChange = useCallback((value) => {
    dispatch({ type: 'UPDATE_FILE_CONTENT', file, content: value });
    if (state.autoSave) {
      dispatch({ type: 'SAVE_FILE', file });
    }
  }, [file, state.autoSave, dispatch]);

  return (
    <Editor
      height="100%"
      language={getMonacoLanguage(language)}
      value={content}
      theme={themeMap[state.theme] || 'antigravity-dark'}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      loading={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: 'var(--text-muted)', gap: 10, flexDirection: 'column',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="spin">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Loading Monaco Editor…
        </div>
      }
      options={{
        fontSize: state.fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        wordWrap: state.wordWrap ? 'on' : 'off',
        minimap: { enabled: state.minimap, scale: 1 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: 'active', indentation: true },
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showVariables: true,
          showClasses: true,
          showInterfaces: true,
          showModules: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
        },
        quickSuggestions: { other: true, comments: false, strings: true },
        parameterHints: { enabled: true },
        codeLens: true,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        renderLineHighlight: 'all',
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        padding: { top: 12, bottom: 12 },
        lineNumbersMinChars: 4,
        glyphMargin: true,
        accessibilitySupport: 'off',
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
      }}
    />
  );
}
