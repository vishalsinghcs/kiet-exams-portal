// ── Single keydown handler: keyboard shortcuts ──
// S10: DevTools blocking (F12, Ctrl+Shift+I, Ctrl+U) removed.
// It is security theatre — it does nothing when DevTools is already open,
// and it actively blocks legitimate developers from debugging their code.
document.addEventListener('keydown', function (event) {
  const ctrl = event.ctrlKey || event.metaKey;
  const key  = event.key.toLowerCase();

  // ── Keyboard shortcuts ──
  if (ctrl && key === 's') { event.preventDefault(); manualSave(); return; }
  if (ctrl && key === 'y') {
    event.preventDefault();
    if (typeof editor !== 'undefined' && editor) editor.trigger('keyboard', 'redo', null);
    return;
  }
  if (ctrl && key === 'n') { event.preventDefault(); promptCreateFile(); return; }
  if (ctrl && key === '`') { event.preventDefault(); toggleConsole(); return; }
  if (event.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && !document.activeElement?.classList?.contains('inputarea')) {
    event.preventDefault();
    showShortcutsModal();
    return;
  }
  if (event.key === 'Escape') {
    const shortcutsModal = document.getElementById('shortcutsModal');
    if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
      hideShortcutsModal();
      return;
    }
    const newFileModal = document.getElementById('newFileModal');
    if (newFileModal && !newFileModal.classList.contains('hidden')) {
      closeNewFileModal();
      return;
    }
    const newFolderModal = document.getElementById('newFolderModal');
    if (newFolderModal && !newFolderModal.classList.contains('hidden')) {
      closeNewFolderModal();
      return;
    }
    const filePathModal = document.getElementById('filePathModal');
    if (filePathModal && !filePathModal.classList.contains('hidden')) {
      closeFilePathModal();
      return;
    }
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    if (deleteConfirmModal && !deleteConfirmModal.classList.contains('hidden')) {
      hideDeleteConfirmModal();
      return;
    }
    const clearStorageModal = document.getElementById('clearStorageModal');
    if (clearStorageModal && !clearStorageModal.classList.contains('hidden')) {
      hideClearStorageModal();
      return;
    }
    const filePreviewModal = document.getElementById('filePreviewModal');
    if (filePreviewModal && !filePreviewModal.classList.contains('hidden')) {
      closeFilePreviewModal();
      return;
    }
  }
});

// ── Fix 2: beforeunload guard for unsaved edits ──
// Only fires the browser "Leave site?" dialog when the editor has changes
// that haven't yet been flushed to IndexedDB (i.e. within the 800ms debounce window).
window.addEventListener('beforeunload', (e) => {
  if (window._isDirty) {
    e.preventDefault();
    e.returnValue = ''; // Required for Chrome to show the native dialog
  }
});

// ── Launch IDE transition ──
function launchIDE() {
  // Fix 3: Persist the launched flag in localStorage so it survives tab close/reopen.
  // sessionStorage is wiped when the tab closes, so the flash-guard in <head> was
  // never firing on tab-reopen — causing a brief landing page flash.
  try {
    localStorage.setItem('elixir_ide_ever_launched', 'true');
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
  // Fix 6: Give the Launch IDE button instant loading feedback on click.
  const launchBtn = document.querySelector('button[onclick="launchIDE()"]');
  if (launchBtn) {
    launchBtn.disabled = true;
    launchBtn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Launching…';
  }

  const loadingOverlay = document.getElementById('loadingOverlay');

  if (loadingOverlay && !window._elixirKernelReady) {
    loadingOverlay.classList.remove('hidden');
  }

  initPyodide();
}

// ── Check startup state ──
async function checkStartupState() {
  if (typeof refreshLucideIcons === 'function') refreshLucideIcons();
  
  // Detect if page was reloaded (F5 / Cmd+R / Reload button)
  let isReload = false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      isReload = (navEntries[0].type === 'reload');
    } else if (performance.navigation) {
      isReload = (performance.navigation.type === 1);
    }
  } catch (e) {
    console.warn('Navigation timing check error:', e);
  }

  const state = await loadState();
  const hasSavedData = Boolean(state && (state.pyFiles?.length > 0 || state.activeFile));
  const loadingOverlay = document.getElementById('loadingOverlay');
  const reloadBar = document.getElementById('reloadProgressBar');

  if (isReload) {
    // ── CASE 1: PAGE REFRESH ──
    // Open IDE immediately so code & files are visible.
    // Show the slim shimmer bar and locked Run button while kernel re-inits.
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    // Fix 5: Show reload shimmer progress bar below the top nav
    if (reloadBar) reloadBar.classList.remove('hidden');

    // Fix 4: Show locked Run button with spinner while Pyodide loads
    _setRunBtnLoading();

    if (typeof setStatus === 'function' && !window._elixirKernelReady) {
      setStatus('loading', 'Initializing Python 3.11...');
    }
    initPyodide();

  } else if (hasSavedData) {
    // ── CASE 2: TAB CLOSED & REOPENED WITH SAVED DATA ──
    // Show IDE directly with "Welcome back" toast.
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    // Fix 5: Show reload shimmer progress bar
    if (reloadBar) reloadBar.classList.remove('hidden');

    // Fix 4: Show locked Run button with spinner while Pyodide loads
    _setRunBtnLoading();

    // Fix 1: Read file count directly from state (pyFiles is still empty here —
    // restoreWorkspaceState() runs later inside Monaco's ready callback).
    const fileCount = state?.pyFiles?.length || 0;
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(
          fileCount > 0
            ? `Welcome back! Workspace restored (${fileCount} file${fileCount !== 1 ? 's' : ''})`
            : 'Welcome back! Workspace restored',
          'info'
        );
      }
    }, 400);

    if (typeof setStatus === 'function' && !window._elixirKernelReady) {
      setStatus('loading', 'Initializing Python 3.11...');
    }
    initPyodide();

  } else {
    // ── CASE 3: FIRST VISIT / CLEARED HISTORY & STORAGE ──
    // In embedded mode (like the Exam Environment), there is no landing page.
    // We auto-launch the IDE immediately.
    launchIDE();

    // Fix 10: If the user cleared their workspace via the in-app modal,
    // show a contextual notice strip on the landing page.
    try {
      const wasCleared = localStorage.getItem('elixir_ide_workspace_cleared');
      if (wasCleared) {
        const notice = document.getElementById('clearedNotice');
        if (notice) notice.classList.add('visible');
        localStorage.removeItem('elixir_ide_workspace_cleared');
      }
    } catch (e) { /* localStorage unavailable */ }
  }
}

// ── Fix 4: Shared helper — puts the Run button in a locked loading state ──
// Called during page refresh and tab-reopen paths while Pyodide initialises.
// The state is cleared automatically by initPyodide() success path (setBtn + disabled=false).
function _setRunBtnLoading() {
  const runBtn = DOM.runBtn;
  if (!runBtn) return;
  runBtn.disabled = true;
  runBtn.title = 'Python runtime loading…';
  runBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Loading...';
  if (typeof refreshLucideIcons === 'function') refreshLucideIcons();
}

checkStartupState();

// ── Exam Portal Integration ──
window.loadExamFiles = async function(datasetUrl, sampleUrl) {
  try {
    let filesLoaded = 0;
    if (datasetUrl) {
      const res = await fetch(datasetUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      uploadedFiles.set('dataset.zip', {
        name: 'dataset.zip',
        size: blob.size,
        type: blob.type || 'application/zip',
        data: new Uint8Array(arrayBuffer)
      });
      filesLoaded++;
    }
    if (sampleUrl) {
      const res = await fetch(sampleUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      uploadedFiles.set('sample.csv', {
        name: 'sample.csv',
        size: blob.size,
        type: blob.type || 'text/csv',
        data: new Uint8Array(arrayBuffer)
      });
      filesLoaded++;
    }
    
    if (filesLoaded > 0) {
      debouncedSaveState();
      refreshFileLists();
      if (typeof showToast === 'function') {
        showToast('Exam resources automatically loaded!', 'success');
      }
    }
  } catch (e) {
    console.error("Failed to load exam files automatically:", e);
  }
};
