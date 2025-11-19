export function initSort({ items, labels, question, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  
  // Use design system typography and spacing
  // Render a minimal placeholder view
  elContainer.innerHTML = `
    <div class="sort-placeholder" style="padding: var(--UI-Spacing-spacing-xl); max-width: 600px; margin: 0 auto;">
      <h2 class="heading-small" style="margin-bottom: var(--UI-Spacing-spacing-lg); color: var(--color-text-body-strong);">${question || 'Sort Activity'}</h2>
      
      <div style="margin-bottom: var(--UI-Spacing-spacing-xl);">
        <h3 class="body-small" style="color: var(--color-text-body-medium); margin-bottom: var(--UI-Spacing-spacing-s); font-weight: 600;">Categories</h3>
        <div style="display: flex; gap: var(--UI-Spacing-spacing-m); margin-bottom: var(--UI-Spacing-spacing-m);">
          <div style="padding: var(--UI-Spacing-spacing-m); border: 1px solid var(--color-stroke-default); border-radius: var(--UI-Radius-radius-m); background: var(--color-bg-main-top); flex: 1;">
            <span class="body-medium" style="color: var(--color-text-body-default);">${labels.first || 'Box 1'}</span>
          </div>
          <div style="padding: var(--UI-Spacing-spacing-m); border: 1px solid var(--color-stroke-default); border-radius: var(--UI-Radius-radius-m); background: var(--color-bg-main-top); flex: 1;">
            <span class="body-medium" style="color: var(--color-text-body-default);">${labels.second || 'Box 2'}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 class="body-small" style="color: var(--color-text-body-medium); margin-bottom: var(--UI-Spacing-spacing-s); font-weight: 600;">Items to Sort</h3>
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--UI-Spacing-spacing-s);">
          ${items.map(item => `
            <li style="padding: var(--UI-Spacing-spacing-s) var(--UI-Spacing-spacing-m); background: var(--color-bg-main-top); border: 1px solid var(--color-stroke-default); border-radius: var(--UI-Radius-radius-s);">
              <span class="body-medium" style="color: var(--color-text-body-default);">${item.text}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  // No interactivity for now
  return () => {
    elContainer.innerHTML = '';
  };
}
