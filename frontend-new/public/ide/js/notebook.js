// ── Elixir IDE Notebook Manager (.ipynb) ──

const notebookModels = {}; // filename -> { cells: [...], activeCellId: null }
const cellMonacoEditors = {}; // cellId -> Monaco Editor instance

function createEmptyNotebookJSON() {
  return JSON.stringify({
    cells: [
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: ["# Welcome to Elixir IDE Notebook\n", "import pandas as pd\n", "import numpy as np\n\n", "print('Notebook ready!')"]
      }
    ],
    metadata: {
      language_info: { name: "python" }
    },
    nbformat: 4,
    nbformat_minor: 2
  }, null, 2);
}

function isNotebookFile(filename) {
  return filename && filename.toLowerCase().endsWith('.ipynb');
}

function parseNotebookJSON(content) {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    if (data && Array.isArray(data.cells)) {
      return data;
    }
  } catch (e) {
    console.warn("Invalid notebook JSON, initializing empty notebook structure:", e);
  }
  return JSON.parse(createEmptyNotebookJSON());
}

function serializeNotebookJSON(filename) {
  const model = notebookModels[filename];
  if (!model) {
    // Safety fallback: never overwrite with an empty notebook.
    // Return whatever pyFiles holds (the last good save) if available.
    const existing = (typeof pyFiles !== 'undefined') && pyFiles.get(filename);
    return existing || createEmptyNotebookJSON();
  }

  const cells = model.cells.map(cell => {
    let sourceText = '';
    if (cell.type === 'code' && cellMonacoEditors[cell.id]) {
      sourceText = cellMonacoEditors[cell.id].getValue();
    } else {
      sourceText = cell.source || '';
    }

    const sourceLines = sourceText.split('\n').map((line, idx, arr) => 
      idx < arr.length - 1 ? line + '\n' : line
    );

    return {
      cell_type: cell.type,
      execution_count: cell.executionCount || null,
      metadata: cell.metadata || {},
      outputs: cell.outputs || [],
      source: sourceLines
    };
  });

  return JSON.stringify({
    cells,
    metadata: { language_info: { name: "python" } },
    nbformat: 4,
    nbformat_minor: 2
  }, null, 2);
}

function renderNotebookUI(filename, content) {
  const container = document.getElementById('notebookContainer');
  if (!container) return;

  // B10: Dispose orphaned Monaco cell editors BEFORE wiping the DOM.
  // Each renderNotebookUI call generates fresh cell IDs, so old editor
  // instances in cellMonacoEditors become permanently unreachable otherwise.
  const prevModel = notebookModels[filename];
  if (prevModel) {
    prevModel.cells.forEach(cell => {
      if (cellMonacoEditors[cell.id]) {
        try { cellMonacoEditors[cell.id].dispose(); } catch (_) {}
        delete cellMonacoEditors[cell.id];
      }
    });
  }

  container.innerHTML = '';
  const data = parseNotebookJSON(content);

  // Re-build model
  notebookModels[filename] = {
    cells: data.cells.map((c, idx) => ({
      id: `cell_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      type: c.cell_type === 'markdown' ? 'markdown' : 'code',
      source: Array.isArray(c.source) ? c.source.join('') : (c.source || ''),
      executionCount: c.execution_count || null,
      outputs: c.outputs || [],
      isEditingMd: false
    }))
  };

  const model = notebookModels[filename];

  // Global toolbar for Notebook
  // S8: Build toolbar with JS event listeners — NOT raw filename in onclick attributes.
  // A filename containing a single-quote would break innerHTML-embedded onclick strings.
  const nbToolbar = document.createElement('div');
  nbToolbar.className = 'flex items-center justify-between bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm mb-4 shrink-0';
  nbToolbar.innerHTML = `
    <div class="flex items-center gap-1.5">
      <button class="btn btn-sm btn-primary gap-1.5 text-xs text-white" id="nb-run-all-btn">
        <i data-lucide="fast-forward" class="w-3.5 h-3.5"></i> Run All
      </button>
      <div class="h-4 w-px bg-base-300 mx-0.5"></div>
      <button class="btn btn-sm btn-ghost border-base-200 text-xs gap-1" id="nb-add-code-btn">
        <i data-lucide="code-2" class="w-3.5 h-3.5 text-primary"></i> + Code
      </button>
      <button class="btn btn-sm btn-ghost border-base-200 text-xs gap-1" id="nb-add-md-btn">
        <i data-lucide="file-text" class="w-3.5 h-3.5 text-secondary"></i> + Markdown
      </button>
      <div class="h-4 w-px bg-base-300 mx-0.5"></div>
      <button class="btn btn-sm btn-ghost border-base-200 text-xs gap-1 text-error hover:bg-error/10 hover:border-error/30" id="nb-restart-btn" title="Restart kernel, clear all outputs, and reset cell counters to [1]">
        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Restart Kernel &amp; Clear Cells
      </button>
    </div>
    <div class="flex items-center gap-2">
      <button class="btn btn-sm btn-ghost border-base-200 text-xs gap-1" id="nb-download-btn" title="Download .ipynb">
        <i data-lucide="download" class="w-3.5 h-3.5 text-base-content/40"></i>
      </button>
      <span class="text-xs font-mono text-base-content/40 font-medium">${model.cells.length} cells</span>
    </div>
  `;
  // Attach listeners using closure — filename is captured safely, no string injection
  nbToolbar.querySelector('#nb-run-all-btn').addEventListener('click', () => runAllNotebookCells(filename));
  nbToolbar.querySelector('#nb-add-code-btn').addEventListener('click', () => addNotebookCell(filename, 'code'));
  nbToolbar.querySelector('#nb-add-md-btn').addEventListener('click', () => addNotebookCell(filename, 'markdown'));
  nbToolbar.querySelector('#nb-restart-btn').addEventListener('click', () => restartNotebookKernel(filename));
  nbToolbar.querySelector('#nb-download-btn').addEventListener('click', () => downloadNotebook(filename));
  container.appendChild(nbToolbar);

  // Render each cell with inter-cell dividers between them
  model.cells.forEach((cell, idx) => {
    container.appendChild(createCellElement(filename, cell, idx));
    // Add an inter-cell divider after every cell (including the last)
    container.appendChild(createInterCellDivider(filename, cell.id));
  });

  requestAnimationFrame(() => {
    refreshLucideIcons();
    // Initialize Monaco editors for code cells
    model.cells.forEach(cell => {
      if (cell.type === 'code') {
        initCellMonacoEditor(cell.id, cell.source, filename);
      }
    });
    const defaultActiveId = model.activeCellId || (model.cells[0] ? model.cells[0].id : null);
    if (defaultActiveId) {
      selectNotebookCell(filename, defaultActiveId, false);
    }
  });
}

function selectNotebookCell(filename, cellId, shouldFocus = true) {
  const model = notebookModels[filename];
  if (model) {
    model.activeCellId = cellId;
  }
  document.querySelectorAll('.notebook-cell').forEach(el => {
    if (el.id === `wrap_${cellId}`) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  if (shouldFocus && cellMonacoEditors[cellId]) {
    try {
      if (!cellMonacoEditors[cellId].hasTextFocus()) {
        cellMonacoEditors[cellId].focus();
      }
    } catch (_) {}
  }
}

function createCellElement(filename, cell, index) {
  const cellWrap = document.createElement('div');
  cellWrap.className = `notebook-cell p-3 flex flex-col gap-2 relative bg-base-100 border border-base-200 text-base-content ${cell.type === 'code' ? 'border-l-4 border-l-primary/60' : 'border-l-4 border-l-secondary/60'}`;
  cellWrap.id = `wrap_${cell.id}`;

  cellWrap.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    selectNotebookCell(filename, cell.id, true);
  });

  // Header / Actions
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between text-xs text-base-content/60 font-mono pb-1 border-b border-base-200';
  
  const labelBadge = document.createElement('span');
  if (cell.type === 'code') {
    labelBadge.className = 'cell-exec-badge bg-primary/10 text-primary px-2.5 py-0.5 rounded font-mono font-bold text-xs';
    labelBadge.textContent = `In [${cell.executionCount || ' '}]:`;
  } else {
    labelBadge.className = 'bg-secondary/10 text-secondary px-2.5 py-0.5 rounded font-mono font-bold text-xs';
    labelBadge.textContent = 'Markdown';
  }

  const labelWrap = document.createElement('div');
  labelWrap.className = 'flex items-center gap-2';
  labelWrap.appendChild(labelBadge);

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'flex items-center gap-1';

  if (cell.type === 'code') {
    const runBtn = document.createElement('button');
    runBtn.className = 'p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors';
    runBtn.title = 'Run Cell (Shift+Enter)';
    runBtn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i>';
    runBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNotebookCell(filename, cell.id, false);
      runNotebookCell(filename, cell.id);
    });
    actionsWrap.appendChild(runBtn);

    // UX-2: Shift+Enter hint
    const hint = document.createElement('span');
    hint.className = 'text-[10px] text-base-content/40 font-mono hidden lg:inline mr-1';
    hint.textContent = 'Shift+↵';
    actionsWrap.appendChild(hint);
  } else {
    const editBtn = document.createElement('button');
    editBtn.className = 'p-1 hover:bg-base-200 text-base-content/80 rounded transition-colors';
    editBtn.title = 'Toggle Markdown Edit';
    editBtn.innerHTML = '<i data-lucide="edit-3" class="w-3.5 h-3.5"></i>';
    editBtn.addEventListener('click', () => toggleMarkdownEdit(filename, cell.id));
    actionsWrap.appendChild(editBtn);
  }

  // Move Up Button
  const moveUpBtn = document.createElement('button');
  moveUpBtn.className = 'p-1 hover:bg-base-200 text-base-content/80 rounded transition-colors';
  moveUpBtn.title = 'Move Cell Up';
  moveUpBtn.innerHTML = '<i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>';
  moveUpBtn.addEventListener('click', () => moveNotebookCell(filename, cell.id, 'up'));
  actionsWrap.appendChild(moveUpBtn);

  // Move Down Button
  const moveDownBtn = document.createElement('button');
  moveDownBtn.className = 'p-1 hover:bg-base-200 text-base-content/80 rounded transition-colors';
  moveDownBtn.title = 'Move Cell Down';
  moveDownBtn.innerHTML = '<i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>';
  moveDownBtn.addEventListener('click', () => moveNotebookCell(filename, cell.id, 'down'));
  actionsWrap.appendChild(moveDownBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'p-1 hover:bg-red-50 text-error rounded transition-colors';
  delBtn.title = 'Delete Cell';
  delBtn.innerHTML = '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>';
  delBtn.addEventListener('click', () => deleteNotebookCell(filename, cell.id));
  actionsWrap.appendChild(delBtn);

  header.appendChild(labelWrap);
  header.appendChild(actionsWrap);
  cellWrap.appendChild(header);

  // Body Content
  if (cell.type === 'code') {
    const editorDiv = document.createElement('div');
    editorDiv.id = `editor_${cell.id}`;
    editorDiv.style.height = `${Math.max(80, Math.min(400, (cell.source.split('\n').length + 1) * 22))}px`;
    editorDiv.className = 'rounded border border-base-200 overflow-hidden';
    cellWrap.appendChild(editorDiv);

    // Output area
    const outputDiv = document.createElement('div');
    outputDiv.id = `output_${cell.id}`;
    outputDiv.className = 'notebook-output-container group relative bg-base-100 rounded-b-xl p-3 text-xs border border-base-200 border-t-0 mt-2 max-h-[450px] overflow-x-auto overflow-y-auto custom-scrollbar';
    if (!cell.outputs || cell.outputs.length === 0) {
      outputDiv.classList.add('hidden');
    } else {
      cell.outputs.forEach(out => {
        if (out.data && out.data['text/html']) {
          if (cell.executionCount) {
            const promptDiv = document.createElement('div');
            promptDiv.className = 'notebook-out-prompt';
            promptDiv.textContent = `Out [${cell.executionCount}]:`;
            outputDiv.appendChild(promptDiv);
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'output-html-container';
          const htmlContent = Array.isArray(out.data['text/html']) ? out.data['text/html'].join('') : out.data['text/html'];
          const purOpts = {
            ADD_TAGS: ['style', 'input', 'label', 'svg', 'path', 'rect', 'text', 'g'],
            ADD_ATTR: ['checked', 'for', 'class', 'id', 'type', 'viewBox', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'transform', 'data-*']
          };
          wrapper.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlContent, purOpts) : htmlContent;
          outputDiv.appendChild(wrapper);
        } else if (out.data && out.data['image/png']) {
          if (cell.executionCount) {
            const promptDiv = document.createElement('div');
            promptDiv.className = 'notebook-out-prompt';
            promptDiv.textContent = `Out [${cell.executionCount}]:`;
            outputDiv.appendChild(promptDiv);
          }
          const b64 = Array.isArray(out.data['image/png']) ? out.data['image/png'].join('') : out.data['image/png'];
          const img = document.createElement('img');
          img.src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
          img.className = 'plot-output-img';
          outputDiv.appendChild(img);
        } else if (out.text) {
          const rawText = Array.isArray(out.text) ? out.text.join('') : out.text;
          if (rawText.includes('__PLOT__:')) {
            const b64 = rawText.split('__PLOT__:')[1].trim();
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${b64}`;
            img.className = 'plot-output-img';
            outputDiv.appendChild(img);
          } else if (rawText.includes('__HTML_B64__:') || rawText.includes('__HTML__:')) {
            if (cell.executionCount) {
              const promptDiv = document.createElement('div');
              promptDiv.className = 'notebook-out-prompt';
              promptDiv.textContent = `Out [${cell.executionCount}]:`;
              outputDiv.appendChild(promptDiv);
            }
            let html = '';
            if (rawText.includes('__HTML_B64__:')) {
              const b64 = rawText.split('__HTML_B64__:')[1].trim();
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              html = new TextDecoder().decode(bytes);
            } else {
              html = rawText.split('__HTML__:')[1];
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'output-html-container';
            const purOpts = {
              ADD_TAGS: ['style', 'input', 'label', 'svg', 'path', 'rect', 'text', 'g'],
              ADD_ATTR: ['checked', 'for', 'class', 'id', 'type', 'viewBox', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'transform', 'data-*']
            };
            wrapper.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html, purOpts) : html;
            outputDiv.appendChild(wrapper);
          } else {
            const line = document.createElement('div');
            line.className = `output-line ${out.name || 'stdout'}`;
            line.textContent = rawText;
            outputDiv.appendChild(line);
          }
        }
      });
      addOutputCopyButton(outputDiv);
    }
    cellWrap.appendChild(outputDiv);

  } else {
    // Markdown cell
    const mdDiv = document.createElement('div');
    mdDiv.id = `md_${cell.id}`;
    
    if (cell.isEditingMd || !cell.source.trim()) {
      const textarea = document.createElement('textarea');
      textarea.className = 'w-full p-2.5 text-xs font-mono border border-base-200 rounded-lg focus:outline-none focus:border-secondary min-h-[80px] bg-base-100';
      textarea.value = cell.source;
      textarea.placeholder = 'Type Markdown here... (Click Edit icon to render)';
      textarea.oninput = (e) => {
        cell.source = e.target.value;
        debouncedSaveState();
      };
      mdDiv.appendChild(textarea);
    } else {
      const preview = document.createElement('div');
      preview.className = 'markdown-cell-preview border border-base-200 rounded-lg bg-base-200/50 cursor-pointer';
      const rawMd = window.marked ? window.marked.parse(cell.source) : cell.source;
      preview.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawMd) : rawMd;
      preview.onclick = () => toggleMarkdownEdit(filename, cell.id);
      mdDiv.appendChild(preview);
    }
    cellWrap.appendChild(mdDiv);
  }

  return cellWrap;
}

function addOutputCopyButton(outputContainer) {
  if (!outputContainer) return;
  outputContainer.classList.add('group', 'relative');
  if (outputContainer.querySelector('.notebook-copy-output-btn')) return;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'notebook-copy-output-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-150 p-1.5 bg-base-100/90 hover:bg-indigo-50 border border-base-200 hover:border-primary/40 rounded-md text-base-content/40 hover:text-primary shadow-xs z-10 flex items-center justify-center cursor-pointer';
  copyBtn.title = 'Copy Output';
  copyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i>';

  copyBtn.onclick = (e) => {
    e.stopPropagation();
    const textToCopy = Array.from(outputContainer.childNodes)
      .filter(node => node !== copyBtn && !node.classList?.contains('notebook-copy-output-btn'))
      .map(node => node.innerText || node.textContent || '')
      .join('\n')
      .replace(/^Out \[\d+\]:\s*/gm, '')
      .trim();

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (typeof showToast === 'function') showToast('Cell output copied', 'success');
      }).catch(() => {
        if (typeof showToast === 'function') showToast('Failed to copy cell output', 'error');
      });
    } else {
      if (typeof showToast === 'function') showToast('No output text to copy', 'warn');
    }
  };

  outputContainer.appendChild(copyBtn);
  if (typeof refreshLucideIcons === 'function') refreshLucideIcons();
}

function initCellMonacoEditor(cellId, initialValue, filename) {
  const container = document.getElementById(`editor_${cellId}`);
  if (!container || !window.monaco) return;

  if (cellMonacoEditors[cellId]) {
    cellMonacoEditors[cellId].dispose();
  }

  const editorInstance = monaco.editor.create(container, {
    value: initialValue,
    language: 'python',
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs',
    minimap: { enabled: false },
    automaticLayout: true,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', monospace",
    lineHeight: 20,
    padding: { top: 6, bottom: 6 },
    scrollBeyondLastLine: false,
    renderLineHighlight: "all",
    acceptSuggestionOnEnter: "off",
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: "off",
    snippetSuggestions: "none",
    tabCompletion: "off"
  });

  editorInstance.onDidFocusEditorWidget(() => {
    selectNotebookCell(filename, cellId, false);
  });

  editorInstance.onDidChangeModelContent(() => {
    // Update cell source
    const model = notebookModels[filename];
    if (model) {
      const cell = model.cells.find(c => c.id === cellId);
      if (cell) cell.source = editorInstance.getValue();
    }
    // Auto sync height to content
    const lineCount = editorInstance.getModel().getLineCount();
    container.style.height = `${Math.max(80, Math.min(400, (lineCount + 1) * 22))}px`;
    debouncedSaveState();
  });

  // Shift+Enter to run cell and advance
  editorInstance.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function() {
    selectNotebookCell(filename, cellId, false);
    runNotebookCell(filename, cellId);
    advanceToNextCell(filename, cellId);
  });

  cellMonacoEditors[cellId] = editorInstance;
}

function advanceToNextCell(filename, currentCellId) {
  const model = notebookModels[filename];
  if (!model) return;
  const idx = model.cells.findIndex(c => c.id === currentCellId);
  if (idx === -1) return;

  if (idx < model.cells.length - 1) {
    const nextCell = model.cells[idx + 1];
    selectNotebookCell(filename, nextCell.id, true);
    const wrap = document.getElementById(`wrap_${nextCell.id}`);
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    insertNotebookCellAfter(filename, currentCellId, 'code');
  }
}

// ── Global Shift+Enter Keydown Listener for Notebook Cells ──
document.addEventListener('keydown', function(e) {
  if (e.shiftKey && e.key === 'Enter') {
    if (typeof activeFile === 'undefined' || !activeFile || !isNotebookFile(activeFile)) return;
    const model = notebookModels[activeFile];
    if (!model) return;

    let targetCellId = model.activeCellId;

    const activeEl = document.activeElement;
    if (activeEl) {
      const wrap = activeEl.closest('.notebook-cell');
      if (wrap && wrap.id && wrap.id.startsWith('wrap_')) {
        targetCellId = wrap.id.replace('wrap_', '');
      }
    }

    if (targetCellId) {
      const cell = model.cells.find(c => c.id === targetCellId);
      if (cell) {
        e.preventDefault();
        e.stopPropagation();
        if (cell.type === 'code') {
          runNotebookCell(activeFile, targetCellId);
        } else if (cell.type === 'markdown' && cell.isEditingMd) {
          toggleMarkdownEdit(activeFile, targetCellId);
        }
        advanceToNextCell(activeFile, targetCellId);
      }
    }
  }
}, true);

function toggleMarkdownEdit(filename, cellId) {
  const model = notebookModels[filename];
  if (!model) return;
  const cell = model.cells.find(c => c.id === cellId);
  if (!cell) return;

  cell.isEditingMd = !cell.isEditingMd;
  const oldElem = document.getElementById(`wrap_${cellId}`);
  if (oldElem) {
    const idx = model.cells.findIndex(c => c.id === cellId);
    const newElem = createCellElement(filename, cell, idx);
    oldElem.replaceWith(newElem);
    requestAnimationFrame(() => { refreshLucideIcons(); });
  }
}

function addNotebookCell(filename, type) {
  // Appends a new cell at the end of the notebook
  const model = notebookModels[filename];
  const lastCellId = (model && model.cells.length > 0) ? model.cells[model.cells.length - 1].id : null;
  insertNotebookCellAfter(filename, lastCellId, type);
}

function insertNotebookCellAfter(filename, afterCellId, type) {
  const model = notebookModels[filename];
  if (!model) return;

  const newCell = {
    id: `cell_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type: type,
    source: type === 'code' ? '' : '## New Heading\nType markdown here...',
    executionCount: null,
    outputs: [],
    isEditingMd: type === 'markdown'
  };

  let idx = -1;
  if (afterCellId === null) {
    model.cells.push(newCell);
    idx = model.cells.length - 1;
  } else {
    const findIdx = model.cells.findIndex(c => c.id === afterCellId);
    if (findIdx === -1) {
      model.cells.push(newCell);
      idx = model.cells.length - 1;
    } else {
      model.cells.splice(findIdx + 1, 0, newCell);
      idx = findIdx + 1;
    }
  }

  const container = document.getElementById('notebookContainer');
  if (container) {
    const newCellElem = createCellElement(filename, newCell, idx);
    const newDividerElem = createInterCellDivider(filename, newCell.id);

    if (afterCellId && document.getElementById(`wrap_${afterCellId}`)) {
      const afterWrap = document.getElementById(`wrap_${afterCellId}`);
      let refNode = afterWrap.nextElementSibling;
      if (refNode) {
        refNode.after(newCellElem, newDividerElem);
      } else {
        container.appendChild(newCellElem);
        container.appendChild(newDividerElem);
      }
    } else {
      container.appendChild(newCellElem);
      container.appendChild(newDividerElem);
    }

    if (typeof refreshLucideIcons === 'function') refreshLucideIcons();

    if (newCell.type === 'code') {
      initCellMonacoEditor(newCell.id, newCell.source, filename);
    }

    selectNotebookCell(filename, newCell.id, true);
    requestAnimationFrame(() => {
      const editorEl = document.getElementById(`editor_${newCell.id}`);
      if (editorEl) editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  } else {
    const jsonContent = serializeNotebookJSON(filename);
    pyFiles.set(filename, jsonContent);
    renderNotebookUI(filename, jsonContent);
  }

  const updatedJSON = serializeNotebookJSON(filename);
  pyFiles.set(filename, updatedJSON);
  debouncedSaveState();
}

// ── Inter-cell insert divider ──
function createInterCellDivider(filename, afterCellId) {
  const divider = document.createElement('div');
  divider.className = 'inter-cell-divider group flex items-center gap-2 py-0.5 px-2';

  const line = document.createElement('div');
  line.className = 'flex-1 h-px bg-transparent group-hover:bg-base-300 transition-colors duration-150';

  const btnWrap = document.createElement('div');
  btnWrap.className = 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150';

  const codeBtn = document.createElement('button');
  codeBtn.className = 'inter-cell-btn flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border border-primary/40 text-primary bg-base-100 hover:bg-primary hover:text-white transition-all shadow-sm';
  codeBtn.innerHTML = '<i data-lucide="code-2" class="w-3 h-3"></i> Code';
  codeBtn.title = 'Insert Code cell here';
  codeBtn.onclick = () => insertNotebookCellAfter(filename, afterCellId, 'code');

  const mdBtn = document.createElement('button');
  mdBtn.className = 'inter-cell-btn flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border border-secondary/40 text-secondary bg-base-100 hover:bg-secondary hover:text-white transition-all shadow-sm';
  mdBtn.innerHTML = '<i data-lucide="file-text" class="w-3 h-3"></i> Markdown';
  mdBtn.title = 'Insert Markdown cell here';
  mdBtn.onclick = () => insertNotebookCellAfter(filename, afterCellId, 'markdown');

  btnWrap.appendChild(codeBtn);
  btnWrap.appendChild(mdBtn);

  divider.appendChild(line);
  divider.appendChild(btnWrap);
  divider.appendChild(line.cloneNode());

  return divider;
}


function deleteNotebookCell(filename, cellId) {
  const model = notebookModels[filename];
  if (!model) return;

  if (model.cells.length <= 1) {
    if (typeof showToast === 'function') showToast('Notebook must keep at least 1 cell', 'warn');
    return;
  }

  model.cells = model.cells.filter(c => c.id !== cellId);
  if (cellMonacoEditors[cellId]) {
    cellMonacoEditors[cellId].dispose();
    delete cellMonacoEditors[cellId];
  }

  const jsonContent = serializeNotebookJSON(filename);
  pyFiles.set(filename, jsonContent);
  renderNotebookUI(filename, jsonContent);
  debouncedSaveState();
}

function moveNotebookCell(filename, cellId, direction) {
  const model = notebookModels[filename];
  if (!model) return;
  const idx = model.cells.findIndex(c => c.id === cellId);
  if (idx === -1) return;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= model.cells.length) return;

  const temp = model.cells[idx];
  model.cells[idx] = model.cells[targetIdx];
  model.cells[targetIdx] = temp;

  const jsonContent = serializeNotebookJSON(filename);
  pyFiles.set(filename, jsonContent);
  renderNotebookUI(filename, jsonContent);
  debouncedSaveState();
}

async function runNotebookCell(filename, cellId) {
  if (!pyodide) {
    if (typeof showToast === 'function') showToast('Python runtime is loading...', 'warn');
    return;
  }

  const model = notebookModels[filename];
  if (!model) return;
  const cell = model.cells.find(c => c.id === cellId);
  if (!cell || cell.type !== 'code') return;

  const editorInstance = cellMonacoEditors[cellId];
  const code = editorInstance ? editorInstance.getValue() : cell.source;

  const outputContainer = document.getElementById(`output_${cellId}`);
  if (!outputContainer) return;

  outputContainer.classList.remove('hidden');
  outputContainer.innerHTML = '';
  cell.outputs = [];

  // Update cell execution count
  window._notebookExecCounter = (window._notebookExecCounter || 0) + 1;
  cell.executionCount = window._notebookExecCounter;

  // Update header label
  const wrap = document.getElementById(`wrap_${cellId}`);
  if (wrap) {
    const badge = wrap.querySelector('.bg-primary\\/10');
    if (badge) badge.textContent = `In [*]:`;
  }

  setStatus('running', `Executing cell [${cell.executionCount}]...`);

  // Redirect stdout and stderr temporarily to target cell output container
  pyodide.setStdout({ batched: (text) => {
    appendOutput(text, 'stdout', outputContainer);
    if (text.includes('__PLOT__:')) {
      const b64 = text.split('__PLOT__:')[1].trim();
      cell.outputs.push({
        output_type: 'display_data',
        data: { 'image/png': b64 },
        metadata: {}
      });
    } else if (text.includes('__HTML_B64__:')) {
      const b64 = text.split('__HTML_B64__:')[1].trim();
      try {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const html = new TextDecoder().decode(bytes);
        cell.outputs.push({
          output_type: 'execute_result',
          execution_count: cell.executionCount,
          data: { 'text/html': html },
          metadata: {}
        });
      } catch (e) {}
    } else {
      cell.outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: text
      });
    }
  }});
  pyodide.setStderr({ batched: (text) => {
    appendOutput(text, 'stderr', outputContainer);
    cell.outputs.push({
      output_type: 'stream',
      name: 'stderr',
      text: text
    });
  }});

  try {
    pyodide.globals.set('__notebook_code__', code);
    await pyodide.runPythonAsync(`
import ast as _ast
compile(__notebook_code__, '<cell>', 'exec', flags=_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
`);

    await pyodide.loadPackagesFromImports(code);

    const wrappedCode = `
import sys, io, base64, ast, warnings, builtins, pyodide.code as _pycode
warnings.filterwarnings("ignore")

def _nb_displayhook(val):
    if val is None:
        return
    builtins._ = val
    if hasattr(val, '_repr_html_'):
        try:
            h = val._repr_html_()
            if h:
                b64_str = base64.b64encode(str(h).encode('utf-8')).decode('utf-8')
                print("__HTML_B64__:" + b64_str)
                return
        except Exception:
            pass
    if hasattr(val, '_repr_png_'):
        try:
            b64 = val._repr_png_()
            if b64:
                print("__PLOT__:" + str(b64))
                return
        except Exception:
            pass
    print(repr(val))

sys.displayhook = _nb_displayhook

def _display(*args):
    for arg in args:
        sys.displayhook(arg)

builtins.display = _display

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.show = lambda *a, **kw: None
    _plt_avail = True
except Exception:
    _plt_avail = False

_code_tree = ast.parse(__notebook_code__, '<cell>')
if _code_tree.body and isinstance(_code_tree.body[-1], ast.Expr):
    _last_expr = _code_tree.body[-1].value
    _code_tree.body[-1] = ast.Expr(
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id='sys', ctx=ast.Load()),
                attr='displayhook',
                ctx=ast.Load()
            ),
            args=[_last_expr],
            keywords=[]
        )
    )
    ast.fix_missing_locations(_code_tree)

_transformed_code_str = ast.unparse(_code_tree)
await _pycode.eval_code_async(_transformed_code_str, globals(), globals())

if _plt_avail and plt.get_fignums():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120, facecolor='white')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode()
    plt.close('all')
    print(f"__PLOT__:{img_b64}")
`;

    await pyodide.runPythonAsync(wrappedCode);
  } catch (err) {
    const msg = err.message || String(err);
    appendOutput(msg, 'stderr', outputContainer);
    cell.outputs.push({ name: 'stderr', output_type: 'stream', text: msg });
  } finally {
    // Reset stdout/stderr back to main console defaults
    pyodide.setStdout({ batched: (text) => appendOutput(text, 'stdout') });
    pyodide.setStderr({ batched: (text) => appendOutput(text, 'stderr') });

    if (wrap) {
      const badge = wrap.querySelector('.cell-exec-badge');
      if (badge) badge.textContent = `In [${cell.executionCount}]:`;
    }
    if (outputContainer && cell.outputs && cell.outputs.length > 0) {
      addOutputCopyButton(outputContainer);
    }
    setStatus('ready', 'Python 3.11 Ready');
    
    // Sync notebook model JSON
    const updatedJSON = serializeNotebookJSON(filename);
    pyFiles.set(filename, updatedJSON);
    debouncedSaveState();
  }
}

async function runAllNotebookCells(filename) {
  const model = notebookModels[filename];
  if (!model) return;

  for (const cell of model.cells) {
    if (cell.type === 'code') {
      await runNotebookCell(filename, cell.id);
    }
  }
}

// ── Clear all outputs (keeps code intact) and reset execution counter ──
function clearAllNotebookOutputs(filename) {
  const model = notebookModels[filename];
  if (!model) return;

  // Reset the global execution counter so the next run starts at [1]
  window._notebookExecCounter = 0;

  model.cells.forEach(cell => {
    cell.outputs = [];
    cell.executionCount = null;
    // Clear rendered output containers
    const outputEl = document.getElementById(`output_${cell.id}`);
    if (outputEl) {
      outputEl.innerHTML = '';
      outputEl.classList.add('hidden');
    }
    // Reset execution badge back to Jupyter-style 'In [ ]:'
    const wrap = document.getElementById(`wrap_${cell.id}`);
    if (wrap) {
      const badge = wrap.querySelector('.cell-exec-badge');
      if (badge) badge.textContent = 'In [ ]:';
    }
  });

  const jsonContent = serializeNotebookJSON(filename);
  pyFiles.set(filename, jsonContent);
  debouncedSaveState();
}

// ── Restart kernel: full Jupyter-style namespace wipe + re-apply hooks ──
async function restartNotebookKernel(filename) {
  const model = notebookModels[filename];
  if (!model) return;

  if (!pyodide) {
    showToast('Kernel not ready yet', 'warn');
    return;
  }

  // Visual feedback while restarting
  const restartBtn = document.querySelector('#nb-restart-btn');
  if (restartBtn) {
    restartBtn.disabled = true;
    restartBtn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Restarting...';
  }

  try {
    await pyodide.runPythonAsync(`
import sys, builtins, base64

# ── Step 1: Wipe ALL user-defined names ──
# Restore globals() to exactly the pristine snapshot taken at Pyodide init.
# This removes every user variable, module import, and private name
# created since startup — identical to Jupyter's kernel restart behaviour.
_keep = _ELIXIR_CLEAN_NAMESPACE_KEYS
for _k in list(globals().keys()):
    if _k not in _keep and _k != '_keep':
        try:
            del globals()[_k]
        except Exception:
            pass

# ── Step 2: Close any open matplotlib figures ──
try:
    import matplotlib.pyplot as _plt
    _plt.close('all')
    del _plt
except Exception:
    pass

# ── Step 3: Re-apply display hook (it lives in globals, was just wiped) ──
def _custom_displayhook(value):
    if value is None:
        return
    builtins._ = value
    if hasattr(value, '_repr_html_'):
        try:
            html_str = value._repr_html_()
            if html_str:
                b64_str = base64.b64encode(str(html_str).encode('utf-8')).decode('utf-8')
                print(f"__HTML_B64__:{b64_str}")
                return
        except Exception:
            pass
    print(repr(value))

sys.displayhook = _custom_displayhook

# ── Step 4: Re-apply browser input override ──
import js as _js_mod
def _browser_input(prompt_text=""):
    print(prompt_text, end="")
    res = _js_mod.prompt(prompt_text)
    if res is None:
        raise EOFError("EOF when reading a line")
    print(res)
    return res
builtins.input = _browser_input
`);
  } catch (e) {
    console.error('Kernel restart failed:', e);
    showToast('Kernel restart failed — see console', 'error');
    return;
  } finally {
    if (restartBtn) {
      restartBtn.disabled = false;
      restartBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Restart Kernel &amp; Clear Cells';
      requestAnimationFrame(() => { if (window.lucide) lucide.createIcons(); });
    }
  }

  // Clear all cell outputs and reset execution counters to [ ]
  clearAllNotebookOutputs(filename);

  showToast('Kernel restarted — all variables cleared', 'warn');
}


// ── Download .ipynb ──
function downloadNotebook(filename) {
  if (!filename) filename = activeFile;
  if (!filename) return;

  // Flush current Monaco cell editors into the model before serializing
  const model = notebookModels[filename];
  if (model) {
    model.cells.forEach(cell => {
      if (cell.type === 'code' && cellMonacoEditors[cell.id]) {
        cell.source = cellMonacoEditors[cell.id].getValue();
      }
    });
  }

  const json = serializeNotebookJSON(filename);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.split('/').pop(); // e.g. "analysis.ipynb"
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast(`Downloaded ${a.download}`);
}
