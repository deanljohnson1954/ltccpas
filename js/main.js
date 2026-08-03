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
  // Mobile toggle — guard against duplicate listeners when initNav() is called
  // again after each SPA navigation (the button lives in <header>, not <nav>,
  // so it is never replaced, but initNav() would keep stacking listeners).
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle && !navToggle.dataset.bound) {
    navToggle.dataset.bound = '1';
    navToggle.addEventListener('click', () => {
      document.querySelector('nav').classList.toggle('open');
    });
  }

  // Click-to-open dropdowns (all viewports) — must re-attach after each
  // SPA nav replacement. Click toggles the menu instead of relying on
  // hover, which closes the menu the instant the mouse crosses any gap
  // on the way down to a subsection.
  document.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const item = link.closest('.has-dropdown');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.has-dropdown.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector(':scope > a').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        link.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Close any open dropdown when clicking outside the nav
  if (!document.body.dataset.dropdownOutsideBound) {
    document.body.dataset.dropdownOutsideBound = '1';
    document.addEventListener('click', e => {
      if (e.target.closest('.has-dropdown')) return;
      document.querySelectorAll('.has-dropdown.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector(':scope > a').setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.has-dropdown.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector(':scope > a').setAttribute('aria-expanded', 'false');
      });
    });
  }
}
initNav();

/* ── 2b. Pin the chrome's relative links ────────────────────────
   The router swaps #page-content and <nav> and calls fixPaths() on
   both, but the top bar, header and footer are never replaced. They
   keep the relative hrefs of whichever page was loaded first while
   the URL changes underneath them, so after one navigation from the
   home page into a subdirectory every one of them points a level too
   deep: contact.html resolves to /long-term-care-ltc-insurance/
   contact.html, which is a 404. Resolving them against the document
   they actually arrived with, once, makes them immune -- fixPaths()
   skips anything already absolute, so this cannot double-apply. */
['.top-bar', 'header', 'footer'].forEach(sel => {
  document.querySelectorAll(sel).forEach(el => fixPaths(el, window.location.href));
});

/* ── 2c. One call to action per view ────────────────────────────
   "Request a Complimentary Review" sits in the header, in most pages'
   closing CTA, and in the footer. The header is position:sticky, so
   its button rides down the page and would share the screen with the
   other two; and a page's closing CTA sits only 300-800px above the
   footer button, well inside one screen. Two rules keep exactly one
   on screen at a time:

     - the footer button stands down on any page that closes with its
       own CTA, so that page's own button is the one at the bottom;
     - the header button hides while any other CTA is on screen and
       comes back when none is, so it is the one at the top.

   The footer markup stays identical on every page; only what is shown
   differs. Re-run after each SPA navigation, since #page-content is
   replaced and the new page may have a different closing CTA. */
function oneCtaPerView() {
  const isCta = el => /request a complimentary review/i.test(el.textContent);
  const headerBtn = document.querySelector('header .header-actions a.btn-gold');
  const footerBtn = document.querySelector('footer a.footer-btn');
  // Matched on destination and wording, not on class: several pages style
  // their gold button with inline CSS and carry no btn class at all, and a
  // plain text link to the contact page is the same instruction either way.
  const pageBtns = [...document.querySelectorAll('#page-content a[href*="contact"]')]
    .filter(isCta);

  if (footerBtn) footerBtn.style.display = pageBtns.length ? 'none' : '';
  if (!headerBtn) return;

  const others = pageBtns.slice();
  if (footerBtn && !pageBtns.length) others.push(footerBtn);
  if (!others.length) { headerBtn.style.display = ''; oneCtaPerView._others = null; return; }
  oneCtaPerView._others = others;

  // Measured against the viewport rather than watched with an
  // IntersectionObserver: the header has to settle on the same frame the
  // other button appears, and a rect test is synchronous where an
  // observer callback is not.
  if (!oneCtaPerView._bound) {
    const sync = () => {
      const list = oneCtaPerView._others;
      if (!list || !headerBtn) return;
      const h = window.innerHeight;
      // The header is position:sticky and therefore still in normal flow, so
      // hiding its button shortens the header and shifts everything below it
      // -- on a phone by about 5px. Testing the exact viewport edge lets that
      // shift flip the answer back and forth, and a button sitting one pixel
      // from the edge ends up shown alongside the header again. Judging a
      // button on screen slightly before it arrives is well clear of that
      // shift and errs the only safe way, towards hiding the header.
      const M = 24;
      const shown = list.some(el => {
        const b = el.getBoundingClientRect();
        return b.bottom > -M && b.top < h + M && b.width > 0;
      });
      headerBtn.style.display = shown ? 'none' : '';
    };
    let queued = false;
    const onScrollOrResize = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sync(); });
    };
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    oneCtaPerView._bound = true;
    oneCtaPerView._sync = sync;
  }
  oneCtaPerView._sync();
}
oneCtaPerView();

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

    // Inject page-specific <style> blocks from the fetched page's <head>.
    // Remove ALL inline <style> tags (not just ones we previously marked
    // data-spa) — the very first page loaded (a direct hit, not via SPA
    // nav) has its own un-marked page-specific <style> block that would
    // otherwise linger forever and fight later pages' styles by selector
    // specificity (e.g. index.html's "#page-content h1" outranking a
    // scoped ".page-class h1" on the page navigated to).
    document.querySelectorAll('head style').forEach(s => s.remove());
    doc.querySelectorAll('head style').forEach(style => {
      const clone = document.createElement('style');
      clone.setAttribute('data-spa', '1');
      clone.textContent = style.textContent;
      document.head.appendChild(clone);
    });

    // Swap page content
    document.title = doc.title;
    content.innerHTML = newContent.innerHTML;
    decodeEmails();
    oneCtaPerView();

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

/* ── 4. Cloudflare email-obfuscation decoder ────────────────── */
// Cloudflare replaces mailto links with /cdn-cgi/l/email-protection URLs.
// This reverses that XOR encoding so the real address appears on the page.
function decodeEmails() {
  document.querySelectorAll('.__cf_email__').forEach(function (el) {
    var enc = el.getAttribute('data-cfemail');
    if (!enc) return;
    var key = parseInt(enc.slice(0, 2), 16), addr = '';
    for (var i = 2; i < enc.length; i += 2) {
      addr += String.fromCharCode(parseInt(enc.slice(i, i + 2), 16) ^ key);
    }
    var parent = el.closest('a');
    if (parent) parent.setAttribute('href', 'mailto:' + addr);
    el.textContent = addr;
  });
}
decodeEmails();
