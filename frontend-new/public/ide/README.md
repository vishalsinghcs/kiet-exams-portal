# Elixir IDE — Serverless Python & Machine Learning IDE in Your Browser

**Elixir IDE** is a professional-grade, 100% client-side Python Development Environment and Data Science Workspace. Powered by **WebAssembly (WASM)** and **Pyodide**, Elixir executes Python 3.11 code natively inside your browser without backend servers, container hosting, or cloud runtime costs.

![Elixir IDE](https://img.shields.io/badge/Status-Active-success) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![WASM](https://img.shields.io/badge/Runtime-Pyodide_WASM-purple) ![Editor](https://img.shields.io/badge/Editor-Monaco-indigo) ![Security](https://img.shields.io/badge/Sandbox-Air--Gapped-emerald)

---

## ✨ Key Features

### 🚀 Client-Side Python 3.11 Runtime
* **Zero Backend Latency**: Code runs directly on your local CPU via WebAssembly.
* **Pre-Configured ML & Data Science Suite**: Includes `numpy`, `pandas`, `scipy`, `scikit-learn`, `matplotlib`, `seaborn`, `openpyxl`, `imbalanced-learn`, and `black`.
* **Automatic Graphical Output**: Inline `matplotlib` and `seaborn` plots are captured as high-DPI base64 images and rendered directly in execution cells and the output console.
* **Rich HTML & DataFrame Representation**: Pandas DataFrames and Series are formatted as styled HTML tables with hover states and custom scrolling.

---

### 📓 Native Jupyter Notebook Manager (`.ipynb`)
* **Full Notebook Interactivity**: Create, edit, and execute Jupyter Notebooks directly within the browser interface.
* **Code & Markdown Cells**: Mix executable Python cells with rich formatted Markdown cells (using **Marked.js** and **DOMPurify**).
* **Cell Reordering & Management**:
  * Move cells up and down with dedicated header controls (`chevron-up` / `chevron-down`).
  * Add code or markdown cells anywhere in the notebook using inter-cell dividers.
  * Delete cells or clear execution outputs with zero data loss.
* **Execution Counter Tracking**: Real-time `In [n]:` and `Out [n]:` counter tracking, surviving session saves.
* **Kernel Operations**: Restart kernel to wipe Python namespace memory and start fresh with a single click.

---

### 💻 VS Code-Grade Monaco Editor
* **Monaco Editor Engine**: Features full syntax highlighting, bracket matching, line numbers, error diagnostics, and minimap navigation.
* **Pre-Execution Syntax Verification**: Evaluates code structure via Python's AST parser (`ast.parse`) before runtime execution, marking syntax errors directly on Monaco line numbers.
* **Code Formatting**: Format Python scripts on-demand using Python's official `black` formatter inside WebAssembly (`Shift + Alt + F`).
* **Multi-Tab File Management**: Work across multiple open `.py`, `.ipynb`, `.txt`, `.json`, `.md`, `.html`, `.css`, and `.js` files concurrently.

---

### 🗂️ Virtual File System & Interactive Previewer
* **Categorized Project Storage**: Standardized `/workspace` (scripts/notebooks), `/data` (uploaded datasets), and `/output` (script export destination) virtual directory layout.
* **Interactive File Previewer**: Preview data files instantly in popup modals without loading them into memory:
  * **CSV & TSV Files**: Rendered in interactive **AG Grid** tables with column sorting, filtering, and pagination (parsed via **PapaParse**).
  * **Excel Worksheets (`.xlsx` / `.xls`)**: Rendered in **AG Grid** with active sheet selection dropdowns (parsed via **SheetJS**).
  * **JSON Files**: Formatted and highlighted using Monaco Editor.
  * **Text Files**: Quick raw viewer with one-click clipboard copying.
* **Drag-and-Drop File Uploads**: Upload local datasets (`.csv`, `.json`, `.xlsx`, `.zip`, `.py`, `.ipynb`) directly into the sandbox.

---

### 🛡️ Sandboxed Security Model
* **Network Isolation**: Strict host allowlisting intercepts and blocks unauthorized external `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` calls.
* **Standard Library Blocking**: Hardened Python network wrappers raise explicit `PermissionError` exceptions on network calls (`urllib`, `socket`, `http.client`, `requests`, `httpx`, `aiohttp`).
* **Client-Side Privacy**: Your code and data never leave your web browser.

---

### 💾 Persistent Workspace State (IndexedDB)
* **Debounced Auto-Saving**: Code changes, background tab edits, open notebook states, console output history, and expanded folder structures are stored asynchronously in `IndexedDB`.
* **Session Restore**: Reopening the browser tab seamlessly restores all files, active tabs, and terminal outputs.
* **Workspace Backup & Clear**: Export all workspace files before clearing storage using the safety modal option.

---

## ⌨️ Keyboard Shortcuts

Press **`?`** anywhere in the IDE to open the interactive Keyboard Shortcuts visual cheat sheet.

| Shortcut | Action |
|:--- |:--- |
| `Ctrl` / `Cmd` + `Enter` | Run active Python script |
| `Shift` + `Enter` | Run active Jupyter Notebook cell |
| `Ctrl` / `Cmd` + `S` | Save workspace state to IndexedDB |
| `Ctrl` / `Cmd` + `N` | Open New File prompt |
| `Ctrl` / `Cmd` + `` ` `` | Toggle Console terminal pane |
| `Shift` + `Alt` + `F` | Format active Python script (Black) |
| `?` | Toggle Keyboard Shortcuts help modal |
| `Escape` | Dismiss active modal or overlay |

---

## 🏗️ Technical Architecture

### Tech Stack
* **UI & Styling**: HTML5, Vanilla JavaScript (ES6+), TailwindCSS 3, DaisyUI 4, Lucide Icons.
* **Code Engine**: Monaco Editor (`v0.45.0`).
* **Notebook Renderer**: Custom Notebook DOM renderer + Marked.js + DOMPurify.
* **Python Runtime**: Pyodide (`v0.24.1`) on WebAssembly (CPython 3.11).
* **Grid & Data Engine**: AG Grid Community (`v31.3.2`), PapaParse (`v5.4.1`), SheetJS (`v0.18.5`).
* **Storage Layer**: Asynchronous `IndexedDB` wrapper.

### Module Breakdown

```
Elixir IDE/
├── index.html         # Application shell, layout, dialogs, and CDN loader
├── index.css          # Design system CSS, animations, scrollbars, and themes
├── js/
│   ├── store.js       # IndexedDB storage layer, state serialization, & workspace restoration
│   ├── ui.js          # UI utilities, console controls, toasts, & shortcut modal toggle
│   ├── editor.js      # Monaco Editor setup, AST syntax marker, & Black code formatter
│   ├── notebook.js    # Jupyter Notebook (.ipynb) renderer, cell manager, & execution engine
│   ├── explorer.js    # File tree renderer, drag-and-drop handler, & rich preview modal
│   ├── runtime.js     # Pyodide WASM bootstrap, network sandbox override, & python hooks
│   └── index.js       # Global event routing, hotkeys listener, & startup state controller
└── README.md          # Documentation
```

---

## 🚀 Getting Started

Elixir IDE requires no backend deployment or database setup.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/Elixir-IDE.git
   cd "Elixir IDE"
   ```

2. **Serve static files:**
   Due to WebAssembly CORS policies, serve the project root using any HTTP server:
   ```bash
   python -m http.server 8000
   ```
   *or using Node:*
   ```bash
   npx serve .
   ```

3. **Launch in Browser:**
   Open `http://localhost:8000` in Google Chrome, Edge, Safari, or Firefox.

---

## 🛡️ Capabilities & Boundaries

### ✅ Supported
* **Full Python 3.11 Execution**: Execute complex scripts, data pipelines, OOP classes, and data transformations.
* **Jupyter Notebook Workflows**: Build interactive data science experiments mixing Markdown and Python code cells.
* **Data Visualizations**: Generate high-quality charts using `matplotlib` or `seaborn`.
* **File System Processing**: Parse CSVs, Excel files, JSONs, or text files inside the virtual filesystem.
* **Air-Gapped Privacy**: 100% of data remains within your local browser storage.

### ⚠️ Sandbox Boundaries
* **External Network Access**: Network requests to external APIs via `requests` or `urllib` are blocked by design.
* **C-Extension Compilation**: Only pure Python packages or pre-compiled Pyodide WASM packages are supported.
* **OS-Level Threading**: True OS multithreading is limited by browser WebAssembly environment bounds.

---
