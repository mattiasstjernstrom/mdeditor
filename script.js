document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const wordCountEl = document.getElementById('word-count');
    const readTimeEl = document.getElementById('read-time');
    const viewMarkdownBtn = document.getElementById('view-markdown-btn');
    const markdownModal = document.getElementById('markdown-modal');
    const markdownInput = document.getElementById('markdown-input');
    const applyMarkdownBtn = document.getElementById('apply-markdown');
    const toggleSplitViewBtn = document.getElementById('toggle-split-view');
    const sourceWrapper = document.getElementById('source-wrapper');
    const sourceCode = document.getElementById('source-code');
    const exportHtmlBtn = document.getElementById('export-html');

    const commandPalette = document.getElementById('command-palette');
    const commandInput = document.getElementById('command-input');
    const commandResults = document.getElementById('command-results');
    const findBox = document.getElementById('find-box');
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');

    const outlineBtn = document.getElementById('outline-btn');
    const outlineSidebar = document.getElementById('outline-sidebar');
    const outlineContent = document.getElementById('outline-content');

    // Source editing elements
    const sourceTextarea = document.getElementById('source-textarea');
    const sourceView = document.getElementById('source-view');
    const toggleSourceEditBtn = document.getElementById('toggle-source-edit');
    const copySourceBtn = document.getElementById('copy-source');
    let isSourceEditMode = false;

    const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    turndownService.use(turndownPluginGfm.gfm);

    // --- Core Functions ---
    const updateStats = () => {
        const text = editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordCountEl.innerText = `${words} ord`;
        readTimeEl.innerText = `Ca ${Math.ceil(words / 200)} min läsning`;
    };

    const updateSourceView = () => {
        if (sourceWrapper && !sourceWrapper.classList.contains('hidden')) {
            const markdown = turndownService.turndown(editor.innerHTML);
            const lines = markdown.split('\n');

            // Create line-numbered HTML
            const html = lines.map((line, i) => {
                const lineNum = String(i + 1).padStart(3, ' ');
                const escapedLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || ' ';
                return `<span class="source-line" data-line="${i + 1}"><span class="line-number">${lineNum}</span>${escapedLine}</span>`;
            }).join('\n');

            sourceCode.innerHTML = html;
            highlightCursorLine();
        }
    };

    const highlightCursorLine = () => {
        if (!sourceWrapper || sourceWrapper.classList.contains('hidden')) return;

        // Get current selection in editor
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let node = range.startContainer;

        // Find the block-level element the cursor is in
        while (node && node !== editor) {
            if (node.nodeType === 1) {
                const tagName = node.tagName.toLowerCase();
                if (['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'pre', 'table'].includes(tagName)) {
                    break;
                }
            }
            node = node.parentNode;
        }

        if (!node || node === editor) return;

        // Find position of this element among siblings
        const elements = editor.querySelectorAll('p, h1, h2, h3, h4, li, blockquote, pre, table, tr');
        let lineIndex = 0;
        for (let i = 0; i < elements.length; i++) {
            if (elements[i] === node || elements[i].contains(node)) {
                lineIndex = i;
                break;
            }
        }

        // Highlight corresponding line in source
        const sourceLines = sourceCode.querySelectorAll('.source-line');
        sourceLines.forEach(el => el.classList.remove('active'));

        if (sourceLines[lineIndex]) {
            sourceLines[lineIndex].classList.add('active');
            sourceLines[lineIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };


    const toggleSplitView = () => {
        if (sourceWrapper) {
            sourceWrapper.classList.toggle('hidden');
            toggleSplitViewBtn.classList.toggle('active');
            if (!sourceWrapper.classList.contains('hidden')) {
                updateSourceView();
            }
        }
    };

    const toggleSourceEditMode = () => {
        isSourceEditMode = !isSourceEditMode;

        if (isSourceEditMode) {
            // Switch to edit mode
            const markdown = turndownService.turndown(editor.innerHTML);
            sourceTextarea.value = markdown;
            sourceView.classList.add('hidden');
            sourceTextarea.classList.remove('hidden');
            sourceTextarea.focus();
            toggleSourceEditBtn.innerHTML = '<i class="ph ph-eye"></i>';
            toggleSourceEditBtn.setAttribute('data-tooltip', 'Förhandsvisa');
        } else {
            // Switch to view mode
            sourceTextarea.classList.add('hidden');
            sourceView.classList.remove('hidden');
            toggleSourceEditBtn.innerHTML = '<i class="ph ph-pencil-simple"></i>';
            toggleSourceEditBtn.setAttribute('data-tooltip', 'Redigera');
            updateSourceView();
        }
    };

    const syncFromSource = () => {
        if (isSourceEditMode && sourceTextarea.value) {
            editor.innerHTML = marked.parse(sourceTextarea.value);
            updateStats();
            updateOutline();
            saveToLocalStorage();
        }
    };


    const updateOutline = () => {
        if (!outlineSidebar || outlineSidebar.classList.contains('hidden')) return;
        outlineContent.innerHTML = '';
        const headers = editor.querySelectorAll('h1, h2, h3');
        headers.forEach(h => {
            const item = document.createElement('div');
            item.className = `outline-item ${h.tagName.toLowerCase()}`;
            item.innerText = h.innerText || 'Rubrik saknas';
            item.onclick = () => h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            outlineContent.appendChild(item);
        });
    };

    const saveToLocalStorage = () => {
        localStorage.setItem('md-flow-content', editor.innerHTML);
    };

    // --- Commands & Tools ---
    const commands = [
        { name: 'Toggle Split View', icon: 'ph-columns', action: toggleSplitView, shortcut: 'Cmd+J' },
        { name: 'Toggle Outline', icon: 'ph-list-numbers', action: () => outlineBtn?.click(), shortcut: 'Cmd+O' },
        { name: 'Exportera HTML', icon: 'ph-download', action: () => exportHtmlBtn?.click(), shortcut: 'Cmd+E' },
        { name: 'Finn & Ersätt', icon: 'ph-magnifying-glass', action: () => findBox?.classList.remove('hidden'), shortcut: 'Cmd+F' },
        { name: 'Skriv ut (PDF)', icon: 'ph-printer', action: () => window.print(), shortcut: 'Cmd+P' }
    ];

    const findAndReplace = (all = false) => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), all ? 'g' : '');
        editor.innerHTML = editor.innerHTML.replace(regex, replace);
        updateSourceView();
        saveToLocalStorage();
    };

    // --- Event Listeners ---
    editor.addEventListener('input', () => {
        updateStats();
        updateSourceView();
        updateOutline();
        saveToLocalStorage();
    });

    // Track cursor position for split view sync
    editor.addEventListener('click', highlightCursorLine);
    editor.addEventListener('keyup', highlightCursorLine);

    // Split View Button
    if (toggleSplitViewBtn) {
        toggleSplitViewBtn.addEventListener('click', toggleSplitView);
    }

    // Source Edit Toggle Button
    if (toggleSourceEditBtn) {
        toggleSourceEditBtn.addEventListener('click', toggleSourceEditMode);
    }

    // Source Textarea - sync changes to WYSIWYG with debounce
    let sourceDebounce = null;
    if (sourceTextarea) {
        sourceTextarea.addEventListener('input', () => {
            clearTimeout(sourceDebounce);
            sourceDebounce = setTimeout(syncFromSource, 300);
        });
    }

    // Copy Source Button
    if (copySourceBtn) {
        copySourceBtn.addEventListener('click', () => {
            const markdown = turndownService.turndown(editor.innerHTML);
            navigator.clipboard.writeText(markdown).then(() => {
                copySourceBtn.innerHTML = '<i class="ph ph-check"></i>';
                setTimeout(() => copySourceBtn.innerHTML = '<i class="ph ph-copy"></i>', 1500);
            });
        });
    }


    // Outline Button
    if (outlineBtn) {
        outlineBtn.addEventListener('click', () => {
            outlineSidebar.classList.toggle('hidden');
            updateOutline();
        });
    }

    // Close Outline
    const closeOutlineBtn = document.getElementById('close-outline');
    if (closeOutlineBtn) {
        closeOutlineBtn.addEventListener('click', () => outlineSidebar.classList.add('hidden'));
    }

    // Find & Replace
    const findNextBtn = document.getElementById('find-next');
    const replaceBtnEl = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const closeFindBtn = document.getElementById('close-find');

    if (findNextBtn) findNextBtn.onclick = () => findAndReplace(false);
    if (replaceBtnEl) replaceBtnEl.onclick = () => findAndReplace(false);
    if (replaceAllBtn) replaceAllBtn.onclick = () => findAndReplace(true);
    if (closeFindBtn) closeFindBtn.onclick = () => findBox.classList.add('hidden');

    // Export HTML
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', () => {
            const blob = new Blob([editor.innerHTML], { type: 'text/html;charset=utf-8' });
            saveAs(blob, 'dokument.html');
        });
    }

    // View Markdown Modal
    if (viewMarkdownBtn) {
        viewMarkdownBtn.addEventListener('click', () => {
            markdownInput.value = turndownService.turndown(editor.innerHTML);
            markdownModal.classList.remove('hidden');
        });
    }

    if (applyMarkdownBtn) {
        applyMarkdownBtn.addEventListener('click', () => {
            editor.innerHTML = marked.parse(markdownInput.value);
            markdownModal.classList.add('hidden');
            updateStats();
            updateSourceView();
        });
    }

    // Close modals
    document.querySelectorAll('.close-btn, .modal-backdrop').forEach(el => {
        el.addEventListener('click', () => {
            markdownModal?.classList.add('hidden');
            commandPalette?.classList.add('hidden');
        });
    });

    // Command Palette UI
    const renderCommands = (filter = '') => {
        commandResults.innerHTML = '';
        const filtered = commands.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
        filtered.forEach(cmd => {
            const div = document.createElement('div');
            div.className = 'command-item';
            div.innerHTML = `<span><i class="ph ${cmd.icon}"></i> ${cmd.name}</span><span class="shortcut">${cmd.shortcut || ''}</span>`;
            div.onclick = () => { cmd.action(); commandPalette.classList.add('hidden'); commandInput.value = ''; };
            commandResults.appendChild(div);
        });
    };

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        const isCmd = e.metaKey || e.ctrlKey;

        // Command Palette: Cmd+K
        if (isCmd && e.key === 'k') {
            e.preventDefault();
            commandPalette.classList.remove('hidden');
            commandInput.focus();
            renderCommands();
        }

        // Find & Replace: Cmd+F
        if (isCmd && e.key === 'f') {
            e.preventDefault();
            findBox.classList.remove('hidden');
            findInput.focus();
        }

        // Outline: Cmd+O
        if (isCmd && e.key === 'o') {
            e.preventDefault();
            outlineBtn?.click();
        }

        // Split View: Cmd+J
        if (isCmd && e.key === 'j') {
            e.preventDefault();
            toggleSplitView();
        }

        // Escape closes modals
        if (e.key === 'Escape') {
            commandPalette.classList.add('hidden');
            findBox.classList.add('hidden');
        }
    });

    if (commandInput) {
        commandInput.addEventListener('input', (e) => renderCommands(e.target.value));
    }

    // Toolbar Buttons
    document.querySelectorAll('[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand(btn.getAttribute('data-command'), false, btn.getAttribute('data-value'));
            editor.focus();
            updateSourceView();
        });
    });

    // Init
    const saved = localStorage.getItem('md-flow-content');
    if (saved) editor.innerHTML = saved;
    updateStats();
    if (typeof Prism !== 'undefined') Prism.highlightAll();
    if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: true });
});
