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

    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const outlineBtn = document.getElementById('outline-btn');
    const outlineSidebar = document.getElementById('outline-sidebar');
    const outlineContent = document.getElementById('outline-content');
    const linkBtn = document.getElementById('link-btn');
    const inlineCodeBtn = document.getElementById('inline-code-btn');
    const insertTableBtn = document.getElementById('btn-insert-table');
    const insertTasklistBtn = document.getElementById('btn-insert-tasklist');

    // Language Modal Elements
    const languageModal = document.getElementById('language-modal');
    const languageInput = document.getElementById('language-input');
    const saveLanguageBtn = document.getElementById('save-language');
    const closeLanguageModal = document.getElementById('close-language-modal');
    const cancelLanguageBtn = document.getElementById('cancel-language');
    let activeCodeWrapper = null;

    // Configure Marked for GFM
    const renderer = new marked.Renderer();
    renderer.code = (args) => {
        // Handle both old (code, lang) and new ({text, lang}) marked API
        const code = typeof args === 'string' ? args : (args.text || '');
        let lang = typeof args === 'string' ? arguments[1] : (args.lang || '');
        // Display 'code' if lang is empty or 'text'
        const displayLang = (!lang || lang === 'text') ? 'code' : lang;
        return `<div class="code-block-wrapper" data-lang="${lang || 'text'}"><div class="code-block-header" contenteditable="false"><span class="code-lang-tag" title="Klicka för att ändra språk">${displayLang}</span></div><pre><code class="language-${lang || 'text'}">${code}</code></pre></div>`;
    };

    // GitHub-style alerts renderer
    renderer.blockquote = (args) => {
        // Handle both old string API and new object API
        let text = '';
        if (typeof args === 'string') {
            text = args;
        } else if (args && typeof args === 'object') {
            text = args.text || args.raw || '';
        }

        // Check for alert syntax in raw text or HTML-wrapped text
        const alertPatterns = [
            /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/im,
            /^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/im
        ];

        let alertMatch = null;
        for (const pattern of alertPatterns) {
            alertMatch = text.match(pattern);
            if (alertMatch) break;
        }

        if (alertMatch) {
            const type = alertMatch[1].toLowerCase();
            const icons = {
                note: 'ph-info',
                tip: 'ph-lightbulb',
                important: 'ph-star',
                warning: 'ph-warning',
                caution: 'ph-warning-octagon'
            };
            const labels = {
                note: 'Note',
                tip: 'Tip',
                important: 'Important',
                warning: 'Warning',
                caution: 'Caution'
            };
            // Remove the alert marker from content
            let content = text
                .replace(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/im, '')
                .replace(/^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\/?>)?\s*/im, '<p>')
                .trim();

            // Wrap in paragraph if it's plain text
            if (!content.startsWith('<')) {
                content = `<p>${content}</p>`;
            }

            return `<div class="alert alert-${type}" data-alert-type="${type}"><div class="alert-header"><i class="ph ${icons[type]}"></i><span>${labels[type]}</span></div><div class="alert-content">${content}</div></div>`;
        }
        return `<blockquote>${text}</blockquote>`;
    };

    marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false
    });

    const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    turndownService.use(turndownPluginGfm.gfm);

    // Custom Turndown rule for code block wrappers
    turndownService.addRule('codeBlockWrapper', {
        filter: (node) => node.nodeName === 'DIV' && node.classList.contains('code-block-wrapper'),
        replacement: (content, node) => {
            const lang = node.getAttribute('data-lang') || '';
            // Only get text from the pre/code tag, ignoring the interactive header
            const codeNode = node.querySelector('pre');
            const code = codeNode ? codeNode.textContent : '';
            if (!code.trim()) return '';
            return '\n```' + lang + '\n' + code + '\n```\n';
        }
    });

    // Custom Turndown rule for GitHub-style alerts
    turndownService.addRule('alertBox', {
        filter: (node) => node.nodeName === 'DIV' && node.classList.contains('alert'),
        replacement: (content, node) => {
            const type = node.getAttribute('data-alert-type') || 'note';
            const contentEl = node.querySelector('.alert-content');
            const text = contentEl ? turndownService.turndown(contentEl.innerHTML) : content;
            return '\n> [!' + type.toUpperCase() + ']\n> ' + text.trim().replace(/\n/g, '\n> ') + '\n';
        }
    });

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
            // Enable checkboxes for task lists and fix structure
            editor.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.removeAttribute('disabled'));

            // Post-process: ensure code blocks have wrappers if marked didn't add them
            editor.querySelectorAll('pre:not(.code-block-wrapper pre)').forEach(pre => {
                const codeNode = pre.querySelector('code');
                let lang = codeNode ? (codeNode.className.match(/language-(\w+)/) || [null, ''])[1] : '';
                const displayLang = (!lang || lang === 'text') ? 'code' : lang;

                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                wrapper.setAttribute('data-lang', lang || 'text');
                wrapper.innerHTML = `<div class="code-block-header" contenteditable="false"><span class="code-lang-tag" title="Klicka för att ändra språk">${displayLang}</span></div>`;
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
            });

            // Cleanup: remove any legacy delete buttons that might have sneaked in
            editor.querySelectorAll('.code-delete-btn').forEach(btn => btn.remove());

            updateStats();
            updateOutline();
        }
        setTimeout(() => lastEditedBy = null, 100);
    };

    // Task list checkbox interaction
    editor.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            // Update attribute so turndown sees it
            if (e.target.checked) {
                e.target.setAttribute('checked', '');
            } else {
                e.target.removeAttribute('checked');
            }
            syncToSource();
            saveToLocalStorage();
        }
    });


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

    // Check if cursor is inside specific block type and return the node
    const getBlockParent = (tagName, className = null) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.anchorNode;
        while (node && node !== editor) {
            if (node.nodeType === 1) {
                const matchesTag = node.tagName.toLowerCase() === tagName.toLowerCase();
                const matchesClass = !className || node.classList.contains(className);
                if (matchesTag && matchesClass) return node;
            }
            node = node.parentNode;
        }
        return null;
    };

    const isInsideBlock = (tagName) => !!getBlockParent(tagName);

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

    // Check if cursor is inside a fenced code block in source view
    const isInsideFencedCodeBlock = () => {
        const text = sourceTextarea.value;
        const pos = sourceTextarea.selectionStart;
        const before = text.substring(0, pos);
        const after = text.substring(pos);

        // Count ``` before and after. This is a simple heuristic.
        const codeBlocksBefore = (before.match(/^```/gm) || []).length;
        const codeBlocksAfter = (after.match(/^```/gm) || []).length;

        // If we have an odd number before, we're likely inside
        return codeBlocksBefore % 2 !== 0;
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
                } else if (command === 'formatBlock' && value === 'pre') {
                    isActive = isInsideFencedCodeBlock();
                }
            } else {
                // WYSIWYG mode
                if (command === 'formatBlock') {
                    isActive = isInsideBlock(value);
                } else if (command === 'bold') {
                    // Browsers often return true for bold inside headings.
                    // We check if it's actually wrapped in a bold tag.
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

    // Handle Enter key inside code blocks and other structures
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const pre = getBlockParent('pre');
            const alert = getBlockParent('div', 'alert');

            if (pre) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);

                if (!e.shiftKey) {
                    // Regular Enter: Break out of the code block
                    e.preventDefault();
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';

                    const wrapper = getBlockParent('div', 'code-block-wrapper');
                    const target = wrapper || pre;
                    target.after(p);

                    // Position cursor in the new paragraph
                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);

                    syncToSource();
                } else {
                    // Shift+Enter: Insert newline inside code block
                    e.preventDefault();
                    const newline = document.createTextNode('\n');
                    range.deleteContents();
                    range.insertNode(newline);
                    range.setStartAfter(newline);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    syncToSource();
                }
            } else if (alert) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);

                if (!e.shiftKey) {
                    // Regular Enter: Break out of the alert
                    e.preventDefault();
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    alert.after(p);

                    // Position cursor in the new paragraph
                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);

                    syncToSource();
                }
                // Shift+Enter: Default behavior (new line inside)
            }
        }
    }, true); // Use capture phase to ensure we intercept it before browser splits tags

    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor) {
            updateButtonStates();
        }
    });

    // Handle clicks on interactive elements within the editor
    editor.addEventListener('click', (e) => {
        // 1. Change Code Language (using Modal)
        if (e.target.classList.contains('code-lang-tag')) {
            openLanguageModalFn(e.target.closest('.code-block-wrapper'));
            return;
        }

        // Update states as usual
        updateButtonStates();
    });

    // Language Modal Logic
    const openLanguageModalFn = (wrapper) => {
        activeCodeWrapper = wrapper;
        languageModal.classList.remove('hidden');
        languageInput.value = wrapper.getAttribute('data-lang') || 'text';
        languageInput.focus();
        languageInput.select();
    };

    const applyLanguage = () => {
        const lang = languageInput.value.trim();
        const safeLang = lang || 'text';
        const displayLang = (!lang || lang === 'text') ? 'code' : lang;

        if (activeCodeWrapper) {
            activeCodeWrapper.setAttribute('data-lang', safeLang);
            const tag = activeCodeWrapper.querySelector('.code-lang-tag');
            if (tag) tag.innerText = displayLang;
            const codeNode = activeCodeWrapper.querySelector('code');
            if (codeNode) codeNode.className = `language-${safeLang}`;
            syncToSource();
        }
        languageModal.classList.add('hidden');
    };

    saveLanguageBtn.onclick = applyLanguage;
    languageInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyLanguage();
        }
    };
    closeLanguageModal.onclick = () => languageModal.classList.add('hidden');
    cancelLanguageBtn.onclick = () => languageModal.classList.add('hidden');

    // Close on backdrop click
    languageModal.querySelector('.modal-backdrop').onclick = () => languageModal.classList.add('hidden');

    // Split View Button
    if (toggleSplitViewBtn) {
        toggleSplitViewBtn.addEventListener('click', toggleSplitView);
    }

    // Sidebar Toggle
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    };

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Link Button
    if (linkBtn) {
        linkBtn.addEventListener('click', () => {
            const url = prompt('Ange URL:');
            if (url) {
                if (lastFocusedElement === sourceTextarea) {
                    wrapSourceSelection('[', `](${url})`);
                } else {
                    document.execCommand('createLink', false, url);
                    syncToSource();
                }
            }
        });
    }

    // Inline Code Button
    if (inlineCodeBtn) {
        inlineCodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (lastFocusedElement === sourceTextarea) {
                wrapSourceSelection('`', '`');
            } else {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                // Toggle logic: if already inside <code>, unwrap it.
                let node = selection.anchorNode;
                let codeNode = null;
                while (node && node !== editor) {
                    if (node.nodeType === 1 && node.tagName.toLowerCase() === 'code') {
                        codeNode = node;
                        break;
                    }
                    node = node.parentNode;
                }

                if (codeNode) {
                    const parent = codeNode.parentNode;
                    while (codeNode.firstChild) {
                        parent.insertBefore(codeNode.firstChild, codeNode);
                    }
                    parent.removeChild(codeNode);
                } else if (!selection.isCollapsed) {
                    const range = selection.getRangeAt(0);
                    const code = document.createElement('code');
                    code.appendChild(range.extractContents());
                    range.insertNode(code);
                }

                editor.focus();
                syncToSource();
                updateButtonStates();
            }
        });
    }

    const insertAtCursor = (html, markdown) => {
        if (lastFocusedElement === sourceTextarea) {
            const start = sourceTextarea.selectionStart;
            const end = sourceTextarea.selectionEnd;
            sourceTextarea.value = sourceTextarea.value.substring(0, start) + markdown + sourceTextarea.value.substring(end);
            syncToEditor();
        } else {
            editor.focus();
            document.execCommand('insertHTML', false, html);
            syncToSource();
        }
    };

    // Insert Table
    if (insertTableBtn) {
        insertTableBtn.addEventListener('click', () => {
            const tableMd = '\n| Rubrik 1 | Rubrik 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n';
            insertAtCursor(marked.parse(tableMd), tableMd);
        });
    }

    // Insert Tasklist
    if (insertTasklistBtn) {
        insertTasklistBtn.addEventListener('click', () => {
            const taskMd = '\n- [ ] Uppgift 1\n- [ ] Uppgift 2\n';
            insertAtCursor(marked.parse(taskMd), taskMd);
        });
    }

    // Insert Image
    const insertImageBtn = document.getElementById('btn-insert-image');
    if (insertImageBtn) {
        insertImageBtn.addEventListener('click', () => {
            const url = prompt('Ange bild-URL:');
            if (url) {
                const alt = prompt('Ange alt-text (beskrivning):', 'Bild') || 'Bild';
                const imgMd = `\n![${alt}](${url})\n`;
                insertAtCursor(`<img src="${url}" alt="${alt}">`, imgMd);
            }
        });
    }

    // Insert Horizontal Rule
    const insertHrBtn = document.getElementById('btn-insert-hr');
    if (insertHrBtn) {
        insertHrBtn.addEventListener('click', () => {
            insertAtCursor('<hr>', '\n---\n');
        });
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

    const toggleMarkdownCodeBlock = () => {
        const text = sourceTextarea.value;
        const start = sourceTextarea.selectionStart;
        const end = sourceTextarea.selectionEnd;
        const selected = text.substring(start, end);

        if (isInsideFencedCodeBlock()) {
            // Unwrapping logic is already handled by syncToEditor if fences are removed manually.
            // But for a toggle, we find the fence and remove it.
            const before = text.substring(0, start);
            const after = text.substring(end);

            // Find start and end fences
            const lastStartFence = before.lastIndexOf('\n```');
            const nextEndFence = after.indexOf('```');

            if (lastStartFence !== -1 && nextEndFence !== -1) {
                const head = text.substring(0, lastStartFence);
                const tail = text.substring(end + nextEndFence + 3);
                const middle = text.substring(lastStartFence, end + nextEndFence).replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
                sourceTextarea.value = (head + '\n' + middle + tail).trim();
            }
        } else {
            sourceTextarea.value = text.substring(0, start) + `\n\`\`\`text\n` + selected + `\n\`\`\`\n` + text.substring(end);
        }
        syncToEditor();
        updateButtonStates();
    };

    // Markdown syntax map for toolbar commands
    const markdownSyntax = {
        'bold': { before: '**', after: '**' },
        'italic': { before: '_', after: '_' },
        'strikeThrough': { before: '~~', after: '~~' },
        'insertUnorderedList': { before: '- ', after: '' },
        'insertOrderedList': { before: '1. ', after: '' },
        'inlineCode': { before: '`', after: '`' },
        'formatBlock': {
            'h1': { before: '# ', after: '' },
            'h2': { before: '## ', after: '' },
            'blockquote': { before: '> ', after: '' },
            'pre': { before: '```\n', after: '\n```' }
        }
    };

    const toggleCodeBlock = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const wrapper = getBlockParent('div', 'code-block-wrapper');
        const pre = getBlockParent('pre');

        if (wrapper || pre) {
            // Remove code block: convert to paragraphs
            const target = wrapper || pre;
            const text = target.textContent;
            const lines = text.split('\n').filter(l => l.trim() !== '');
            const fragment = document.createDocumentFragment();
            lines.forEach(line => {
                const p = document.createElement('p');
                p.textContent = line;
                fragment.appendChild(p);
            });
            const parent = target.closest('.code-block-wrapper') || target;
            parent.parentNode.replaceChild(fragment, parent);
        } else {
            // Create code block
            const selectedText = selection.toString() || 'kod här';
            const html = `<div class="code-block-wrapper" data-lang="text"><div class="code-block-header" contenteditable="false"><span class="code-lang-tag" title="Klicka för att ändra språk">code</span></div><pre><code class="language-text">${selectedText}</code></pre></div><p><br></p>`;
            document.execCommand('insertHTML', false, html);
        }
        editor.focus();
        syncToSource();
        updateButtonStates();
    };

    // Toolbar Buttons
    document.querySelectorAll('[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.getAttribute('data-command');
            const value = btn.getAttribute('data-value');

            if (lastFocusedElement === sourceTextarea) {
                if (command === 'formatBlock' && value === 'pre') {
                    toggleMarkdownCodeBlock();
                    return;
                }

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
            } else {
                // WYSIWYG Logic
                if (command === 'formatBlock') {
                    if (value === 'pre') {
                        toggleCodeBlock();
                    } else if (isInsideBlock(value)) {
                        document.execCommand('formatBlock', false, 'p');
                    } else {
                        document.execCommand(command, false, value);
                    }
                } else {
                    document.execCommand(command, false, value);
                }
                editor.focus();
                syncToSource();
                updateButtonStates();
            }
        });
    });

    // Init
    const saved = localStorage.getItem('md-flow-content');
    if (saved) {
        editor.innerHTML = saved;
        // Migration: Remove legacy delete buttons from saved content
        editor.querySelectorAll('.code-delete-btn').forEach(btn => btn.remove());

        editor.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.removeAttribute('disabled');
        });
    }
    updateStats();
    if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: true });
});
