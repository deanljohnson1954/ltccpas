/* ============================================================
   LTCCPAS.COM — Main JavaScript
   SPA Router + Sticky Header + Mobile Nav
   ============================================================ */

/* ── 1. Sticky Header ──────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (header) {
    header.classList.toggle('sticky', window.scrollY > 60);
  }
});

/* ── 2. Mobile Nav Toggle ──────────────────────────────────── */
const navToggle = document.getElementById('nav-toggle');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    document.querySelector('nav').classList.toggle('open');
  });
}

/* ── 3. Dropdown support on mobile ────────────────────────── */
document.querySelectorAll('.has-dropdown > a').forEach(link => {
  link.addEventListener('click', e => {
    const nav = document.querySelector('nav');
    // Only intercept on mobile (when nav is in toggle mode)
    if (nav && nav.classList.contains('open')) {
      e.preventDefault();
      const parent = link.closest('.has-dropdown');
      parent.classList.toggle('open');
    }
  });
});

/* ── 4. SPA Router ─────────────────────────────────────────── */
const BASE = (() => {
  const base = document.querySelector('base');
  return base ? base.href : window.location.origin + '/ltccpas/';
})();

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
    if (!newContent) {
      window.location.href = url;
      return;
    }

    // Fix relative asset paths in new content
    newContent.querySelectorAll('[src],[href]').forEach(el => {
      ['src', 'href'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val &&
            !val.startsWith('http') &&
            !val.startsWith('#') &&
            !val.startsWith('mailto') &&
            !val.startsWith('tel') &&
            !val.startsWith('data:')) {
          try {
            el.setAttribute(attr, new URL(val, url).href);
          } catch (_) {}
        }
      });
    });

    document.title = doc.title;
    content.innerHTML = newContent.innerHTML;

    if (pushState) {
      history.pushState({ url }, '', url);
    }

    // Update active nav link
    document.querySelectorAll('nav a').forEach(a => {
      const aHref = a.href.replace(/\/$/, '');
      const curUrl = url.replace(/\/$/, '');
      a.classList.toggle('active',
        aHref === curUrl ||
        (curUrl.endsWith('/index.html') && aHref.endsWith('/index.html')) ||
        (curUrl === BASE.replace(/\/$/, '') && aHref.endsWith('/index.html'))
      );
    });

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

/* Intercept internal link clicks */
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
    const resolved = new URL(href, window.location.href).href;
    navigate(resolved);
  } catch (_) {
    window.location.href = href;
  }
});

/* Handle browser back/forward */
window.addEventListener('popstate', e => {
  if (e.state && e.state.url) {
    navigate(e.state.url, false);
  }
});

/* Set initial history state */
history.replaceState({ url: window.location.href }, '', window.location.href);
