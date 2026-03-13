import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ─── Default Files ────────────────────────────────────────────────────────────
const DEFAULT_FILES = {
  'index.html': {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <h1>Hello, World!</h1>
    <p>Edit this file and see real-time preview →</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    unsaved: false,
  },
  'style.css': {
    name: 'style.css',
    language: 'css',
    content: `/* Global Styles */
body {
  font-family: 'Inter', system-ui, sans-serif;
  margin: 0;
  padding: 40px;
  background: linear-gradient(135deg, #0f0f1a, #1a0f2e);
  min-height: 100vh;
  color: #e8e8f0;
}

#app {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 60px 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(20px);
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #4a9eff, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}

p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
  line-height: 1.6;
}`,
    unsaved: false,
  },
  'app.js': {
    name: 'app.js',
    language: 'javascript',
    content: `// app.js - Main application script
const app = document.getElementById('app');

// Animate in on load
app.style.opacity = '0';
app.style.transform = 'translateY(20px)';
app.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    app.style.opacity = '1';
    app.style.transform = 'translateY(0)';
  });
});

console.log('Welcome to Antigravity IDE! 🚀');`,
    unsaved: false,
  },
  'main.py': {
    name: 'main.py',
    language: 'python',
    content: `#!/usr/bin/env python3
"""
Antigravity IDE - Python Demo
A simple Python script to demonstrate syntax highlighting
"""

from typing import List, Dict
import math

def fibonacci(n: int) -> List[int]:
    """Generate Fibonacci sequence up to n terms."""
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    return sequence[:n]

class DataProcessor:
    """A simple data processing class."""
    
    def __init__(self, data: List[float]):
        self.data = data
    
    @property
    def mean(self) -> float:
        return sum(self.data) / len(self.data)
    
    @property
    def std_dev(self) -> float:
        mean = self.mean
        variance = sum((x - mean) ** 2 for x in self.data) / len(self.data)
        return math.sqrt(variance)
    
    def normalize(self) -> List[float]:
        mean, std = self.mean, self.std_dev
        return [(x - mean) / std for x in self.data]

if __name__ == "__main__":
    # Generate Fibonacci numbers
    fib = fibonacci(10)
    print(f"Fibonacci: {fib}")
    
    # Process some data
    data = DataProcessor([1.2, 3.4, 5.6, 7.8, 9.0])
    print(f"Mean: {data.mean:.2f}")
    print(f"StdDev: {data.std_dev:.2f}")
    print(f"Normalized: {[f'{x:.3f}' for x in data.normalize()]}")
`,
    unsaved: false,
  },
  'README.md': {
    name: 'README.md',
    language: 'markdown',
    content: `# Antigravity IDE

A modern, browser-based IDE powered by **Monaco Editor**.

## Features

- 🎨 **Monaco Editor** — Same editor as VS Code
- 🔌 **Extension Marketplace** — Browse Open VSX extensions
- 🌐 **Real-time Preview** — Live HTML/CSS/JS preview
- 🖥️ **Integrated Terminal** — Command-line interface
- 🌙 **Multiple Themes** — Dark, Light, Midnight
- ⚡ **IntelliSense** — Auto-completion & error detection

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+P\` | Quick File Open |
| \`Ctrl+Shift+P\` | Command Palette |
| \`Ctrl+\`\` | Toggle Terminal |
| \`Ctrl+B\` | Toggle Sidebar |
| \`Ctrl+S\` | Save File |
| \`Ctrl+Shift+F\` | Search in Files |

## Getting Started

1. Browse files in the **Explorer** panel
2. Click any file to open it in the editor
3. Edit code with full **IntelliSense** support
4. Toggle the **Live Preview** for HTML files
5. Browse **Extensions** from Open VSX

Happy coding! 🚀
`,
    unsaved: false,
  },
  'tsconfig.json': {
    name: 'tsconfig.json',
    language: 'json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}`,
    unsaved: false,
  },
};

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  files: DEFAULT_FILES,
  openTabs: ['index.html', 'style.css', 'app.js'],
  activeTab: 'index.html',
  sidebarVisible: true,
  sidebarView: 'explorer', // explorer|search|git|extensions|settings
  rightSidebarVisible: false,
  rightSidebarView: 'settings',
  terminalVisible: false,
  terminalPanel: 'terminal', // terminal|problems|debug
  commandPaletteOpen: false,
  theme: 'dark',
  fontSize: 14,
  wordWrap: true,
  minimap: true,
  autoSave: false,
  previewVisible: false,
  notifications: [],
  extensions: [
    // ── Languages ──
    { id: 'ms-python.python',           name: 'Python',                      category: 'Languages',      description: 'IntelliSense (Pylance), linting, debugging (multi-threaded, remote), Jupyter Notebooks, code formatting, refactoring, unit tests, and more.', author: 'Microsoft',           iconColor: '#3776ab', iconText: 'Py', installed: false, downloads: '72.4M', rating: 4.9 },
    { id: 'ms-vscode.cpptools',         name: 'C/C++',                       category: 'Languages',      description: 'C/C++ IntelliSense, debugging, and code browsing. Supports GCC, Clang, and MSVC compilers.', author: 'Microsoft',           iconColor: '#00549e', iconText: 'C++', installed: false, downloads: '55.1M', rating: 4.7 },
    { id: 'ms-vscode.vscode-typescript-next', name: 'TypeScript Nightly',   category: 'Languages',      description: 'Enable the latest TypeScript nightly build for cutting-edge features and bug fixes.', author: 'Microsoft',           iconColor: '#007acc', iconText: 'TS',  installed: true,  downloads: '2.1M',  rating: 4.6 },
    { id: 'rust-lang.rust-analyzer',    name: 'rust-analyzer',               category: 'Languages',      description: 'Rust language support: IntelliSense, inline type hints, go-to-definition, code actions, and integrated debugging.', author: 'rust-lang',           iconColor: '#ce422b', iconText: '🦀', installed: false, downloads: '19.3M', rating: 4.8 },
    { id: 'golang.go',                  name: 'Go',                          category: 'Languages',      description: 'Rich Go language support — IntelliSense, code navigation, symbol search, bracket matching, snippets, and many more.', author: 'Go Team at Google',   iconColor: '#00add8', iconText: 'Go',  installed: false, downloads: '12.8M', rating: 4.8 },
    { id: 'ms-dotnettools.csharp',      name: 'C#',                          category: 'Languages',      description: 'Base language support for C#. Debugging support for .NET Core (CoreCLR). Limited support for .NET Framework (on Windows).', author: 'Microsoft',           iconColor: '#9b4993', iconText: 'C#',  installed: false, downloads: '29.2M', rating: 4.7 },
    { id: 'redhat.java',                name: 'Language Support for Java',   category: 'Languages',      description: 'Java IntelliSense, code formatting, refactoring, code snippets for Maven, Gradle, Spring Boot projects.', author: 'Red Hat',             iconColor: '#f89820', iconText: 'Jv',  installed: false, downloads: '21.7M', rating: 4.6 },
    { id: 'rebornix.ruby',              name: 'Ruby',                        category: 'Languages',      description: 'Ruby language support with IntelliSense, code navigation, snippets, and debugging via Ruby Debug protocol.', author: 'Peng Lv',             iconColor: '#cc342d', iconText: 'Rb',  installed: false, downloads: '3.4M',  rating: 4.4 },
    { id: 'dart-code.flutter',          name: 'Flutter',                     category: 'Languages',      description: 'Flutter support and debugger for Visual Studio Code. Includes hot reload, widget inspector, and Dart IntelliSense.', author: 'Dart Code',          iconColor: '#54c5f8', iconText: 'Fl',  installed: false, downloads: '14.6M', rating: 4.9 },
    { id: 'ms-vscode.powershell',       name: 'PowerShell',                  category: 'Languages',      description: 'Develop PowerShell modules, commands and scripts in VS Code. Includes IntelliSense, Pester testing, PSScriptAnalyzer.', author: 'Microsoft',           iconColor: '#012456', iconText: 'PS',  installed: false, downloads: '7.3M',  rating: 4.6 },
    { id: 'scala-lang.scala',           name: 'Scala (Metals)',               category: 'Languages',      description: 'Scala language server with IntelliSense, type checking, go-to-definition, find-references, and build tool integration.', author: 'Scalameta',          iconColor: '#dc322f', iconText: 'Sc',  installed: false, downloads: '2.1M',  rating: 4.5 },
    { id: 'sumneko.lua',                name: 'Lua',                         category: 'Languages',      description: 'Lua language support: IntelliSense, code completion, real-time diagnostics, code formatting.', author: 'sumneko',             iconColor: '#000083', iconText: 'Lu',  installed: false, downloads: '8.8M',  rating: 4.8 },
    { id: 'ms-vscode.cmake-tools',      name: 'CMake Tools',                 category: 'Languages',      description: 'Extended CMake support for Visual Studio Code. Configure, build, run, and debug CMake-based projects.', author: 'Microsoft',           iconColor: '#064f8c', iconText: 'CM',  installed: false, downloads: '5.9M',  rating: 4.5 },
    { id: 'ms-vscode.hexeditor',        name: 'Hex Editor',                  category: 'Languages',      description: 'Allows viewing and editing files in their hexadecimal representation. Useful for binary files.', author: 'Microsoft',           iconColor: '#68217a', iconText: '0x',  installed: false, downloads: '1.8M',  rating: 4.5 },
    { id: 'ms-toolsai.jupyter',         name: 'Jupyter',                     category: 'Languages',      description: 'Jupyter notebook support, interactive programming and computing with Python, R, and other kernels.', author: 'Microsoft',           iconColor: '#f37726', iconText: 'Jn',  installed: false, downloads: '42.1M', rating: 4.7 },
    { id: 'prisma.prisma',              name: 'Prisma',                      category: 'Languages',      description: 'Adds syntax highlighting, formatting, auto-completion, jump-to-definition and linting for .prisma files.', author: 'Prisma',              iconColor: '#0c344b', iconText: '◈',   installed: false, downloads: '3.6M',  rating: 4.9 },
    { id: 'graphql.vscode-graphql',     name: 'GraphQL: Language Feature Support', category: 'Languages', description: 'GraphQL language support: IntelliSense, validation, formatting, suggestions, and inline documentation.', author: 'GraphQL Foundation',  iconColor: '#e535ab', iconText: 'GQL', installed: false, downloads: '2.4M',  rating: 4.6 },
    { id: 'bbenoist.nix',               name: 'Nix',                         category: 'Languages',      description: 'Nix expression language syntax highlighting for VS Code.', author: 'bbenoist',            iconColor: '#5277c3', iconText: 'Nix', installed: false, downloads: '0.9M',  rating: 4.3 },
    { id: 'ms-vscode.vscode-speech',    name: 'VS Code Speech',              category: 'Languages',      description: 'Provides speech-to-text integration in VS Code for voice-driven coding.', author: 'Microsoft',           iconColor: '#007acc', iconText: '🎙',  installed: false, downloads: '1.2M',  rating: 4.4 },
    { id: 'ms-vscode.swift',            name: 'Swift',                       category: 'Languages',      description: 'Rich language support for the Swift programming language on macOS and Linux.', author: 'Swift Server Work Group', iconColor: '#f05138', iconText: 'Sw',  installed: false, downloads: '2.9M',  rating: 4.7 },

    // ── Formatters & Linters ──
    { id: 'esbenp.prettier-vscode',     name: 'Prettier — Code Formatter',   category: 'Formatters',     description: 'Opinionated code formatter. Enforces a consistent style by parsing your code and re-printing it with its rules that take the maximum line length into account.', author: 'Prettier',            iconColor: '#f7b93e', iconText: 'P',   installed: false, downloads: '58.7M', rating: 4.8 },
    { id: 'dbaeumer.vscode-eslint',     name: 'ESLint',                      category: 'Formatters',     description: 'Integrates ESLint JavaScript into VS Code. Highlights errors, applies fixes automatically, and integrates with Prettier.', author: 'Microsoft',           iconColor: '#4b32c3', iconText: 'ES',  installed: true,  downloads: '61.4M', rating: 4.7 },
    { id: 'stylelint.vscode-stylelint', name: 'Stylelint',                   category: 'Formatters',     description: 'A mighty, modern linter for CSS, SCSS, Sass, Less, and SugarSS. Enforces CSS coding conventions.', author: 'Stylelint',           iconColor: '#263238', iconText: 'SL',  installed: false, downloads: '4.2M',  rating: 4.5 },
    { id: 'EditorConfig.EditorConfig',  name: 'EditorConfig',                category: 'Formatters',     description: 'EditorConfig helps maintain consistent coding styles between different editors and IDEs across teams.', author: 'EditorConfig',        iconColor: '#f09748', iconText: 'EC',  installed: false, downloads: '8.6M',  rating: 4.6 },
    { id: 'streetsidesoftware.code-spell-checker', name: 'Code Spell Checker', category: 'Formatters',  description: 'A basic spell checker that works well with code and documents. Catches common spelling errors in camelCase, snake_case identifiers.', author: 'Street Side Software', iconColor: '#3794ff', iconText: '✓',   installed: false, downloads: '11.3M', rating: 4.8 },
    { id: 'ms-vscode.vscode-json',      name: 'JSON Language Features',      category: 'Formatters',     description: 'Rich JSON editing experience with schema-based IntelliSense, hover, validation, formatting, and more.', author: 'Microsoft',           iconColor: '#fbbf24', iconText: '{}',  installed: true,  downloads: '14.2M', rating: 4.8 },
    { id: 'tamasfe.even-better-toml',   name: 'Even Better TOML',            category: 'Formatters',     description: 'Fully-featured TOML support: syntax highlighting, validation, formatting, folding, and document symbols.', author: 'tamasfe',             iconColor: '#9c4121', iconText: 'TM',  installed: false, downloads: '5.1M',  rating: 4.8 },

    // ── Themes ──
    { id: 'GitHub.github-vscode-theme', name: 'GitHub Theme',                category: 'Themes',         description: 'GitHub\'s VS Code themes: GitHub Dark, GitHub Dark Colorblind, GitHub Dark Dimmed, GitHub Dark High Contrast, GitHub Light.', author: 'GitHub',              iconColor: '#1f2328', iconText: '⚫', installed: false, downloads: '10.2M', rating: 4.8 },
    { id: 'dracula-theme.theme-dracula', name: 'Dracula Official',           category: 'Themes',         description: 'Official Dracula Theme. A dark theme with purple-tinted syntax highlighting for over 300 applications.', author: 'Dracula Theme',       iconColor: '#282a36', iconText: '🧛', installed: false, downloads: '7.4M',  rating: 4.9 },
    { id: 'zhuangtongfa.material-theme', name: 'One Dark Pro',               category: 'Themes',         description: 'Atom\'s iconic One Dark theme, converted for Visual Studio Code. The most downloaded VS Code theme!', author: 'binaryify',           iconColor: '#282c34', iconText: '◑',  installed: false, downloads: '13.1M', rating: 4.8 },
    { id: 'arcticicestudio.nord-visual-studio-code', name: 'Nord',           category: 'Themes',         description: 'An arctic, north-bluish clean and elegant Visual Studio Code theme.', author: 'arcticicestudio',     iconColor: '#2e3440', iconText: '❄',  installed: false, downloads: '3.5M',  rating: 4.8 },
    { id: 'leveluptutorials.level-up-vscode-theme', name: 'Level Up — New Features & Fixes', category: 'Themes', description: 'A minimal, clean syntax & UI theme for VS Code, inspired by Scott Tolinski\'s Level Up Tutorials.', author: 'Level Up Tutorials',  iconColor: '#282a36', iconText: '⬆',  installed: false, downloads: '0.6M',  rating: 4.5 },
    { id: 'catppuccin.catppuccin-vsc',  name: 'Catppuccin for VSCode',       category: 'Themes',         description: 'Soothing pastel theme for the high-spirited! Includes Latte, Frappé, Macchiato, and Mocha variants.', author: 'Catppuccin',          iconColor: '#1e1e2e', iconText: '🐱', installed: false, downloads: '4.8M',  rating: 4.9 },
    { id: 'monokai.theme-monokai-pro',  name: 'Monokai Pro',                 category: 'Themes',         description: 'Professional theme and matching icons, from the author of original Monokai color scheme.', author: 'monokai',             iconColor: '#2d2a2e', iconText: 'M',   installed: false, downloads: '4.2M',  rating: 4.7 },
    { id: 'RobbOwen.synthwave-vscode',  name: 'SynthWave \'84',              category: 'Themes',         description: 'A dark, neon-lit theme inspired by the music and visuals of the \'80s. Includes glow effects!', author: 'Robb Owen',           iconColor: '#2a2139', iconText: '🌅', installed: false, downloads: '4.9M',  rating: 4.9 },
    { id: 'teabyii.ayu',                name: 'Ayu',                         category: 'Themes',         description: 'A simple theme with bright colors and comes in three versions — dark, light and mirage.', author: 'teabyii',             iconColor: '#0f1419', iconText: '☀',  installed: false, downloads: '2.8M',  rating: 4.7 },
    { id: 'PKief.material-icon-theme',  name: 'Material Icon Theme',         category: 'Themes',         description: 'Material Design Icons for Visual Studio Code. Over 1000 icons, neatly organized.', author: 'Philipp Kief',        iconColor: '#2196f3', iconText: '◆',  installed: false, downloads: '19.4M', rating: 4.9 },
    { id: 'vscode-icons-team.vscode-icons', name: 'VSCode Icons',           category: 'Themes',         description: 'Icons for Visual Studio Code — supports 1000+ unique file types and folder icons.', author: 'VSCode Icons Team',   iconColor: '#f5da55', iconText: '⚡', installed: false, downloads: '9.1M',  rating: 4.8 },
    { id: 'antfu.icons-carbon',         name: 'Carbon Product Icons',        category: 'Themes',         description: 'IBM Carbon Design product icons for VS Code — clean, modern line-style icons.', author: 'antfu',               iconColor: '#161616', iconText: '🔹', installed: false, downloads: '0.8M',  rating: 4.7 },

    // ── Git & SCM ──
    { id: 'eamodio.gitlens',            name: 'GitLens — Git supercharged',  category: 'SCM',            description: 'Supercharge Git within VS Code — visualize code authorship via Git blame annotations and CodeLens, seamlessly navigate and explore Git repositories, compare.', author: 'GitKraken',           iconColor: '#e24329', iconText: 'GL',  installed: false, downloads: '43.5M', rating: 4.8 },
    { id: 'github.vscode-pull-request-github', name: 'GitHub Pull Requests', category: 'SCM',           description: 'Review and manage GitHub pull requests and issues directly in VS Code without leaving the editor.', author: 'GitHub',              iconColor: '#1f2328', iconText: 'PR',  installed: false, downloads: '11.2M', rating: 4.6 },
    { id: 'donjayamanne.githistory',    name: 'Git History',                 category: 'SCM',            description: 'View git log, file history, compare branches or commits, and cherry-pick commits right in VS Code.', author: 'Don Jayamanne',       iconColor: '#f05133', iconText: 'GH',  installed: false, downloads: '8.3M',  rating: 4.6 },
    { id: 'mhutchie.git-graph',         name: 'Git Graph',                   category: 'SCM',            description: 'View a Git Graph of your repository, perform Git actions from the graph, and compare commits.', author: 'mhutchie',            iconColor: '#f14e32', iconText: 'GG',  installed: false, downloads: '8.8M',  rating: 4.9 },
    { id: 'codezombiech.gitignore',     name: 'gitignore',                   category: 'SCM',            description: 'Language support for .gitignore files. Quickly add .gitignore templates from github/gitignore.', author: 'CodeZombie',          iconColor: '#f05133', iconText: '.gi', installed: false, downloads: '1.4M',  rating: 4.4 },

    // ── AI & Productivity ──
    { id: 'github.copilot',             name: 'GitHub Copilot',              category: 'AI',             description: 'Your AI pair programmer — suggests whole lines and functions in real time, right in your editor, from GitHub Copilot.', author: 'GitHub',              iconColor: '#24292f', iconText: '✦',  installed: false, downloads: '89.1M', rating: 4.9 },
    { id: 'github.copilot-chat',        name: 'GitHub Copilot Chat',         category: 'AI',             description: 'AI chat features powered by Copilot — ask questions about your codebase or get help writing code, all within VS Code.', author: 'GitHub',              iconColor: '#24292f', iconText: '💬', installed: false, downloads: '42.3M', rating: 4.8 },
    { id: 'continue.continue',          name: 'Continue',                    category: 'AI',             description: 'Open-source AI code assistant — use local models (Ollama, LM Studio) or cloud APIs (Claude, GPT-4) in your IDE.', author: 'Continue Dev',        iconColor: '#1d4ed8', iconText: '→',  installed: false, downloads: '2.1M',  rating: 4.7 },
    { id: 'Codeium.codeium',            name: 'Codeium — AI Autocomplete',   category: 'AI',             description: 'Free AI-powered code acceleration: autocomplete, natural language search, chat, and command explanations.', author: 'Codeium',             iconColor: '#08a045', iconText: '◎',  installed: false, downloads: '5.8M',  rating: 4.8 },
    { id: 'tabnine.tabnine-vscode',     name: 'Tabnine AI — Autocomplete',   category: 'AI',             description: 'AI-based code completion tool trained on code. Works with all major languages and IDEs.', author: 'TabNine',             iconColor: '#4a90e2', iconText: 'T',   installed: false, downloads: '9.2M',  rating: 4.6 },

    // ── Snippets ──
    { id: 'dsznajder.es7-react-js-snippets', name: 'ES7+ React/Redux/React-Native snippets', category: 'Snippets', description: 'Simple extensions for React, Redux and Graphql in JS/TS with ES7+ syntax: snippets & shortcuts for everyday use.', author: 'dsznajder',           iconColor: '#61dafb', iconText: '⚛',  installed: false, downloads: '17.3M', rating: 4.7 },
    { id: 'xabikos.JavaScriptSnippets', name: 'JavaScript (ES6) code snippets', category: 'Snippets',   description: 'Code snippets for JavaScript in ES6 syntax — console, import/export, class, arrow functions, and more.', author: 'xabikos',             iconColor: '#f7df1e', iconText: 'ES6', installed: false, downloads: '14.1M', rating: 4.6 },
    { id: 'ariseno.vscode-mysql-snippet', name: 'MySQL Snippets',            category: 'Snippets',       description: 'MySQL snippets for SELECT, INSERT, UPDATE, DELETE, JOIN, and many more query patterns.', author: 'ariseno',             iconColor: '#4479a1', iconText: 'SQL', installed: false, downloads: '0.5M',  rating: 4.3 },

    // ── Debuggers ──
    { id: 'ms-vscode.js-debug',         name: 'JavaScript Debugger',         category: 'Debuggers',      description: 'A debugger for Node.js programs and Chrome/Edge browsers. Supports breakpoints, call stacks, watch expressions.', author: 'Microsoft',           iconColor: '#f7df1e', iconText: '🐞', installed: true,  downloads: '31.2M', rating: 4.7 },
    { id: 'ms-vscode.python-debugger',  name: 'Python Debugger',             category: 'Debuggers',      description: 'Python extension for Visual Studio Code — full debugging, breakpoints, call stacks, multi-threaded support.', author: 'Microsoft',           iconColor: '#3776ab', iconText: 'Py🐞', installed: false, downloads: '8.4M', rating: 4.7 },

    // ── Remote Development ──
    { id: 'ms-vscode.remote-containers', name: 'Dev Containers',            category: 'Remote',          description: 'Open any folder or repository inside a Docker container and take advantage of VS Code\'s full feature set.', author: 'Microsoft',           iconColor: '#2496ed', iconText: 'DC',  installed: false, downloads: '25.1M', rating: 4.7 },
    { id: 'ms-vscode-remote.remote-wsl', name: 'WSL',                       category: 'Remote',          description: 'Open any folder in the Windows Subsystem for Linux (WSL) and take advantage of VS Code\'s full feature set.', author: 'Microsoft',           iconColor: '#e95420', iconText: 'WSL', installed: false, downloads: '18.7M', rating: 4.8 },
    { id: 'ms-vscode-remote.remote-ssh', name: 'Remote — SSH',              category: 'Remote',          description: 'Open any folder on a remote machine using SSH and take advantage of VS Code\'s full feature set.', author: 'Microsoft',           iconColor: '#007acc', iconText: 'SSH', installed: false, downloads: '22.4M', rating: 4.7 },
    { id: 'ms-vscode.remote-explorer',  name: 'Remote Explorer',             category: 'Remote',          description: 'View remote machines for Remote - SSH and Dev Containers. Manage tunnels and explore remote environments.', author: 'Microsoft',           iconColor: '#007acc', iconText: 'RE',  installed: false, downloads: '16.3M', rating: 4.6 },

    // ── Web ──
    { id: 'ritwickdey.LiveServer',      name: 'Live Server',                 category: 'Web',             description: 'Launch a local development server with live reload feature for static and dynamic pages.', author: 'Ritwick Dey',         iconColor: '#4296EB', iconText: '↗',  installed: false, downloads: '55.2M', rating: 4.8 },
    { id: 'bradlc.vscode-tailwindcss',  name: 'Tailwind CSS IntelliSense',   category: 'Web',             description: 'Intelligent Tailwind CSS tooling: autocomplete, linting, hover previews, and syntax highlighting.', author: 'Tailwind Labs',       iconColor: '#38bdf8', iconText: '💨', installed: false, downloads: '32.4M', rating: 4.9 },
    { id: 'formulahendry.auto-close-tag', name: 'Auto Close Tag',            category: 'Web',             description: 'Automatically add HTML/XML close tag, the same as Visual Studio IDE or Sublime Text does.', author: 'Jun Han',             iconColor: '#e34c26', iconText: '</>', installed: false, downloads: '9.8M',  rating: 4.6 },
    { id: 'formulahendry.auto-rename-tag', name: 'Auto Rename Tag',          category: 'Web',             description: 'Auto rename paired HTML/XML tag — rename the opening tag and the corresponding closing tag updates too.', author: 'Jun Han',             iconColor: '#e34c26', iconText: '✎',  installed: false, downloads: '13.2M', rating: 4.7 },
    { id: 'ecmel.vscode-html-css',      name: 'HTML CSS Support',            category: 'Web',             description: 'CSS class name completion for the HTML class attribute based on the definitions found in your workspace.', author: 'ecmel',               iconColor: '#1572b6', iconText: 'HC',  installed: false, downloads: '10.3M', rating: 4.6 },
    { id: 'pranaygp.vscode-css-peek',   name: 'CSS Peek',                    category: 'Web',             description: 'Allow peeking to CSS ID and class strings as definitions from HTML files to CSS via Peek and Go To Definition.', author: 'pranaygp',           iconColor: '#1572b6', iconText: 'CP',  installed: false, downloads: '4.7M',  rating: 4.6 },
    { id: 'ms-vscode.vscode-node-azure-pack', name: 'Azure Tools',          category: 'Web',             description: 'Get web site hosting, SQL and MongoDB data, Docker Containers, Serverless Functions and more with the Azure SDKs.', author: 'Microsoft',           iconColor: '#0078d4', iconText: 'Az',  installed: false, downloads: '3.1M',  rating: 4.5 },

    // ── Keymaps ──
    { id: 'ms-vscode.atom-keybindings', name: 'Atom Keymap',                 category: 'Keymaps',        description: 'Popular Atom keybindings for Visual Studio Code. Brings familiar shortcuts from Atom into VS Code.', author: 'Microsoft',           iconColor: '#66595c', iconText: 'A',   installed: false, downloads: '1.2M',  rating: 4.3 },
    { id: 'ms-vscode.sublime-keybindings', name: 'Sublime Text Keymap',     category: 'Keymaps',        description: 'Popular Sublime Text keybindings for Visual Studio Code. Brings over popular key bindings from Sublime Text.', author: 'Microsoft',           iconColor: '#ff9800', iconText: 'ST',  installed: false, downloads: '2.8M',  rating: 4.4 },
    { id: 'K--Vu.vscode-vim',           name: 'Vim',                         category: 'Keymaps',        description: 'Vim emulation for Visual Studio Code. Full Vim mode including insert, normal, visual, and command modes.', author: 'vscodevim',           iconColor: '#019733', iconText: 'Vim', installed: false, downloads: '10.7M', rating: 4.5 },
    { id: 'ms-vscode.notepadplusplus-keybindings', name: 'Notepad++ Keymap', category: 'Keymaps',       description: 'Popular Notepad++ keybindings for VS Code — find, replace, manage sessions, and more familiar shortcuts.', author: 'Microsoft',           iconColor: '#90e59a', iconText: 'N++', installed: false, downloads: '0.7M',  rating: 4.2 },

    // ── Tools & Utilities ──
    { id: 'formulahendry.code-runner',  name: 'Code Runner',                 category: 'Tools',          description: 'Run code snippet or code file for C, C++, Java, JS, PHP, Python, Perl, Ruby, Go, Lua, Groovy, PowerShell, and more.', author: 'Jun Han',             iconColor: '#ea5d4a', iconText: '▶',  installed: false, downloads: '38.1M', rating: 4.7 },
    { id: 'christian-kohler.path-intellisense', name: 'Path IntelliSense',   category: 'Tools',          description: 'Visual Studio Code plugin that auto-completes filenames. Works across all project types.', author: 'Christian Kohler',    iconColor: '#19a7ce', iconText: '📁', installed: false, downloads: '14.6M', rating: 4.8 },
    { id: 'ms-vscode.docker',           name: 'Docker',                      category: 'Tools',          description: 'Makes it easy to create, manage, and debug containerized applications. Build, push, and run Docker images.', author: 'Microsoft',           iconColor: '#0db7ed', iconText: '🐳', installed: false, downloads: '21.3M', rating: 4.7 },
    { id: 'ms-kubernetes-tools.vscode-kubernetes-tools', name: 'Kubernetes', category: 'Tools',          description: 'Develop, deploy and debug Kubernetes applications in VS Code. YAML IntelliSense, Helm chart support.', author: 'Microsoft',           iconColor: '#326ce5', iconText: '☸',  installed: false, downloads: '6.4M',  rating: 4.6 },
    { id: 'rangav.vscode-thunder-client', name: 'Thunder Client',            category: 'Tools',          description: 'Lightweight REST API Client for VS Code — test APIs, manage collections, and inspect responses without leaving the editor.', author: 'Ranga Vadhineni',     iconColor: '#4285f4', iconText: '⚡', installed: false, downloads: '5.7M',  rating: 4.8 },
    { id: 'humao.rest-client',           name: 'REST Client',                category: 'Tools',          description: 'REST Client allows you to send HTTP request and view the response in Visual Studio Code directly.', author: 'Huachao Mao',         iconColor: '#3b9ddd', iconText: 'RC',  installed: false, downloads: '6.9M',  rating: 4.8 },
    { id: 'ms-azuretools.vscode-azurefunctions', name: 'Azure Functions',   category: 'Tools',          description: 'Create, debug, manage and deploy Azure Functions directly from VS Code using this extension.', author: 'Microsoft',           iconColor: '#0078d4', iconText: 'fn',  installed: false, downloads: '3.2M',  rating: 4.5 },
    { id: 'Gruntfuggly.todo-tree',      name: 'Todo Tree',                   category: 'Tools',          description: 'Show TODO, FIXME, HACK etc. comment tags in a tree view in the activity bar. Provides highlighting.', author: 'Gruntfuggly',         iconColor: '#ffd700', iconText: '✅', installed: false, downloads: '7.3M',  rating: 4.8 },
    { id: 'oderwat.indent-rainbow',     name: 'Indent Rainbow',              category: 'Tools',          description: 'Makes indentation easier to read by colorizing indentation in front of your text alternating four different colors.', author: 'oderwat',             iconColor: '#e6a817', iconText: '🌈', installed: false, downloads: '8.5M',  rating: 4.7 },
    { id: 'aaron-bond.better-comments', name: 'Better Comments',             category: 'Tools',          description: 'Improve your code commenting by creating more human-friendly comments with alerts, queries, TODOs, and highlights.', author: 'Aaron Bond',          iconColor: '#3793ef', iconText: '💬', installed: false, downloads: '5.2M',  rating: 4.8 },
    { id: 'usernamehw.errorlens',       name: 'Error Lens',                  category: 'Tools',          description: 'Improve highlighting of errors, warnings and other language diagnostics. Shows them inline in the editor.', author: 'usernamehw',          iconColor: '#f57535', iconText: '🔴', installed: false, downloads: '8.9M',  rating: 4.9 },
    { id: 'wix.vscode-import-cost',     name: 'Import Cost',                 category: 'Tools',          description: 'Display import/require package size in the editor. Helps identify heavy dependencies in real time.', author: 'Wix',                 iconColor: '#0c6efc', iconText: '📦', installed: false, downloads: '4.0M',  rating: 4.5 },
    { id: 'naumovs.color-highlight',    name: 'Color Highlight',             category: 'Tools',          description: 'Highlight web colors in your editor — works for hex, rgb, hsl, and CSS named colors.', author: 'Sergii Naumov',       iconColor: '#ff6ec7', iconText: '🎨', installed: false, downloads: '7.8M',  rating: 4.7 },
    { id: 'wayou.vscode-todo-highlight', name: 'TODO Highlight',             category: 'Tools',          description: 'Highlight TODO, FIXME and any keywords, annotations in your code to help you notice them.', author: 'Wayou Liu',           iconColor: '#ffcc00', iconText: '📌', installed: false, downloads: '6.1M',  rating: 4.6 },
    { id: 'streetsidesoftware.code-spell-checker', name: 'Code Spell Checker', category: 'Tools',       description: 'A basic spell checker that works well with code and documents, catching common spelling errors.', author: 'Street Side Software', iconColor: '#3794ff', iconText: '✓',   installed: false, downloads: '11.3M', rating: 4.8 },
    { id: 'TabNine.tabnine-vscode',     name: 'Tabnine AI Autocomplete',     category: 'AI',             description: 'AI-powered code completion tool that works with all major programming languages and IDEs.', author: 'TabNine',             iconColor: '#4a90e2', iconText: 'T',   installed: false, downloads: '9.2M',  rating: 4.6 },
    { id: 'ms-vscode.live-server',      name: 'Live Preview',                category: 'Web',             description: 'Hosts a local server in your workspace for you to preview your webpages on. Supports hot reload and multi-root workspaces.', author: 'Microsoft',           iconColor: '#007acc', iconText: '🌐', installed: false, downloads: '6.1M',  rating: 4.7 },
    { id: 'hediet.vscode-drawio',       name: 'Draw.io Integration',         category: 'Tools',          description: 'This unofficial extension integrates Draw.io into VS Code — edit diagrams directly within the editor.', author: 'Henning Dieterichs',  iconColor: '#f08705', iconText: '🗂',  installed: false, downloads: '3.4M',  rating: 4.8 },
    { id: 'ms-playwright.playwright',   name: 'Playwright Test for VS Code', category: 'Tools',          description: 'Run Playwright tests right from VS Code. Pick up tests, run, debug, generate tests with Codegen.', author: 'Microsoft',           iconColor: '#45ba4b', iconText: '🎭', installed: false, downloads: '2.9M',  rating: 4.8 },
    { id: 'yzhang.markdown-all-in-one', name: 'Markdown All in One',         category: 'Tools',          description: 'All you need for Markdown: keyboard shortcuts, table of contents, auto preview, math, list editing.', author: 'Yu Zhang',            iconColor: '#083fa1', iconText: 'MD',  installed: false, downloads: '9.8M',  rating: 4.8 },
    { id: 'ms-vscode-remote.vscode-remote-extensionpack', name: 'Remote Development', category: 'Remote', description: 'An extension pack that lets you open any folder in a container, on a remote machine, or in WSL.', author: 'Microsoft',           iconColor: '#007acc', iconText: '⚙',  installed: false, downloads: '18.4M', rating: 4.8 },
    { id: 'shd101wyy.markdown-preview-enhanced', name: 'Markdown Preview Enhanced', category: 'Tools',  description: 'Markdown Preview Enhanced is an extension that provides many useful functionalities for previewing Markdown.', author: 'Yiyi Wang',           iconColor: '#083fa1', iconText: 'MP',  installed: false, downloads: '8.7M',  rating: 4.7 },
    { id: 'bierner.markdown-mermaid',   name: 'Markdown Preview Mermaid Support', category: 'Tools',     description: 'Adds Mermaid diagram and flowchart support to VS Code\'s built-in Markdown preview.', author: 'Matt Bierner',        iconColor: '#ff3670', iconText: '🧜', installed: false, downloads: '3.1M',  rating: 4.7 },
    { id: 'rafamel.subtle-brackets',    name: 'Subtle Brackets',             category: 'Tools',          description: 'Underlines matching brackets in your code, making it easy to see which brackets pair together.', author: 'rafamel',             iconColor: '#61afef', iconText: '[ ]', installed: false, downloads: '0.8M',  rating: 4.5 },
    { id: 'ms-vsliveshare.vsliveshare', name: 'Live Share',                  category: 'Tools',          description: 'Real-time collaborative development from the comfort of your favorite tools. Share code, debug, and pair-program.', author: 'Microsoft',           iconColor: '#5a009d', iconText: '🤝', installed: false, downloads: '13.7M', rating: 4.8 },
  ],
  searchQuery: '',
  searchResults: [],
  problems: [
    { id: 1, type: 'warning', message: 'Unused variable "app"', file: 'app.js', line: 3, col: 7 },
    { id: 2, type: 'info', message: 'Consider using const instead of let', file: 'app.js', line: 6, col: 1 },
  ],
  gitChanges: [
    { file: 'index.html', status: 'M' },
    { file: 'style.css', status: 'M' },
    { file: 'app.js', status: 'A' },
  ],
  terminalHistory: [
    { type: 'prompt', path: '~/project', cmd: 'npm install' },
    { type: 'output', text: 'added 127 packages in 3.4s' },
    { type: 'output', text: '' },
    { type: 'prompt', path: '~/project', cmd: 'npm run dev' },
    { type: 'success', text: '  VITE v5.4.0  ready in 312 ms' },
    { type: 'success', text: '  ➜  Local: http://localhost:5173/' },
  ],
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_TAB': {
      const { file } = action;
      if (!state.files[file]) return state;
      const newTabs = state.openTabs.includes(file)
        ? state.openTabs
        : [...state.openTabs, file];
      return { ...state, openTabs: newTabs, activeTab: file };
    }
    case 'CLOSE_TAB': {
      const newTabs = state.openTabs.filter(t => t !== action.file);
      let newActive = state.activeTab;
      if (state.activeTab === action.file) {
        const idx = state.openTabs.indexOf(action.file);
        newActive = newTabs[Math.min(idx, newTabs.length - 1)] || null;
      }
      return { ...state, openTabs: newTabs, activeTab: newActive };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.file };
    case 'UPDATE_FILE_CONTENT': {
      const { file, content } = action;
      return {
        ...state,
        files: {
          ...state.files,
          [file]: { ...state.files[file], content, unsaved: true },
        },
      };
    }
    case 'SAVE_FILE': {
      const { file } = action;
      return {
        ...state,
        files: {
          ...state.files,
          [file]: { ...state.files[file], unsaved: false },
        },
      };
    }
    case 'CREATE_FILE': {
      const { name } = action;
      if (state.files[name]) return state;
      const ext = name.split('.').pop();
      const langMap = { js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown' };
      const language = langMap[ext] || 'plaintext';
      const newFiles = {
        ...state.files,
        [name]: { name, language, content: '', unsaved: false },
      };
      return {
        ...state,
        files: newFiles,
        openTabs: [...state.openTabs, name],
        activeTab: name,
      };
    }
    case 'DELETE_FILE': {
      const newFiles = { ...state.files };
      delete newFiles[action.file];
      const newTabs = state.openTabs.filter(t => t !== action.file);
      const newActive = state.activeTab === action.file
        ? (newTabs[newTabs.length - 1] || null)
        : state.activeTab;
      return { ...state, files: newFiles, openTabs: newTabs, activeTab: newActive };
    }
    case 'SET_SIDEBAR_VIEW':
      return { ...state, sidebarView: action.view, sidebarVisible: true };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarVisible: !state.sidebarVisible };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.size };
    case 'TOGGLE_TERMINAL':
      return { ...state, terminalVisible: !state.terminalVisible };
    case 'SET_TERMINAL_PANEL':
      return { ...state, terminalPanel: action.panel };
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    case 'CLOSE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: false };
    case 'TOGGLE_PREVIEW':
      return { ...state, previewVisible: !state.previewVisible };
    case 'TOGGLE_MINIMAP':
      return { ...state, minimap: !state.minimap };
    case 'TOGGLE_WORDWRAP':
      return { ...state, wordWrap: !state.wordWrap };
    case 'TOGGLE_AUTOSAVE':
      return { ...state, autoSave: !state.autoSave };
    case 'TOGGLE_EXTENSION': {
      const exts = state.extensions.map(e =>
        e.id === action.id ? { ...e, installed: !e.installed } : e
      );
      return { ...state, extensions: exts };
    }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, { id: Date.now(), ...action.payload }],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.results, searchQuery: action.query };
    case 'TOGGLE_RIGHT_SIDEBAR':
      return {
        ...state,
        rightSidebarVisible: action.view ? action.view !== state.rightSidebarView
          ? true : !state.rightSidebarVisible
          : !state.rightSidebarVisible,
        rightSidebarView: action.view || state.rightSidebarView,
      };
    case 'ADD_TERMINAL_LINE':
      return { ...state, terminalHistory: [...state.terminalHistory, action.line] };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const IDEContext = createContext(null);

export function IDEProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openTab = useCallback((file) => dispatch({ type: 'OPEN_TAB', file }), []);
  const closeTab = useCallback((file) => dispatch({ type: 'CLOSE_TAB', file }), []);
  const notify = useCallback((message, type = 'info') => {
    const id = Date.now();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', id }), 4000);
  }, []);

  return (
    <IDEContext.Provider value={{ state, dispatch, openTab, closeTab, notify }}>
      {children}
    </IDEContext.Provider>
  );
}

export const useIDE = () => {
  const ctx = useContext(IDEContext);
  if (!ctx) throw new Error('useIDE must be used within IDEProvider');
  return ctx;
};
