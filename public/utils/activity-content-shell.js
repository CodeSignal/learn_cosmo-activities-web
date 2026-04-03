import toolbar from '../components/toolbar.js';
import SplitPanel from '../design-system/components/split-panel/split-panel.js';

const OPEN_URL_TOOL_ID = 'activity-content-open-url';

/** Persisted left-panel width as a percentage (matches SplitPanel minLeft/minRight below). */
const SPLIT_STORAGE_KEY = 'activity-content-split-left-percent';

function clampSplitPercent(percent, minLeft = 20, minRight = 30) {
  const max = 100 - minRight;
  return Math.max(minLeft, Math.min(max, percent));
}

function readStoredSplitPercent(minLeft, minRight) {
  try {
    const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
    if (raw == null || raw === '') return null;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return null;
    return clampSplitPercent(n, minLeft, minRight);
  } catch {
    return null;
  }
}

function writeStoredSplitPercent(percent, minLeft, minRight) {
  try {
    const clamped = clampSplitPercent(percent, minLeft, minRight);
    localStorage.setItem(SPLIT_STORAGE_KEY, String(clamped));
  } catch {
    /* quota / private mode */
  }
}

/**
 * When activity.content has url or markdown, builds split layout in container and returns
 * the inner scroll element (.activity-main-pane-scroll) as mainMount for module UI.
 * Otherwise returns container unchanged.
 */
export function mountActivityContentShell({ container, content }) {
  const hasUrl = !!(content && content.url);
  const hasMarkdown = !!(content && content.markdown);
  if (!hasUrl && !hasMarkdown) {
    return { mainMount: container, cleanup: () => {} };
  }

  let splitPanel = null;
  let blobUrl = null;
  let cancelled = false;
  let scrollPreventionCleanup = null;
  let preventHorizontalScroll = null;

  container.innerHTML = `
    <div class="activity-with-side-content" data-activity-layout="split-content">
      <div class="activity-content-split-root" id="activity-content-split-root"></div>
    </div>
  `;

  const splitRoot = document.getElementById('activity-content-split-root');

  const minLeft = 20;
  const minRight = 30;

  const contentWidthRaw = content?.contentWidth;
  let initialSplitPercent = 40;
  let contentWidthPx = null;
  if (contentWidthRaw) {
    const match = String(contentWidthRaw).trim().match(/^(\d+(?:\.\d+)?)\s*(%|px)?$/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = (match[2] || '%').toLowerCase();
      if (unit === '%') {
        initialSplitPercent = clampSplitPercent(value, minLeft, minRight);
      } else if (unit === 'px') {
        contentWidthPx = value;
      }
    }
  }

  const storedSplit = readStoredSplitPercent(minLeft, minRight);
  if (storedSplit !== null && contentWidthPx == null) {
    initialSplitPercent = storedSplit;
  }

  splitPanel = new SplitPanel(splitRoot, {
    initialSplit: initialSplitPercent,
    minLeft,
    minRight,
    onChange: (percent) => {
      writeStoredSplitPercent(percent, minLeft, minRight);
    }
  });

  if (contentWidthPx != null) {
    const applyPxSplit = () => {
      const rect = splitRoot.getBoundingClientRect();
      if (rect.width > 0) {
        const percent = Math.max(20, Math.min(80, (contentWidthPx / rect.width) * 100));
        splitPanel.setSplit(percent, true);
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(applyPxSplit);
    });
  }

  const leftPanel = splitPanel.getLeftPanel();
  const rightPanel = splitPanel.getRightPanel();

  const splitPanelContainerEl = splitPanel.container;
  if (splitPanelContainerEl) {
    splitPanelContainerEl.style.overflow = 'hidden';
    splitPanelContainerEl.addEventListener('scroll', (e) => {
      e.preventDefault();
      e.stopPropagation();
      splitPanelContainerEl.scrollTop = 0;
      splitPanelContainerEl.scrollLeft = 0;
    }, { passive: false, capture: true });
  }

  leftPanel.className = 'activity-content-pane';
  const iframe = document.createElement('iframe');
  iframe.className = 'activity-content-iframe';
  iframe.setAttribute('frameborder', '1');
  leftPanel.appendChild(iframe);

  rightPanel.className = 'activity-main-pane';
  const mainPaneScroll = document.createElement('div');
  mainPaneScroll.className = 'activity-main-pane-scroll';
  rightPanel.appendChild(mainPaneScroll);
  mainPaneScroll.scrollLeft = 0;

  preventHorizontalScroll = () => {
    if (mainPaneScroll.scrollLeft !== 0) {
      mainPaneScroll.scrollLeft = 0;
    }
  };
  mainPaneScroll.addEventListener('scroll', preventHorizontalScroll, { passive: false, capture: true });
  mainPaneScroll.addEventListener('scroll', preventHorizontalScroll, { passive: true });

  const originalBodyStyle = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    height: document.body.style.height,
    width: document.body.style.width,
    top: document.body.style.top,
    left: document.body.style.left
  };
  const originalHtmlStyle = {
    overflow: document.documentElement.style.overflow,
    height: document.documentElement.style.height
  };
  const mainEl = container.closest('.main');
  const originalMainOverflow = mainEl?.style.overflow || '';
  const originalActivityOverflow = container.style.overflow || '';

  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.height = '100vh';
  document.body.style.width = '100%';
  document.body.style.top = '0';
  document.body.style.left = '0';

  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100vh';

  if (mainEl) {
    mainEl.style.overflow = 'hidden';
  }
  container.style.overflow = 'hidden';

  scrollPreventionCleanup = () => {
    document.body.style.overflow = originalBodyStyle.overflow;
    document.body.style.position = originalBodyStyle.position;
    document.body.style.height = originalBodyStyle.height;
    document.body.style.width = originalBodyStyle.width;
    document.body.style.top = originalBodyStyle.top;
    document.body.style.left = originalBodyStyle.left;

    document.documentElement.style.overflow = originalHtmlStyle.overflow;
    document.documentElement.style.height = originalHtmlStyle.height;

    if (mainEl) {
      mainEl.style.overflow = originalMainOverflow;
    }
    container.style.overflow = originalActivityOverflow;
  };

  const contentUrl = content.url;
  const showOpenInNewTab = content.openInNewTab === true;
  if (hasUrl && contentUrl && showOpenInNewTab) {
    toolbar.registerTool(OPEN_URL_TOOL_ID, {
      icon: 'icon-globe-bold',
      title: 'Open content in new tab',
      onClick: (e) => {
        e.preventDefault();
        window.open(contentUrl, '_blank', 'noopener,noreferrer');
      },
      enabled: true
    });
  }

  if (hasUrl) {
    iframe.src = contentUrl;
  } else if (hasMarkdown) {
    fetch('/api/content/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: content.markdown })
    })
      .then(res => res.text())
      .then((html) => {
        if (cancelled) return;
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
        const blob = new Blob([html], { type: 'text/html' });
        blobUrl = URL.createObjectURL(blob);
        iframe.src = blobUrl;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to render markdown content:', err);
        }
      });
  }

  const cleanup = () => {
    cancelled = true;
    if (hasUrl && contentUrl && showOpenInNewTab) {
      toolbar.unregisterTool(OPEN_URL_TOOL_ID);
    }
    if (preventHorizontalScroll && mainPaneScroll) {
      mainPaneScroll.removeEventListener('scroll', preventHorizontalScroll, true);
      mainPaneScroll.removeEventListener('scroll', preventHorizontalScroll, false);
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
    if (splitPanel) {
      splitPanel.destroy();
      splitPanel = null;
    }
    if (scrollPreventionCleanup) {
      scrollPreventionCleanup();
      scrollPreventionCleanup = null;
    }
    container.innerHTML = '';
  };

  return { mainMount: mainPaneScroll, cleanup };
}
