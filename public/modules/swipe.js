export function initSwipe({ items, labels, question, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  const leftLabelText = labels.left || 'Left';
  const rightLabelText = labels.right || 'Right';
  
  // Use design system typography and spacing
  // Render a minimal placeholder view
  elContainer.innerHTML = `
    <div class="swipe-placeholder" style="padding: var(--UI-Spacing-spacing-xl); max-width: 600px; margin: 0 auto;">
      <h2 class="heading-small" style="margin-bottom: var(--UI-Spacing-spacing-lg); color: var(--Colors-Text-Body-Strong);">
        ${question || 'Swipe Activity'}
        <span style="display: block; font-size: var(--Fonts-Body-Default-sm); color: var(--Colors-Text-Body-Medium); margin-top: var(--UI-Spacing-spacing-xs); font-weight: 400;">(This activity is currently a placeholder)</span>
      </h2>
      
      <div style="margin-bottom: var(--UI-Spacing-spacing-xl); display: flex; justify-content: center; gap: var(--UI-Spacing-spacing-xl);">
        <div style="text-align: center;">
          <div class="body-small" style="color: var(--Colors-Text-Body-Medium); margin-bottom: var(--UI-Spacing-spacing-xxs);">Left Label</div>
          <div class="body-medium" style="font-weight: 600; color: var(--Colors-Text-Body-Default);">${leftLabelText}</div>
        </div>
        <div style="text-align: center;">
          <div class="body-small" style="color: var(--Colors-Text-Body-Medium); margin-bottom: var(--UI-Spacing-spacing-xxs);">Right Label</div>
          <div class="body-medium" style="font-weight: 600; color: var(--Colors-Text-Body-Default);">${rightLabelText}</div>
        </div>
      </div>

      <div>
        <h3 class="body-small" style="color: var(--Colors-Text-Body-Medium); margin-bottom: var(--UI-Spacing-spacing-s); font-weight: 600;">Items to Swipe</h3>
        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--UI-Spacing-spacing-s);">
          ${items.map(item => `
            <li style="padding: var(--UI-Spacing-spacing-m); background: var(--Colors-Backgrounds-Main-Top); border: 1px solid var(--Colors-Stroke-Default); border-radius: var(--UI-Radius-radius-m); text-align: center;">
              <p class="body-large" style="margin: 0; color: var(--Colors-Text-Body-Strong);">${item.text}</p>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  // No interactivity for now
  return {
    cleanup: () => {
      elContainer.innerHTML = '';
    }
  };
}
