import gsap from 'gsap';

/** Chapter boundaries in timeline seconds: the opening is 0–1, chapter n runs n…n+1, the close holds 8–8.6. */
export const STORY_LENGTH = 8.6;

function typeInto(tl, el, at, duration) {
  const text = el.dataset.text || '';
  const state = { n: 0 };
  tl.to(state, { n: text.length, duration, ease: 'none', onUpdate: () => { el.textContent = text.slice(0, Math.round(state.n)); } }, at);
}

function grow(tl, el, at, duration = 0.14) {
  tl.to(el, { height: 'auto', opacity: 1, duration, ease: 'power2.out' }, at);
}

/**
 * Builds the product story on one paused timeline. The page drives it with the scroll position (or freezes it at a
 * chapter for reduced motion), so every step plays forward and in reverse.
 * @param {HTMLElement} root - the story section; the app canvas sits inside it.
 * @param {{ canvas: HTMLElement, chapterTitles: HTMLElement[], chapterMarks: HTMLElement[], cta: HTMLElement|null,
 *   lid: HTMLElement|null, glow: HTMLElement|null, device: HTMLElement|null, phone: boolean, colors: string[] }} parts
 * @returns {gsap.core.Timeline}
 */
export function buildStoryTimeline(root, { canvas, chapterTitles, chapterMarks, cta, lid, glow, device, phone, colors }) {
  const q = sel => canvas.querySelector(sel);
  const qa = sel => [...canvas.querySelectorAll(sel)];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const scale = () => canvas.getBoundingClientRect().width / canvas.offsetWidth;
  const point = (el, dx = 0.5, dy = 0.5) => {
    const c = canvas.getBoundingClientRect(); const r = el.getBoundingClientRect(); const s = scale();
    return { x: (r.left - c.left + r.width * dx) / s, y: (r.top - c.top + r.height * dy) / s };
  };
  const cursor = q('[data-cursor]'); const click = q('[data-click]');
  const tap = at => { tl.fromTo(click, { scale: 0, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.12, ease: 'power1.out', immediateRender: false }, at); };
  const show = (el, at, duration = 0.12, vars = {}) => tl.to(el, { opacity: 1, y: 0, scale: 1, duration, ...vars }, at);
  const hide = (el, at, duration = 0.1) => tl.to(el, { opacity: 0, duration }, at);
  const chapterAt = i => i + 1;

  // Ground colour, chapter titles and the chapter list.
  colors.forEach((color, i) => tl.to(root, { backgroundColor: color, duration: 0.3, ease: 'none' }, chapterAt(i) - 0.1));
  chapterTitles.forEach((title, i) => {
    if (i === 0) { tl.to(title, { opacity: 0, y: -24, duration: 0.18 }, 0.84); return; }
    tl.to(title, { opacity: 1, y: 0, duration: 0.18 }, i === 1 ? 0.92 : i - 0.04);
    if (i < chapterTitles.length - 1) tl.to(title, { opacity: 0, y: -24, duration: 0.18 }, i + 0.84);
  });
  chapterMarks.forEach((mark, i) => {
    const on = chapterAt(i) - 0.05; const off = chapterAt(i) + 0.95;
    tl.to(mark, { color: '#151515', duration: 0.1 }, on).to(mark.querySelector('i'), { width: 36, duration: 0.15 }, on);
    if (i < chapterMarks.length - 1) tl.to(mark, { color: 'rgba(21,21,21,.42)', duration: 0.1 }, off).to(mark.querySelector('i'), { width: 14, duration: 0.15 }, off);
  });
  if (cta) tl.to(cta, { opacity: 1, y: 0, duration: 0.2 }, 7.9);

  // 0 · Opening: the device rises and the lid opens onto Turing's room.
  if (device) tl.fromTo(device, { y: 50, rotationX: 16, scale: 0.92 }, { y: 0, rotationX: 0, scale: 1, duration: 0.7, ease: 'power3.out', immediateRender: false }, 0);
  if (lid) tl.fromTo(lid, { rotationX: -96 }, { rotationX: 0, duration: 0.62, ease: 'power2.inOut', immediateRender: false }, 0.04);
  // The closed lid shows its aluminium back until it has opened past upright.
  const lidBack = lid?.querySelector('[data-mac-back]');
  if (lidBack) tl.fromTo(lidBack, { opacity: 1 }, { opacity: 0, duration: 0.05 }, 0.16);
  const shadow = device?.querySelector('[data-mac-shadow]'); const sheen = device?.querySelector('[data-mac-sheen]');
  if (shadow) tl.fromTo(shadow, { scaleX: 0.6, opacity: 0.35 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0.05);
  if (glow) tl.to(glow, { opacity: 0, duration: 0.3 }, 0.48);
  if (sheen) tl.fromTo(sheen, { opacity: 0, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-40% 0', duration: 0.45, ease: 'power1.inOut', immediateRender: false }, 0.5).to(sheen, { opacity: 0, duration: 0.12 }, 0.85);
  // The finished laptop settles back slightly while the call to action appears.
  if (device) tl.to(device, { scale: 0.97, y: -6, duration: 0.4, ease: 'power1.inOut' }, 7.85);
  const side = q('[data-side]');
  if (phone) tl.set(side, { opacity: 1 }, 0);

  // 1 · Hire in seconds.
  const create = q('[data-create]'); const modal = q('[data-modal]'); const card = modal.querySelector('.ps-modal-card');
  const ringEl = q('[data-choice-ring]'); const crown = q('[data-choice="2"]'); const firstChoice = q('[data-choice="0"]');
  const createBtn = q('[data-create-btn]'); const nova = q('[data-tile="AMAR"]'); const turingTile = q('[data-tile="Turing"]');
  const needs = q('[data-needs]'); const approve = q('[data-approve]');
  // Measure every cursor target at rest, then put the animated layers in their starting pose.
  const start = point(create, 0.5, 2.2); const createAt = point(create); const crownAt = point(crown); const createBtnAt = point(createBtn);
  const approveAt = point(approve); const near = point(approve, 3.5, 2.6);
  const ringStart = firstChoice.offsetLeft; const ringCrown = crown.offsetLeft;
  gsap.set(card, { y: 24, scale: 0.96 }); gsap.set(needs, { y: 30 }); gsap.set(ringEl, { x: ringStart });
  const goTo = (p, at, duration) => tl.to(cursor, { x: p.x, y: p.y, duration, ease: 'power2.inOut' }, at);
  tl.set(cursor, { x: start.x, y: start.y }, 1.0).to(cursor, { opacity: 1, duration: 0.06 }, 1.0);
  goTo(createAt, 1.04, 0.16); tap(1.21);
  tl.to(create, { scale: 0.95, duration: 0.04, yoyo: true, repeat: 1 }, 1.2);
  tl.to(modal, { opacity: 1, duration: 0.08 }, 1.25).to(card, { y: 0, scale: 1, duration: 0.12 }, 1.25);
  tl.to(ringEl, { opacity: 1, duration: 0.05 }, 1.36);
  goTo(crownAt, 1.36, 0.1); tap(1.47);
  tl.to(ringEl, { x: ringCrown, duration: 0.08 }, 1.47);
  typeInto(tl, q('[data-type="name"]'), 1.5, 0.18);
  goTo(createBtnAt, 1.7, 0.12); tap(1.83);
  tl.to(modal, { opacity: 0, duration: 0.08 }, 1.86).to(card, { y: 20, scale: 0.97, duration: 0.08 }, 1.86);
  const step = create.offsetWidth + 8;
  tl.to(create, { x: step, duration: 0.12 }, 1.88);
  tl.to(nova, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(1.8)' }, 1.9);
  tl.to(q('[data-count-from]'), { opacity: 0, duration: 0.05 }, 1.9).to(q('[data-count-to]'), { opacity: 1, duration: 0.05 }, 1.9);
  tl.to(turingTile, { backgroundColor: 'rgba(231,237,249,0)', duration: 0.08 }, 1.9).to(nova, { backgroundColor: '#e7edf9', duration: 0.08 }, 1.92);
  tl.to(cursor, { opacity: 0, duration: 0.06 }, 1.97);

  // 2 · It learns the job: the room switches to AMAR.
  if (phone) tl.to(side, { opacity: 0, duration: 0.12 }, 2.0);
  tl.to(q('[data-scene="turing"]'), { opacity: 0, duration: 0.08 }, 2.0).to(q('[data-scene="onboard"]'), { opacity: 1, duration: 0.08 }, 2.02);
  tl.to(q('[data-pill="Turing"]'), { opacity: 0, duration: 0.06 }, 2.0).to(q('[data-pill="AMAR"]'), { opacity: 1, duration: 0.06 }, 2.03);
  tl.to(q('[data-composer="Turing"]'), { opacity: 0, duration: 0.05 }, 2.0).to(q('[data-composer="AMAR"]'), { opacity: 1, duration: 0.05 }, 2.02);
  const onboard = sel => q(`[data-scene="onboard"] [data-item="${sel}"]`);
  grow(tl, onboard('hello'), 2.06); grow(tl, onboard('role'), 2.16, 0.16);
  typeInto(tl, q('[data-type="role"]'), 2.32, 0.24);
  grow(tl, onboard('mine'), 2.58, 0.08);
  tl.to(onboard('role'), { height: 0, opacity: 0, duration: 0.12 }, 2.6);
  grow(tl, onboard('profile'), 2.66, 0.16);
  tl.from(onboard('profile').firstChild, { scale: 0.6, rotation: -8, duration: 0.18, ease: 'back.out(2)' }, 2.7);
  grow(tl, onboard('jobs'), 2.82, 0.08);
  tl.from(qa('[data-scene="onboard"] [data-job]'), { y: 26, opacity: 0, stagger: 0.04, duration: 0.1 }, 2.84);

  // 3 · Notices before you ask: an email lands and the attention layer routes it to AMAR.
  const toast = q('[data-toast]');
  tl.to(q('[data-scene="onboard"]'), { opacity: 0, duration: 0.08 }, 3.0).to(q('[data-scene="work"]'), { opacity: 1, duration: 0.08 }, 3.02);
  const work = sel => q(`[data-scene="work"] [data-item="${sel}"]`);
  show(toast, 3.06, 0.12);
  tl.fromTo(q('[data-bell]'), { rotation: 0 }, { keyframes: [{ rotation: 16 }, { rotation: -12 }, { rotation: 8 }, { rotation: 0 }], duration: 0.16, immediateRender: false }, 3.1);
  tl.to(q('[data-badge-from]'), { opacity: 0, duration: 0.04 }, 3.14).to(q('[data-badge-to]'), { opacity: 1, duration: 0.04 }, 3.14);
  tl.fromTo(q('.ps-badge'), { scale: 1 }, { scale: 1.35, duration: 0.06, yoyo: true, repeat: 1, immediateRender: false }, 3.14);
  grow(tl, work('date'), 3.22, 0.06); grow(tl, work('event'), 3.3, 0.16);
  hide(toast, 3.5, 0.1);
  grow(tl, work('tools'), 3.58, 0.12);

  // 4 · Works inside your rules: the dial moves to Auto, the draft and its receipt follow.
  const segs = qa('[data-seg]');
  tl.to(segs.slice(5), { backgroundColor: '#1f1f1f', stagger: 0.012, duration: 0.03 }, 4.04);
  qa('[data-dial-label]').forEach(label => {
    const i = Number(label.dataset.dialLabel);
    if (i === 1) tl.to(label, { color: '#888', fontWeight: 400, duration: 0.05 }, 4.1).to(label.querySelector('i'), { backgroundColor: '#fff', borderColor: '#999', duration: 0.05 }, 4.1);
    if (i === 4) tl.to(label, { color: '#111', fontWeight: 600, duration: 0.05 }, 4.24).to(label.querySelector('i'), { backgroundColor: '#111', borderColor: '#111', duration: 0.05 }, 4.24);
  });
  tl.to(qa('[data-dial-from]'), { opacity: 0, duration: 0.05 }, 4.24).to(qa('[data-dial-to]'), { opacity: 1, duration: 0.05 }, 4.24);
  grow(tl, work('draft'), 4.42, 0.12); grow(tl, work('receipt'), 4.62, 0.08);

  // 5 · Asks only when it must: one question, approved in a tap.
  show(needs, 5.04, 0.14);
  tl.set(cursor, { x: near.x, y: near.y }, 5.2).to(cursor, { opacity: 1, duration: 0.05 }, 5.22);
  goTo(approveAt, 5.24, 0.16); tap(5.42);
  tl.to(approve, { scale: 0.94, duration: 0.04, yoyo: true, repeat: 1 }, 5.41);
  tl.to(q('[data-done]'), { opacity: 1, duration: 0.08 }, 5.48);
  tl.fromTo(q('[data-done] i'), { scale: 0.3 }, { scale: 1, duration: 0.14, ease: 'back.out(3)', immediateRender: false }, 5.5);
  tl.to(cursor, { opacity: 0, duration: 0.05 }, 5.62);
  tl.to(needs, { opacity: 0, y: 20, duration: 0.1 }, 5.82);

  // 6 · One shared brain: a colleague asks, AMAR answers, the Library fills.
  grow(tl, work('colleague'), 6.04, 0.14); grow(tl, work('outgoing'), 6.24, 0.08);
  tl.to(q('[data-scene="work"]'), { opacity: 0, duration: 0.08 }, 6.46).to(q('[data-scene="library"]'), { opacity: 1, duration: 0.08 }, 6.48);
  tl.to(qa('[data-file]'), { opacity: 1, y: 0, scale: 1, stagger: 0.05, duration: 0.1 }, 6.52);

  // 7 · Reports like a colleague: the nightly review.
  tl.to(q('[data-scene="library"]'), { opacity: 0, duration: 0.08 }, 7.0).to(q('[data-scene="work"]'), { opacity: 1, duration: 0.08 }, 7.02);
  grow(tl, work('review'), 7.08, 0.16);
  tl.to({}, { duration: 0.6 }, 8.0);
  tl.progress(0.001).progress(0);
  return tl;
}
