document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const toolbar = document.querySelector('.toolbar');
    const wordCountEl = document.getElementById('word-count');
    const readTimeEl = document.getElementById('read-time');
    const viewMarkdownBtn = document.getElementById('view-markdown-btn');
    const markdownModal = document.getElementById('markdown-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const markdownInput = document.getElementById('markdown-input');
    const applyMarkdownBtn = document.getElementById('apply-markdown');
    const linkBtn = document.getElementById('link-btn');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const closeShortcutsBtn = document.getElementById('close-shortcuts-modal');

    // Pro Buttons
    const insertTableBtn = document.getElementById('btn-insert-table');
    const insertTaskListBtn = document.getElementById('btn-insert-tasklist');

    // Feature Manager / Paywall Logic
    const FeatureManager = {
        isProUser: true, // Toggle this to test paywall

        checkAccess: function(callback) {
            if (this.isProUser) {
                callback();
            } else {
                alert('Denna funktion kräver Pro-versionen!\nUppgradera för att få tillgång till tabeller och checklistor.');
            }
        }
    };


    // Mobile Menu Logic
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Create overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Modal helpers
    const openModal = (modal) => modal.classList.remove('hidden');
    const closeModal = (modal) => modal.classList.add('hidden');

    // Shortcuts Modal
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', () => openModal(shortcutsModal));
    }
    if (closeShortcutsBtn) {
        closeShortcutsBtn.addEventListener('click', () => closeModal(shortcutsModal));
    }
    // Backdrop click for shortcuts
    if (shortcutsModal) {
         shortcutsModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(shortcutsModal));
    }


    // Initialize Turndown Service with GFM
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });
    // Apply GFM plugin
    const gfm = turndownPluginGfm.gfm;
    turndownService.use(gfm);


    // Formatting Logic
    const formatCommands = document.querySelectorAll('[data-command]');

    // Check if the current selection is strictly inside a specific block type
    const isInsideBlock = (tagName) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;

        let node = selection.anchorNode;
        // Ascend to find the block level element
        while (node && node !== editor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName.toLowerCase()) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    };

    const toggleFormat = (command, value) => {
        if (command === 'formatBlock') {
            if (isInsideBlock(value)) {
                 document.execCommand('formatBlock', false, 'p');
            } else {
                document.execCommand(command, false, value);
            }
        } else {
            document.execCommand(command, false, value);
        }
        editor.focus();
        updateButtonStates();
    };

    formatCommands.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.getAttribute('data-command');
            const value = btn.getAttribute('data-value') || null;
            toggleFormat(command, value);
        });
    });

    // Link Handler
    const insertLink = () => {
        const url = prompt('Ange länkens URL:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    };

    if(linkBtn) {
        linkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            insertLink();
        });
    }

    // Pro Features Handlers
    if (insertTableBtn) {
        insertTableBtn.addEventListener('click', (e) => {
            e.preventDefault();
            FeatureManager.checkAccess(() => {
                const tableHtml = `
                    <table style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th>Rubrik 1</th>
                                <th>Rubrik 2</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Cell 1</td>
                                <td>Cell 2</td>
                            </tr>
                        </tbody>
                    </table>
                    <p><br></p>
                `;
                document.execCommand('insertHTML', false, tableHtml);
            });
        });
    }

    if (insertTaskListBtn) {
        insertTaskListBtn.addEventListener('click', (e) => {
            e.preventDefault();
            FeatureManager.checkAccess(() => {
                const taskListHtml = `
                    <ul data-type="task-list">
                        <li data-task="true"><input type="checkbox"> Att göra 1</li>
                        <li data-task="true"><input type="checkbox"> Att göra 2</li>
                    </ul>
                    <p><br></p>
                `;
                document.execCommand('insertHTML', false, taskListHtml);
            });
        });
    }

    // Shortcuts Handler
    document.addEventListener('keydown', (e) => {
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;

        // Help Menu: Cmd + /
        if (isCmdOrCtrl && e.key === '/') {
            e.preventDefault();
            if (shortcutsModal.classList.contains('hidden')) {
                openModal(shortcutsModal);
            } else {
                closeModal(shortcutsModal);
            }
        }

        // Only handle editor shortcuts if editor is focused or focus is in body (not other inputs)
        // But preventing default requires careful checking.
        if (!isCmdOrCtrl) return;

        // Heading 1: Cmd + Alt + 1
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            toggleFormat('formatBlock', 'h1');
        }
        // Heading 2: Cmd + Alt + 2
        if (e.altKey && e.key === '2') {
            e.preventDefault();
            toggleFormat('formatBlock', 'h2');
        }
         // Unordered List: Cmd + Shift + 8
         if (e.shiftKey && e.key === '8') {
             e.preventDefault();
             document.execCommand('insertUnorderedList');
             updateButtonStates();
         }
         // Ordered List: Cmd + Shift + 7
         if (e.shiftKey && e.key === '7') {
             e.preventDefault();
             document.execCommand('insertOrderedList');
             updateButtonStates();
         }
         // Link: Cmd + K
         if (e.key === 'k') {
             e.preventDefault();
             insertLink();
         }
         // Bold/Italic handled natively by contenteditable usually, but we want to ensure state update
         if (e.key === 'b' || e.key === 'i') {
            setTimeout(updateButtonStates, 10);
         }
    });


    // Live Word Count & Reading Time
    const updateStats = () => {
        const text = editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        const time = Math.ceil(words / 200); // Avg reading speed 200 wpm

        wordCountEl.innerText = `${words} ord`;
        readTimeEl.innerText = `Mindre än ${time} min läsning`;
    };

    editor.addEventListener('input', updateStats);
    updateStats();


    // Update active states on toolbar buttons
    const updateButtonStates = () => {
        formatCommands.forEach(btn => {
            const command = btn.getAttribute('data-command');
            const value = btn.getAttribute('data-value');

            let isActive = false;

            if (command === 'formatBlock') {
                // For blocks, custom check
                isActive = isInsideBlock(value);
            } else {
                // For bold, italic etc.
                isActive = document.queryCommandState(command);
            }

            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    editor.addEventListener('mouseup', updateButtonStates);
    editor.addEventListener('keyup', updateButtonStates);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === editor || editor.contains(document.activeElement)) {
            updateButtonStates();
        }
    });


    // View/Edit Markdown Modal
    viewMarkdownBtn.addEventListener('click', () => {
        const html = editor.innerHTML;
        const markdown = turndownService.turndown(html);
        markdownInput.value = markdown; // Set logic to textarea
        openModal(markdownModal);
    });

    // Apply Changes (Markdown -> HTML)
    applyMarkdownBtn.addEventListener('click', () => {
        const mdText = markdownInput.value;
        // Parse Markdown to HTML using marked.js
        const html = marked.parse(mdText);
        editor.innerHTML = html;
        closeModal(markdownModal);
        updateStats(); // Refresh stats
    });

    closeModalBtn.addEventListener('click', () => {
        closeModal(markdownModal);
    });

    // Close modal on backdrop click
    markdownModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(markdownModal);
    });

    // Copy to Clipboard inside Modal
    document.getElementById('copy-markdown').addEventListener('click', () => {
        const mdText = markdownInput.value;
        navigator.clipboard.writeText(mdText).then(() => {
            const btn = document.getElementById('copy-markdown');
            const originalText = btn.innerText;
            btn.innerText = 'Kopierat!';
            setTimeout(() => {
                btn.innerText = originalText;
            }, 2000);
        });
    });

    // Prevent default tab behavior
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    });
});
