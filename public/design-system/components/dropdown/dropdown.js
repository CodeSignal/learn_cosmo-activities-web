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
      growToFit: options.growToFit || false,
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
    toggleLabel.className = 'dropdown-toggle-label body-small';
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
    
    // Calculate and set menu height dynamically
    this.updateMenuHeight();
    
    // Append to container
    this.container.appendChild(this.toggle);
    this.container.appendChild(this.menu);
    
    // Set width if specified (but not if growToFit is enabled)
    if (!this.config.growToFit && this.config.width !== 'auto') {
      this.container.style.width = typeof this.config.width === 'number' 
        ? `${this.config.width}px` 
        : this.config.width;
    }
    
    // Add grow-to-fit class if enabled
    if (this.config.growToFit) {
      this.container.classList.add('grow-to-fit');
      // Set initial width to min-width
      this.container.style.width = '200px';
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
    label.className = 'dropdown-menu-item-label body-small';
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

  updateMenuHeight() {
    const itemCount = this.config.items.length;
    const itemHeight = 40; // Height of each menu item
    const gap = 4; // Gap between items
    const padding = 24; // Total padding (12px top + 12px bottom)
    const maxItems = 6; // Maximum items before scrolling
    
    // Calculate height: (itemHeight * itemCount) + (gap * (itemCount - 1)) + padding
    let calculatedHeight = (itemHeight * itemCount) + (gap * Math.max(0, itemCount - 1)) + padding;
    
    // Cap at max height for 6 items (284px) to enable scrolling
    const maxHeight = (itemHeight * maxItems) + (gap * (maxItems - 1)) + padding;
    
    if (itemCount <= maxItems) {
      // Set exact height for 6 or fewer items
      this.menu.style.height = `${calculatedHeight}px`;
      this.menu.style.maxHeight = `${calculatedHeight}px`;
      this.menu.style.overflow = 'visible';
      this.menuList.style.overflowY = 'visible';
      this.menuList.style.maxHeight = 'none';
      this.menuList.style.height = 'auto';
    } else {
      // Set max height and enable scrolling for more than 6 items
      // The menu container constrains the height to 284px, and the list scrolls
      this.menu.style.height = `${maxHeight}px`;
      this.menu.style.maxHeight = `${maxHeight}px`;
      this.menu.style.overflow = 'hidden';
      // List should be constrained by max-height and scroll, maintaining item heights
      // Don't set explicit height, let it grow naturally but constrain with max-height
      this.menuList.style.overflowY = 'auto';
      this.menuList.style.maxHeight = `${maxHeight - padding}px`;
      this.menuList.style.height = '';
    }
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
    
    // Update width if growToFit is enabled
    if (this.config.growToFit) {
      this.updateToggleWidth();
    }
  }

  updateToggleWidth() {
    // Only measure and grow toggle if there's a selected value
    let toggleWidth = 200; // Default minimum width
    if (this.selectedValue) {
      const toggleLabel = this.toggle.querySelector('.dropdown-toggle-label');
      const toggleContent = this.toggle.querySelector('.dropdown-toggle-content');
      const toggleIcon = this.toggle.querySelector('.dropdown-toggle-icon');
      const originalContainerWidth = this.container.style.width;
      
      // Temporarily remove truncation to measure full width
      const originalOverflow = toggleLabel.style.overflow;
      const originalTextOverflow = toggleLabel.style.textOverflow;
      const originalWhiteSpace = toggleLabel.style.whiteSpace;
      
      // Set container and toggle to auto width temporarily for measurement
      const originalToggleWidth = this.toggle.style.width;
      this.container.style.width = 'auto';
      this.toggle.style.width = 'auto';
      toggleLabel.style.overflow = 'visible';
      toggleLabel.style.textOverflow = 'clip';
      toggleLabel.style.whiteSpace = 'nowrap';
      
      // Force a layout recalculation to get accurate measurements
      void this.container.offsetHeight;
      void this.toggle.offsetHeight;
      void toggleContent.offsetHeight;
      
      // Measure components individually to calculate total width
      const contentStyles = window.getComputedStyle(toggleContent);
      const labelStyles = window.getComputedStyle(toggleLabel);
      const iconStyles = window.getComputedStyle(toggleIcon);
      
      // Get padding and gap values
      const paddingLeft = parseFloat(contentStyles.paddingLeft) || 0;
      const paddingRight = parseFloat(contentStyles.paddingRight) || 0;
      const gap = parseFloat(contentStyles.gap) || 0;
      
      // Measure label and icon widths when unconstrained
      // Use getBoundingClientRect for more accurate measurement
      const labelRect = toggleLabel.getBoundingClientRect();
      const iconRect = toggleIcon.getBoundingClientRect();
      const labelWidth = labelRect.width;
      const iconWidth = iconRect.width;
      
      // Calculate total content width: padding-left + label + gap + icon + padding-right
      const contentWidth = paddingLeft + labelWidth + gap + iconWidth + paddingRight;
      
      // Get computed border width
      const toggleStyles = window.getComputedStyle(this.toggle);
      const borderLeft = parseFloat(toggleStyles.borderLeftWidth) || 0;
      const borderRight = parseFloat(toggleStyles.borderRightWidth) || 0;
      
      // With box-sizing: border-box, borders are included in the width
      // So toggle width = content width + borders
      // Add a buffer to account for measurement inaccuracies and ensure proper 12px padding
      const buffer = 16; // Buffer to ensure proper padding spacing (accounts for flexbox layout and measurement accuracy)
      toggleWidth = Math.max(200, contentWidth + borderLeft + borderRight + buffer);
      
      // Restore toggle width
      this.toggle.style.width = originalToggleWidth;
      
      // Restore original styles
      toggleLabel.style.overflow = originalOverflow;
      toggleLabel.style.textOverflow = originalTextOverflow;
      toggleLabel.style.whiteSpace = originalWhiteSpace;
      this.container.style.width = originalContainerWidth;
    }
    
    // Set container width based on toggle width only
    this.container.style.width = `${toggleWidth}px`;
    
    // Always measure menu items to ensure menu is wide enough
    const menuItems = this.menuList.querySelectorAll('.dropdown-menu-item');
    let maxMenuItemWidth = 0;
    
    // Temporarily show menu and set to auto width for accurate measurement
    const originalMenuDisplay = this.menu.style.display;
    const originalMenuWidth = this.menu.style.width;
    const originalMenuVisibility = this.menu.style.visibility;
    this.menu.style.display = 'block';
    this.menu.style.visibility = 'hidden';
    this.menu.style.width = 'auto';
    this.menu.style.position = 'absolute';
    this.menu.style.top = '-9999px';
    
    menuItems.forEach(item => {
      const itemContent = item.querySelector('.dropdown-menu-item-content');
      const itemLabel = item.querySelector('.dropdown-menu-item-label');
      if (itemContent && itemLabel) {
        // Temporarily remove truncation to measure full width
        const originalItemWidth = item.style.width;
        const originalLabelOverflow = itemLabel.style.overflow;
        const originalLabelTextOverflow = itemLabel.style.textOverflow;
        
        item.style.width = 'auto';
        itemLabel.style.overflow = 'visible';
        itemLabel.style.textOverflow = 'clip';
        
        const itemWidth = itemContent.scrollWidth;
        maxMenuItemWidth = Math.max(maxMenuItemWidth, itemWidth);
        
        // Restore styles
        item.style.width = originalItemWidth;
        itemLabel.style.overflow = originalLabelOverflow;
        itemLabel.style.textOverflow = originalLabelTextOverflow;
      }
    });
    
    // Restore menu styles
    this.menu.style.display = originalMenuDisplay;
    this.menu.style.visibility = originalMenuVisibility;
    this.menu.style.width = originalMenuWidth;
    this.menu.style.top = '';
    
    // Add padding for menu (12px on each side = 24px total)
    const menuPadding = 24;
    // Menu width should be at least as wide as the container, but can be wider
    const menuWidth = Math.max(toggleWidth, maxMenuItemWidth + menuPadding);
    
    // Apply the calculated width to menu (can be wider than container)
    this.menu.style.width = `${menuWidth}px`;
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

