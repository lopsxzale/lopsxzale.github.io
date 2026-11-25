(() => {
  'use strict';
  const carousel = document.querySelector('.project-carousel');
  if (!carousel) return;
  const stage = carousel.querySelector('.carousel-stage');
  const cards = [...stage.querySelectorAll('.showcase-card')];
  const dots = [...carousel.querySelectorAll('.carousel-dot')];
  const counter = carousel.querySelector('.carousel-count');
  const status = carousel.querySelector('.carousel-status');
  const dialog = document.querySelector('.project-dialog');
  const detailSlot = dialog.querySelector('.project-dialog-content');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const english = () => document.documentElement.lang === 'en';
  let active = 0, sourceBody = null, sourceParent = null, trigger = null, oldOverflow = '';

  const measure = (card) => {
    const box = card.querySelector('.preview-window');
    const img = box.querySelector('img');
    // A short tour of the page, without long blank stretches in animated landing pages.
    const end = Math.min(Math.max(img.clientHeight - box.clientHeight, 0), box.clientHeight * 2);
    img.style.setProperty('--preview-end', `${-end}px`);
    img.style.setProperty('--preview-duration', `${Math.max(16, end / 24)}s`);
  };
  const update = (announce = true) => {
    cards.forEach((card, i) => {
      let offset = (i - active + cards.length) % cards.length;
      if (offset > cards.length / 2) offset -= cards.length;
      card.dataset.position = offset;
      card.style.setProperty('--position', offset);
      card.toggleAttribute('data-away', Math.abs(offset) > 1);
      card.inert = Math.abs(offset) > 1;
      card.tabIndex = Math.abs(offset) === 1 ? 0 : -1;
      card.setAttribute('aria-label', `${card.querySelector('h3').textContent} · ${i + 1} / ${cards.length}`);
      card.querySelectorAll('a, button').forEach(el => el.tabIndex = offset === 0 ? 0 : -1);
      dots[i].setAttribute('aria-current', String(i === active));
    });
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    if (announce) status.textContent = `${cards[active].querySelector('h3').textContent}, ${active + 1} ${english() ? 'of' : 'de'} ${cards.length}`;
    measure(cards[active]);
  };
  const select = (index) => {
    const focused = document.activeElement.closest('.showcase-card');
    active = (index + cards.length) % cards.length;
    update();
    if (focused && focused !== cards[active]) stage.focus({ preventScroll: true });
  };
  carousel.querySelector('[data-prev]').addEventListener('click', () => select(active - 1));
  carousel.querySelector('[data-next]').addEventListener('click', () => select(active + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => select(i)));
  stage.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    select(e.key === 'Home' ? 0 : e.key === 'End' ? cards.length - 1 : active + (e.key === 'ArrowRight' ? 1 : -1));
  });

  const openDetails = (card, button) => {
    if (dialog.open || sourceBody) return;
    sourceBody = document.querySelector(`#${card.dataset.project} .project-body`);
    if (!sourceBody) return;
    sourceParent = sourceBody.parentElement;
    trigger = button;
    sourceBody.querySelectorAll('.count').forEach(el => el.textContent = el.dataset.to);
    const heading = sourceBody.querySelector('h3');
    heading.id = 'project-dialog-title';
    detailSlot.append(sourceBody);
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    carousel.setAttribute('data-paused', '');
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.project-close').focus();
  };
  dialog.querySelector('.project-close').addEventListener('click', () => dialog.close());
  let backdropDown = false;
  dialog.addEventListener('pointerdown', e => backdropDown = e.target === dialog);
  dialog.addEventListener('click', e => { if (backdropDown && e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    if (sourceBody) {
      sourceBody.querySelector('h3').removeAttribute('id');
      sourceParent.append(sourceBody);
      sourceBody = null;
    }
    document.body.style.overflow = oldOverflow;
    carousel.removeAttribute('data-paused');
    trigger?.focus({ preventScroll: true });
  });

  let pointer = null, dragging = false, suppressClick = false;
  stage.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    if (e.pointerType === 'mouse' && !e.target.closest('a, button')) e.preventDefault();
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    dragging = false;
    suppressClick = false;
  });
  stage.addEventListener('pointermove', e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (!dragging && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
    }
  });
  stage.addEventListener('pointerup', e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    if (dragging) {
      suppressClick = true;
      if (Math.abs(dx) >= 40) select(active + (dx < 0 ? 1 : -1));
      setTimeout(() => suppressClick = false, 0);
    }
    pointer = null;
    dragging = false;
  });
  stage.addEventListener('pointercancel', () => { pointer = null; dragging = false; });
  stage.addEventListener('dragstart', e => e.preventDefault());
  stage.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    const card = e.target.closest('.showcase-card');
    if (!card) return;
    const index = cards.indexOf(card);
    if (index !== active) { e.preventDefault(); select(index); return; }
    const button = e.target.closest('.showcase-details');
    if (button) openDetails(card, button);
  }, true);
  cards.forEach((card, i) => {
    card.addEventListener('keydown', e => {
      if (e.target === card && ['Enter', ' '].includes(e.key)) { e.preventDefault(); select(i); }
    });
    card.querySelector('img').addEventListener('load', () => measure(card));
  });
  const resize = new ResizeObserver(() => cards.forEach(measure));
  resize.observe(stage);
  new IntersectionObserver(([entry]) => {
    carousel.toggleAttribute('data-in-view', entry.isIntersecting);
  }, { threshold: .2 }).observe(stage);
  document.addEventListener('visibilitychange', () => carousel.toggleAttribute('data-paused', document.hidden || dialog.open));
  motion.addEventListener('change', () => cards.forEach(measure));

  // Existing technology links and direct hashes select the corresponding slide.
  const fromHash = (hash, scroll) => {
    const index = cards.findIndex(card => `#${card.dataset.project}` === hash);
    if (index < 0) return false;
    select(index);
    if (scroll) carousel.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
    return true;
  };
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (link && fromHash(link.getAttribute('href'), true)) {
      e.preventDefault();
      history.replaceState(null, '', link.getAttribute('href'));
    }
  });
  addEventListener('hashchange', () => fromHash(location.hash, true));
  new MutationObserver(() => update(false)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  update(false);
  if (location.hash) requestAnimationFrame(() => fromHash(location.hash, true));
})();
