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
        if (!sourceWrapper.classList.contains('hidden')) {
            sourceCode.textContent = turndownService.turndown(editor.innerHTML);
            Prism.highlightElement(sourceCode);
        }
    };

    const updateOutline = () => {
        if (outlineSidebar.classList.contains('hidden')) return;
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
        { name: 'Toggle Split View', icon: 'ph-columns', action: () => toggleSplitViewBtn.click(), shortcut: 'Cmd+P' },
        { name: 'Toggle Outline', icon: 'ph-list-numbers', action: () => outlineBtn.click(), shortcut: 'Cmd+O' },
        { name: 'Exportera HTML', icon: 'ph-download', action: () => exportHtmlBtn.click(), shortcut: 'Cmd+E' },
        { name: 'Finn & Ersätt', icon: 'ph-magnifying-glass', action: () => findBox.classList.remove('hidden') },
        { name: 'Skriv ut (PDF)', icon: 'ph-printer', action: () => window.print() }
    ];

    const findAndReplace = (all = false) => {
        const find = findInput.value;
        const replace = replaceInput.value;
        if (!find) return;
        const regex = new RegExp(find, all ? 'g' : '');
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

    outlineBtn.addEventListener('click', () => {
        outlineSidebar.classList.toggle('hidden');
        updateOutline();
    });

    document.getElementById('find-next').onclick = () => findAndReplace(false);
    document.getElementById('replace-btn').onclick = () => findAndReplace(false);
    document.getElementById('replace-all-btn').onclick = () => findAndReplace(true);
    document.getElementById('close-find').onclick = () => findBox.classList.add('hidden');

    // Command Palette UI
    const renderCommands = (filter = '') => {
        commandResults.innerHTML = '';
        const filtered = commands.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
        filtered.forEach(cmd => {
            const div = document.createElement('div');
            div.className = 'command-item';
            div.innerHTML = `<span><i class="ph ${cmd.icon}"></i> ${cmd.name}</span><span class="shortcut">${cmd.shortcut || ''}</span>`;
            div.onclick = () => { cmd.action(); commandPalette.classList.add('hidden'); };
            commandResults.appendChild(div);
        });
    };

    window.addEventListener('keydown', (e) => {
        const isCmd = e.metaKey || e.ctrlKey;
        if (isCmd && e.key === 'k') { e.preventDefault(); commandPalette.classList.remove('hidden'); commandInput.focus(); renderCommands(); }
        if (isCmd && e.key === 'f') { e.preventDefault(); findBox.classList.remove('hidden'); findInput.focus(); }
        if (isCmd && e.key === 'o') { e.preventDefault(); outlineBtn.click(); }
        if (e.key === 'Escape') { commandPalette.classList.add('hidden'); findBox.classList.add('hidden'); }
    });

    commandInput.addEventListener('input', (e) => renderCommands(e.target.value));

    // Toolbar & Init
    document.querySelectorAll('[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand(btn.getAttribute('data-command'), false, btn.getAttribute('data-value'));
            editor.focus();
            updateSourceView();
        });
    });

    const saved = localStorage.getItem('md-flow-content');
    if (saved) editor.innerHTML = saved;
    updateStats();
    Prism.highlightAll();

    // Mermaid Init
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: true });
    }
});
