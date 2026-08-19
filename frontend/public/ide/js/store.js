// ── Global Variables ──
let pyodide = null;
let isRunning = false;
const uploadedFiles = new Map(); // name -> {data: Uint8Array|string, size, type}
const pyFiles = new Map();       // filename -> code string
const openTabs = new Set();      // set of filenames currently open as editor tabs
let activeFile = null;
let editor = null;    // Monaco Editor instance
let consoleHistory = []; // Array of output objects


// ── DOM Cache ──
const DOM = {
  get outputPane() { return document.getElementById('outputPane'); },
  get hResizer() { return document.getElementById('hResizer'); },
  get outputContent() { return document.getElementById('outputContent'); },
  get outputEmpty() { return document.getElementById('outputEmpty'); },
  get execTimeLabel() { return document.getElementById('execTimeLabel'); },
  get networkBanner() { return document.getElementById('networkBanner'); },
  get statusDot() { return document.getElementById('statusDot'); },
  get statusText() { return document.getElementById('statusText'); },
  get runBtn() { return document.getElementById('runBtn'); },
  get downloadBtn() { return document.getElementById('downloadBtn'); },
  get saveBtn() { return document.getElementById('saveBtn'); },
  get loadingOverlay() { return document.getElementById('loadingOverlay'); },
  get loaderProgress() { return document.getElementById('loaderProgress'); },
  get loaderText() { return document.getElementById('loaderText'); },
  get toast() { return document.getElementById('toast'); },
  get clearStorageModal() { return document.getElementById('clearStorageModal'); },
  get tabBar() { return document.getElementById('tabBar'); },
  get emptyWorkspace() { return document.getElementById('emptyWorkspace'); },
  get paneHeader() { return document.getElementById('paneHeader'); },
  get activeFilename() { return document.getElementById('activeFilename'); },
  get filePanel() { return document.getElementById('filePanel'); },
  get consoleToggleBtn() { return document.getElementById('consoleToggleBtn'); },
  get deleteConfirmModal() { return document.getElementById('deleteConfirmModal'); },
  get deleteConfirmMsg() { return document.getElementById('deleteConfirmMsg'); },
  get deleteConfirmBtn() { return document.getElementById('deleteConfirmBtn'); }
};

// ── Browser Database (IndexedDB) Storage Layer ──
const DB_NAME = 'PyExDB';
const DB_VERSION = 1;
let saveTimeout = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveState() {
  try {
    const db = await openDB();
    const transaction = db.transaction('state', 'readwrite');
    const store = transaction.objectStore('state');

    // Sync active text editor and all open notebook models
    if (typeof notebookModels !== 'undefined') {
      for (const nbPath in notebookModels) {
        if (pyFiles.has(nbPath) && notebookModels[nbPath]) {
          pyFiles.set(nbPath, serializeNotebookJSON(nbPath));
        }
      }
    }
    if (activeFile && pyFiles.has(activeFile)) {
      if (typeof isNotebookFile === 'function' && !isNotebookFile(activeFile)) {
        pyFiles.set(activeFile, getEditorCode());
      }
    }

    const pyFilesArr = Array.from(pyFiles.entries());
    const uploadedFilesArr = Array.from(uploadedFiles.entries()).map(([name, f]) => [
      name,
      { name: f.name, size: f.size, type: f.type, data: f.data }
    ]);

    const state = {
      activeFile,
      openTabs: Array.from(openTabs),
      expandedFolders: typeof expandedFolders !== 'undefined' ? Array.from(expandedFolders) : [],
      pyFiles: pyFilesArr,
      uploadedFiles: uploadedFilesArr,
      consoleEntries: consoleHistory,
      // consoleIsEmpty is omitted — always derivable from consoleEntries.length === 0
      execTimeText: DOM.execTimeLabel ? DOM.execTimeLabel.textContent : '',
      notebookExecCounter: window._notebookExecCounter || 0
    };

    const putReq = store.put(state, 'workspaceState');
    putReq.onsuccess = () => {
      // Fix 2: Changes are now persisted — clear dirty flag
      window._isDirty = false;
    };
    putReq.onerror = (e) => {
      console.error('Failed to persist workspace state (storage quota may be exceeded):', e.target.error);
    };
  } catch (err) {
    console.error('Failed to save workspace state to IndexedDB:', err);
  }
}

async function loadState() {
  try {
    const db = await openDB();
    const transaction = db.transaction('state', 'readonly');
    const store = transaction.objectStore('state');
    const request = store.get('workspaceState');

    return new Promise((resolve) => {
      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('Failed to load workspace state from IndexedDB:', err);
    return null;
  }
}

function debouncedSaveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveState, 800);
}

async function restoreWorkspaceState() {
  const state = await loadState();
  if (state) {
    if (state.pyFiles && state.pyFiles.length > 0) {
      pyFiles.clear();
      state.pyFiles.forEach(([name, code]) => {
        const absName = name.startsWith('/') ? name : '/workspace/' + name;
        pyFiles.set(absName, code);
      });
    }

    if (state.uploadedFiles) {
      uploadedFiles.clear();
      state.uploadedFiles.forEach(([name, f]) => uploadedFiles.set(name, f));
    }

    if (state.expandedFolders && Array.isArray(state.expandedFolders) && typeof expandedFolders !== 'undefined') {
      expandedFolders = new Set(state.expandedFolders);
    }

    // Normalize activeFile path once — not set again below
    let loadedActiveFile = state.activeFile || null;
    if (loadedActiveFile && !loadedActiveFile.startsWith('/')) {
      loadedActiveFile = '/workspace/' + loadedActiveFile;
    }
    activeFile = loadedActiveFile;

    // Restore open tabs — fall back to opening activeFile if no saved tabs
    openTabs.clear();
    if (state.openTabs && Array.isArray(state.openTabs) && state.openTabs.length > 0) {
      state.openTabs.forEach(t => {
        const absT = t.startsWith('/') ? t : '/workspace/' + t;
        if (pyFiles.has(absT)) openTabs.add(absT); // Only restore tabs for files that still exist
      });
    } else if (activeFile && pyFiles.has(activeFile)) {
      openTabs.add(activeFile); // Fallback: open the active file as a tab
    }

    if (activeFile) {
      if (typeof isNotebookFile === 'function' && isNotebookFile(activeFile)) {
        // Notebooks need renderNotebookUI (not setEditorCode) to populate notebookModels.
        // Without this, the first debouncedSaveState() after restore would find no model
        // and serialize an empty notebook, overwriting all saved cell content.
        const notebookContainerEl = document.getElementById('notebookContainer');
        const codeEditorEl = document.getElementById('codeEditor');
        if (codeEditorEl) codeEditorEl.style.display = 'none';
        if (notebookContainerEl) notebookContainerEl.style.display = 'block';
        if (typeof renderNotebookUI === 'function') {
          renderNotebookUI(activeFile, pyFiles.get(activeFile) || '');
        }
      } else {
        setEditorCode(activeFile, pyFiles.get(activeFile) || '');
      }
    }

    // Restore console HTML
    const outputContentEl = DOM.outputContent;
    const outputEmptyEl = DOM.outputEmpty;
    const execTimeLabel = DOM.execTimeLabel;

    if (outputContentEl) {
      // Clear existing children except #outputEmpty
      Array.from(outputContentEl.childNodes).forEach(node => {
        if (node !== outputEmptyEl) {
          node.remove();
        }
      });

      if (state.consoleEntries && Array.isArray(state.consoleEntries)) {
        consoleHistory = state.consoleEntries;
        consoleHistory.forEach(entry => {
          if (entry.type === 'line') {
            const div = document.createElement('div');
            div.className = `output-line ${entry.class || ''}`.trim();
            div.textContent = entry.text || '';
            outputContentEl.appendChild(div);
          } else if (entry.type === 'html') {
            // B7: Restore rich HTML output (DataFrames, etc.) saved from previous session
            const wrapper = document.createElement('div');
            wrapper.className = 'output-html-container';
            const purOpts = {
              ADD_TAGS: ['style', 'input', 'label', 'svg', 'path', 'rect', 'text', 'g'],
              ADD_ATTR: ['checked', 'for', 'class', 'id', 'type', 'viewBox', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'transform', 'data-*']
            };
            wrapper.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(entry.html || '', purOpts) : (entry.html || '');
            outputContentEl.appendChild(wrapper);
          } else if (entry.type === 'plot') {
            if (entry.src && (entry.src.startsWith('data:image/png;base64,') || entry.src.startsWith('data:image/jpeg;base64,'))) {
              const img = document.createElement('img');
              img.src = entry.src;
              img.className = 'plot-output-img';
              outputContentEl.appendChild(img);
            }
          } else if (entry.type === 'time') {
            const div = document.createElement('div');
            div.className = 'exec-time';
            div.textContent = entry.text || '';
            outputContentEl.appendChild(div);
          }
        });
      } else {
        consoleHistory = [];
      }
    }
    if (outputEmptyEl) {
      outputEmptyEl.style.display = consoleHistory.length === 0 ? 'flex' : 'none';
    }
    if (execTimeLabel && state.execTimeText) {
      execTimeLabel.textContent = state.execTimeText;
    }
    // Restore notebook execution counter so cell numbers continue from previous session
    if (typeof state.notebookExecCounter === 'number') {
      window._notebookExecCounter = state.notebookExecCounter;
    }

    // Default setup
    if (pyFiles.size === 0) {
      activeFile = null;
    }
  }

  // Render lists and tabs
  renderTabs();
  refreshFileLists();
  toggleEmptyState();
}
