// ── Init Monaco Editor ──
const editorModels = {};
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
  const container = document.getElementById('codeEditor');
  
  editor = monaco.editor.create(container, {
    value: '',
    language: 'python',
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
    lineHeight: 24,
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
    roundedSelection: true,
    renderLineHighlight: "all",
    acceptSuggestionOnEnter: "off",
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: "off",
    snippetSuggestions: "none",
    tabCompletion: "off",
  });

  editor.onDidChangeModelContent(() => {
    // Fix 2: Mark workspace as dirty so beforeunload can warn on unsaved changes
    window._isDirty = true;
    debouncedSaveState();
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
    runCode();
  });


  monaco.languages.registerDocumentFormattingEditProvider('python', {
    provideDocumentFormattingEdits: async (model, options, _token) => {
      if (!window.pyodide) return [];
      try {
        const code = model.getValue();
        // Pass code via pyodide.globals to avoid JS template-literal injection issues
        // (e.g. user code containing backticks or ${...} would break interpolation)
        pyodide.globals.set('__fmt_code__', code);
        const formatted = await pyodide.runPythonAsync(
          'import black as _black; _black.format_str(__fmt_code__, mode=_black.FileMode())'
        );
        return [{
          range: model.getFullModelRange(),
          text: formatted
        }];
      } catch (err) {
        // Surface formatting errors as a toast so the user knows why Shift+Alt+F failed
        if (typeof showToast === 'function') showToast('Format error: ' + (err.message || err), 'warn');
        console.error('Formatting error:', err);
        return [];
      }
    }
  });

  setTimeout(() => {
    restoreWorkspaceState();
  }, 0);
});


// ── Editor helpers ──

// I2: Derive Monaco language from file extension — was always 'python' before.
function getLanguageForFile(filename) {
  if (!filename) return 'python';
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    py: 'python',
    txt: 'plaintext',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    js: 'javascript',
  };
  return langMap[ext] || 'python';
}

function getEditorCode() {
  return editor ? editor.getValue() : '';
}

function setEditorCode(filename, code) {
  if (!editor || !window.monaco) return;
  if (!filename) {
    editor.setModel(null);
    return;
  }
  const lang = getLanguageForFile(filename);
  if (!editorModels[filename]) {
    editorModels[filename] = monaco.editor.createModel(code, lang);
  } else {
    if (editorModels[filename].getValue() !== code) {
      editorModels[filename].setValue(code);
    }
  }
  editor.setModel(editorModels[filename]);
}

function clearEditorErrors() {
  if (!editor || !window.monaco) return;
  const model = editor.getModel();
  if (!model) return;
  monaco.editor.setModelMarkers(model, 'python', []);
}

function markEditorErrors(errMsg) {
  clearEditorErrors();
  if (!editor || !window.monaco) return;
  
  const lineRe = /[Ll]ine (\d+)/g;
  let match;
  const markers = [];
  const marked = new Set();
  const maxLines = editor.getModel().getLineCount();
  
  while ((match = lineRe.exec(errMsg)) !== null) {
    const lineNo = parseInt(match[1], 10);
    if (!marked.has(lineNo)) {
      marked.add(lineNo);
      const lastLine = errMsg.split('\n').filter(Boolean).pop() || 'Error';
      
      const validLineNo = Math.min(Math.max(1, lineNo), maxLines);
      const lineContent = editor.getModel().getLineContent(validLineNo) || '';
      
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: lastLine,
        startLineNumber: validLineNo,
        startColumn: 1,
        endLineNumber: validLineNo,
        endColumn: lineContent.length + 1
      });
    }
  }
  
  if (markers.length > 0) {
    monaco.editor.setModelMarkers(editor.getModel(), 'python', markers);
  }
}

function downloadActiveFile() {
  if (!activeFile) return;

  // .ipynb files must be serialized from the notebook model, not from Monaco text
  if (activeFile.endsWith('.ipynb')) {
    if (typeof downloadNotebook === 'function') downloadNotebook(activeFile);
    return;
  }

  const code = getEditorCode();
  const mimeType = activeFile.endsWith('.txt') ? 'text/plain' : 'text/x-python';
  const blob = new Blob([code], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = activeFile.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
