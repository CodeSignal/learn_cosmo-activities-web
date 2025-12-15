/**
 * Global Toolbar Component
 * Provides a fixed toolbar in the upper-right corner for activity modules
 */

class Toolbar {
  constructor() {
    this.tools = new Map();
    this.container = null;
    this.init();
  }

  init() {
    // Find or create toolbar container
    let toolbar = document.getElementById('global-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'global-toolbar';
      toolbar.className = 'global-toolbar';
      document.body.appendChild(toolbar);
    }
    this.container = toolbar;
  }

  /**
   * Register a tool in the toolbar
   * @param {string} id - Unique identifier for the tool
   * @param {Object} options - Tool configuration
   * @param {string} options.icon - Icon class name (e.g., 'icon-eraser')
   * @param {string} options.title - Hover title/tooltip text
   * @param {Function} options.onClick - Callback function when tool is clicked
   * @param {boolean} options.enabled - Whether the tool is enabled (default: true)
   */
  registerTool(id, options) {
    const {
      icon,
      title,
      onClick,
      enabled = true
    } = options;

    if (!icon || !title || !onClick) {
      console.error('Toolbar: registerTool requires icon, title, and onClick');
      return;
    }

    // Remove existing tool if it exists
    this.unregisterTool(id);

    // Create tool button
    const toolButton = document.createElement('button');
    toolButton.className = 'global-toolbar-tool';
    toolButton.setAttribute('data-tool-id', id);
    toolButton.setAttribute('aria-label', title);
    toolButton.setAttribute('title', title);
    toolButton.disabled = !enabled;

    // Create icon element
    const iconEl = document.createElement('span');
    iconEl.className = `icon ${icon}`;
    toolButton.appendChild(iconEl);

    // Add click handler
    toolButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (enabled && onClick) {
        onClick(e);
      }
    });

    // Store tool reference
    this.tools.set(id, {
      element: toolButton,
      options: { icon, title, onClick, enabled }
    });

    // Add to toolbar
    this.container.appendChild(toolButton);
  }

  /**
   * Unregister a tool from the toolbar
   * @param {string} id - Tool identifier
   */
  unregisterTool(id) {
    const tool = this.tools.get(id);
    if (tool && tool.element && tool.element.parentNode) {
      tool.element.parentNode.removeChild(tool.element);
    }
    this.tools.delete(id);
  }

  /**
   * Update tool enabled state
   * @param {string} id - Tool identifier
   * @param {boolean} enabled - Whether tool should be enabled
   */
  setToolEnabled(id, enabled) {
    const tool = this.tools.get(id);
    if (tool) {
      tool.element.disabled = !enabled;
      tool.options.enabled = enabled;
    }
  }

  /**
   * Clear all tools from the toolbar
   */
  clear() {
    this.tools.forEach((tool, id) => {
      this.unregisterTool(id);
    });
  }
}

// Create singleton instance
const toolbar = new Toolbar();

export default toolbar;
