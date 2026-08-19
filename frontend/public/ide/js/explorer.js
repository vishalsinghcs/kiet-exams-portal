// ── File upload ──
function processFiles(files) {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      
      if (file.name.endsWith('.py') || file.name.endsWith('.ipynb')) {
        const textData = new TextDecoder().decode(data);
        const fullPath = '/workspace/' + file.name;
        // UX-4: Warn before overwriting existing files
        if (pyFiles.has(fullPath)) {
          showToast(`Replaced existing "${file.name}"`, 'warn');
        }
        pyFiles.set(fullPath, textData);
        openTabs.add(fullPath);
        if (pyodide) {
          pyodide.FS.writeFile(fullPath, textData);
        }
      } else {
        if (uploadedFiles.has(file.name)) {
          showToast(`Replaced existing "${file.name}" in Data`, 'warn');
        }
        uploadedFiles.set(file.name, { data, size: file.size, type: file.type, name: file.name });
        if (pyodide) {
          pyodide.FS.writeFile('/data/' + file.name, data);
        }
      }

      refreshFileLists();
      saveState();
    };
    reader.readAsArrayBuffer(file);
  });
}

function handleFileUpload(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
  event.target.value = '';
}

// Drag-and-drop support
// Guard against null: getElementById may return null if script loads before the DOM element
const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  });
}



let expandedFolders = new Set(['/workspace', '/data', '/output']);

function deletePath(path) {
  if (!pyodide) return;
  const isDir = pyodide.FS.isDir(pyodide.FS.stat(path).mode);

  if (isDir) {
    function rmdirRec(p) {
      pyodide.FS.readdir(p).forEach(f => {
        if (f !== '.' && f !== '..') {
          const cp = p + '/' + f;
          if (pyodide.FS.isDir(pyodide.FS.stat(cp).mode)) rmdirRec(cp);
          else pyodide.FS.unlink(cp);
        }
      });
      pyodide.FS.rmdir(p);
    }
    rmdirRec(path);
  } else {
    pyodide.FS.unlink(path);
  }

  const removePrefix = (map, isAbsolute, prefixPath) => {
    for (const key of map.keys()) {
      let mapAbsPath = isAbsolute ? key : prefixPath + key;

      if (mapAbsPath === path || mapAbsPath.startsWith(path + '/')) {
        map.delete(key);
      }
    }
  };

  removePrefix(pyFiles, true, '');
  removePrefix(uploadedFiles, false, '/data/');

  // Remove deleted paths from openTabs too (B8)
  for (const tab of openTabs) {
    if (tab === path || tab.startsWith(path + '/')) {
      openTabs.delete(tab);
    }
  }

  // If the deleted item was the active file, switch to another open tab (B8 fix)
  if (activeFile && (path === activeFile || activeFile.startsWith(path + '/'))) {
    // Prefer a remaining open tab over any arbitrary file in pyFiles
    const remainingTabs = Array.from(openTabs).filter(t => pyFiles.has(t));
    activeFile = remainingTabs.length > 0 ? remainingTabs[0] : null;
    // Use '' as fallback — setEditorCode(null, undefined) would throw in Monaco
    setEditorCode(activeFile, activeFile ? (pyFiles.get(activeFile) || '') : '');
  }

  refreshFileLists();
  toggleEmptyState();
  renderTabs();
}

function renderFileTree() {
  const container = document.getElementById('fileExplorerTree');
  if (!container || !pyodide) return;
  container.innerHTML = '';

  const rootFolders = ['/workspace', '/data', '/output'];

  rootFolders.forEach(root => {
    container.appendChild(createTreeNode(root, root, true));
  });

  refreshLucideIcons();
}

function createTreeNode(path, name, isRoot) {
  const node = document.createElement('div');
  node.className = 'tree-node';

  const rawName = name.replace(/^\//, '');
  let displayName = rawName;
  if (rawName === 'workspace') displayName = 'Workspace';
  if (rawName === 'output') displayName = 'Output';
  if (rawName === 'data') displayName = 'Data';

  const item = document.createElement('div');
  let isActive = (path === activeFile);
  let baseItemClass = 'tree-item group flex items-center gap-2 px-2.5 py-[5px] rounded-lg cursor-pointer transition-all font-mono text-[11.5px] relative mb-px ';
  if (isActive) {
    baseItemClass += 'bg-primary text-primary-content font-semibold shadow-sm';
  } else {
    baseItemClass += 'text-base-content/65 hover:bg-base-200 hover:text-base-content';
  }
  item.className = baseItemClass;

  let isDir = false;
  try {
    const stat = pyodide.FS.stat(path);
    isDir = pyodide.FS.isDir(stat.mode);
  } catch (e) { }

  if (isDir) {
    const isExpanded = expandedFolders.has(path);

    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'tree-folder-toggle text-base-content/40 hover:text-base-content mr-1 transition-transform' + (isExpanded ? ' rotate-90' : '');
    toggleSpan.innerHTML = '<i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'mr-1.5 text-primary/70';
    iconSpan.innerHTML = isExpanded
      ? '<i data-lucide="folder-open" class="w-4 h-4"></i>'
      : '<i data-lucide="folder" class="w-4 h-4"></i>';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'fp-file-name font-semibold';
    nameSpan.textContent = displayName;

    const leftWrap = document.createElement('div');
    leftWrap.className = 'flex items-center';
    leftWrap.appendChild(toggleSpan);
    leftWrap.appendChild(iconSpan);
    leftWrap.appendChild(nameSpan);
    item.appendChild(leftWrap);

    item.onclick = (e) => {
      if (e.target.closest('.fp-file-action')) return;
      if (expandedFolders.has(path)) {
        expandedFolders.delete(path);
      } else {
        expandedFolders.add(path);
      }
      refreshFileLists();
    };
  } else {
    const spacer = document.createElement('span');
    spacer.style.width = '18px';
    spacer.style.display = 'inline-block';
    item.appendChild(spacer);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'fp-file-name tree-file';
    nameSpan.textContent = name;
    item.appendChild(nameSpan);

    item.onclick = (e) => {
      if (e.target.closest('.fp-file-action')) return;
      if (!path.startsWith('/workspace/')) {
        openFilePreviewModal(path, name);
        return;
      }
      if (!pyFiles.has(path)) {
        try {
          const content = pyodide.FS.readFile(path, { encoding: 'utf8' });
          pyFiles.set(path, content);
        } catch (err) {
          showToast('Cannot open binary files in the editor', 'warn'); // B9: replaced alert()
          return;
        }
      }
      switchActiveFile(path);
    };
  }

  const actions = document.createElement('div');
  actions.className = 'fp-file-action hidden group-hover:flex items-center gap-0.5 absolute right-1 top-1/2 -translate-y-1/2 bg-base-100/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-base-200/60';

  if (isDir) {
    // Action buttons for folders (workspace, output, data, or subfolders)
    if (path.startsWith('/workspace')) {
      const addFileBtn = document.createElement('div');
      addFileBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
      addFileBtn.innerHTML = '<i data-lucide="file-plus" class="w-3 h-3"></i>';
      addFileBtn.title = 'New File in ' + displayName;
      addFileBtn.onclick = (e) => {
        e.stopPropagation();
        expandedFolders.add(path);
        promptCreateFile(path);
      };
      actions.appendChild(addFileBtn);

      const addFolderBtn = document.createElement('div');
      addFolderBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
      addFolderBtn.innerHTML = '<i data-lucide="folder-plus" class="w-3 h-3"></i>';
      addFolderBtn.title = 'New Folder in ' + displayName;
      addFolderBtn.onclick = (e) => {
        e.stopPropagation();
        expandedFolders.add(path);
        promptCreateFolder(path);
      };
      actions.appendChild(addFolderBtn);
    }

    // Download Folder button (output, data, workspace, or subfolders)
    const dlFolderBtn = document.createElement('div');
    dlFolderBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
    dlFolderBtn.innerHTML = '<i data-lucide="download" class="w-3 h-3"></i>';
    dlFolderBtn.title = 'Download files in ' + displayName;
    dlFolderBtn.onclick = (e) => {
      e.stopPropagation();
      downloadFolder(path);
    };
    actions.appendChild(dlFolderBtn);

    // Copy Folder Path button
    const pathFolderBtn = document.createElement('div');
    pathFolderBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
    pathFolderBtn.innerHTML = '<i data-lucide="link-2" class="w-3 h-3"></i>';
    pathFolderBtn.title = 'Get folder path';
    pathFolderBtn.onclick = (e) => {
      e.stopPropagation();
      showFilePathModal(path);
    };
    actions.appendChild(pathFolderBtn);

    if (!isRoot) {
      const delBtn = document.createElement('div');
      delBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-error hover:bg-error/15';
      delBtn.innerHTML = '<i data-lucide="trash-2" class="w-3 h-3"></i>';
      delBtn.title = 'Delete folder';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        showDeleteConfirmModal(path);
      };
      actions.appendChild(delBtn);
    }
  } else {
    // Action buttons for files (output, data, workspace)
    if (!isRoot) {
      const viewBtn = document.createElement('div');
      viewBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
      viewBtn.innerHTML = '<i data-lucide="eye" class="w-3 h-3"></i>';
      viewBtn.title = 'View file content';
      viewBtn.onclick = (e) => {
        e.stopPropagation();
        openFilePreviewModal(path, name);
      };
      actions.appendChild(viewBtn);

      const dlBtn = document.createElement('div');
      dlBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
      dlBtn.innerHTML = '<i data-lucide="download" class="w-3 h-3"></i>';
      dlBtn.title = 'Download';
      dlBtn.onclick = (e) => {
        e.stopPropagation();
        try {
          if (name.endsWith('.ipynb') && typeof downloadNotebook === 'function') {
            downloadNotebook(path);
            return;
          }
          const data = pyodide.FS.readFile(path);
          const blob = new Blob([data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) { console.error('Download failed:', e); }
      };
      actions.appendChild(dlBtn);

      const pathBtn = document.createElement('div');
      pathBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-primary hover:bg-primary/15';
      pathBtn.innerHTML = '<i data-lucide="link-2" class="w-3 h-3"></i>';
      pathBtn.title = 'Get file path';
      pathBtn.onclick = (e) => {
        e.stopPropagation();
        showFilePathModal(path);
      };
      actions.appendChild(pathBtn);

      const delBtn = document.createElement('div');
      delBtn.className = 'btn btn-ghost btn-xs btn-square min-h-0 h-5 w-5 text-base-content/40 hover:text-error hover:bg-error/15';
      delBtn.innerHTML = '<i data-lucide="trash-2" class="w-3 h-3"></i>';
      delBtn.title = 'Delete';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        showDeleteConfirmModal(path);
      };
      actions.appendChild(delBtn);
    }
  }

  item.appendChild(actions);
  node.appendChild(item);

  if (isDir) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children' + (expandedFolders.has(path) ? ' expanded' : '');

    try {
      const files = pyodide.FS.readdir(path).filter(f => f !== '.' && f !== '..');
      files.forEach(f => {
        childrenContainer.appendChild(createTreeNode(path + '/' + f, f, false));
      });
    } catch (e) { }

    node.appendChild(childrenContainer);
  }

  return node;
}

// ── File Path Modal ──
function showFilePathModal(path) {
  const modal = document.getElementById('filePathModal');
  const input = document.getElementById('filePathInput');
  if (!modal || !input) return;

  input.value = path;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    refreshLucideIcons();
    input.focus();
    input.select();
  });
}

function closeFilePathModal() {
  const modal = document.getElementById('filePathModal');
  if (modal) modal.classList.add('hidden');
}

function copyFilePathInput() {
  const input = document.getElementById('filePathInput');
  if (input && input.value) {
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('File path copied to clipboard');
    }).catch(() => {
      showToast('Failed to copy file path', 'error');
    });
  }
}

// insertReadCode alias removed — was dead code (RED-6)

function refreshFileLists() {
  if (pyodide) {
    renderFileTree();
    debouncedSaveState(); // Use debounced version — called on every tab switch & tree render
  }
}

// ── Workspace Management ──

function renderTabs() {
  const tabBar = DOM.tabBar;
  if (!tabBar) return;

  // Remove existing tabs
  Array.from(tabBar.querySelectorAll('.editor-tab')).forEach(t => t.remove());

  // Insert tabs before the add button — iterate openTabs, NOT pyFiles
  // Closing a tab only removes it from openTabs; the file remains in pyFiles
  const addBtn = tabBar.querySelector('.tab-add-btn');

  Array.from(openTabs).forEach(pathKey => {
    if (!pyFiles.has(pathKey)) {
      openTabs.delete(pathKey); // Clean up stale tab if file was deleted
      return;
    }

    const tab = document.createElement('div');
    let tabClass = 'editor-tab group flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono cursor-pointer rounded-t-lg transition-all whitespace-nowrap border border-b-0 ';
    if (pathKey === activeFile) tabClass += 'text-primary bg-base-100 font-bold border-base-300 shadow-sm -mb-px z-10';
    else tabClass += 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-700 border-transparent';
    tab.className = tabClass;
    
    // File icon
    const icon = document.createElement('i');
    const isNb = isNotebookFile(pathKey);
    icon.setAttribute('data-lucide', isNb ? 'book-open' : 'file-code-2');
    icon.className = 'w-3.5 h-3.5';
    if (pathKey === activeFile) icon.classList.add(isNb ? 'text-secondary' : 'text-primary');
    tab.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = pathKey.split('/').pop();
    tab.appendChild(nameSpan);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'w-4 h-4 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all text-gray-400 hover:text-error';
    closeBtn.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
    closeBtn.title = 'Close tab (file stays in Explorer)';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      // Save current buffer before closing
      if (pathKey === activeFile && pyFiles.has(pathKey)) {
        if (isNotebookFile(pathKey)) {
          pyFiles.set(pathKey, serializeNotebookJSON(pathKey));
        } else {
          pyFiles.set(pathKey, getEditorCode());
        }
      }
      // Remove tab only — file stays in pyFiles and Explorer
      openTabs.delete(pathKey);
      if (typeof editorModels !== 'undefined' && editorModels[pathKey]) {
        editorModels[pathKey].dispose();
        delete editorModels[pathKey];
      }
      if (activeFile === pathKey) {
        // Switch to another open tab if available
        const remainingTabs = Array.from(openTabs);
        activeFile = remainingTabs.length > 0 ? remainingTabs[0] : null;
        if (activeFile) {
          setEditorCode(activeFile, pyFiles.get(activeFile) || '');
        } else {
          setEditorCode(null, '');
        }
      }
      renderTabs();
      refreshFileLists();
      toggleEmptyState();
    };
    tab.appendChild(closeBtn);

    tab.onclick = () => switchActiveFile(pathKey);

    tabBar.insertBefore(tab, addBtn);
  });
  refreshLucideIcons();
}

function switchActiveFile(filename) {
  if (activeFile === filename) return;

  // BUG-2: Save unconditionally when switching away from a notebook
  if (activeFile) {
    if (typeof isNotebookFile === 'function' && isNotebookFile(activeFile) && notebookModels[activeFile]) {
      pyFiles.set(activeFile, serializeNotebookJSON(activeFile));
    } else if (pyFiles.has(activeFile)) {
      pyFiles.set(activeFile, getEditorCode());
    }
  }

  activeFile = filename;
  openTabs.add(filename); // Ensure this file has an open tab

  const codeEditorEl = document.getElementById('codeEditor');
  const notebookContainerEl = document.getElementById('notebookContainer');

  if (isNotebookFile(filename)) {
    // Show Notebook Container, Hide Monaco Standard Editor
    if (codeEditorEl) codeEditorEl.style.display = 'none';
    if (notebookContainerEl) notebookContainerEl.style.display = 'block'; // R5: use style.display only
    const content = pyFiles.get(filename) || createEmptyNotebookJSON();
    renderNotebookUI(filename, content);
  } else {
    // Show Monaco Standard Editor, Hide Notebook Container
    if (notebookContainerEl) notebookContainerEl.style.display = 'none'; // R5: use style.display only
    if (codeEditorEl) codeEditorEl.style.display = 'block';
    setEditorCode(filename, pyFiles.get(filename) || '');
  }

  clearEditorErrors();
  renderTabs();
  refreshFileLists();
  toggleEmptyState();
}

function toggleEmptyState() {
  const emptyWorkspace = DOM.emptyWorkspace;
  const paneHeader = DOM.paneHeader;
  const codeEditorEl = document.getElementById('codeEditor');
  const notebookContainerEl = document.getElementById('notebookContainer');
  const runBtn = DOM.runBtn;
  const activeFilenameEl = DOM.activeFilename;
  const blurTargets = document.querySelectorAll('.ide-blur-target');

  // Check if any files exist in the workspace directory (pyFiles or uploadedFiles)
  const hasFiles = pyFiles.size > 0 || uploadedFiles.size > 0;

  if (!hasFiles) {
    // Completely empty project: Show welcome overlay & apply blur
    if (emptyWorkspace) emptyWorkspace.classList.remove('hidden');
    blurTargets.forEach(el => el.classList.add('blurred'));

    if (paneHeader) paneHeader.style.display = 'none';
    if (codeEditorEl) codeEditorEl.style.display = 'none';
    if (notebookContainerEl) notebookContainerEl.style.display = 'none';
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Run';
      refreshLucideIcons();
    }
  } else {
    // Files exist in directory: NEVER apply blur or show welcome modal
    if (emptyWorkspace) emptyWorkspace.classList.add('hidden');
    blurTargets.forEach(el => el.classList.remove('blurred'));

    if (activeFile) {
      // An open file tab is active
      if (paneHeader) paneHeader.style.display = 'flex';
      if (activeFilenameEl) activeFilenameEl.textContent = activeFile.split('/').pop();
      if (runBtn) runBtn.disabled = false;

      if (isNotebookFile && isNotebookFile(activeFile)) {
        if (codeEditorEl) codeEditorEl.style.display = 'none';
        if (notebookContainerEl) notebookContainerEl.style.display = 'block';
      } else {
        if (notebookContainerEl) notebookContainerEl.style.display = 'none';
        if (codeEditorEl) codeEditorEl.style.display = 'block';
        setTimeout(() => { if (editor) editor.layout(); }, 10);
      }
    } else {
      // All tabs are closed, but files still exist in explorer
      if (paneHeader) paneHeader.style.display = 'none';
      if (codeEditorEl) codeEditorEl.style.display = 'none';
      if (notebookContainerEl) notebookContainerEl.style.display = 'none';
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Run';
        refreshLucideIcons();
      }
    }
  }
}

// ── New File Modal ──
let _selectedFileType = 'py'; // tracks which file type is selected in the modal
let _targetCreateFolder = '/workspace'; // tracks target directory for new file

function promptCreateFile(targetFolder = '/workspace') {
  _targetCreateFolder = (targetFolder && targetFolder.startsWith('/workspace')) ? targetFolder : '/workspace';
  _selectedFileType = 'py';

  const input = document.getElementById('newFileNameInput');
  const extLabel = document.getElementById('newFileExtLabel');
  const locationBadge = document.getElementById('newFileLocationBadge');

  if (input) { input.value = ''; }
  if (extLabel) extLabel.textContent = '.py';

  if (locationBadge) {
    const relPath = _targetCreateFolder.replace(/^\/workspace\/?/, '');
    locationBadge.textContent = relPath ? `in Workspace/${relPath}` : 'in Workspace';
    locationBadge.title = _targetCreateFolder;
  }

  // Reset button highlights
  selectFileType('py', /* openModal= */ false);
  // Show modal
  const modal = document.getElementById('newFileModal');
  if (modal) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      refreshLucideIcons();
      if (input) input.focus();
    });
  }
}

function selectFileType(ext, openModal = true) {
  _selectedFileType = ext;
  // Type → accent color map
  const accentMap = {
    py:    'border-primary bg-primary/5 text-primary',
    ipynb: 'border-secondary bg-secondary/5 text-secondary',
    txt:   'border-tertiary bg-tertiary/5 text-tertiary',
  };
  const hoverMap = {
    py:    'border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5',
    ipynb: 'border-gray-200 text-gray-500 hover:border-secondary hover:text-secondary hover:bg-secondary/5',
    txt:   'border-gray-200 text-gray-500 hover:border-tertiary hover:text-tertiary hover:bg-tertiary/5',
  };
  ['py', 'ipynb', 'txt'].forEach(t => {
    const btn = document.getElementById(`typeBtn_${t}`);
    if (!btn) return;
    btn.className = `file-type-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all `;
    if (t === ext) {
      btn.className += accentMap[t];
    } else {
      btn.className += hoverMap[t];
    }
  });
  const extLabel = document.getElementById('newFileExtLabel');
  if (extLabel) extLabel.textContent = '.' + ext;
  // Update input focus ring color
  const input = document.getElementById('newFileNameInput');
  if (input && openModal) input.focus();
}

function closeNewFileModal() {
  const modal = document.getElementById('newFileModal');
  if (modal) modal.classList.add('hidden');
}

function confirmNewFile() {
  const input = document.getElementById('newFileNameInput');
  let rawName = input ? input.value.trim() : '';

  if (!rawName) {
    if (input) input.focus();
    return;
  }

  // Prevent backslash, path traversal, null bytes
  if (rawName.includes('\\') || rawName.includes('..') || rawName.includes('\0')) {
    showToast('Invalid file path — .. or backslashes not allowed', 'error');
    return;
  }

  rawName = rawName.replace(/^\/+/, '');
  if (!rawName) {
    if (input) input.focus();
    return;
  }

  const ext = _selectedFileType;

  // Extract typed extension if present
  let nameWithoutExt = rawName;
  const lastSlash = rawName.lastIndexOf('/');
  const filenamePart = lastSlash >= 0 ? rawName.substring(lastSlash + 1) : rawName;
  const dirPart = lastSlash >= 0 ? rawName.substring(0, lastSlash) : '';

  const dotIdx = filenamePart.lastIndexOf('.');
  if (dotIdx > 0) {
    nameWithoutExt = (dirPart ? dirPart + '/' : '') + filenamePart.substring(0, dotIdx);
  }

  const fileNameWithExt = nameWithoutExt + '.' + ext;
  
  // Construct full absolute path in workspace
  const baseDir = _targetCreateFolder.endsWith('/') ? _targetCreateFolder.slice(0, -1) : _targetCreateFolder;
  const fullPath = (baseDir + '/' + fileNameWithExt).replace(/\/+/g, '/');

  if (!fullPath.startsWith('/workspace/')) {
    showToast('Files must be created inside Workspace', 'error');
    return;
  }

  if (pyFiles.has(fullPath)) {
    showToast(`"${fullPath.split('/').pop()}" already exists at this location`, 'warn');
    return;
  }

  // Ensure any parent subdirectories exist in Pyodide FS
  if (pyodide) {
    const lastSlashIdx = fullPath.lastIndexOf('/');
    if (lastSlashIdx > 0) {
      const dirPath = fullPath.substring(0, lastSlashIdx);
      const parts = dirPath.split('/').filter(Boolean);
      let curr = '';
      for (const p of parts) {
        curr += '/' + p;
        try {
          if (!pyodide.FS.analyzePath(curr).exists) {
            pyodide.FS.mkdir(curr);
          }
          expandedFolders.add(curr);
        } catch (e) {}
      }
    }
  }

  const initialContent = ext === 'ipynb' ? createEmptyNotebookJSON() : '';

  pyFiles.set(fullPath, initialContent);
  if (pyodide) {
    try { pyodide.FS.writeFile(fullPath, initialContent); } catch (e) {}
  }

  openTabs.add(fullPath);
  closeNewFileModal();
  refreshFileLists();
  switchActiveFile(fullPath);
  showToast(`Created ${fullPath.split('/').pop()}`);
}

let _targetCreateParentFolder = '/workspace';

function promptCreateFolder(parentFolder = '/workspace') {
  _targetCreateParentFolder = (parentFolder && parentFolder.startsWith('/workspace')) ? parentFolder : '/workspace';

  const input = document.getElementById('newFolderNameInput');
  const locationBadge = document.getElementById('newFolderLocationBadge');

  if (input) { input.value = ''; }
  if (locationBadge) {
    const relPath = _targetCreateParentFolder.replace(/^\/workspace\/?/, '');
    locationBadge.textContent = relPath ? `in Workspace/${relPath}` : 'in Workspace';
    locationBadge.title = _targetCreateParentFolder;
  }

  const modal = document.getElementById('newFolderModal');
  if (modal) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      refreshLucideIcons();
      if (input) input.focus();
    });
  }
}

function closeNewFolderModal() {
  const modal = document.getElementById('newFolderModal');
  if (modal) modal.classList.add('hidden');
}

function confirmNewFolder() {
  const input = document.getElementById('newFolderNameInput');
  let name = input ? input.value.trim() : '';

  if (!name) {
    if (input) input.focus();
    return;
  }

  if (name.includes('\\') || name.includes('..') || name.includes('\0')) {
    showToast('Invalid folder path — .. or backslashes not allowed', 'error');
    return;
  }

  name = name.replace(/^\/+/, '');
  if (!name) {
    if (input) input.focus();
    return;
  }

  const baseDir = _targetCreateParentFolder.endsWith('/') ? _targetCreateParentFolder.slice(0, -1) : _targetCreateParentFolder;
  const targetPath = (baseDir + '/' + name).replace(/\/+/g, '/');

  if (!targetPath.startsWith('/workspace/')) {
    showToast('Folders must be created inside Workspace', 'error');
    return;
  }

  try {
    if (pyodide) {
      const parts = targetPath.split('/').filter(Boolean);
      let curr = '';
      for (const p of parts) {
        curr += '/' + p;
        try {
          if (!pyodide.FS.analyzePath(curr).exists) {
            pyodide.FS.mkdir(curr);
          }
          expandedFolders.add(curr);
        } catch (e) {}
      }
    }
    expandedFolders.add(baseDir);
    closeNewFolderModal();
    refreshFileLists();
    showToast(`Created folder "${name.split('/').pop()}"`);
  } catch (e) {
    showToast('Could not create folder. It may already exist.', 'warn');
  }
}
// ── Manual Save ──
async function manualSave() {
  const btn = DOM.saveBtn;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Saving…';
  }
  if (activeFile && isNotebookFile(activeFile)) {
    pyFiles.set(activeFile, serializeNotebookJSON(activeFile));
  }
  await saveState();
  if (btn) setBtn(btn, 'save', 'Save');
  showToast('Workspace saved');
}

// ── File Preview Modal (Rich Viewers: SheetJS, PapaParse, Monaco, AG Grid) ──
let agGridInstance = null;
let monacoPreviewEditor = null;
let currentPreviewWorkbook = null;
let currentPreviewRawData = null;
let currentPreviewPath = null;

function openFilePreviewModal(path, fileName) {
  const modal = document.getElementById('filePreviewModal');
  const title = document.getElementById('filePreviewTitle');
  const badge = document.getElementById('fileTypeBadge');
  const sizeLabel = document.getElementById('filePreviewSize');
  const gridContainer = document.getElementById('filePreviewGridContainer');
  const monacoContainer = document.getElementById('filePreviewMonacoContainer');
  const textContainer = document.getElementById('filePreviewTextContainer');
  const sheetSelectorContainer = document.getElementById('sheetSelectorContainer');
  const sheetSelect = document.getElementById('excelSheetSelect');

  if (!modal || !pyodide) return;

  const actualFileName = fileName || path.split('/').pop();
  const ext = actualFileName.split('.').pop().toLowerCase();

  title.textContent = actualFileName;
  badge.textContent = ext.toUpperCase();
  currentPreviewPath = path;

  // Hide containers & reset state
  gridContainer.classList.add('hidden');
  monacoContainer.classList.add('hidden');
  textContainer.classList.add('hidden');
  sheetSelectorContainer.classList.add('hidden');
  sheetSelect.innerHTML = '';
  
  if (agGridInstance) {
    agGridInstance.destroy();
    agGridInstance = null;
  }
  gridContainer.innerHTML = '';

  try {
    const rawData = pyodide.FS.readFile(path);
    currentPreviewRawData = rawData;
    sizeLabel.textContent = `${rawData.length.toLocaleString()} bytes`;

    if (ext === 'csv' || ext === 'tsv') {
      // 📊 CSV / TSV Parsing via PapaParse & AG Grid
      gridContainer.classList.remove('hidden');
      const text = new TextDecoder().decode(rawData);
      const delimiter = ext === 'tsv' ? '\t' : '';
      
      Papa.parse(text, {
        delimiter: delimiter,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.data && results.data.length > 1) {
            _renderGridFrom2DArray(gridContainer, results.data);
          } else {
            gridContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">No data rows found in this file.</div>';
          }
        },
        error: function(err) {
          gridContainer.innerHTML = '';
          const errDiv = document.createElement('div');
          errDiv.className = 'flex items-center justify-center h-full text-red-400 text-sm';
          errDiv.textContent = `Parse error: ${err.message || String(err)}`;
          gridContainer.appendChild(errDiv);
        }
      });

    } else if (ext === 'xlsx' || ext === 'xls') {
      // 📗 Excel files via SheetJS & AG Grid
      gridContainer.classList.remove('hidden');
      sheetSelectorContainer.classList.remove('hidden');

      const workbook = XLSX.read(rawData, { type: 'array' });
      currentPreviewWorkbook = workbook;

      workbook.SheetNames.forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        sheetSelect.appendChild(option);
      });

      renderExcelSheet(workbook.SheetNames[0]);

    } else if (ext === 'json') {
      // 🌐 JSON files via Monaco Editor (Read-Only)
      monacoContainer.classList.remove('hidden');
      const text = new TextDecoder().decode(rawData);
      let formattedJson = text;
      try {
        formattedJson = JSON.stringify(JSON.parse(text), null, 2);
      } catch (e) { }

      if (window.monaco) {
        if (!monacoPreviewEditor) {
          monacoPreviewEditor = monaco.editor.create(monacoContainer, {
            value: formattedJson,
            language: 'json',
            readOnly: true,
            theme: 'vs',
            minimap: { enabled: false },
            automaticLayout: true,
            fontSize: 12,
            scrollBeyondLastLine: false,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            wordBasedSuggestions: "off",
            snippetSuggestions: "none"
          });
        } else {
          monacoPreviewEditor.setValue(formattedJson);
          monaco.editor.setModelLanguage(monacoPreviewEditor.getModel(), 'json');
        }
      }

    } else {
      // 📄 Text / Code / Fallback files
      textContainer.classList.remove('hidden');
      const textEl = document.getElementById('filePreviewContent');
      let textContent = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        textContent = decoder.decode(rawData);
      } catch (err) {
        textContent = '[Binary File - Cannot display content as text]';
      }
      textEl.textContent = textContent;
    }

  } catch (err) {
    textContainer.classList.remove('hidden');
    document.getElementById('filePreviewContent').textContent = 'Error loading preview: ' + err.message;
  }

  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    refreshLucideIcons();
    if (monacoPreviewEditor && !monacoContainer.classList.contains('hidden')) {
      monacoPreviewEditor.layout();
    }
  });
}

// ── Shared Grid Renderer (RED-1 dedup) ──
function _renderGridFrom2DArray(container, data2D) {
  if (agGridInstance) {
    agGridInstance.destroy();
    agGridInstance = null;
  }
  container.innerHTML = '';

  if (!data2D || data2D.length === 0) return;

  const headers = data2D[0];
  const rows = data2D.slice(1);

  const columnDefs = headers.map((h, i) => ({
    headerName: (h !== undefined && h !== null && h !== '') ? String(h) : `Column ${i + 1}`,
    field: `col_${i}`,
    sortable: true,
    filter: true,
    resizable: true
  }));

  const rowData = rows.map(r => {
    const rowObj = {};
    headers.forEach((_, i) => {
      rowObj[`col_${i}`] = r[i] !== undefined ? r[i] : '';
    });
    return rowObj;
  });

  const gridOptions = {
    columnDefs,
    rowData,
    pagination: true,
    paginationPageSize: 100,
    defaultColDef: { flex: 1, minWidth: 100 }
  };
  agGridInstance = agGrid.createGrid(container, gridOptions);
}

function renderExcelSheet(sheetName) {
  const gridContainer = document.getElementById('filePreviewGridContainer');
  if (!currentPreviewWorkbook || !gridContainer) return;

  const sheet = currentPreviewWorkbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  _renderGridFrom2DArray(gridContainer, jsonData);
}

// onExcelSheetChange was a one-liner wrapper around renderExcelSheet.
// The HTML select's onchange now calls renderExcelSheet(this.value) directly.

function closeFilePreviewModal() {
  const modal = document.getElementById('filePreviewModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (agGridInstance) {
    agGridInstance.destroy();
    agGridInstance = null;
  }
  if (monacoPreviewEditor) {
    monacoPreviewEditor.dispose();
    monacoPreviewEditor = null;
  }
}

function copyPreviewContent() {
  let textToCopy = '';

  const monacoContainer = document.getElementById('filePreviewMonacoContainer');
  const textContainer = document.getElementById('filePreviewTextContainer');

  if (monacoPreviewEditor && !monacoContainer.classList.contains('hidden')) {
    textToCopy = monacoPreviewEditor.getValue();
  } else if (!textContainer.classList.contains('hidden')) {
    textToCopy = document.getElementById('filePreviewContent').textContent;
  } else if (currentPreviewRawData) {
    try {
      textToCopy = new TextDecoder().decode(currentPreviewRawData);
    } catch (e) { }
  }

  if (textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Content copied to clipboard');
    }).catch(() => {
      showToast('Failed to copy content');
    });
  }
}
