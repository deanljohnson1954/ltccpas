/* ============================================================
   LTCCPAS.COM — Main JavaScript
   SPA Router + Sticky Header + Mobile Nav
   ============================================================ */

/* ── 1. Sticky Header ──────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (header) header.classList.toggle('sticky', window.scrollY > 60);
});

/* ── 2. Dropdown + Mobile Nav ──────────────────────────────── */
function initNav() {
  // Mobile toggle
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      document.querySelector('nav').classList.toggle('open');
    });
  }

  // Mobile dropdown toggles
  document.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', e => {
      const nav = document.querySelector('nav');
      if (nav && nav.classList.contains('open')) {
        e.preventDefault();
        link.closest('.has-dropdown').classList.toggle('open');
      }
    });
  });
}
initNav();

/* ── 3. SPA Router ─────────────────────────────────────────── */
async function navigate(url, pushState = true) {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Fade out
  content.style.transition = 'opacity .2s ease, transform .2s ease';
  content.style.opacity = '0';
  content.style.transform = 'translateY(8px)';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const newContent = doc.getElementById('page-content');
    if (!newContent) { window.location.href = url; return; }

    // Fix relative paths in new page-content
    fixPaths(newContent, url);

    // ── Swap nav from the fetched page so relative links are correct ──
    const newNav = doc.querySelector('nav');
    const currentNav = document.querySelector('nav');
    if (newNav && currentNav) {
      fixPaths(newNav, url);
      currentNav.replaceWith(newNav);
      initNav(); // re-attach listeners to new nav
    }

    // Inject page-specific <style> blocks from the fetched page's <head>
    document.querySelectorAll('style[data-spa]').forEach(s => s.remove());
    doc.querySelectorAll('head style').forEach(style => {
      const clone = document.createElement('style');
      clone.setAttribute('data-spa', '1');
      clone.textContent = style.textContent;
      document.head.appendChild(clone);
    });

    // Swap page content
    document.title = doc.title;
    content.innerHTML = newContent.innerHTML;

    if (pushState) history.pushState({ url }, '', url);

    // Close mobile nav
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('open');

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (e) {
    window.location.href = url;
    return;
  }

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      content.style.transition = 'opacity .3s ease, transform .3s ease';
      content.style.opacity = '1';
      content.style.transform = 'none';
    });
  });
}

function fixPaths(el, baseUrl) {
  el.querySelectorAll('[src],[href]').forEach(node => {
    ['src', 'href'].forEach(attr => {
      const val = node.getAttribute(attr);
      if (val &&
          !val.startsWith('http') &&
          !val.startsWith('#') &&
          !val.startsWith('mailto') &&
          !val.startsWith('tel') &&
          !val.startsWith('data:')) {
        try { node.setAttribute(attr, new URL(val, baseUrl).href); } catch (_) {}
      }
    });
  });
}

/* ── Intercept internal link clicks ────────────────────────── */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('#')) return;
  if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
  if (href.startsWith('mailto') || href.startsWith('tel')) return;
  if (link.target === '_blank') return;

  e.preventDefault();
  try {
    navigate(new URL(href, window.location.href).href);
  } catch (_) {
    window.location.href = href;
  }
});

/* ── Browser back/forward ──────────────────────────────────── */
window.addEventListener('popstate', e => {
  if (e.state && e.state.url) navigate(e.state.url, false);
});

/* ── Set initial history state ─────────────────────────────── */
history.replaceState({ url: window.location.href }, '', window.location.href);
