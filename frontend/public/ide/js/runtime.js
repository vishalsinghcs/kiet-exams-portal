// ── Network blocking ──
// Uses URL hostname matching to prevent substring bypass attacks
// e.g., https://evil.com/?q=cdn.jsdelivr.net would incorrectly pass an includes() check
function isUrlAllowed(urlStr) {
  if (typeof urlStr !== 'string') urlStr = String(urlStr);
  if (urlStr.startsWith('blob:') || urlStr.startsWith('data:')) return true;
  try {
    const url = new URL(urlStr, window.location.href);

    // Allow same-origin requests (local workspace assets, relative URLs)
    if (url.origin === window.location.origin || url.protocol === 'file:') {
      return true;
    }
    
    // jsDelivr: allow Pyodide distribution assets across all jsDelivr edge mirrors (*.jsdelivr.net / *.jsdelivr.com)
    if (url.hostname.endsWith('.jsdelivr.net') || url.hostname.endsWith('.jsdelivr.com')) {
      return url.pathname.includes('/pyodide');
    }

    const allowedHosts = ['pypi.org', 'files.pythonhosted.org', 'pypi.python.org'];
    return allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
}

const originalFetch = window.fetch;
window.fetch = async function (url, ...args) {
  const urlStr = String(url);
  if (!isUrlAllowed(urlStr)) {
    // Guard: DOM may not exist yet if fetch is called before store.js runs
    DOM?.networkBanner?.classList.remove('hidden');
    throw new TypeError(`Network access blocked: ${urlStr}`);
  }
  return originalFetch.apply(this, [url, ...args]);
};

// Override only xhr.open — preserves instanceof, prototype, and static constants (DONE, etc.)
const OrigXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function () {
  const xhr = new OrigXHR();
  const origOpen = xhr.open.bind(xhr);
  xhr.open = function (method, url, ...rest) {
    const urlStr = String(url);
    if (!isUrlAllowed(urlStr)) {
      // Guard: DOM may not exist yet if XHR is opened before store.js runs
      DOM?.networkBanner?.classList.remove('hidden');
      throw new TypeError(`Network access blocked: ${urlStr}`);
    }
    return origOpen(method, url, ...rest);
  };
  return xhr;
};
// Copy static constants (XMLHttpRequest.DONE, .OPENED, etc.) so instanceof and static checks work
Object.setPrototypeOf(window.XMLHttpRequest, OrigXHR);
['UNSENT','OPENED','HEADERS_RECEIVED','LOADING','DONE'].forEach(k => {
  Object.defineProperty(window.XMLHttpRequest, k, { value: OrigXHR[k], enumerable: true });
});

// Block WebSocket, EventSource, and sendBeacon (SEC-6)
window.WebSocket = function () { throw new TypeError('Network access blocked: WebSocket is disabled in this sandbox'); };
window.EventSource = function () { throw new TypeError('Network access blocked: EventSource is disabled in this sandbox'); };
if (navigator && typeof navigator.sendBeacon === 'function') {
  navigator.sendBeacon = function () { return false; };
}

// ── Init Pyodide ──
let pyodideInitStarted = false;
async function initPyodide() {
  if (pyodideInitStarted) return;
  pyodideInitStarted = true;
  try {
    const progress = DOM.loaderProgress;
    const updateProgress = (val) => { if (progress) progress.value = val; };

    const highlightBadge = (name) => {
      document.querySelectorAll('.loader-pkg').forEach(b => {
        if (b.textContent.toLowerCase().includes(name.toLowerCase())) {
          b.className = 'loader-pkg text-[11px] font-mono bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-md text-emerald-700 font-bold flex items-center gap-1.5 shadow-2xs animate-pulse';
        }
      });
    };

    setStatus('loading', 'Loading runtime...');
    if (DOM.loaderText) DOM.loaderText.textContent = '[1/4] Downloading Pyodide (~10 MB)...';
    updateProgress(10);

    pyodide = await loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/` });
    updateProgress(35);

    if (DOM.loaderText) DOM.loaderText.textContent = '[2/4] Loading ML packages (numpy, pandas, sklearn)...';
    setStatus('loading', 'Loading packages...');

    ['numpy', 'pandas', 'scipy', 'sklearn', 'matplotlib'].forEach(pkg => highlightBadge(pkg));
    await pyodide.loadPackage(['numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib', 'micropip']);
    updateProgress(65);

    try {
      if (DOM.loaderText) DOM.loaderText.textContent = '[3/4] Installing PyPI packages (seaborn, openpyxl)...';
      ['seaborn', 'imbalanced-learn'].forEach(pkg => highlightBadge(pkg));
      const micropip = pyodide.pyimport('micropip');
      await micropip.install(['seaborn', 'openpyxl', 'imbalanced-learn==0.11.0']);
    } catch (pipErr) {
      console.warn('Optional PyPI packages failed to install:', pipErr);
    }
    updateProgress(85);

    // Setup filesystem safely (BUG-4)
    ['/data', '/output', '/workspace'].forEach(dir => {
      try {
        if (!pyodide.FS.analyzePath(dir).exists) {
          pyodide.FS.mkdir(dir);
        }
      } catch (e) {}
    });

    // Sync any files uploaded before Pyodide finished loading
    for (const [name, fileObj] of uploadedFiles.entries()) {
      try {
        pyodide.FS.writeFile('/data/' + name, fileObj.data);
      } catch (e) {
        console.error(`Failed to write pre-uploaded file ${name} to Pyodide FS:`, e);
      }
    }

    // Sync any workspace files loaded from state
    for (const [name, content] of pyFiles.entries()) {
      try {
        pyodide.FS.writeFile(name, content);
      } catch (e) {
        console.error(`Failed to write workspace file ${name} to Pyodide FS:`, e);
      }
    }

    // --- Inject Exam Dataset & Sample CSV ---
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const examId = urlParams.get('examId');
      const token = urlParams.get('token');
      const API_BASE = urlParams.get('apiBaseUrl');

      if (examId && token && API_BASE) {
        setStatus('loading', 'Downloading dataset...');
        if (DOM.loaderText) DOM.loaderText.textContent = '[4/4] Injecting exam resources...';

        // 1. Download Dataset Zip
        try {
          const dsRes = await originalFetch(`${API_BASE}/users/me/exams/${examId}/dataset`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (dsRes.ok) {
            const buffer = await dsRes.arrayBuffer();
            try { pyodide.FS.mkdir('/data/dataset'); } catch(e) {}
            pyodide.unpackArchive(buffer, 'zip', { extractDir: '/data/dataset' });
            console.log('Dataset unpacked to /data/dataset');
          }
        } catch (e) {
          console.warn('Dataset download skipped/failed:', e);
        }

        // 2. Download Sample CSV
        try {
          const csvRes = await originalFetch(`${API_BASE}/users/me/exams/${examId}/sample-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (csvRes.ok) {
            const buffer = await csvRes.arrayBuffer();
            const dataView = new Uint8Array(buffer);
            pyodide.FS.writeFile('/data/sample.csv', dataView);
            console.log('Sample CSV saved to /data');
          }
        } catch (e) {
          console.warn('Sample CSV download skipped/failed:', e);
        }
        
        // Refresh the file explorer UI so the student sees the injected files immediately
        if (typeof renderFileTree === 'function') {
          renderFileTree();
        }
      }
    } catch (e) {
      console.error('Error during exam resource injection:', e);
    }
    // ----------------------------------------

    await pyodide.runPythonAsync(`
import sys, os, base64
os.chdir('/output')
if '/workspace' not in sys.path:
    sys.path.append('/workspace')

import matplotlib
matplotlib.use('Agg')

import builtins
import js

def _browser_input(prompt_text=""):
    # Print the prompt so it appears in the console
    print(prompt_text, end="")
    # Show browser prompt dialog
    res = js.prompt(prompt_text)
    if res is None:
        raise EOFError("EOF when reading a line")
    # Print the result so it echoes in the console like a real terminal
    print(res)
    return res

builtins.input = _browser_input


class BlockedSocket:
    def __init__(self, *a, **kw):
        raise PermissionError("Network access is disabled in this environment.")
    def __getattr__(self, name):
        raise PermissionError("Network access is disabled in this environment.")

import socket as _socket_module
_socket_module.socket = BlockedSocket

import urllib.request as _urllib
def _blocked_urlopen(*a, **kw):
    raise PermissionError("Network access is disabled. urllib is blocked.")
_urllib.urlopen = _blocked_urlopen
_urllib.urlretrieve = _blocked_urlopen  # also block urlretrieve (S5)

import http.client as _http
def _blocked_http(*a, **kw):
    raise PermissionError("Network access is disabled. http.client is blocked.")
_http.HTTPConnection = type('BlockedHTTP', (), {'__init__': _blocked_http})
_http.HTTPSConnection = type('BlockedHTTPS', (), {'__init__': _blocked_http})

# Block common third-party HTTP libraries (S6)
# These may be pre-installed or installed via micropip
class _BlockedNetworkModule:
    """Sentinel that raises PermissionError on any attribute access."""
    def __getattr__(self, name):
        raise PermissionError(f"Network access is disabled. This module is blocked in the sandbox.")
    def __call__(self, *a, **kw):
        raise PermissionError("Network access is disabled.")

for _blocked_mod_name in ('requests', 'httpx', 'aiohttp', 'urllib3', 'httplib2'):
    if _blocked_mod_name in sys.modules:
        sys.modules[_blocked_mod_name] = _BlockedNetworkModule()



# Rich HTML display hook (for DataFrames, Series, etc.)
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
sys.displayhook = _custom_displayhook

def _display(*args):
    for arg in args:
        sys.displayhook(arg)

builtins.display = _display

# ── Snapshot clean namespace for kernel restart ──
# Capture the exact set of names that exist in a pristine environment.
# restartNotebookKernel() will restore globals() to exactly these keys,
# wiping every user-defined variable, import, and private name created since.
import js as _js_ref
_ELIXIR_CLEAN_NAMESPACE_KEYS = frozenset(list(globals().keys()) + ['_ELIXIR_CLEAN_NAMESPACE_KEYS'])

print("✓ Security layer & Rich HTML hook initialized")
    `);
    // Fix 8: Final step label
    if (DOM.loaderText) DOM.loaderText.textContent = '[4/4] Setting up filesystem...';
    // Expose the restart helper to JS so restartNotebookKernel() can call it cleanly
    window._elixirKernelReady = true;
    updateProgress(100);

    if (DOM.loaderText) DOM.loaderText.textContent = 'All packages ready!';
    setStatus('ready', 'Python 3.11 Ready');
    // Fix 4: Fully reset the Run button — not just disabled=false, because
    // _setRunBtnLoading() changed innerHTML to a spinner. setBtn() restores
    // the play icon + "Run" label and re-enables the button in one call.
    setBtn(DOM.runBtn, 'play', 'Run');
    refreshFileLists();

    // Fix 5: Hide the reload shimmer progress bar once kernel is fully ready
    const reloadBar = document.getElementById('reloadProgressBar');
    if (reloadBar) reloadBar.classList.add('hidden');

    setTimeout(() => {
      if (DOM.loadingOverlay) DOM.loadingOverlay.classList.add('hidden');
    }, 500);

  } catch (err) {
    console.error('Pyodide init failed:', err);
    pyodideInitStarted = false;
    const loaderText = DOM.loaderText;
    if (loaderText) {
      loaderText.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-2';

      const title = document.createElement('span');
      title.className = 'text-red-600 font-semibold text-sm';
      title.textContent = '❌ Failed to load Python runtime';

      const msg = document.createElement('span');
      msg.className = 'text-xs text-gray-500 max-w-sm text-center';
      msg.textContent = err.message || String(err);

      const btn = document.createElement('button');
      btn.className = 'mt-2 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all cursor-pointer';
      btn.textContent = 'Retry Loading';
      btn.onclick = () => initPyodide();

      wrapper.appendChild(title);
      wrapper.appendChild(msg);
      wrapper.appendChild(btn);
      loaderText.appendChild(wrapper);
    }
    setStatus('error', 'Load failed');
  }
}

// ── Run code ──
async function runCode() {
  if (!pyodide) { showToast('Python runtime is still loading…', 'warn'); return; }
  if (isRunning || !activeFile) return;

  if (typeof isNotebookFile === 'function' && isNotebookFile(activeFile)) {
    runAllNotebookCells(activeFile);
    return;
  }

  isRunning = true;

  const code = getEditorCode();
  pyFiles.set(activeFile, code); // Save current editor content

  // Sync all files to Pyodide filesystem
  // NOTE: pyFiles keys are already absolute paths (e.g. /workspace/main.py)
  // Do NOT prepend '/workspace/' again — that would create double-prefixed paths
  for (const [name, content] of pyFiles.entries()) {
    try {
      pyodide.FS.writeFile(name, content);
    } catch (e) {
      console.error(`Failed to sync workspace file ${name} to Pyodide FS:`, e);
    }
  }

  openConsole();       // Always show console when running
  clearEditorErrors();

  const runBtn = DOM.runBtn;
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Running...';
  }
  setStatus('running', 'Executing...');
  DOM.networkBanner?.classList.add('hidden');

  const outputEl = DOM.outputContent;
  const emptyEl = DOM.outputEmpty;
  if (emptyEl) emptyEl.style.display = 'none';
  if (outputEl) {
    Array.from(outputEl.querySelectorAll('.output-line, .exec-time, img')).forEach(e => e.remove());
  }
  consoleHistory = [];

  const startTime = performance.now();
  let hasOutput = false;

  pyodide.setStdout({ batched: (text) => { appendOutput(text, 'stdout'); hasOutput = true; } });
  pyodide.setStderr({ batched: (text) => { appendOutput(text, 'stderr'); hasOutput = true; } });

  try {
    // ── Step 1: Real syntax check via ast.parse ──
    // Pass code via pyodide.globals to avoid breaking the JS template literal
    // if user code contains backticks, backslashes, or ${...} expressions.
    setStatus('running', 'Checking syntax...');
    pyodide.globals.set('__elixir_code__', code);
    try {
      await pyodide.runPythonAsync(`
import ast as _ast
compile(__elixir_code__, '<input>', 'exec', flags=_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
`);
    } catch (syntaxErr) {
      const msg = syntaxErr.message || String(syntaxErr);
      appendOutput(msg, 'stderr');
      markEditorErrors(msg);
      hasOutput = true;
      throw syntaxErr;
    }

    setStatus('running', 'Resolving dependencies...');
    await pyodide.loadPackagesFromImports(code);
    setStatus('running', 'Executing...');

    // Code is passed via Python global — not interpolated into the JS template string
    const wrappedCode = `
import sys, io, base64, ast, warnings, builtins, pyodide.code as _pycode
warnings.filterwarnings("ignore")

def _display(*args):
    for arg in args:
        sys.displayhook(arg)

builtins.display = _display

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    plt.show = lambda *a, **kw: None
    _plt_available = True
except Exception:
    _plt_available = False

_code_tree = ast.parse(__elixir_code__, '<input>')
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

if _plt_available and plt.get_fignums():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120, facecolor='white')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode()
    plt.close('all')
    print(f"__PLOT__:{img_b64}")
`;

    // exec() never returns a value; output is captured via stdout/stderr hooks above
    await pyodide.runPythonAsync(wrappedCode);
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('Network access blocked') || msg.includes('Network access is disabled')) {
      appendOutput('🚫 NETWORK BLOCKED: ' + msg, 'blocked');
      DOM.networkBanner.classList.remove('hidden');
    } else {
      appendOutput(msg, 'stderr');
      markEditorErrors(msg);
    }
    hasOutput = true;
  } finally {
    // Reset stdout/stderr back to default console hooks
    pyodide.setStdout({ batched: (text) => appendOutput(text, 'stdout') });
    pyodide.setStderr({ batched: (text) => appendOutput(text, 'stderr') });

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    const timeEl = document.createElement('div');
    timeEl.className = 'exec-time';
    timeEl.textContent = `⏱ ${elapsed}s`;
    outputEl.appendChild(timeEl);
    consoleHistory.push({ type: 'time', text: `⏱ ${elapsed}s` });
    DOM.execTimeLabel.textContent = elapsed + 's';

    if (!hasOutput) appendOutput('(no output)', 'info');

    refreshFileLists();

    setStatus('ready', 'Python 3.11 Ready');
    setBtn(runBtn, 'play', 'Run');
    isRunning = false;
    saveState();
  }
}

function appendOutput(text, type, targetContainer = null) {
  const outputEl = targetContainer || DOM.outputContent;
  if (!outputEl) return;

  if (text.includes('__PLOT__:')) {
    const b64 = text.split('__PLOT__:')[1].trim();
    const imgSrc = `data:image/png;base64,${b64}`;
    const img = document.createElement('img');
    img.src = imgSrc;
    img.className = 'plot-output-img';
    outputEl.appendChild(img);
    if (!targetContainer) consoleHistory.push({ type: 'plot', src: imgSrc });
    return;
  }

  if (text.includes('__HTML_B64__:')) {
    const b64 = text.split('__HTML_B64__:')[1].trim();
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const htmlContent = new TextDecoder().decode(bytes);

      if (targetContainer && !targetContainer.querySelector('.notebook-out-prompt')) {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'notebook-out-prompt';
        promptDiv.textContent = `Out [${window._notebookExecCounter || 1}]:`;
        outputEl.appendChild(promptDiv);
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'output-html-container';
      const purOptions = {
        ADD_TAGS: ['style', 'input', 'label', 'svg', 'path', 'rect', 'text', 'g'],
        ADD_ATTR: ['checked', 'for', 'class', 'id', 'type', 'viewBox', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'transform', 'data-*']
      };
      wrapper.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlContent, purOptions) : htmlContent;
      outputEl.appendChild(wrapper);
      if (!targetContainer) consoleHistory.push({ type: 'html', html: htmlContent });
      return;
    } catch (e) {
      console.error('Failed to decode __HTML_B64__:', e);
    }
  }

  // Note: __HTML__: (unencoded) branch was removed — the Python displayhook
  // now always emits __HTML_B64__: (Base64-encoded) to prevent splitting by Pyodide's
  // batched stdout. This comment is intentionally kept for future reference.

  const lines = text.split('\n');
  lines.forEach(line => {
    if (!line && lines.length > 1) return;
    const div = document.createElement('div');
    div.className = `output-line ${type}`;
    div.textContent = line;
    outputEl.appendChild(div);
    if (!targetContainer) consoleHistory.push({ type: 'line', class: type, text: line });
  });
  // Auto-scroll to latest output
  outputEl.scrollTop = outputEl.scrollHeight;
}

function clearOutput() {
  const outputEl = DOM.outputContent;
  if (outputEl) {
    Array.from(outputEl.querySelectorAll('.output-line, .exec-time, img')).forEach(e => e.remove());
  }
  consoleHistory = [];
  if (DOM.outputEmpty) DOM.outputEmpty.style.display = 'flex';
  if (DOM.execTimeLabel) DOM.execTimeLabel.textContent = '';
  DOM.networkBanner?.classList.add('hidden');
  saveState();
}

