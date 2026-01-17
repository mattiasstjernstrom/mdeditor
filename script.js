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
            sourceCode.textContent = markdown;
            if (typeof Prism !== 'undefined') {
                Prism.highlightElement(sourceCode);
            }
        }
    };

    const toggleSplitView = () => {
        if (sourceWrapper) {
            sourceWrapper.classList.toggle('hidden');
            toggleSplitViewBtn.classList.toggle('active');
            updateSourceView();
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
        { name: 'Toggle Split View', icon: 'ph-columns', action: toggleSplitView, shortcut: 'Cmd+\\' },
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

    // Split View Button (THIS WAS MISSING!)
    if (toggleSplitViewBtn) {
        toggleSplitViewBtn.addEventListener('click', toggleSplitView);
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

        // Split View: Cmd+\ (backslash)
        if (isCmd && e.key === '\\') {
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
