document.addEventListener('DOMContentLoaded', () => {
    // Detect OS and update modifier key labels
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    if (!isMac) {
        document.querySelectorAll('.mod-key').forEach(el => {
            el.textContent = 'Ctrl';
        });
    }
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
        return `<div class="code-block-wrapper" data-lang="${lang || 'text'}"><div class="code-block-header" contenteditable="false"><span class="code-lang-tag" title="Click to change language">${displayLang}</span></div><pre><code class="language-${lang || 'text'}">${code}</code></pre></div>`;
    };

    // Custom heading renderer for {#custom-id} anchor syntax
    renderer.heading = (args) => {
        const text = typeof args === 'string' ? args : (args.text || '');
        const level = typeof args === 'string' ? arguments[1] : (args.depth || 1);

        // Check for {#custom-id} at the end of the heading
        const anchorMatch = text.match(/\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
        let id, cleanText;

        if (anchorMatch) {
            id = anchorMatch[1];
            cleanText = text.replace(/\s*\{#[a-zA-Z0-9_-]+\}\s*$/, '');
        } else {
            // Auto-generate ID from text
            id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            cleanText = text;
        }

        return `<h${level} id="${id}" data-custom-anchor="${anchorMatch ? 'true' : 'false'}">${cleanText}</h${level}>`;
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

    // Emoji shortcode map
    const emojiMap = {
        'smile': '😊', 'grinning': '😀', 'joy': '😂', 'heart': '❤️', 'heart_eyes': '😍',
        'fire': '🔥', 'thumbsup': '👍', 'thumbsdown': '👎', 'clap': '👏', 'wave': '👋',
        'rocket': '🚀', 'star': '⭐', 'sparkles': '✨', 'tada': '🎉', 'party': '🥳',
        'check': '✅', 'x': '❌', 'warning': '⚠️', 'info': 'ℹ️', 'question': '❓',
        'bulb': '💡', 'idea': '💡', 'memo': '📝', 'book': '📖', 'link': '🔗',
        'lock': '🔒', 'key': '🔑', 'gear': '⚙️', 'wrench': '🔧', 'hammer': '🔨',
        'bug': '🐛', 'coffee': '☕', 'pizza': '🍕', 'beer': '🍺', 'cake': '🎂',
        'sun': '☀️', 'moon': '🌙', 'cloud': '☁️', 'rain': '🌧️', 'snow': '❄️',
        'eyes': '👀', 'thinking': '🤔', 'shrug': '🤷', 'facepalm': '🤦', 'pray': '🙏',
        '100': '💯', 'muscle': '💪', 'crown': '👑', 'gem': '💎', 'trophy': '🏆',
        'arrow_right': '➡️', 'arrow_left': '⬅️', 'arrow_up': '⬆️', 'arrow_down': '⬇️',
        'plus': '➕', 'minus': '➖', 'point_right': '👉', 'point_left': '👈'
    };

    // Custom text renderer for emoji shortcodes and color previews
    renderer.text = function(token) {
        const text = typeof token === 'string' ? token : (token.text || '');

        // Handle nested inline tokens (fixes bold/italic in lists)
        // If we have children, we must render them instead of the raw text
        if (typeof token === 'object' && token.tokens && token.tokens.length > 0) {
            if (this.parser && this.parser.parseInline) {
                return this.parser.parseInline(token.tokens);
            } else if (typeof marked !== 'undefined' && marked.parseInline) {
                // Fallback if this.parser isn't available
                return marked.parseInline(text);
            }
        }

        let content = text;

        // Replace :emoji: shortcodes with actual emojis
        content = content.replace(/:([a-z0-9_]+):/gi, (match, code) => {
            return emojiMap[code.toLowerCase()] || match;
        });

        // Color preview for HEX colors (#fff, #ffffff)
        content = content.replace(/`(#[0-9a-fA-F]{3,6})`/g, (match, color) => {
            return `<code class="color-code"><span class="color-chip" style="background-color: ${color};"></span>${color}</code>`;
        });

        // Color preview for RGB colors
        content = content.replace(/`(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))`/gi, (match, color) => {
            return `<code class="color-code"><span class="color-chip" style="background-color: ${color};"></span>${color}</code>`;
        });

        // Color preview for HSL colors
        content = content.replace(/`(hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\))`/gi, (match, color) => {
            return `<code class="color-code"><span class="color-chip" style="background-color: ${color};"></span>${color}</code>`;
        });

        return content;
    };

    // Footnote preprocessor
    const processFootnotes = (markdown) => {
        // Find all footnote definitions [^id]: text
        const footnoteDefRegex = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
        const footnotes = {};
        let match;

        while ((match = footnoteDefRegex.exec(markdown)) !== null) {
            footnotes[match[1]] = match[2];
        }

        // If no footnotes, return unchanged
        if (Object.keys(footnotes).length === 0) return markdown;

        // Remove footnote definitions from main content
        let processed = markdown.replace(/^\[\^([^\]]+)\]:\s*.+$/gm, '');

        // Replace footnote references [^id] with superscript links
        processed = processed.replace(/\[\^([^\]]+)\]/g, (match, id) => {
            if (footnotes[id]) {
                return `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${id}">[${id}]</a></sup>`;
            }
            return match;
        });

        // Build footnotes section
        const footnoteEntries = Object.entries(footnotes);
        if (footnoteEntries.length > 0) {
            let footnotesHtml = '\n\n<div class="footnotes"><hr><ol>';
            footnoteEntries.forEach(([id, text]) => {
                footnotesHtml += `<li id="fn-${id}">${text} <a href="#fnref-${id}">↩</a></li>`;
            });
            footnotesHtml += '</ol></div>';
            processed += footnotesHtml;
        }

        return processed;
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

    // Custom Turndown rule for underline (preserves as HTML since Markdown doesn't support it)
    turndownService.addRule('underline', {
        filter: (node) => node.nodeName === 'U' || node.nodeName === 'INS',
        replacement: (content) => `<ins>${content}</ins>`
    });

    // Custom Turndown rule for headings with custom anchors
    turndownService.addRule('headingWithAnchor', {
        filter: (node) => /^H[1-6]$/.test(node.nodeName) && node.getAttribute('data-custom-anchor') === 'true',
        replacement: (content, node) => {
            const level = parseInt(node.nodeName.charAt(1), 10);
            const id = node.getAttribute('id') || '';
            const hashes = '#'.repeat(level);
            return `\n${hashes} ${content} {#${id}}\n`;
        }
    });

    // Custom Turndown rule for footnote references
    turndownService.addRule('footnoteRef', {
        filter: (node) => node.nodeName === 'SUP' && node.classList.contains('footnote-ref'),
        replacement: (content, node) => {
            const link = node.querySelector('a');
            if (link) {
                const id = link.id.replace('fnref-', '');
                return `[^${id}]`;
            }
            return content;
        }
    });

    // Custom Turndown rule for footnotes section
    turndownService.addRule('footnotesSection', {
        filter: (node) => node.nodeName === 'DIV' && node.classList.contains('footnotes'),
        replacement: (content, node) => {
            const items = node.querySelectorAll('li');
            let footnotesDef = '\n';
            items.forEach(item => {
                const id = item.id.replace('fn-', '');
                // Get text without the back arrow
                let text = item.textContent.replace(/\s*↩\s*$/, '').trim();
                footnotesDef += `[^${id}]: ${text}\n`;
            });
            return footnotesDef;
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
        wordCountEl.innerText = `${words} words`;
        readTimeEl.innerText = `~ ${Math.ceil(words / 200)} min read`;
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
        const processedMarkdown = processFootnotes(sourceTextarea.value);
        const html = marked.parse(processedMarkdown);
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
                wrapper.innerHTML = `<div class="code-block-header" contenteditable="false"><span class="code-lang-tag" title="Click to change language">${displayLang}</span></div>`;
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
            item.innerText = h.innerText || 'Missing heading';
            item.onclick = () => h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            outlineContent.appendChild(item);
        });
    };

    // --- Document Management ---
    let documents = JSON.parse(localStorage.getItem('md-flow-documents')) || [];
    let currentDocId = localStorage.getItem('md-flow-current-doc-id') || null;

    const docListEl = document.getElementById('doc-list');
    const newDocBtn = document.getElementById('new-doc-btn');

    // Generate UUID-like ID
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    const saveToLocalStorage = () => {
        // Find current doc and update it
        if (currentDocId) {
            const docIndex = documents.findIndex(d => d.id === currentDocId);
            if (docIndex !== -1) {
                // Update content
                documents[docIndex].content = editor.innerHTML;

                // Update title based on first heading or first line
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = editor.innerHTML;
                let title = 'Untitled document';
                const h1 = tempDiv.querySelector('h1');
                if (h1 && h1.innerText.trim()) {
                    title = h1.innerText.trim();
                } else {
                    const firstLine = tempDiv.innerText.split('\n')[0].trim();
                    if (firstLine) title = firstLine.substring(0, 30) + (firstLine.length > 30 ? '...' : '');
                }
                // If title is still empty/generic and content is empty, keep it generic or empty
                if (editor.innerText.trim() === '') {
                     title = 'Untitled document';
                }

                documents[docIndex].title = title;
                documents[docIndex].updatedAt = Date.now();
            }
        }

        localStorage.setItem('md-flow-documents', JSON.stringify(documents));
        localStorage.setItem('md-flow-current-doc-id', currentDocId);

        // Also save legacy single-doc for backup/compatibility
        localStorage.setItem('md-flow-content', editor.innerHTML);

        renderDocList();
    };

    const createWelcomeDocument = () => {
        const markdownContent = `![mdbase Logo](logotype.png)

# Welcome to mdbase

Your new distraction-free writing space.

## 🚀 Get Started

mdbase is designed to help you focus on your writing. Here are some things you can do:

*   **Write freely** – Use Markdown shortcuts or the toolbar
*   **Format** – Select text to see options or use syntax like \`**bold**\` or \\*\\*bold\\*\\*
*   **Structure** – Use headings (\\#) to create an automatic Outline

## ✨ Features

*   ✅ **Auto-save** – Everything is saved locally in your browser
*   ✅ **Multi-document** – Manage multiple drafts at once
*   ✅ **HTML Export** – Download your work as HTML

> [!NOTE]
> Start writing here or create a new document in the menu/sidebar to start a blank sheet.`;

        const welcomeDoc = {
            id: generateId(),
            title: 'Welcome to mdbase',
            content: typeof marked !== 'undefined' ? marked.parse(markdownContent) : markdownContent,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        documents.push(welcomeDoc);
        switchDocument(welcomeDoc.id);
    };

    const loadDocuments = () => {
        if (documents.length === 0) {
            // Check for legacy content
            const legacyContent = localStorage.getItem('md-flow-content');
            // Check if legacy content is just the old default template
            const isOldDefault = legacyContent && legacyContent.includes('Välkommen till din nya editor');

            if (legacyContent && legacyContent.trim().length > 50 && !isOldDefault) { // Only keep legacy if substantial and not default
                const newDoc = {
                    id: generateId(),
                    title: 'Restored draft',
                    content: legacyContent,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                documents.push(newDoc);
                currentDocId = newDoc.id;
                saveToLocalStorage();
            } else {
                createWelcomeDocument();
            }
        }

        // Ensure valid currentDocId
        if (!currentDocId || !documents.find(d => d.id === currentDocId)) {
            currentDocId = documents[0].id;
        }

        // Load content
        const currentDoc = documents.find(d => d.id === currentDocId);
        if (currentDoc) {
            editor.innerHTML = currentDoc.content;
            syncToSource();
            // Reset undo stack for new document
            if (typeof undoStack !== 'undefined') {
                undoStack.length = 0;
                undoStack.push(currentDoc.content);
                redoStack.length = 0;
            }
        }

        renderDocList();
    };

    const createNewDocument = () => {
        const newDoc = {
            id: generateId(),
            title: '', // Title will be set on first save
            content: '', // Start empty
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        documents.unshift(newDoc);
        switchDocument(newDoc.id);
        // Focus editor immediately
        editor.focus();
    };

    const deleteDocument = (id, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this document?')) {
            documents = documents.filter(d => d.id !== id);
            if (documents.length === 0) {
                createWelcomeDocument();
            } else if (currentDocId === id) {
                switchDocument(documents[0].id);
            } else {
                saveToLocalStorage();
            }
        }
    };

    const switchDocument = (id) => {
        // Save current before switching
        if (currentDocId) {
             const docIndex = documents.findIndex(d => d.id === currentDocId);
             if (docIndex !== -1) {
                 documents[docIndex].content = editor.innerHTML;
             }
        }

        currentDocId = id;
        const widthDoc = documents.find(d => d.id === id);
        if (widthDoc) {
            editor.innerHTML = widthDoc.content;
            syncToSource();
             // Reset undo stack for new document
            if (typeof undoStack !== 'undefined') {
                undoStack.length = 0;
                undoStack.push(widthDoc.content);
                redoStack.length = 0;
            }
        }
        saveToLocalStorage();
    };

    const renderDocList = () => {
        if (!docListEl) return;
        docListEl.innerHTML = '';

        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === currentDocId ? 'active' : ''}`;
            item.onclick = () => switchDocument(doc.id);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'doc-name';
            titleSpan.innerText = doc.title || 'Untitled';

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'doc-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'doc-btn-delete';
            deleteBtn.innerHTML = '<i class="ph ph-trash"></i>';
            deleteBtn.onclick = (e) => deleteDocument(doc.id, e);

            actionsDiv.appendChild(deleteBtn);
            item.appendChild(titleSpan);
            item.appendChild(actionsDiv);

            docListEl.appendChild(item);
        });
    };

    if (newDocBtn) newDocBtn.onclick = createNewDocument;

    // Load initial docs
    // Call this at the end of DOMContentLoaded or init
    // setTimeout to ensure other inits are done
    setTimeout(loadDocuments, 0);

    // --- Commands ---
    const commands = [
        { name: 'Toggle Split View', icon: 'ph-columns', action: toggleSplitView, shortcut: 'Cmd+J' },
        { name: 'Toggle Outline', icon: 'ph-list-numbers', action: () => outlineBtn?.click(), shortcut: 'Cmd+O' },
        { name: 'Export HTML', icon: 'ph-download', action: () => exportHtmlBtn?.click() },
        { name: 'Find & Replace', icon: 'ph-magnifying-glass', action: () => findBox?.classList.remove('hidden'), shortcut: 'Cmd+F' },
        { name: 'Print (PDF)', icon: 'ph-printer', action: () => window.print() }
    ];

    // Keyboard Shortcuts Handler - using window and capture phase for earliest interception
    window.addEventListener('keydown', (e) => {
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();

        // Debug logging
        if (isCmdOrCtrl) {
            console.log('SHORTCUT DEBUG:', { key, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        }

        // Skip if we're in an input field that's not our editor or source
        const activeEl = document.activeElement;
        const inSource = activeEl === sourceTextarea;
        const inEditor = activeEl === editor;
        const inOurApp = inSource || inEditor || activeEl === document.body;

        if (!isCmdOrCtrl) return;

        // Cmd/Ctrl + J: Toggle Split View
        if (key === 'j') {
            console.log('Cmd+J detected, toggling split view');
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('toggle-split-view')?.click();
            return;
        }

        // Cmd/Ctrl + O: Toggle Outline
        if (key === 'o') {
            console.log('Cmd+O detected, toggling outline');
            e.preventDefault();
            e.stopPropagation();
            outlineBtn?.click();
            return;
        }

        // Cmd/Ctrl + F: Find & Replace
        if (key === 'f') {
            e.preventDefault();
            findBox?.classList.remove('hidden');
            findInput?.focus();
            return;
        }

        // Cmd/Ctrl + H: Show Shortcuts
        if (key === 'h') {
            e.preventDefault();
            document.getElementById('shortcuts-modal')?.classList.remove('hidden');
            return;
        }

        // Only process formatting shortcuts if we're in our app
        if (!inOurApp) return;

        // Cmd/Ctrl + B: Bold
        if (key === 'b') {
            if (inSource) {
                e.preventDefault();
                wrapSourceSelection('**', '**');
            } else if (inEditor) {
                // Let browser handle, then sync
                setTimeout(() => {
                    updateButtonStates();
                    syncToSource();
                }, 10);
            }
            return;
        }

        // Cmd/Ctrl + I: Italic
        if (key === 'i') {
            if (inSource) {
                e.preventDefault();
                wrapSourceSelection('_', '_');
            } else if (inEditor) {
                setTimeout(() => {
                    updateButtonStates();
                    syncToSource();
                }, 10);
            }
            return;
        }

        // Cmd/Ctrl + Alt + 1/2: Headings
        if (e.altKey) {
            if (key === '1') {
                e.preventDefault();
                if (inSource) {
                    const start = sourceTextarea.selectionStart;
                    const text = sourceTextarea.value;
                    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                    sourceTextarea.value = text.substring(0, lineStart) + '# ' + text.substring(lineStart);
                    syncToEditor();
                } else {
                    document.execCommand('formatBlock', false, 'h1');
                    syncToSource();
                }
                return;
            }
            if (key === '2') {
                e.preventDefault();
                if (inSource) {
                    const start = sourceTextarea.selectionStart;
                    const text = sourceTextarea.value;
                    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                    sourceTextarea.value = text.substring(0, lineStart) + '## ' + text.substring(lineStart);
                    syncToEditor();
                } else {
                    document.execCommand('formatBlock', false, 'h2');
                    syncToSource();
                }
                return;
            }
        }

        // Cmd/Ctrl + Shift + 8: Bullet List
        // Cmd/Ctrl + Shift + 7: Numbered List
        if (e.shiftKey && inEditor) {
            if (key === '8' || key === '*') {
                e.preventDefault();
                document.execCommand('insertUnorderedList');
                syncToSource();
                return;
            }
            if (key === '7' || key === '&') {
                e.preventDefault();
                document.execCommand('insertOrderedList');
                syncToSource();
                return;
            }
        }
    }, true); // Use capture phase to intercept before contenteditable

    // Find functionality - custom highlighting
    let currentMatchIndex = -1;
    let matches = [];
    const HIGHLIGHT_CLASS = 'find-highlight';
    const CURRENT_HIGHLIGHT_CLASS = 'find-highlight-current';

    const clearHighlights = () => {
        document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        matches = [];
        currentMatchIndex = -1;
    };

    const highlightMatches = (searchText) => {
        clearHighlights();
        if (!searchText) return;

        const searchLower = searchText.toLowerCase();
        const treeWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);

        const textNodes = [];
        while (treeWalker.nextNode()) {
            textNodes.push(treeWalker.currentNode);
        }

        textNodes.forEach(node => {
            const text = node.textContent;
            const textLower = text.toLowerCase();
            let lastIndex = 0;
            let index;
            const fragments = [];

            while ((index = textLower.indexOf(searchLower, lastIndex)) !== -1) {
                if (index > lastIndex) {
                    fragments.push(document.createTextNode(text.substring(lastIndex, index)));
                }
                const span = document.createElement('span');
                span.className = HIGHLIGHT_CLASS;
                span.textContent = text.substring(index, index + searchText.length);
                fragments.push(span);
                matches.push(span);
                lastIndex = index + searchText.length;
            }

            if (lastIndex < text.length) {
                fragments.push(document.createTextNode(text.substring(lastIndex)));
            }

            if (fragments.length > 0 && lastIndex > 0) {
                const parent = node.parentNode;
                fragments.forEach(frag => parent.insertBefore(frag, node));
                parent.removeChild(node);
            }
        });

        if (matches.length > 0) {
            currentMatchIndex = 0;
            updateCurrentHighlight();
        }
    };

    const updateCurrentHighlight = () => {
        document.querySelectorAll('.' + CURRENT_HIGHLIGHT_CLASS).forEach(el => {
            el.classList.remove(CURRENT_HIGHLIGHT_CLASS);
        });
        if (matches.length > 0 && currentMatchIndex >= 0) {
            matches[currentMatchIndex].classList.add(CURRENT_HIGHLIGHT_CLASS);
            matches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const findNext = () => {
        const searchText = findInput.value;
        if (!searchText) return;
        if (matches.length === 0) {
            highlightMatches(searchText);
        } else {
            currentMatchIndex = (currentMatchIndex + 1) % matches.length;
            updateCurrentHighlight();
        }
    };

    const findPrevious = () => {
        const searchText = findInput.value;
        if (!searchText) return;
        if (matches.length === 0) {
            highlightMatches(searchText);
        } else {
            currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
            updateCurrentHighlight();
        }
    };

    const replaceOne = () => {
        const searchText = findInput.value;
        const replaceText = replaceInput.value;
        if (!searchText || matches.length === 0) {
            highlightMatches(searchText);
            return;
        }
        const currentMatch = matches[currentMatchIndex];
        if (currentMatch) {
            currentMatch.textContent = replaceText;
            currentMatch.classList.remove(HIGHLIGHT_CLASS, CURRENT_HIGHLIGHT_CLASS);
            matches.splice(currentMatchIndex, 1);
            if (matches.length > 0) {
                currentMatchIndex = currentMatchIndex % matches.length;
                updateCurrentHighlight();
            }
            syncToSource();
            saveToLocalStorage();
        }
    };

    const replaceAll = () => {
        const searchText = findInput.value;
        const replaceText = replaceInput.value;
        if (!searchText) return;
        if (matches.length === 0) highlightMatches(searchText);
        matches.forEach(match => {
            match.textContent = replaceText;
            match.classList.remove(HIGHLIGHT_CLASS, CURRENT_HIGHLIGHT_CLASS);
        });
        matches = [];
        currentMatchIndex = -1;
        syncToSource();
        saveToLocalStorage();
    };

    if (findInput) {
        findInput.addEventListener('input', () => highlightMatches(findInput.value));
    }

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

    // Alt+click (Windows/Linux) or Cmd+click (Mac) to follow links
    editor.addEventListener('click', (e) => {
        if (e.altKey || e.metaKey) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                window.open(link.href, '_blank');
            }
        }
    });

    // Change cursor to pointer when Alt/Cmd is held over links
    document.addEventListener('keydown', (e) => {
        if (e.altKey || e.metaKey) {
            editor.classList.add('link-clickable');
        }
    });
    document.addEventListener('keyup', (e) => {
        if (!e.altKey && !e.metaKey) {
            editor.classList.remove('link-clickable');
        }
    });

    // Handle Enter key inside code blocks and other structures
    editor.addEventListener('keydown', (e) => {
        // Arrow key navigation around non-editable elements like hr
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            let node = selection.anchorNode;
            // Walk up to find the direct child of editor
            while (node && node.parentNode !== editor) {
                node = node.parentNode;
            }
            if (!node || node === editor) return;

            const nextSibling = node.nextElementSibling;
            const prevSibling = node.previousElementSibling;

            // ArrowDown: if next sibling is HR, skip to the element after it
            if (e.key === 'ArrowDown' && nextSibling?.tagName === 'HR') {
                e.preventDefault();
                const target = nextSibling.nextElementSibling;
                if (target) {
                    const range = document.createRange();
                    // Position at the beginning of the target
                    const firstTextNode = target.querySelector('*') || target;
                    if (target.firstChild) {
                        range.setStart(target.firstChild, 0);
                    } else {
                        range.setStart(target, 0);
                    }
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // No element after hr, create a paragraph
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    nextSibling.after(p);
                    const range = document.createRange();
                    range.setStart(p, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                return;
            }

            // ArrowUp: if previous sibling is HR, skip to the element before it
            if (e.key === 'ArrowUp' && prevSibling?.tagName === 'HR') {
                e.preventDefault();
                const target = prevSibling.previousElementSibling;
                if (target) {
                    const range = document.createRange();
                    // Position at the end of the target
                    if (target.lastChild && target.lastChild.nodeType === Node.TEXT_NODE) {
                        range.setStart(target.lastChild, target.lastChild.textContent.length);
                    } else if (target.lastChild) {
                        range.setStartAfter(target.lastChild);
                    } else {
                        range.setStart(target, 0);
                    }
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // No element before hr, create a paragraph
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    prevSibling.before(p);
                    const range = document.createRange();
                    range.setStart(p, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                return;
            }
        }

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

    // Shortcuts Modal
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const closeShortcutsModal = document.getElementById('close-shortcuts-modal');

    if (shortcutsBtn && shortcutsModal) {
        shortcutsBtn.addEventListener('click', () => {
            shortcutsModal.classList.remove('hidden');
        });
    }
    if (closeShortcutsModal && shortcutsModal) {
        closeShortcutsModal.addEventListener('click', () => {
            shortcutsModal.classList.add('hidden');
        });
    }
    // Close on backdrop click
    if (shortcutsModal) {
        const backdrop = shortcutsModal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                shortcutsModal.classList.add('hidden');
            });
        }
    }

    // Sidebar Toggle
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    };

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);



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
            const taskMd = '\n- [ ] Task 1\n- [ ] Task 2\n';
            insertAtCursor(marked.parse(taskMd), taskMd);
        });
    }

    // Insert Image
    const insertImageBtn = document.getElementById('btn-insert-image');
    if (insertImageBtn) {
        insertImageBtn.addEventListener('click', () => {
            const url = prompt('Enter image URL:');
            if (url) {
                const alt = prompt('Enter alt text (description):', 'Image') || 'Image';
                const imgMd = `\n![${alt}](${url})\n`;
                insertAtCursor(`<img src="${url}" alt="${alt}">`, imgMd);
            }
        });
    }

    // Insert Horizontal Rule
    const insertHrBtn = document.getElementById('btn-insert-hr');
    if (insertHrBtn) {
        insertHrBtn.addEventListener('click', () => {
            if (lastFocusedElement === sourceTextarea) {
                const start = sourceTextarea.selectionStart;
                const end = sourceTextarea.selectionEnd;
                sourceTextarea.value = sourceTextarea.value.substring(0, start) + '\n---\n\n' + sourceTextarea.value.substring(end);
                syncToEditor();
            } else {
                editor.focus();
                // Insert HR followed by an empty paragraph for navigation
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);

                const hr = document.createElement('hr');
                const p = document.createElement('p');
                p.innerHTML = '<br>';

                range.deleteContents();
                range.insertNode(p);
                range.insertNode(hr);

                // Move cursor to the paragraph after hr
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);

                syncToSource();
            }
        });
    }

    // Quote/Alert Dropdown
    const quoteDropdown = document.getElementById('quote-dropdown');
    if (quoteDropdown) {
        const dropdownItems = quoteDropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const insertType = item.getAttribute('data-insert');

                if (insertType === 'blockquote') {
                    const md = '\n> Quote here\n';
                    insertAtCursor(marked.parse(md), md);
                } else {
                    // Alert types
                    const alertType = insertType.replace('alert-', '').toUpperCase();
                    const md = `\n> [!${alertType}]\n> Write your text here\n`;
                    insertAtCursor(marked.parse(md), md);
                }

                // Close dropdown
                quoteDropdown.classList.remove('open');
            });
        });
    }

    // Subscript Button
    const subscriptBtn = document.getElementById('btn-subscript');
    if (subscriptBtn) {
        subscriptBtn.addEventListener('click', () => {
            const selection = window.getSelection();
            const selectedText = selection.toString() || 'x';
            if (lastFocusedElement === sourceTextarea) {
                const start = sourceTextarea.selectionStart;
                const end = sourceTextarea.selectionEnd;
                const text = sourceTextarea.value;
                const sel = text.substring(start, end) || 'x';
                sourceTextarea.value = text.substring(0, start) + `<sub>${sel}</sub>` + text.substring(end);
                syncToEditor();
            } else {
                editor.focus();
                document.execCommand('insertHTML', false, `<sub>${selectedText}</sub>`);
                syncToSource();
            }
        });
    }

    // Superscript Button
    const superscriptBtn = document.getElementById('btn-superscript');
    if (superscriptBtn) {
        superscriptBtn.addEventListener('click', () => {
            const selection = window.getSelection();
            const selectedText = selection.toString() || '2';
            if (lastFocusedElement === sourceTextarea) {
                const start = sourceTextarea.selectionStart;
                const end = sourceTextarea.selectionEnd;
                const text = sourceTextarea.value;
                const sel = text.substring(start, end) || '2';
                sourceTextarea.value = text.substring(0, start) + `<sup>${sel}</sup>` + text.substring(end);
                syncToEditor();
            } else {
                editor.focus();
                document.execCommand('insertHTML', false, `<sup>${selectedText}</sup>`);
                syncToSource();
            }
        });
    }

    // Emoji Picker
    const emojiDropdown = document.getElementById('emoji-dropdown');
    if (emojiDropdown) {
        const emojiButtons = emojiDropdown.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const emoji = btn.getAttribute('data-emoji');
                if (lastFocusedElement === sourceTextarea) {
                    const start = sourceTextarea.selectionStart;
                    sourceTextarea.value = sourceTextarea.value.substring(0, start) + emoji + sourceTextarea.value.substring(start);
                    syncToEditor();
                } else {
                    editor.focus();
                    document.execCommand('insertText', false, emoji);
                    syncToSource();
                }
            });
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
    const findPrevBtn = document.getElementById('find-prev');
    const findNextBtn = document.getElementById('find-next');
    const replaceBtnEl = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const closeFindBtn = document.getElementById('close-find');

    if (findPrevBtn) findPrevBtn.onclick = () => findPrevious();
    if (findNextBtn) findNextBtn.onclick = () => findNext();
    if (replaceBtnEl) replaceBtnEl.onclick = () => replaceOne();
    if (replaceAllBtn) replaceAllBtn.onclick = () => replaceAll();
    if (closeFindBtn) closeFindBtn.onclick = () => {
        findBox.classList.add('hidden');
        clearHighlights();
    };

    // Also find on Enter key in find input
    if (findInput) {
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    findPrevious();
                } else {
                    findNext();
                }
            }
        });
    }

    // Export HTML
    // Export Handlers
    const exportMdBtn = document.getElementById('export-md');
    const exportHtmlBtnNew = document.getElementById('export-html');
    const exportPdfBtn = document.getElementById('export-pdf');

    const downloadFile = (filename, content, type) => {
        const blob = new Blob([content], { type: type });
        saveAs(blob, filename);
    };

    if (exportMdBtn) {
        exportMdBtn.onclick = () => {
            const docTitle = (documents.find(d => d.id === currentDocId)?.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            downloadFile(`${docTitle}.md`, sourceTextarea.value, 'text/markdown;charset=utf-8');
        };
    }

    if (exportHtmlBtnNew) {
        exportHtmlBtnNew.onclick = () => {
            const docTitle = documents.find(d => d.id === currentDocId)?.title || 'Document';
            const cleanTitle = docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            // Create a complete HTML document
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${docTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #333; }
        img { max-width: 100%; }
        blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #666; margin-left: 0; }
        pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        code { font-family: monospace; background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
        hr { border: none; border-top: 2px solid #eee; margin: 2rem 0; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
        th { background-color: #f9f9f9; }
        /* Checkboxes */
        li.task-list-item { list-style: none; margin-left: -1.5em; }
        input[type="checkbox"] { margin-right: 0.5em; }
    </style>
</head>
<body>
    ${editor.innerHTML}
</body>
</html>`;
            downloadFile(`${cleanTitle}.html`, fullHtml, 'text/html;charset=utf-8');
        };
    }

    if (exportPdfBtn) {
        exportPdfBtn.onclick = () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            // Small delay to allow UI to update (close menus, apply styles)
            setTimeout(() => {
                window.print();
            }, 50);
        };
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
