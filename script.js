document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const wordCountEl = document.getElementById('word-count');
    const readTimeEl = document.getElementById('read-time');
    const toggleSplitViewBtn = document.getElementById('toggle-split-view');
    const sourceWrapper = document.getElementById('source-wrapper');
    const sourceTextarea = document.getElementById('source-textarea');
    const copySourceBtn = document.getElementById('copy-source');
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

    let lastEditedBy = null;
    let lastFocusedElement = null;

    // Track focus changes to know where to apply formatting
    document.addEventListener('focusout', (e) => {
        if (e.target === editor || e.target === sourceTextarea) {
            lastFocusedElement = e.target;
        }
    });

    // --- Core Functions ---
    const updateStats = () => {
        const text = editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordCountEl.innerText = `${words} ord`;
        readTimeEl.innerText = `Ca ${Math.ceil(words / 200)} min läsning`;
    };

    // Sync WYSIWYG -> Source
    const syncToSource = () => {
        if (lastEditedBy === 'source') return;
        if (sourceWrapper && !sourceWrapper.classList.contains('hidden')) {
            const markdown = turndownService.turndown(editor.innerHTML);
            if (sourceTextarea.value !== markdown) {
                sourceTextarea.value = markdown;
            }
        }
    };

    // Sync Source -> WYSIWYG
    const syncToEditor = () => {
        lastEditedBy = 'source';
        const html = marked.parse(sourceTextarea.value);
        if (editor.innerHTML !== html) {
            editor.innerHTML = html;
            updateStats();
            updateOutline();
        }
        setTimeout(() => lastEditedBy = null, 100);
    };


    const toggleSplitView = () => {
        if (sourceWrapper) {
            sourceWrapper.classList.toggle('hidden');
            toggleSplitViewBtn.classList.toggle('active');
            if (!sourceWrapper.classList.contains('hidden')) {
                syncToSource();
            }
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

    // --- Commands ---
    const commands = [
        { name: 'Toggle Split View', icon: 'ph-columns', action: toggleSplitView, shortcut: 'Cmd+J' },
        { name: 'Toggle Outline', icon: 'ph-list-numbers', action: () => outlineBtn?.click(), shortcut: 'Cmd+O' },
        { name: 'Exportera HTML', icon: 'ph-download', action: () => exportHtmlBtn?.click() },
        { name: 'Finn & Ersätt', icon: 'ph-magnifying-glass', action: () => findBox?.classList.remove('hidden'), shortcut: 'Cmd+F' },
        { name: 'Skriv ut (PDF)', icon: 'ph-printer', action: () => window.print() }
    ];

    const findAndReplace = (all = false) => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), all ? 'g' : '');
        editor.innerHTML = editor.innerHTML.replace(regex, replace);
        syncToSource();
        saveToLocalStorage();
    };

    // Check if cursor is inside specific block type
    const isInsideBlock = (tagName) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;
        let node = selection.anchorNode;
        while (node && node !== editor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    };

    // Check if cursor is inside markdown syntax in source textarea
    // This searches outward from cursor to find enclosing markers
    const isInsideMarkdownSyntax = (marker) => {
        const pos = sourceTextarea.selectionStart;
        const text = sourceTextarea.value;

        // Get the current line
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        const lineEnd = text.indexOf('\n', pos);
        const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
        const posInLine = pos - lineStart;

        // Find all marker positions in the line
        const markerLen = marker.length;
        let inMarker = false;
        let i = 0;

        while (i < line.length) {
            if (line.substring(i, i + markerLen) === marker) {
                if (!inMarker) {
                    // Opening marker - check if cursor is after it
                    if (posInLine > i) {
                        inMarker = true;
                    }
                } else {
                    // Closing marker - check if cursor is before it
                    if (posInLine <= i) {
                        return true; // Cursor is between markers
                    }
                    inMarker = false;
                }
                i += markerLen;
            } else {
                i++;
            }
        }

        return false;
    };

    // Check current line for heading prefix
    const isOnHeadingLine = (prefix) => {
        const text = sourceTextarea.value;
        const start = sourceTextarea.selectionStart;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineText = text.substring(lineStart, start);
        return lineText.startsWith(prefix);
    };

    // Update active states on toolbar buttons
    const updateButtonStates = () => {
        const isInSource = lastFocusedElement === sourceTextarea || document.activeElement === sourceTextarea;

        document.querySelectorAll('[data-command]').forEach(btn => {
            const command = btn.getAttribute('data-command');
            const value = btn.getAttribute('data-value');
            let isActive = false;

            if (isInSource) {
                // Check markdown syntax in source view
                if (command === 'bold') {
                    isActive = isInsideMarkdownSyntax('**');
                } else if (command === 'italic') {
                    isActive = isInsideMarkdownSyntax('_');
                } else if (command === 'strikeThrough') {
                    isActive = isInsideMarkdownSyntax('~~');
                } else if (command === 'formatBlock' && value === 'h1') {
                    isActive = isOnHeadingLine('# ');
                } else if (command === 'formatBlock' && value === 'h2') {
                    isActive = isOnHeadingLine('## ');
                }
            } else {
                // WYSIWYG mode
                if (command === 'formatBlock') {
                    isActive = isInsideBlock(value);
                } else if (command === 'bold') {
                    // Browsers often return true for bold inside headings.
                    // We check if it's actually wrapped in a bold tag.
                    isActive = document.queryCommandState(command);
                    if (isActive && (isInsideBlock('h1') || isInsideBlock('h2') || isInsideBlock('h3'))) {
                        // Check if there's an actual bold tag between the selection and the heading block
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            let node = selection.anchorNode;
                            let foundBoldTag = false;
                            while (node && node !== editor) {
                                if (node.nodeType === 1) {
                                    if (['STRONG', 'B'].includes(node.tagName)) {
                                        foundBoldTag = true;
                                        break;
                                    }
                                    if (['H1', 'H2', 'H3'].includes(node.tagName)) break;
                                }
                                node = node.parentNode;
                            }
                            isActive = foundBoldTag;
                        }
                    }
                } else {
                    isActive = document.queryCommandState(command);
                }
            }

            btn.classList.toggle('active', isActive);
        });
    };

    // --- Event Listeners ---

    // WYSIWYG Editor input
    editor.addEventListener('input', () => {
        lastEditedBy = 'wysiwyg';
        updateStats();
        syncToSource();
        updateOutline();
        saveToLocalStorage();
        setTimeout(() => lastEditedBy = null, 100);
    });

    // Source Textarea input - live sync
    sourceTextarea.addEventListener('input', () => {
        syncToEditor();
        updateButtonStates();
    });

    // Update button states on cursor move in source
    sourceTextarea.addEventListener('click', () => {
        updateButtonStates();
    });
    sourceTextarea.addEventListener('keyup', () => {
        updateButtonStates();
    });

    // Update toolbar button active states when cursor moves in WYSIWYG
    editor.addEventListener('click', updateButtonStates);
    editor.addEventListener('keyup', updateButtonStates);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor) {
            updateButtonStates();
        }
    });

    // Split View Button
    if (toggleSplitViewBtn) {
        toggleSplitViewBtn.addEventListener('click', toggleSplitView);
    }

    // Copy Source Button
    if (copySourceBtn) {
        copySourceBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(sourceTextarea.value).then(() => {
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


    // Close modals
    document.querySelectorAll('.close-btn, .modal-backdrop').forEach(el => {
        el.addEventListener('click', () => {
            commandPalette?.classList.add('hidden');
        });
    });

    // Command Palette
    const renderCommands = (filter = '') => {
        commandResults.innerHTML = '';
        commands.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())).forEach(cmd => {
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
        const isShift = e.shiftKey;

        // Command Palette
        if (isCmd && e.key === 'k') { e.preventDefault(); commandPalette.classList.remove('hidden'); commandInput.focus(); renderCommands(); }
        // Find
        if (isCmd && e.key === 'f') { e.preventDefault(); findBox.classList.remove('hidden'); findInput.focus(); }
        // Outline
        if (isCmd && e.key === 'o') { e.preventDefault(); outlineBtn?.click(); }
        // Split View
        if (isCmd && e.key === 'j') { e.preventDefault(); toggleSplitView(); }
        // Escape
        if (e.key === 'Escape') { commandPalette.classList.add('hidden'); findBox.classList.add('hidden'); }

        // Formatting Shortcuts
        if (isCmd && e.key === 'b') {
            e.preventDefault();
            document.querySelector('[data-command="bold"]').click();
        }
        if (isCmd && e.key === 'i') {
            e.preventDefault();
            document.querySelector('[data-command="italic"]').click();
        }
        if (isCmd && isShift && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            document.querySelector('[data-command="strikeThrough"]').click();
        }
    });

    if (commandInput) commandInput.addEventListener('input', (e) => renderCommands(e.target.value));

    // Wrap or unwrap selected text in textarea with markdown syntax
    const wrapSourceSelection = (before, after) => {
        const start = sourceTextarea.selectionStart;
        const end = sourceTextarea.selectionEnd;
        const text = sourceTextarea.value;
        const selected = text.substring(start, end);

        // Case 1: Markers are OUTSIDE selection (e.g. cursor between **text**)
        const beforeStart = start - before.length;
        const afterEnd = end + after.length;
        const textBefore = text.substring(Math.max(0, beforeStart), start);
        const textAfter = text.substring(end, Math.min(text.length, afterEnd));

        if (beforeStart >= 0 && textBefore === before && textAfter === after) {
            // Unwrap: remove the markers outside
            sourceTextarea.value = text.substring(0, beforeStart) + selected + text.substring(afterEnd);
            sourceTextarea.selectionStart = beforeStart;
            sourceTextarea.selectionEnd = beforeStart + selected.length;
        }
        // Case 2: Markers are INSIDE selection (e.g. selected "**text**")
        else if (selected.startsWith(before) && selected.endsWith(after) && selected.length > before.length + after.length) {
            // Unwrap: remove markers from inside selection
            const unwrapped = selected.substring(before.length, selected.length - after.length);
            sourceTextarea.value = text.substring(0, start) + unwrapped + text.substring(end);
            sourceTextarea.selectionStart = start;
            sourceTextarea.selectionEnd = start + unwrapped.length;
        }
        // Case 3: No markers - wrap the text
        else {
            sourceTextarea.value = text.substring(0, start) + before + selected + after + text.substring(end);
            sourceTextarea.selectionStart = start + before.length;
            sourceTextarea.selectionEnd = end + before.length;
        }

        sourceTextarea.focus();
        syncToEditor();
        updateButtonStates();
    };

    // Markdown syntax map for toolbar commands
    const markdownSyntax = {
        'bold': { before: '**', after: '**' },
        'italic': { before: '_', after: '_' },
        'strikeThrough': { before: '~~', after: '~~' },
        'formatBlock': {
            'h1': { before: '# ', after: '' },
            'h2': { before: '## ', after: '' },
            'blockquote': { before: '> ', after: '' },
            'pre': { before: '```\n', after: '\n```' }
        }
    };

    // Toolbar Buttons
    document.querySelectorAll('[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.getAttribute('data-command');
            const value = btn.getAttribute('data-value');

            // Check if source textarea was last focused
            if (lastFocusedElement === sourceTextarea) {
                let syntax;
                if (command === 'formatBlock' && markdownSyntax.formatBlock[value]) {
                    syntax = markdownSyntax.formatBlock[value];
                } else if (markdownSyntax[command]) {
                    syntax = markdownSyntax[command];
                }

                if (syntax) {
                    wrapSourceSelection(syntax.before, syntax.after);
                    return;
                }
            }

            // Default: apply to WYSIWYG
            document.execCommand(command, false, value);
            editor.focus();
            syncToSource();
        });
    });

    // Init
    const saved = localStorage.getItem('md-flow-content');
    if (saved) editor.innerHTML = saved;
    updateStats();
    if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: true });
});
