// Cell component for the notebook UI

import { VOID, stringify } from '../interpreter/types.js';

class Cell {
    constructor(notebook, id) {
        this.notebook = notebook;
        this.id = id;
        this.element = null;
        this.textarea = null;
        this.output = null;
        this.lineNumbers = null;
        this.isRunning = false;

        this.createDOM();
        this.attachEventListeners();
    }

    createDOM() {
        this.element = document.createElement('div');
        this.element.className = 'cell';
        this.element.dataset.cellId = this.id;

        this.element.innerHTML = `
            <div class="cell-toolbar">
                <span class="cell-number">In [${this.id}]:</span>
                <button class="btn-run" title="Run (Shift+Enter)">&#9654; Run</button>
                <button class="btn-move-up" title="Move Up">&#8593;</button>
                <button class="btn-move-down" title="Move Down">&#8595;</button>
                <button class="btn-delete" title="Delete (Ctrl+D)">&#10005;</button>
            </div>
            <div class="cell-input">
                <div class="line-numbers">1</div>
                <textarea
                    placeholder="Enter LISP code here..."
                    spellcheck="false"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                ></textarea>
            </div>
            <div class="cell-output"></div>
        `;

        this.textarea = this.element.querySelector('textarea');
        this.output = this.element.querySelector('.cell-output');
        this.lineNumbers = this.element.querySelector('.line-numbers');
    }

    attachEventListeners() {
        // Focus handling
        this.textarea.addEventListener('focus', () => {
            this.notebook.setActiveCell(this);
            this.element.classList.add('focused');
        });

        this.textarea.addEventListener('blur', () => {
            this.element.classList.remove('focused');
        });

        // Line numbers and auto-resize
        this.textarea.addEventListener('input', () => {
            this.updateLineNumbers();
            this.autoResize();
        });

        // Keyboard shortcuts
        this.textarea.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Toolbar buttons
        this.element.querySelector('.btn-run').addEventListener('click', () => {
            this.run();
        });

        this.element.querySelector('.btn-delete').addEventListener('click', () => {
            this.notebook.deleteCell(this);
        });

        this.element.querySelector('.btn-move-up').addEventListener('click', () => {
            this.notebook.moveCellUp(this);
        });

        this.element.querySelector('.btn-move-down').addEventListener('click', () => {
            this.notebook.moveCellDown(this);
        });
    }

    handleKeydown(e) {
        // Tab: insert spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertAtCursor('  ');
            return;
        }

        // Shift+Enter: Run cell
        if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            this.run();
            return;
        }

        // Ctrl+Enter: Run and add new cell
        if (e.key === 'Enter' && e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            this.run();
            const newCell = this.notebook.addCellAfter(this);
            newCell.focus();
            return;
        }

        // Ctrl+D: Delete cell
        if (e.key === 'd' && e.ctrlKey) {
            e.preventDefault();
            this.notebook.deleteCell(this);
            return;
        }

        // Ctrl+Up: Previous cell
        if (e.key === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            this.notebook.focusPreviousCell(this);
            return;
        }

        // Ctrl+Down: Next cell
        if (e.key === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            this.notebook.focusNextCell(this);
            return;
        }

        // Auto-close parentheses and brackets
        if (e.key === '(') {
            e.preventDefault();
            this.insertMatchingPair('(', ')');
            return;
        }

        if (e.key === '[') {
            e.preventDefault();
            this.insertMatchingPair('[', ']');
            return;
        }

        if (e.key === '"') {
            e.preventDefault();
            this.insertMatchingPair('"', '"');
            return;
        }

        // Handle backspace for paired characters
        if (e.key === 'Backspace') {
            const start = this.textarea.selectionStart;
            const value = this.textarea.value;
            if (start > 0 && start === this.textarea.selectionEnd) {
                const charBefore = value[start - 1];
                const charAfter = value[start];
                const pairs = { '(': ')', '[': ']', '"': '"' };
                if (pairs[charBefore] === charAfter) {
                    e.preventDefault();
                    this.textarea.value = value.substring(0, start - 1) + value.substring(start + 1);
                    this.textarea.selectionStart = this.textarea.selectionEnd = start - 1;
                    this.updateLineNumbers();
                    this.autoResize();
                }
            }
        }
    }

    insertAtCursor(text) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        this.textarea.value = value.substring(0, start) + text + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        this.updateLineNumbers();
        this.autoResize();
    }

    insertMatchingPair(open, close) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);

        this.textarea.value = value.substring(0, start) + open + selected + close + value.substring(end);

        if (selected.length > 0) {
            this.textarea.selectionStart = start + 1;
            this.textarea.selectionEnd = end + 1;
        } else {
            this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
        }
        this.updateLineNumbers();
        this.autoResize();
    }

    updateLineNumbers() {
        const lines = this.textarea.value.split('\n').length;
        this.lineNumbers.textContent = Array.from(
            { length: lines },
            (_, i) => i + 1
        ).join('\n');
    }

    autoResize() {
        this.textarea.style.height = 'auto';
        this.textarea.style.height = Math.max(80, this.textarea.scrollHeight) + 'px';
    }

    getCode() {
        return this.textarea.value;
    }

    setCode(code) {
        this.textarea.value = code;
        this.updateLineNumbers();
        this.autoResize();
    }

    focus() {
        this.textarea.focus();
    }

    async run() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.element.classList.add('running');
        this.element.classList.remove('error');
        this.clearOutput();

        const code = this.getCode().trim();
        if (!code) {
            this.isRunning = false;
            this.element.classList.remove('running');
            return;
        }

        try {
            // Create output collector
            const outputCollector = {
                content: [],
                write(text) {
                    this.content.push({ type: 'print', text });
                }
            };

            // Run the code
            const result = this.notebook.interpreter.run(code, outputCollector);

            // Display output
            this.displayOutput(outputCollector.content, result);

        } catch (error) {
            this.displayError(error);
            this.element.classList.add('error');
        } finally {
            this.isRunning = false;
            this.element.classList.remove('running');
            this.notebook.updateStatus();
        }
    }

    displayOutput(prints, result) {
        let html = '';

        // Display printed output
        for (const item of prints) {
            html += `<div class="print">${this.escapeHtml(item.text)}</div>`;
        }

        // Display result (if not void)
        if (result !== VOID && result !== undefined) {
            html += `<div class="result">${this.escapeHtml(stringify(result))}</div>`;
        }

        this.output.innerHTML = html;
    }

    displayError(error) {
        let message = error.message || String(error);
        if (error.line) {
            message += ` (line ${error.line}`;
            if (error.column) {
                message += `, column ${error.column}`;
            }
            message += ')';
        }
        this.output.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }

    clearOutput() {
        this.output.innerHTML = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.element.remove();
    }
}

export { Cell };
