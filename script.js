/* =========================================================
   Fit-to-Width Scaler (precise) + Scale-Aware Anchor Scroll
   - Uses clientWidth (no scrollbar drift) to compute scale.
   - Keeps wrapper height in sync with scaled canvas.
   - Anchor clicks (hash links or your div[href]) land exactly
     regardless of scale, font loads, or image loads.
   ========================================================= */
(() => {
  const DESIGN_WIDTH = 1920;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const fit = $('.fit-wrapper');
  const canvas = $('.nextframe');
  if (!fit || !canvas) return;

  // ---- SCALE + HEIGHT ------------------------------------
  function applyScale() {
    const vw = document.documentElement.clientWidth; // excludes scrollbar
    const scale = vw / DESIGN_WIDTH;                 // allow upscaling
    document.documentElement.style.setProperty('--scale', String(scale));

    // Scale-aware wrapper height so native scrolling is correct
    const scaledHeight = canvas.offsetHeight * scale;
    fit.style.height = `${scaledHeight}px`;
  }

  // Throttled resize handler
  let rafId = null;
  const onResize = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyScale();
    });
  };

  // Also react when the canvas' intrinsic size changes
  const ro = new ResizeObserver(applyScale);

  // ---- SCALE-AWARE ANCHOR SCROLL --------------------------
  function scaledTopWithinCanvas(el) {
    let y = 0, n = el;
    while (n && n !== canvas) { y += n.offsetTop || 0; n = n.offsetParent; }
    return y;
  }

  function scrollToTarget(el, behavior = 'smooth') {
    if (!el) return;
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
    const yWithinCanvas = scaledTopWithinCanvas(el);
    const targetY = fit.offsetTop + (yWithinCanvas * scale); // document position
    window.scrollTo({ top: targetY, behavior });
  }

  function handleAnchorNavigation(href, behavior = 'smooth') {
    if (!href || !href.startsWith('#')) return false;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (target) {
      scrollToTarget(target, behavior);
      return true;
    }
    return false;
  }

  function patchAnchorClicks() {
    // Standard anchors
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (handleAnchorNavigation(a.getAttribute('href'))) {
          e.preventDefault();
        }
      });
    });
    // Your custom "div href" nav items
    $$('.nav .component-26 .projects, [href^="#"]').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href.startsWith('#')) {
        el.style.cursor = 'pointer';
        el.setAttribute('role', 'link');
        el.addEventListener('click', (e) => {
          if (handleAnchorNavigation(href)) e.preventDefault();
        });
      }
    });
  }

  // Ensure hash navigation on load / hashchange is scale-aware
  function handleInitialHash() {
    if (location.hash && location.hash.length > 1) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) scrollToTarget(el, 'auto');
    }
  }
  window.addEventListener('hashchange', () => handleInitialHash());

  // ---- INIT ----------------------------------------------
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize);

  window.addEventListener('load', () => {
    applyScale();
    handleInitialHash(); // in case user lands with a hash
  }, { once: true });

  document.addEventListener('DOMContentLoaded', () => {
    applyScale();
    patchAnchorClicks();
    ro.observe(canvas);

    // Pointer glow follows cursor correctly at any scale
    $$('.pointerglow').forEach(container => {
      container.addEventListener('pointermove', (e) => {
        const rect = container.getBoundingClientRect();
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        container.style.setProperty('--x', `${x}px`);
        container.style.setProperty('--y', `${y}px`);
      }, { passive: true });
      container.addEventListener('pointerleave', () => {
        container.style.removeProperty('--x');
        container.style.removeProperty('--y');
      });
    });
  });
})();
