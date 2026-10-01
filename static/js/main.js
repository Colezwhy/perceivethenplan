(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  /* ───────── scroll progress + active section ───────── */
  const progress = $('.progress');
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav a');
  const navById = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.remove('is-active'));
      const a = navById.get(e.target.id);
      if (a) a.classList.add('is-active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  navById.forEach((_, id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });

  /* ───────── tablists (arrow-key navigation) ───────── */
  function tablist(tabs, onSelect) {
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => onSelect(t));
      t.addEventListener('keydown', e => {
        let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault();
        tabs[j].focus();
        onSelect(tabs[j]);
      });
    });
  }
  function selectTab(tabs, tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
  }

  /* ───────── hero: refinement video viewer ───────── */
  const EXAMPLES = [
    { n: 1, alt: 'Input photo of a bedroom with a bed, a nightstand with a lamp and two dressers',
      objs: ['bed', 'pillow ×3', 'night stand', 'lamp', 'dresser ×2'] },
    { n: 2, alt: 'Input photo of a hotel desk with a television on drawers, an office chair and a lamp',
      objs: ['desk', 'chair', 'drawers', 'television', 'lamp'] },
    { n: 3, alt: 'Input photo of a bedroom with a wooden bed, two nightstands with lamps and a dresser',
      objs: ['bed', 'pillow ×2', 'night stand ×2', 'lamp ×2', 'dresser'] },
  ];
  const video = $('#vp-video');
  const photo = $('#vp-photo');
  const stateTag = $('#vp-state');
  const countTag = $('#vp-count');
  const objsBox = $('#vp-objs');
  const playBtn = $('#vp-play');
  const segBtns = $$('#vp-seg button');
  let userPaused = reduceMotion;
  let inView = true;

  function renderObjs(list) {
    objsBox.replaceChildren(...list.map(o => el('span', '', o)));
  }
  function syncPlayUI() {
    const playing = !video.paused;
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    $('.i-pause', playBtn).hidden = !playing;
    $('.i-play', playBtn).hidden = playing;
    stateTag.classList.toggle('is-paused', !playing);
    stateTag.lastChild.textContent = playing ? 'LaP Planner · refining' : 'LaP Planner · paused';
  }
  function tryPlay() {
    if (userPaused || !inView) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => syncPlayUI());
  }
  function setExample(i) {
    const ex = EXAMPLES[i];
    segBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    video.poster = `static/video/example${ex.n}_poster.jpg`;
    video.src = `static/video/example${ex.n}.mp4`;
    photo.src = `static/img/example${ex.n}_input.webp`;
    photo.alt = ex.alt;
    countTag.textContent = `Scene ${i + 1} / ${EXAMPLES.length}`;
    renderObjs(ex.objs);
    video.load();
    tryPlay();
  }
  segBtns.forEach((b, i) => b.addEventListener('click', () => setExample(i)));
  playBtn.addEventListener('click', () => {
    if (video.paused) { userPaused = false; tryPlay(); }
    else { userPaused = true; video.pause(); }
  });
  video.addEventListener('play', syncPlayUI);
  video.addEventListener('pause', syncPlayUI);
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) tryPlay(); else if (!video.paused) video.pause();
  }, { threshold: 0.2 }).observe(video);
  renderObjs(EXAMPLES[0].objs);
  syncPlayUI();
  tryPlay();

  /* ───────── 360° turntables: play while visible, click to pause ───────── */
  const SPIN_RATE = 0.5; // the renders do a full turn in 3 s; half speed keeps labels readable
  $$('.spin-frame').forEach(frame => {
    const v = $('video', frame);
    const btn = $('.spin-toggle', frame);
    const name = btn.getAttribute('aria-label').replace(/^Pause /, '');
    let paused = reduceMotion, visible = false;
    const sync = () => {
      const playing = !v.paused;
      frame.classList.toggle('is-paused', !playing);
      btn.setAttribute('aria-pressed', String(playing));
      btn.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + name);
    };
    const go = () => {
      if (paused || !visible) { if (!v.paused) v.pause(); return; }
      v.playbackRate = SPIN_RATE;
      const p = v.play();
      if (p && p.catch) p.catch(sync);
    };
    v.addEventListener('loadedmetadata', () => { v.playbackRate = SPIN_RATE; });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    btn.addEventListener('click', () => { paused = !v.paused; if (paused) v.pause(); else { visible = true; go(); } });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }, { threshold: 0.3 }).observe(frame);
    sync();
  });

  /* ───────── method: stage tabs highlight the pipeline figure ───────── */
  const stageTabs = $$('.stage-tab');
  const masks = $$('.pipe-mask span');
  const focus = $('.pipe-focus');
  function setStage(tab) {
    selectTab(stageTabs, tab);
    const x = +tab.dataset.x, w = +tab.dataset.w;
    masks[0].style.cssText = `left:0;width:${x}%`;
    masks[1].style.cssText = `left:${x + w}%;width:${Math.max(0, 100 - x - w)}%`;
    masks[2].style.display = 'none';
    focus.style.left = `calc(${x}% + 3px)`;
    focus.style.width = `calc(${w}% - 6px)`;
    focus.style.borderColor = getComputedStyle(tab).getPropertyValue('--stage-c').trim();
  }
  tablist(stageTabs, setStage);
  setStage(stageTabs[0]);

  /* ───────── gallery tabs ───────── */
  const galTabs = $$('#gallery [role="tab"]');
  tablist(galTabs, t => selectTab(galTabs, t));

  /* ───────── lightbox ───────── */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbClose = $('#lb-close');
  let lbReturn = null;
  function openLB(src, alt, from) {
    lbReturn = from;
    lbImg.src = src;
    lbImg.alt = alt || '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function closeLB() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lbReturn) lbReturn.focus();
  }
  $$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const img = b.querySelector('img') || b.closest('.plate-img').querySelector('img');
    openLB(b.dataset.zoom, img ? img.alt : '', b);
  }));
  lbClose.addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLB(); });

  /* ───────── copy BibTeX ───────── */
  const copyBtn = $('#copy-bib');
  copyBtn.addEventListener('click', () => {
    const text = $('#bib-text').textContent;
    const done = ok => {
      copyBtn.lastElementChild.textContent = ok ? 'Copied' : 'Selected';
      setTimeout(() => { copyBtn.lastElementChild.textContent = 'Copy'; }, 1600);
    };
    const select = () => {
      const r = document.createRange();
      r.selectNodeContents($('#bib-text'));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      done(false);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true), select);
    } else select();
  });
})();
