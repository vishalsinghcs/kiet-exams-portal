// ── Debounced Lucide Icon Refresh (RED-3) ──
// Coalesces multiple requestAnimationFrame calls into a single DOM walk.
let _lucidePending = false;
function refreshLucideIcons() {
  if (_lucidePending) return;
  _lucidePending = true;
  requestAnimationFrame(() => {
    if (window.lucide) lucide.createIcons();
    _lucidePending = false;
  });
}

// ── Console open / close / toggle ──
function _syncConsoleToggleBtn(isOpen) {
  const btn = DOM.consoleToggleBtn;
  if (!btn) return;
  if (isOpen) {
    btn.style.color = '#4F46E5';
    btn.style.backgroundColor = 'rgba(79,70,229,0.08)';
  } else {
    btn.style.color = '';
    btn.style.backgroundColor = '';
  }
}

function closeConsole() {
  const pane = DOM.outputPane;
  const resizer = DOM.hResizer;
  if (pane) pane.classList.add('console-hidden');
  if (resizer) resizer.classList.add('console-hidden');
  _syncConsoleToggleBtn(false);
}

function openConsole() {
  const pane = DOM.outputPane;
  const resizer = DOM.hResizer;
  if (pane) pane.classList.remove('console-hidden');
  if (resizer) resizer.classList.remove('console-hidden');
  _syncConsoleToggleBtn(true);
}

function toggleConsole() {
  const pane = DOM.outputPane;
  if (!pane) return;
  if (pane.classList.contains('console-hidden')) {
    openConsole();
  } else {
    closeConsole();
  }
}

// ── Vertical console resize (drag h-resizer) ──
(function initVerticalResize() {
  const resizer = DOM.hResizer;
  const outputPane = DOM.outputPane;
  if (!resizer || !outputPane) return;

  let startY = 0;
  let startH = 0;

  const startDrag = (clientY) => {
    startY = clientY;
    startH = outputPane.getBoundingClientRect().height;
    resizer.classList.add('dragging');
  };

  const moveDrag = (clientY) => {
    const delta = startY - clientY;   // drag up = bigger console
    const newH = Math.min(Math.max(startH + delta, 120), window.innerHeight * 0.7);
    outputPane.style.height = newH + 'px';
  };

  const stopDrag = () => {
    resizer.classList.remove('dragging');
  };

  resizer.addEventListener('mousedown', (e) => {
    startDrag(e.clientY);

    const onMove = (ev) => moveDrag(ev.clientY);
    const onUp = () => {
      stopDrag();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  resizer.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientY);

    const onTouchMove = (ev) => {
      if (ev.touches.length === 1) moveDrag(ev.touches[0].clientY);
    };
    const onTouchEnd = () => {
      stopDrag();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: true });
})();

// ── Utility state helper ──
function setStatus(state, text) {
  const dot = DOM.statusDot;
  const label = DOM.statusText;
  if (!dot || !label) return; // Guard: may be called before DOM is ready

  dot.className = 'w-2 h-2 rounded-full transition-colors ';
  if (state === 'ready') dot.className += 'bg-success';
  else if (state === 'running') dot.className += 'bg-primary animate-pulse';
  else if (state === 'error') dot.className += 'bg-error';
  else dot.className += 'bg-warning animate-pulse';

  label.textContent = text;
}

// ── Reusable button icon setter ──
// Avoids duplicated innerHTML + createIcons pattern scattered across files.
// Usage: setBtn(runBtn, 'play', 'Run') or setBtn(saveBtn, 'save', 'Save')
function setBtn(btn, iconName, label) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i>${label ? ' ' + label : ''}`;
  refreshLucideIcons();
}

// ── Toast notification (Stitch Theme with Lucide icons) ──
// SEC-2 fix: Uses textContent instead of innerHTML interpolation to prevent XSS
function showToast(msg, type = 'success') {
  const toast = DOM.toast;
  if (!toast) return;

  const iconMap = {
    success: 'check-circle-2',
    warn: 'alert-triangle',
    error: 'x-circle',
    info: 'info'
  };

  const iconName = iconMap[type] || 'info';

  // Strip any leading text/emoji symbols so ONLY Lucide icons are rendered
  const cleanMsg = String(msg || '').replace(/^[\s✓🔄✔❌⚠️]+/, '').trim();

  // Build DOM safely — no innerHTML interpolation with user strings
  toast.innerHTML = '';
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', iconName);
  icon.className = 'w-4 h-4 shrink-0';
  const span = document.createElement('span');
  span.className = 'truncate';
  span.textContent = cleanMsg;
  toast.appendChild(icon);
  toast.appendChild(span);

  toast.className = `toast-notification toast-${type} toast-show`;
  refreshLucideIcons();

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = `toast-notification toast-${type}`;
  }, 2800);
}

// ── Clear Browser Storage ──
function showClearStorageModal() {
  const modal = DOM.clearStorageModal;
  if (modal) modal.classList.remove('hidden');
}

function hideClearStorageModal() {
  const modal = DOM.clearStorageModal;
  if (modal) modal.classList.add('hidden');
}

async function confirmClearStorage() {
  hideClearStorageModal();
  try {
    sessionStorage.clear();

    // Fix 10: Save a soft signal BEFORE clearing localStorage, then re-set it after.
    // This lets the landing page show a "workspace was cleared" notice next visit.
    // Fix 3: Also remove the ever-launched flag so the landing page re-appears.
    localStorage.clear();
    // Re-set the cleared signal (localStorage.clear() wiped it above)
    localStorage.setItem('elixir_ide_workspace_cleared', '1');
    // Note: elixir_ide_ever_launched is intentionally NOT re-set,
    // so the flash-guard does not hide the landing page on next visit.

    const db = await openDB();
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').clear();
    tx.oncomplete = () => {
      showToast('Workspace cleared — returning to setup…', 'warn');
      setTimeout(() => location.reload(), 600);
    };
  } catch (err) {
    showToast('Failed to clear storage', 'error');
    console.error(err);
  }
}

// ── Download All Workspace Files (Fix 9) ──
// Triggers a download for each .py / .ipynb file in pyFiles.
// Surfaced as "Download Files First" in the Clear Storage modal.
function downloadAllWorkspaceFiles() {
  if (!pyFiles || pyFiles.size === 0) {
    showToast('No workspace files to download', 'warn');
    return;
  }
  let count = 0;
  for (const [filePath, content] of pyFiles.entries()) {
    const filename = filePath.split('/').pop();
    const isNotebook = filename.endsWith('.ipynb');

    let blob;
    if (isNotebook) {
      // For notebooks, serialize the live model if available, otherwise use saved content
      const liveContent = (typeof serializeNotebookJSON === 'function' && typeof notebookModels !== 'undefined' && notebookModels[filePath])
        ? serializeNotebookJSON(filePath)
        : content;
      blob = new Blob([liveContent], { type: 'application/json' });
    } else {
      blob = new Blob([content], { type: 'text/x-python' });
    }

    // Stagger downloads slightly so the browser doesn't block multiple simultaneous saves
    setTimeout(() => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, count * 150);
    count++;
  }
  showToast(`Downloading ${count} file${count !== 1 ? 's' : ''}…`, 'info');
}

// ── Delete Confirmation Modal (UX-1) ──
let _pendingDeletePath = null;

function showDeleteConfirmModal(path) {
  _pendingDeletePath = path;
  const modal = DOM.deleteConfirmModal;
  const msgEl = DOM.deleteConfirmMsg;
  if (!modal) return;

  const displayName = path.split('/').pop();
  let isDir = false;
  try {
    if (pyodide) {
      isDir = pyodide.FS.isDir(pyodide.FS.stat(path).mode);
    }
  } catch (e) {}

  if (msgEl) {
    msgEl.textContent = isDir
      ? `Delete folder "${displayName}" and all its contents? This action cannot be undone.`
      : `Delete "${displayName}"? This action cannot be undone.`;
  }

  modal.classList.remove('hidden');
  refreshLucideIcons();
}

function hideDeleteConfirmModal() {
  const modal = DOM.deleteConfirmModal;
  if (modal) modal.classList.add('hidden');
  _pendingDeletePath = null;
}

function executeDeleteConfirm() {
  const path = _pendingDeletePath;
  hideDeleteConfirmModal();
  if (path) {
    try {
      deletePath(path);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }
}

// ── Copy Output ──
async function copyOutput() {
  const content = DOM.outputContent;
  if (!content) return;
  const outputEmpty = DOM.outputEmpty;
  if (outputEmpty && outputEmpty.style.display !== 'none' && content.children.length <= 1) {
    showToast('Nothing to copy', 'warn');
    return;
  }
  try {
    await navigator.clipboard.writeText(content.innerText.trim());
    showToast('Output copied', 'success');
  } catch (err) {
    showToast('Failed to copy', 'error');
    console.error(err);
  }
}

// ── Shortcuts Modal ──
function showShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  if (modal) {
    modal.classList.remove('hidden');
    refreshLucideIcons();
  }
}

function hideShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  if (modal) modal.classList.add('hidden');
}
