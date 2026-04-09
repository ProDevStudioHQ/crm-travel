class ModernSelect {
    constructor(element, options = {}) {
        this.originalInput = element;

        // Merge default options
        this.options = {
            searchable: false,
            multiple: false,
            placeholder: 'Select...',
            items: [],          // Array of objects {value: 'v', label: 'L'}
            onChange: null,     // Callback function(value)
            ...options
        };

        this.selectedValues = this.options.multiple ? [] : null;
        this.isOpen = false;
        this.focusedOptionIndex = -1;

        // Extract options from the existing <select> element if it is a real select
        if (this.originalInput.tagName === 'SELECT' && this.options.items.length === 0) {
            this.extractOptionsFromSelect();
        }

        this.init();
    }

    extractOptionsFromSelect() {
        const options = Array.from(this.originalInput.options);
        this.options.items = options.map(opt => ({
            value: opt.value,
            label: opt.text,
            disabled: opt.disabled
        }));

        // Handle pre-selected values
        if (this.options.multiple) {
            this.selectedValues = options.filter(opt => opt.selected).map(opt => opt.value);
        } else {
            const selected = options.find(opt => opt.selected);
            if (selected && selected.value) {
                this.selectedValues = selected.value;
            }
        }
    }

    init() {
        // Build DOM
        this.container = document.createElement('div');
        this.container.className = 'msel';
        if (this.options.multiple) this.container.classList.add('is-multiple');
        if (this.options.searchable) this.container.classList.add('is-searchable');

        this.control = document.createElement('div');
        this.control.className = 'msel__control';
        this.container.appendChild(this.control);

        this.valueContainer = document.createElement('div');
        this.valueContainer.style.display = 'flex';
        this.valueContainer.style.flexWrap = 'wrap';
        this.valueContainer.style.gap = '6px';
        this.valueContainer.style.flexGrow = '1';
        this.control.appendChild(this.valueContainer);

        if (this.options.searchable) {
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.className = 'msel__search';
            this.searchInput.placeholder = this.selectedValues && (!this.options.multiple || this.selectedValues.length === 0) ? '' : this.options.placeholder;
            this.valueContainer.appendChild(this.searchInput);
        } else {
            this.placeholderElement = document.createElement('div');
            this.placeholderElement.innerText = this.options.placeholder;
            this.placeholderElement.style.color = 'var(--text-muted)';
            this.placeholderElement.style.padding = '8px 0';
            this.valueContainer.appendChild(this.placeholderElement);
        }

        this.indicators = document.createElement('div');
        this.indicators.className = 'msel__indicators';
        this.control.appendChild(this.indicators);

        this.clearBtn = document.createElement('i');
        this.clearBtn.className = 'fa-solid fa-xmark msel__clear-indicator';
        this.clearBtn.style.display = 'none';
        this.indicators.appendChild(this.clearBtn);

        this.caretBtn = document.createElement('i');
        this.caretBtn.className = 'fa-solid fa-chevron-down msel__dropdown-indicator';
        this.indicators.appendChild(this.caretBtn);

        this.menu = document.createElement('div');
        this.menu.className = 'msel__menu';
        this.menu.setAttribute('role', 'listbox');
        this.container.appendChild(this.menu);

        // Hide original input and insert our container before it
        this.originalInput.style.display = 'none';

        // If the original input is part of a form, it needs to keep its name and value, but since it's hidden we just update its value when ours changes.
        this.originalInput.parentNode.insertBefore(this.container, this.originalInput);

        this.bindEvents();
        this.renderSelection();
        this.renderMenu(this.options.items);
    }

    bindEvents() {
        // Toggle Open/Close
        this.control.addEventListener('click', (e) => {
            if (e.target.closest('.msel__clear-indicator')) {
                this.clearSelection();
                return;
            }
            if (e.target.closest('.msel__chip-remove')) {
                const val = e.target.closest('.msel__chip').dataset.value;
                this.removeValue(val);
                return;
            }
            this.toggleMenu();
            if (this.isOpen && this.options.searchable) {
                this.searchInput.focus();
            }
        });

        // Click outside closes menu
        document.addEventListener('mousedown', (e) => {
            if (!this.container.contains(e.target) && this.isOpen) {
                this.closeMenu();
            }
        });

        // Search filtering
        if (this.options.searchable) {
            this.searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                if (!this.isOpen) this.openMenu();

                const filtered = this.options.items.filter(item =>
                    item.label.toLowerCase().includes(term) ||
                    item.value.toLowerCase().includes(term)
                );
                this.renderMenu(filtered);
                this.focusedOptionIndex = 0; // reset focus to first item after search
                this.updateFocusVisuals();
            });

            // Delete key removes last chip in multiple mode
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && this.searchInput.value === '' && this.options.multiple && this.selectedValues.length > 0) {
                    this.removeValue(this.selectedValues[this.selectedValues.length - 1]);
                }
            });
        }

        // Global Keyboard Navigation
        this.container.addEventListener('keydown', (e) => {
            if (!this.isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
                e.preventDefault();
                this.openMenu();
                return;
            }

            if (!this.isOpen) return;

            const visibleOptions = Array.from(this.menu.querySelectorAll('.msel__option'));
            if (visibleOptions.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.focusedOptionIndex = (this.focusedOptionIndex + 1) % visibleOptions.length;
                this.updateFocusVisuals();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.focusedOptionIndex = (this.focusedOptionIndex - 1 + visibleOptions.length) % visibleOptions.length;
                this.updateFocusVisuals();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.focusedOptionIndex >= 0 && visibleOptions[this.focusedOptionIndex]) {
                    visibleOptions[this.focusedOptionIndex].click();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeMenu();
            }
        });

        // Focus styles
        if (this.options.searchable) {
            this.searchInput.addEventListener('focus', () => this.container.classList.add('is-focused'));
            this.searchInput.addEventListener('blur', () => this.container.classList.remove('is-focused'));
        } else {
            // Make control focusable if not searchable
            this.control.tabIndex = 0;
            this.control.addEventListener('focus', () => this.container.classList.add('is-focused'));
            this.control.addEventListener('blur', () => this.container.classList.remove('is-focused'));
        }
    }

    renderMenu(itemsToRender) {
        this.menu.innerHTML = '';
        if (itemsToRender.length === 0) {
            this.menu.innerHTML = '<div class="msel__no-options">No options found</div>';
            return;
        }

        itemsToRender.forEach((item, index) => {
            const isSelected = this.options.multiple
                ? this.selectedValues.includes(item.value)
                : this.selectedValues === item.value;

            const optEl = document.createElement('div');
            optEl.className = 'msel__option';
            if (isSelected) optEl.classList.add('is-selected');
            optEl.dataset.value = item.value;
            optEl.setAttribute('role', 'option');
            optEl.setAttribute('aria-selected', isSelected);

            let html = `<span>${item.label}</span>`;
            if (isSelected && this.options.multiple) {
                html += '<i class="fa-solid fa-check" style="color:var(--primary); font-size:12px;"></i>';
            }
            optEl.innerHTML = html;

            optEl.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent control click toggling menu
                this.selectValue(item.value);
            });

            this.menu.appendChild(optEl);
        });
    }

    updateFocusVisuals() {
        const options = this.menu.querySelectorAll('.msel__option');
        options.forEach(opt => opt.classList.remove('is-focused'));

        if (this.focusedOptionIndex >= 0 && options[this.focusedOptionIndex]) {
            const opt = options[this.focusedOptionIndex];
            opt.classList.add('is-focused');
            // scroll into view
            const menuRect = this.menu.getBoundingClientRect();
            const optRect = opt.getBoundingClientRect();
            if (optRect.bottom > menuRect.bottom) {
                this.menu.scrollTop += (optRect.bottom - menuRect.bottom);
            } else if (optRect.top < menuRect.top) {
                this.menu.scrollTop -= (menuRect.top - optRect.top);
            }
        }
    }

    selectValue(val) {
        if (this.options.multiple) {
            if (this.selectedValues.includes(val)) {
                this.removeValue(val);
            } else {
                this.selectedValues.push(val);
                this.triggerChange();
            }
        } else {
            this.selectedValues = val;
            this.closeMenu();
            this.triggerChange();
        }
    }

    removeValue(val) {
        if (this.options.multiple) {
            this.selectedValues = this.selectedValues.filter(v => v !== val);
            this.triggerChange();
        }
    }

    clearSelection() {
        this.selectedValues = this.options.multiple ? [] : null;
        this.triggerChange();
    }

    triggerChange() {
        // Update original input
        if (this.originalInput.tagName === 'SELECT') {
            if (this.options.multiple) {
                Array.from(this.originalInput.options).forEach(opt => {
                    opt.selected = this.selectedValues.includes(opt.value);
                });
            } else {
                this.originalInput.value = this.selectedValues;
            }
        } else if (this.originalInput.tagName === 'INPUT') {
            this.originalInput.value = this.options.multiple ? this.selectedValues.join(',') : this.selectedValues;
        }

        // Render UI
        this.renderSelection();
        this.renderMenu(this.options.items); // update checkmarks

        // Callback
        if (typeof this.options.onChange === 'function') {
            this.options.onChange(this.selectedValues);
        }
    }

    renderSelection() {
        // Clear all chips
        const existingChips = this.valueContainer.querySelectorAll('.msel__chip, .msel__single-value');
        existingChips.forEach(c => c.remove());

        const hasSelection = this.options.multiple ? this.selectedValues.length > 0 : !!this.selectedValues;

        if (hasSelection) {
            if (this.options.multiple) {
                this.selectedValues.forEach(val => {
                    const item = this.options.items.find(i => i.value === val);
                    const label = item ? item.label : val;

                    const chip = document.createElement('div');
                    chip.className = 'msel__chip';
                    chip.dataset.value = val;
                    chip.innerHTML = `
                        <span>${label}</span>
                        <i class="fa-solid fa-xmark msel__chip-remove"></i>
                    `;
                    this.valueContainer.insertBefore(chip, this.searchInput || this.placeholderElement);
                });
            } else {
                const item = this.options.items.find(i => i.value === this.selectedValues);
                const label = item ? item.label : this.selectedValues;

                const singleDisplay = document.createElement('div');
                singleDisplay.className = 'msel__single-value';
                singleDisplay.innerText = label;
                this.valueContainer.insertBefore(singleDisplay, this.searchInput || this.placeholderElement);
            }
        }

        // Toggle clear button
        this.clearBtn.style.display = hasSelection ? 'block' : 'none';

        // Placeholder visibility
        if (this.options.searchable) {
            this.searchInput.placeholder = hasSelection ? '' : this.options.placeholder;
        } else if (this.placeholderElement) {
            this.placeholderElement.style.display = hasSelection ? 'none' : 'block';
        }
    }

    openMenu() {
        this.isOpen = true;
        this.container.classList.add('is-open');
        this.focusedOptionIndex = -1;
        this.updateFocusVisuals();
        if (this.options.searchable) this.searchInput.focus();
    }

    closeMenu() {
        this.isOpen = false;
        this.container.classList.remove('is-open');
        if (this.options.searchable) {
            this.searchInput.value = '';
            this.renderMenu(this.options.items); // reset filter
            this.searchInput.blur();
        }
    }

    toggleMenu() {
        if (this.isOpen) this.closeMenu();
        else this.openMenu();
    }
}

// Attach globally
window.initModernSelect = function (elementOrSelector, options) {
    const el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
    if (!el) return null;
    return new ModernSelect(el, options);
};
