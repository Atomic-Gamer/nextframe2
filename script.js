/* =========================================================
   Fit-to-Width Scaler (precise) + Scale-Aware Anchor Scroll
   - Uses clientWidth (no scrollbar drift) to compute scale.
   - Keeps wrapper height in sync with scaled canvas.
   - Anchor clicks (hash links or your div[href]) land exactly
     regardless of scale, font loads, or image loads.
   ========================================================= */

  // make selector helpers available everywhere
window.$  = window.$  || ((s, c=document) => c.querySelector(s));
window.$$ = window.$$ || ((s, c=document) => Array.from(c.querySelectorAll(s)));





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


function setHeights(){
  const about = document.getElementById('about');
  // offsetHeight gives the **unscaled** layout height (what we want)
  document.documentElement.style.setProperty('--about-h', about.offsetHeight + 'px');
}
window.addEventListener('load', setHeights);
window.addEventListener('resize', setHeights);


const width = window.innerWidth;

if (width <= 1200) {
  document.body.classList.add('breakpoint-sm');
} else if (width <= 1630) {
  document.body.classList.add('breakpoint-md');
} else {
  document.body.classList.add('breakpoint-lg');
}


document.addEventListener('DOMContentLoaded', () => {
  const btn    = document.querySelector('.back-button');
  const fit    = document.querySelector('.fit-wrapper');     // outer wrapper
  const canvas = document.querySelector('.nextframe');       // scaled canvas
  if (!btn || !fit || !canvas) return;

  // Read the current scale from your CSS var that the scaler sets
  const getScale = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--scale');
    const s = parseFloat(v);
    return Number.isFinite(s) && s > 0 ? s : 1;
  };

  // Convert an element’s unscaled offsetTop (inside .nextframe) to real document Y
  const scaledDocTop = (el) => {
    if (!el) return 0;
    let y = 0, n = el;
    while (n && n !== canvas) {
      y += n.offsetTop || 0;
      n = n.offsetParent;
    }
    return fit.offsetTop + y * getScale();
  };

  // Read an element’s height in real document pixels (scale applied)
  const scaledHeight = (el) => (el ? el.offsetHeight * getScale() : 0);

  // Expose helpers (optional, for your debugging/other logic)
  window.NextFrameMetrics = {
    getScale,
    scaledDocTop,
    scaledHeight
  };

  // We’ll show the button after the user scrolls past:
  // - either 100vh (actual viewport)
  // - or the true top of #about (scaled)
  const about = document.getElementById('about');

  const computeThreshold = () => {
    const oneViewport = window.innerHeight;
    const aboutTop = about ? scaledDocTop(about) : Infinity;
    // If ABOUT is within the first screen, use that; else 100vh
    return Math.min(aboutTop, oneViewport);
  };

  let threshold = computeThreshold();

  // Keep the threshold fresh on resize/orientation changes (scale changes)
  const refreshThreshold = () => { threshold = computeThreshold(); update(); };
  window.addEventListener('resize', refreshThreshold, { passive: true });
  window.addEventListener('orientationchange', refreshThreshold);

  // Toggle visibility
  function update() {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y >= threshold) btn.classList.add('show');
    else btn.classList.remove('show');
  }

  // Scroll listener (throttled with rAF)
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Click: go back if possible, else smooth-scroll to top
  btn.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Initial paint
  update();
});





const arrow = document.querySelector('.frame-child11');
const dropdown = document.querySelector('.budget-dropdown');
const input = document.querySelector('.budget-input');

arrow.addEventListener('click', () => {
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

dropdown.querySelectorAll('li').forEach(item => {
  item.addEventListener('click', () => {
    input.value = item.dataset.value;
    dropdown.style.display = 'none';
  });
});

// Optional: hide dropdown if clicked outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.your-budget-parent')) {
    dropdown.style.display = 'none';
  }
});



(() => {
  // ====== CONFIG ======
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbwywRU0sxSkmavu_4hACfCS_y8J4p1woHu9lkUb3BScMn856ywUUQtTki0j0y98d7GT/exec"; // <-- change this

  // ====== HELPERS ======
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const getVal = (ph) => ($(`input[placeholder="${ph}"]`)?.value || "").trim();

  let submitting = false;

  const getPayload = () => ({
    name:         getVal("Name"),
    anythingElse: getVal("Any thing else?"),
    email:        getVal("Email"),
    company:      getVal("Company"),
    service:      ($(".dd-input")?.value || "").trim(),
    budget:       ($(".budget-input")?.value || "").trim(),
    website:      getVal("Website"),
    phone:        getVal("Phone")
  });

  const setLoading = (on) => $(".button1")?.classList.toggle("loading", !!on);

  const resetForm = () => {
    $$(".frame-parent input").forEach(i => { if (!i.readOnly) i.value = ""; });
    if ($(".dd-input")) $(".dd-input").value = "";
    if ($(".budget-input")) $(".budget-input").value = "";
  };

  async function submitHandler(ev) {
    ev?.preventDefault?.();

    if (submitting) return;            // in-flight guard
    submitting = true;
    setLoading(true);

    try {
      const payload = getPayload();
      // Validate name
if (!payload.name) {
  alert("Please enter your name.");
  return;
}

// Validate email format
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailPattern.test(payload.email)) {
  alert("Please enter a valid email address (must include @ and domain).");
  return;
}

// Validate phone (optional, 10 digits)
if (!/^\d{10}$/.test(payload.phone)) {
  alert("Please enter a valid 10-digit phone number.");
  return;
}
      // text/plain → no preflight (OPTIONS)
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok || data.ok === false) {
        console.error("Submit error:", { status: res.status, raw, data });
        alert("Failed to submit. Please try again.");
        return;
      }

      alert("Thanks! Your details were sent.");
      resetForm();
    } catch (err) {
      console.error("Network/JS error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
      submitting = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // 🔧 Bind to ONE element only (the wrapper button)
    const btn = $(".button1");
    if (btn) btn.addEventListener("click", submitHandler);

    // Optional: Enter key submits (but still single because of in-flight guard)
    $$(".frame-parent input").forEach(inp => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitHandler(e);
      });
    });
  });
})();


document.addEventListener('DOMContentLoaded', () => {
  const sticky = document.querySelector('.sticky-contact');
  const story = document.getElementById('story');
  if (!sticky || !story) return;

  const offset = 1000; // px before the end of #story

  function updateStickyVisibility() {
    const storyBottom = story.getBoundingClientRect().bottom;
    if (storyBottom < offset) {
      sticky.style.display = 'none';
    } else {
      sticky.style.display = 'flex';
    }
  }

  window.addEventListener('scroll', updateStickyVisibility, { passive: true });
  window.addEventListener('resize', updateStickyVisibility, { passive: true });
  updateStickyVisibility();
});

