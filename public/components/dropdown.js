/**
 * Dropdown Component
 * A customizable dropdown component matching the CodeSignal Design System
 */

class Dropdown {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      throw new Error('Dropdown container not found');
    }

    // Configuration
    this.config = {
      placeholder: options.placeholder || 'Select option',
      items: options.items || [],
      selectedValue: options.selectedValue || null,
      onSelect: options.onSelect || null,
      width: options.width || 'auto',
      ...options
    };

    // State
    this.isOpen = false;
    this.selectedValue = this.config.selectedValue;

    // Initialize
    this.init();
  }

  init() {
    // Create dropdown structure
    this.container.innerHTML = '';
    this.container.className = 'dropdown-container';
    
    // Create toggle button
    this.toggle = document.createElement('button');
    this.toggle.className = 'dropdown-toggle';
    this.toggle.setAttribute('type', 'button');
    this.toggle.setAttribute('aria-haspopup', 'true');
    this.toggle.setAttribute('aria-expanded', 'false');
    
    // Toggle content
    const toggleContent = document.createElement('div');
    toggleContent.className = 'dropdown-toggle-content';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'dropdown-toggle-label';
    toggleLabel.textContent = this.getSelectedLabel() || this.config.placeholder;
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'dropdown-toggle-icon';
    toggleIcon.innerHTML = this.getChevronDownIcon();
    
    toggleContent.appendChild(toggleLabel);
    toggleContent.appendChild(toggleIcon);
    this.toggle.appendChild(toggleContent);
    
    // Create menu panel
    this.menu = document.createElement('div');
    this.menu.className = 'dropdown-menu';
    this.menu.setAttribute('role', 'listbox');
    
    // Create menu list
    this.menuList = document.createElement('div');
    this.menuList.className = 'dropdown-menu-list';
    
    // Create menu items
    this.config.items.forEach((item, index) => {
      const menuItem = this.createMenuItem(item, index);
      this.menuList.appendChild(menuItem);
    });
    
    this.menu.appendChild(this.menuList);
    
    // Append to container
    this.container.appendChild(this.toggle);
    this.container.appendChild(this.menu);
    
    // Set width if specified
    if (this.config.width !== 'auto') {
      this.container.style.width = typeof this.config.width === 'number' 
        ? `${this.config.width}px` 
        : this.config.width;
    }
    
    // Bind events
    this.bindEvents();
    
    // Update initial state
    this.updateToggleState();
  }

  createMenuItem(item, index) {
    const menuItem = document.createElement('button');
    menuItem.className = 'dropdown-menu-item';
    menuItem.setAttribute('type', 'button');
    menuItem.setAttribute('role', 'option');
    menuItem.setAttribute('data-value', item.value);
    menuItem.setAttribute('data-index', index);
    
    if (this.selectedValue === item.value) {
      menuItem.classList.add('selected');
    }
    
    const itemContent = document.createElement('div');
    itemContent.className = 'dropdown-menu-item-content';
    
    // Checkmark icon (only show if selected)
    if (this.selectedValue === item.value) {
      const checkmark = document.createElement('span');
      checkmark.className = 'dropdown-menu-item-checkmark';
      checkmark.innerHTML = this.getCheckmarkIcon();
      itemContent.appendChild(checkmark);
    }
    
    // Label
    const label = document.createElement('span');
    label.className = 'dropdown-menu-item-label';
    label.textContent = item.label;
    itemContent.appendChild(label);
    
    menuItem.appendChild(itemContent);
    
    // Click handler
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectItem(item.value);
    });
    
    return menuItem;
  }

  bindEvents() {
    // Toggle click
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOpen();
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
    
    // Keyboard navigation
    this.toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleOpen();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
    
    // Keyboard navigation for menu items
    this.menu.addEventListener('keydown', (e) => {
      const items = Array.from(this.menuList.querySelectorAll('.dropdown-menu-item'));
      const currentIndex = items.findIndex(item => item === document.activeElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (document.activeElement.classList.contains('dropdown-menu-item')) {
          document.activeElement.click();
        }
      } else if (e.key === 'Escape') {
        this.close();
        this.toggle.focus();
      }
    });
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
    this.updateToggleState();
  }

  open() {
    this.isOpen = true;
    this.updateToggleState();
  }

  close() {
    this.isOpen = false;
    this.updateToggleState();
  }

  updateToggleState() {
    if (this.isOpen) {
      this.container.classList.add('open');
      this.toggle.setAttribute('aria-expanded', 'true');
      this.toggle.querySelector('.dropdown-toggle-icon').innerHTML = this.getChevronUpIcon();
    } else {
      this.container.classList.remove('open');
      this.toggle.setAttribute('aria-expanded', 'false');
      this.toggle.querySelector('.dropdown-toggle-icon').innerHTML = this.getChevronDownIcon();
    }
    
    // Update toggle label
    const toggleLabel = this.toggle.querySelector('.dropdown-toggle-label');
    toggleLabel.textContent = this.getSelectedLabel() || this.config.placeholder;
    
    // Update toggle text color based on selection
    if (this.selectedValue) {
      this.toggle.classList.add('has-selection');
    } else {
      this.toggle.classList.remove('has-selection');
    }
  }

  selectItem(value) {
    this.selectedValue = value;
    this.close();
    
    // Update menu items
    const items = this.menuList.querySelectorAll('.dropdown-menu-item');
    items.forEach(item => {
      if (item.getAttribute('data-value') === value) {
        item.classList.add('selected');
        // Add checkmark if not present
        if (!item.querySelector('.dropdown-menu-item-checkmark')) {
          const checkmark = document.createElement('span');
          checkmark.className = 'dropdown-menu-item-checkmark';
          checkmark.innerHTML = this.getCheckmarkIcon();
          item.querySelector('.dropdown-menu-item-content').insertBefore(
            checkmark,
            item.querySelector('.dropdown-menu-item-content').firstChild
          );
        }
      } else {
        item.classList.remove('selected');
        const checkmark = item.querySelector('.dropdown-menu-item-checkmark');
        if (checkmark) {
          checkmark.remove();
        }
      }
    });
    
    // Call callback
    if (this.config.onSelect) {
      this.config.onSelect(value, this.getItemByValue(value));
    }
    
    // Update toggle state
    this.updateToggleState();
  }

  getSelectedLabel() {
    if (!this.selectedValue) return null;
    const item = this.getItemByValue(this.selectedValue);
    return item ? item.label : null;
  }

  getItemByValue(value) {
    return this.config.items.find(item => item.value === value);
  }

  getValue() {
    return this.selectedValue;
  }

  setValue(value) {
    if (this.config.items.some(item => item.value === value)) {
      this.selectItem(value);
    }
  }

  // SVG Icons
  getChevronDownIcon() {
    return `<svg width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0L5 5L10 0" stroke="var(--Colors-Dropdown-Icon, #808AA5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
    </svg>`;
  }

  getChevronUpIcon() {
    return `<svg width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 5L5 0L10 5" stroke="var(--Colors-Dropdown-Icon-Active, #377DFF)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
    </svg>`;
  }

  getCheckmarkIcon() {
    // Original path from Icon.svg: M11.6667 1L4.33333 8.33333L1 5 in 13x10 viewBox
    // Scale factor: 0.733 (to fit 10.67x7.33), positioned at (2.67, 4)
    // Transformed: (11.6667*0.733+2.67, 1*0.733+4) = (11.22, 4.73)
    //              (4.33333*0.733+2.67, 8.33333*0.733+4) = (5.85, 10.11)  
    //              (1*0.733+2.67, 5*0.733+4) = (3.40, 7.67)
    // Reversed for left-to-right checkmark: M3.40 7.67L5.85 10.11L11.22 4.73
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.4 7.67L5.85 10.11L11.22 4.73" stroke="var(--Colors-Primary-Medium, #377DFF)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
    </svg>`;
  }

  destroy() {
    // Remove event listeners and clean up
    this.container.innerHTML = '';
    this.container.className = '';
  }
}

// Export for ES6 modules
export default Dropdown;

// Also make available globally
if (typeof window !== 'undefined') {
  window.Dropdown = Dropdown;
}

