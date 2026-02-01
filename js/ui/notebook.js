// Notebook controller for managing cells

import { Cell } from './cell.js';

class Notebook {
    constructor(container, interpreter) {
        this.container = container;
        this.interpreter = interpreter;
        this.cells = [];
        this.activeCell = null;
        this.nextCellId = 1;

        this.attachGlobalListeners();
    }

    attachGlobalListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+Enter: Run all cells
            if (e.key === 'Enter' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                this.runAllCells();
                return;
            }
        });

        // Toolbar buttons
        document.getElementById('btn-run-all').addEventListener('click', () => {
            this.runAllCells();
        });

        document.getElementById('btn-add-cell').addEventListener('click', () => {
            const cell = this.addCell();
            cell.focus();
        });

        document.getElementById('btn-clear-outputs').addEventListener('click', () => {
            this.clearAllOutputs();
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            this.resetEnvironment();
        });

        document.getElementById('btn-help').addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('hidden');
        });

        document.getElementById('close-help').addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('hidden');
        });

        // Close modal on outside click
        document.getElementById('help-modal').addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                document.getElementById('help-modal').classList.add('hidden');
            }
        });

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('help-modal').classList.add('hidden');
            }
        });
    }

    addCell() {
        const cell = new Cell(this, this.nextCellId++);
        this.cells.push(cell);
        this.container.appendChild(cell.element);
        this.updateStatus();
        this.saveToLocalStorage();
        return cell;
    }

    addCellAfter(referenceCell) {
        const index = this.cells.indexOf(referenceCell);
        const cell = new Cell(this, this.nextCellId++);

        if (index === -1 || index === this.cells.length - 1) {
            this.cells.push(cell);
            this.container.appendChild(cell.element);
        } else {
            this.cells.splice(index + 1, 0, cell);
            const nextElement = this.cells[index + 2]?.element;
            this.container.insertBefore(cell.element, nextElement);
        }

        this.updateStatus();
        this.saveToLocalStorage();
        return cell;
    }

    deleteCell(cell) {
        const index = this.cells.indexOf(cell);
        if (index === -1) return;

        // Don't delete if it's the only cell
        if (this.cells.length === 1) {
            cell.setCode('');
            cell.clearOutput();
            return;
        }

        // Focus adjacent cell
        if (index > 0) {
            this.cells[index - 1].focus();
        } else if (this.cells.length > 1) {
            this.cells[1].focus();
        }

        this.cells.splice(index, 1);
        cell.destroy();
        this.updateStatus();
        this.saveToLocalStorage();
    }

    moveCellUp(cell) {
        const index = this.cells.indexOf(cell);
        if (index <= 0) return;

        // Swap in array
        [this.cells[index], this.cells[index - 1]] =
            [this.cells[index - 1], this.cells[index]];

        // Swap in DOM
        this.container.insertBefore(cell.element, this.cells[index].element);
        this.saveToLocalStorage();
    }

    moveCellDown(cell) {
        const index = this.cells.indexOf(cell);
        if (index === -1 || index >= this.cells.length - 1) return;

        // Swap in array
        [this.cells[index], this.cells[index + 1]] =
            [this.cells[index + 1], this.cells[index]];

        // Swap in DOM
        this.container.insertBefore(this.cells[index].element, cell.element);
        this.saveToLocalStorage();
    }

    setActiveCell(cell) {
        this.activeCell = cell;
    }

    focusPreviousCell(cell) {
        const index = this.cells.indexOf(cell);
        if (index > 0) {
            this.cells[index - 1].focus();
        }
    }

    focusNextCell(cell) {
        const index = this.cells.indexOf(cell);
        if (index < this.cells.length - 1) {
            this.cells[index + 1].focus();
        }
    }

    async runAllCells() {
        for (const cell of this.cells) {
            await cell.run();
        }
    }

    clearAllOutputs() {
        for (const cell of this.cells) {
            cell.clearOutput();
            cell.element.classList.remove('error');
        }
    }

    resetEnvironment() {
        this.interpreter.reset();
        this.clearAllOutputs();
        this.updateStatus('Environment reset');
    }

    updateStatus(message = 'Ready') {
        document.getElementById('status-message').textContent = message;

        const bindings = this.interpreter.getBindingCount();
        document.getElementById('status-env').textContent =
            `Environment: ${bindings} user bindings`;
    }

    // Save/load functionality
    toJSON() {
        return {
            cells: this.cells.map(cell => ({
                code: cell.getCode()
            })),
            nextCellId: this.nextCellId
        };
    }

    fromJSON(data) {
        // Clear existing cells
        for (const cell of this.cells) {
            cell.destroy();
        }
        this.cells = [];

        // Restore nextCellId
        if (data.nextCellId) {
            this.nextCellId = data.nextCellId;
        }

        // Create new cells
        for (const cellData of data.cells) {
            const cell = new Cell(this, this.nextCellId++);
            this.cells.push(cell);
            this.container.appendChild(cell.element);
            cell.setCode(cellData.code);
        }
    }

    // Local storage
    saveToLocalStorage() {
        try {
            localStorage.setItem('lisp-notebook', JSON.stringify(this.toJSON()));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('lisp-notebook');
            if (data) {
                this.fromJSON(JSON.parse(data));
                return true;
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
        return false;
    }
}

export { Notebook };
