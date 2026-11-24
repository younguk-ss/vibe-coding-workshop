/* 바이브코딩은 도구다 — 화면 전환, 프롬프트 생성, 코드 미리보기·저장
   AI API를 쓰지 않습니다. 입력한 내용을 정해진 틀에 넣어 프롬프트를 조립합니다.
   02 프롬프트는 두 갈래입니다: 성취기준 기반 수업(lesson) · 업무 및 기타(work).
   수업 쪽 내용은 S에, 업무 및 기타 쪽 내용은 S.work에 따로 저장합니다. */
(() => {
  'use strict';

  const D = window.DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'vibe-dogu-v1';
  const SCREEN_NAMES = ['', '개념', '프롬프트', '제작', '배포', '고급'];
  const TRACK_NAMES = { lesson: '성취기준 기반 수업', work: '업무 및 기타' };

  /* ───────── 상태 ───────── */
  const findIn = (list, id) => list.find(t => t.id === id) || null;
  /* 지금 쓰는 갈래. 아직 고르지 않았으면 수업으로 봅니다 */
  const isWork = () => S.track === 'work';
  const track = () => (isWork() ? 'work' : 'lesson');
  /* 형태·분위기·앱 설명처럼 두 갈래가 따로 가지는 값은 F()에서 꺼냅니다 */
  const F = () => (isWork() ? S.work : S);
  const owner = k => (isWork() && Object.prototype.hasOwnProperty.call(S.work, k) ? S.work : S);
  const typeList = () => (isWork() ? D.WORK_TYPES : D.TYPES);
  /* 코딩 에이전트로 만들 때 다르게 쓰는 형태(예: 대시보드 → shadcn/ui)는 그 내용으로 바꿔 씁니다 */
  const view = t => (S.mode === 'agent' && t.agent ? Object.assign({}, t, t.agent) : t);
  const selectedTypes = () => F().types.map(id => findIn(typeList(), id)).filter(Boolean).map(view);

  /* 앱 설명 칸에 보이는 예시 글: 고른 형태의 예시 문장을 페이지별로 한 줄씩 보여 준다.
     형태가 여러 개면 첫 형태의 처음·끝 문장 사이에 각 형태의 가운데 문장을 차례로 넣는다 */
  function exampleText(types) {
    const work = isWork();
    let src;
    if (!types.length) src = work ? D.WORK_BASE_PAGES : D.BASE_PAGES;
    else if (types.length === 1) src = types[0].pages;
    else {
      const first = types[0].pages;
      const seen = new Set();
      const mid = [];
      types.forEach(t => t.pages.slice(1, -1).forEach(p => {
        if (!seen.has(p[0])) { seen.add(p[0]); mid.push(p); }
      }));
      src = [first[0], ...mid, first[first.length - 1]];
    }
    const num = i => (work ? `${i + 1}. ` : `${i + 1}페이지 `);
    return '예)\n' + src.map(([name, hint], i) => `${num(i)}${name}: ${hint}`).join('\n');
  }

  function freshWork() {
    return {
      types: [], customType: '', addons: [],
      style: 'saas', accent: 'blue', styleNote: '', customStyle: '',
      appName: '', desc: '', extra: '',
    };
  }

  function fresh() {
    return {
      track: '',
      subject: '', grade: '', standard: '', goal: '', difficulty: '', attach: true,
      devices: ['laptop', 'phone'], time: '20',
      types: [], customType: '', addons: [],
      style: 'minimal', accent: 'navy', styleNote: '', customStyle: '',
      appName: '', desc: '',
      extra: '',
      work: freshWork(),
      mode: 'chat', review: [], fix: { where: '', now: '', want: '' }, deploy: 0,
    };
  }

  function load() {
    const base = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      const s = Object.assign(base, saved);
      /* 예전 저장 형식(형태 1개, 완료 조건 한 줄)을 지금 형식으로 옮긴다 */
      if (!Array.isArray(saved.types)) s.types = saved.type ? [saved.type] : [];
      s.types = s.types.filter(id => findIn(D.TYPES, id));
      if (!saved.extra && saved.doneNote) s.extra = saved.doneNote;
      /* 예전에 화면별로 나눠 쓴 내용은 앱 설명 한 칸으로 합친다 */
      if (!saved.desc && Array.isArray(saved.pages)) {
        s.desc = saved.pages
          .filter(p => p && p.action && p.action.trim())
          .map(p => (p.name && p.name.trim() ? `${p.name.trim()}: ` : '') + p.action.trim())
          .join('\n');
      }
      delete s.type; delete s.checks; delete s.doneNote; delete s.pages; delete s.touched;
      s.fix = Object.assign({ where: '', now: '', want: '' }, s.fix);
      /* 업무 및 기타 (이 기능이 생기기 전에 저장한 사람은 빈 상태로 시작) */
      s.work = Object.assign(freshWork(), saved.work);
      s.work.types = (Array.isArray(s.work.types) ? s.work.types : []).filter(id => findIn(D.WORK_TYPES, id));
      if (!Array.isArray(s.work.addons)) s.work.addons = [];
      if (s.track !== 'lesson' && s.track !== 'work') s.track = '';
      return s;
    } catch (e) {
      return base;
    }
  }

  let S = load();
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장이 막혀 있어도 계속 사용 */ }
    }, 200);
  }

  /* ───────── 화면 전환 ─────────
     주소: #1 … #5. 02는 #2(무엇을 만들지 고르기) · #2/lesson · #2/work(만들기) */
  function route() {
    const m = /^#(\d)(?:\/(lesson|work))?$/.exec(location.hash);
    const n = m ? Number(m[1]) : 1;
    if (!(n >= 1 && n <= 5)) return { n: 1, sub: '' };
    return { n, sub: n === 2 && m[2] ? m[2] : '' };
  }
  const currentScreen = () => route().n;
  const builderHash = () => (S.track ? `#2/${S.track}` : '#2');

  function showScreen(moveFocus) {
    const { n, sub } = route();
    const part = n === 2 ? (sub ? 'build' : 'pick') : '';
    $$('.screen').forEach(s => {
      s.hidden = Number(s.dataset.screen) !== n || (s.dataset.view || '') !== part;
    });
    $$('.steps a').forEach(a => {
      if (Number(a.dataset.step) === n) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });

    /* 이전·다음: 02 고르기 화면에는 '다음'이 없습니다(카드를 골라서 넘어감) */
    const link = (cls, href, text, small) =>
      `<a class="${cls}" href="${href}">${small ? `<small>${small}</small>` : ''}${text}</a>`;
    let prev = '';
    let next = '';
    if (n === 2 && !sub) prev = link('prev', '#1', '← 개념');
    else if (n === 2) {
      prev = link('prev', '#2', '← 만들 것 고르기');
      next = link('next', '#3', '제작 →', '03');
    } else {
      if (n === 3) prev = link('prev', builderHash(), '← 프롬프트');
      else if (n > 1) prev = link('prev', `#${n - 1}`, `← ${SCREEN_NAMES[n - 1]}`);
      if (n < 5) next = link('next', `#${n + 1}`, `${SCREEN_NAMES[n + 1]} →`, `0${n + 1}`);
    }
    $('#pager').innerHTML = prev + next;

    if (n === 2 && !sub) renderPick();
    window.scrollTo(0, 0);
    if (moveFocus) {
      const h = $('.screen:not([hidden]) [tabindex="-1"]');
      if (h) h.focus({ preventScroll: true });
    }
    document.title = `${n === 2 && sub ? TRACK_NAMES[sub] : SCREEN_NAMES[n]} · 바이브코딩은 도구다`;
  }

  /* 주소가 #2/lesson · #2/work 이면 그 갈래로 바꾸고 화면을 다시 그린다 */
  function onRoute(moveFocus) {
    const { n, sub } = route();
    if (n === 2 && sub && sub !== S.track) {
      S.track = sub;
      save();
      renderAll();
    }
    showScreen(moveFocus);
  }

  window.addEventListener('hashchange', () => onRoute(true));

  /* ← → 키: 이전·다음 버튼과 같은 곳으로 간다 (04 배포에서는 먼저 배포 순서를 넘긴다) */
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const el = document.activeElement;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    if (currentScreen() === 4) {
      const d = S.deploy + dir;
      if (d >= 0 && d < D.DEPLOY.length) { S.deploy = d; save(); renderDeploy(true); e.preventDefault(); return; }
    }
    const a = $(dir > 0 ? '#pager .next' : '#pager .prev');
    if (a) { location.hash = a.getAttribute('href'); e.preventDefault(); }
  });

  /* ───────── 02: 작성 가이드 (앱 설명 · 추가 요청) ─────────
     이름 줄에 마우스를 올리면 CSS로 열리고, 버튼을 누르면 고정된다(터치 화면용).
     바깥을 누르거나 Esc로 닫는다. .tip 이 붙은 줄이면 모두 같은 방식으로 동작한다. */
  function setTip(wrap, open) {
    wrap.classList.toggle('open', open);
    $('.tip-btn', wrap).setAttribute('aria-expanded', String(open));
  }
  /* 아래쪽에 자리가 모자라면 자리가 더 넓은 쪽으로 열고,
     그래도 화면 밖으로 나가면 나간 만큼 화면 안으로 당긴다 */
  function placeTip(wrap) {
    const popEl = $('.tip-pop', wrap);
    wrap.classList.remove('up');
    popEl.style.transform = '';
    let pop = popEl.getBoundingClientRect();
    if (!pop.height) return;
    const row = wrap.getBoundingClientRect();
    const below = window.innerHeight - 8 - row.bottom;
    const above = row.top - 64;
    if (pop.height > below && above > below) {
      wrap.classList.add('up');
      pop = popEl.getBoundingClientRect();
    }
    let dy = 0;
    if (pop.bottom > window.innerHeight - 8) dy = window.innerHeight - 8 - pop.bottom;
    if (pop.top + dy < 64) dy = 64 - pop.top;
    if (dy) popEl.style.transform = `translateY(${Math.round(dy)}px)`;
  }
  $$('.tip').forEach(wrap => {
    const btn = $('.tip-btn', wrap);
    wrap.addEventListener('mouseenter', () => placeTip(wrap));
    wrap.addEventListener('focusin', () => placeTip(wrap));
    btn.addEventListener('click', () => {
      const open = !wrap.classList.contains('open');
      setTip(wrap, open);
      if (open) placeTip(wrap); else btn.blur();
    });
  });
  document.addEventListener('click', e => {
    $$('.tip.open').forEach(wrap => { if (!wrap.contains(e.target)) setTip(wrap, false); });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    $$('.tip').forEach(wrap => {
      setTip(wrap, false);
      if (wrap.contains(document.activeElement)) document.activeElement.blur();
    });
  });

  /* 추가 요청 가이드의 '이 문장 넣기': 코딩 에이전트용 문장을 추가 요청 칸에 넣는다.
     채팅 AI가 골라져 있으면 맡길 곳도 코딩 에이전트로 바꾼다(버튼 이름에 그렇게 적힌다). */
  const libLine = () => $('#libLine').textContent.trim();
  function renderLibInsert() {
    const btn = $('#libInsert');
    const has = (F().extra || '').includes(libLine());
    btn.disabled = has && S.mode === 'agent';
    btn.textContent = btn.disabled ? '넣었습니다 ✓'
      : S.mode === 'agent' ? '이 문장 넣기'
      : has ? '코딩 에이전트로 바꾸기'
      : '코딩 에이전트로 바꾸고 넣기';
  }
  $('#libInsert').addEventListener('click', () => {
    if (S.mode !== 'agent') { S.mode = 'agent'; renderMode(); renderTypes(); }
    const f = F();
    if (!(f.extra || '').includes(libLine())) {
      const cur = (f.extra || '').trim();
      f.extra = (cur ? cur + '\n' : '') + libLine();
    }
    syncInputs();
    update();
    toast('추가 요청에 넣었습니다');
  });

  /* ───────── 02: 형태 미리보기 ─────────
     형태 카드에 마우스를 올리면(또는 키보드로 가면) 그 형태의 예시 움직임을 카드 옆에 띄운다.
     예시 화면은 demos.js, 모양과 움직임은 demos.css에 있다. */
  const DEMOS = window.DEMOS || {};
  const typePv = $('#typePv');
  const typesBox = $('#types');
  let pvBy = null;          // 무엇으로 열었나: 'hover' | 'focus' | 'touch'
  let pvTimer = 0;
  let lastPointer = 'mouse';

  function showTypePv(btn, by) {
    const demo = DEMOS[btn.dataset.type];
    clearTimeout(pvTimer);
    if (!demo) { hideTypePv(); return; }
    if (typePv.dataset.type !== btn.dataset.type) {
      $('#typePvStage').innerHTML = demo.html;
      $('#typePvCap').textContent = (isWork() && demo.workCap) || demo.cap;
      typePv.dataset.type = btn.dataset.type;
    }
    typePv.hidden = false;
    pvBy = by;
    /* 카드들을 가리지 않게 카드 묶음의 오른쪽 옆에 띄운다.
       옆에 자리가 없는 좁은 화면에서는 카드 위쪽(없으면 아래쪽)에 띄운다. */
    const r = btn.getBoundingClientRect();
    const grid = typesBox.getBoundingClientRect();
    const w = typePv.offsetWidth;
    const h = typePv.offsetHeight;
    let left;
    let top;
    if (grid.right + 16 + w <= window.innerWidth - 8) {
      left = grid.right + 16;
      top = Math.min(Math.max(64, r.top + r.height / 2 - h / 2), window.innerHeight - h - 8);
    } else {
      left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
      top = r.top - h - 10;
      if (top < 64) top = Math.min(r.bottom + 10, window.innerHeight - h - 8);
    }
    typePv.style.left = Math.round(left) + 'px';
    typePv.style.top = Math.round(Math.max(8, top)) + 'px';
  }

  function hideTypePv() {
    clearTimeout(pvTimer);
    if (typePv.hidden) return;
    typePv.hidden = true;
    typePv.dataset.type = '';
    $('#typePvStage').innerHTML = '';   // 움직임을 멈추고, 다음에 처음부터 다시 시작
    pvBy = null;
  }

  typesBox.addEventListener('pointerdown', e => { lastPointer = e.pointerType || 'mouse'; });
  typesBox.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const b = e.target.closest('.type');
    if (b) showTypePv(b, 'hover');
  });
  typesBox.addEventListener('pointerout', e => {
    if (e.pointerType === 'touch' || pvBy !== 'hover') return;
    const to = e.relatedTarget;
    if (!(to && to.closest && to.closest('.type'))) hideTypePv();
  });
  typesBox.addEventListener('focusin', e => {
    const b = e.target.closest('.type');
    if (b && b.matches(':focus-visible')) showTypePv(b, 'focus');
  });
  typesBox.addEventListener('focusout', () => { if (pvBy === 'focus') hideTypePv(); });
  window.addEventListener('scroll', hideTypePv, { passive: true });
  window.addEventListener('hashchange', hideTypePv);

  /* ───────── 01: 나쁜 예 / 좋은 예 ───────── */
  $('#cmpSeg').addEventListener('click', e => {
    const b = e.target.closest('button[data-cmp]');
    if (!b) return;
    const good = b.dataset.cmp === 'good';
    $$('#cmpSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#cmpBad').hidden = good;
    $('#cmpGood').hidden = !good;
  });

  /* ───────── 02: 무엇을 만들지 고르기 ───────── */
  function renderPick() {
    const filled = (o, keys) => o.types.length > 0 || keys.some(k => (o[k] || '').trim());
    const has = {
      lesson: filled(S, ['subject', 'standard', 'goal', 'appName', 'desc']),
      work: filled(S.work, ['appName', 'desc']),
    };
    $$('[data-pick]').forEach(a => {
      const t = a.dataset.pick;
      a.classList.toggle('cur', S.track === t);
      $('.pick-now', a).hidden = !has[t];
      $('.pick-go', a).textContent = has[t] ? '이어서 작성 →' : '시작하기 →';
    });
  }

  /* 고른 갈래에 맞춰 보이는 부분·문구·단계 번호를 바꾼다 */
  function renderTrack() {
    const t = track();
    $$('[data-only]').forEach(el => { el.hidden = el.dataset.only !== t; });
    $$('[data-track-link]').forEach(a => {
      if (a.dataset.trackLink === t) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    let k = 0;
    $$('.builder .step').forEach(st => { if (!st.hidden) $('.num', st).textContent = ++k; });
    $('#exBtns').innerHTML = D.EXAMPLES[t].map(ex =>
      `<button type="button" class="chip plain" data-example="${ex.id}">${esc(ex.label)}</button>`).join('');
    const ph = D.PLACEHOLDERS[t];
    Object.keys(ph).forEach(key => { const el = $(`[data-bind="${key}"]`); if (el) el.placeholder = ph[key]; });
  }

  /* ───────── 02: 입력 그리기 ───────── */
  const pressed = on => `aria-pressed="${on ? 'true' : 'false'}"`;

  function renderDevices() {
    $('#devices').innerHTML = D.DEVICES.map(d =>
      `<button type="button" class="chip" data-device="${d.id}" ${pressed(S.devices.includes(d.id))}>${esc(d.name)}</button>`).join('');
    $('#times').innerHTML = D.TIMES.map(t =>
      `<button type="button" class="chip" data-time="${t.id}" ${pressed(S.time === t.id)}>${esc(t.name)}</button>`).join('');
  }

  function renderTypes() {
    /* 카드는 갈래·맡길 곳이 바뀔 때만 다시 만들고, 그 밖에는 선택 표시만 바꾼다.
       (누를 때마다 다시 만들면 마우스를 올려 띄운 미리보기가 끊긴다) */
    const box = $('#types');
    const f = F();
    const key = `${track()}|${S.mode}`;
    if (box.dataset.key !== key) {
      hideTypePv();
      box.dataset.key = key;
      box.innerHTML = typeList().map(view).map(t =>
        `<button type="button" class="type" data-type="${t.id}" ${pressed(f.types.includes(t.id))}><b>${esc(t.name)}</b><small>${esc(t.term)}</small></button>`).join('');
    } else {
      $$('.type', box).forEach(b => b.setAttribute('aria-pressed', String(f.types.includes(b.dataset.type))));
    }
    const picked = selectedTypes();
    $('#customWrap').hidden = !f.types.includes('custom');
    const say = $('#say');
    if (!picked.length) { say.hidden = true; say.innerHTML = ''; }
    else {
      say.hidden = false;
      say.innerHTML = `<span class="lbl">이렇게 말합니다</span>` + picked.map(t =>
        `<div class="one"><q>${esc(t.say)}</q><dl>${
          t.terms.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`).join('');
    }
    renderAddons();
  }

  function visibleAddons() {
    const f = F();
    const t = track();
    return D.ADDONS.filter(a => (!a.track || a.track === t) && !(a.hideFor && a.hideFor.some(id => f.types.includes(id))));
  }

  function renderAddons() {
    const f = F();
    $('#addons').innerHTML = visibleAddons().map(a =>
      `<button type="button" class="chip" data-addon="${a.id}" title="${esc(a.gloss)}" ${pressed(f.addons.includes(a.id))}>${esc(a.name)}<small>${esc(a.term)}</small></button>`).join('');
  }

  function renderStyles() {
    const f = F();
    const acc = D.ACCENTS.find(a => a.id === f.accent) || D.ACCENTS[0];
    $('#styles').style.setProperty('--acc', acc.hex);
    $('#styles').innerHTML = D.STYLES.map(s => {
      const pv = s.id === 'custom'
        ? '<span class="pvw lk-custom" aria-hidden="true"><em>✎</em><small>내가 쓰는 분위기</small></span>'
        : `<span class="pvw lk-${s.look}" style="--b:${s.bg};--i:${s.ink};--c:${s.card}" aria-hidden="true"><i></i><i></i><span><u></u><s></s></span></span>`;
      return `<button type="button" class="style" data-style="${s.id}" ${pressed(f.style === s.id)}>${pv}<b>${esc(s.name)}</b></button>`;
    }).join('');
    $('#customStyleWrap').hidden = f.style !== 'custom';
    $('#accents').innerHTML = D.ACCENTS.map(a =>
      `<button type="button" class="sw" data-accent="${a.id}" style="--c:${a.hex}" ${pressed(f.accent === a.id)}><i aria-hidden="true"></i>${esc(a.name)}</button>`).join('');
  }

  /* 앱 설명 칸의 예시 글을 고른 형태에 맞춘다 */
  function renderDesc() {
    $('[data-bind="desc"]').placeholder = exampleText(selectedTypes());
  }

  function renderMode() {
    $$('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  }

  function syncInputs() {
    $$('[data-bind]').forEach(el => {
      const k = el.dataset.bind;
      const o = owner(k);
      if (el.type === 'checkbox') el.checked = !!o[k];
      else el.value = o[k] || '';
      if (el.tagName === 'TEXTAREA') grow(el);
    });
    $$('[data-fix]').forEach(el => { el.value = S.fix[el.dataset.fix] || ''; });
  }

  /* field-sizing을 지원하지 않는 브라우저를 위한 높이 맞춤 */
  function grow(el) {
    if (window.CSS && CSS.supports && CSS.supports('field-sizing', 'content')) return;
    if (el.classList.contains('code')) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }

  /* ───────── 프롬프트 조립 ───────── */
  /* 고른 형태가 모두 사이트(아카이브)일 때만 사이트용 문장을 쓴다 (수업 쪽에만 있음) */
  const isSite = () => { const ts = selectedTypes(); return !isWork() && ts.length > 0 && ts.every(t => t.kind === 'site'); };
  const val = k => (owner(k)[k] || '').trim();
  /* 빈칸 표시: {{이동할 곳|라벨}} — 화면에서는 버튼, 복사할 때는 [라벨] */
  const blank = (focus, label) => `{{${focus}|${label}}}`;

  function requirements() {
    const f = F();
    const hasType = f.types.length > 0;
    const customOk = !f.types.includes('custom') || !!val('customType');
    const typeReq = { label: '결과물 형태', ok: hasType && customOk, focus: hasType ? 'customType' : 'types' };
    const styleReq = { label: '분위기', ok: !!val('customStyle'), focus: 'customStyle', skip: f.style !== 'custom' };
    const descReq = { label: '앱 설명', ok: !!val('desc'), focus: 'desc' };
    if (isWork()) return [typeReq, styleReq, descReq].filter(r => !r.skip);
    const site = isSite();
    return [
      { label: '교과·학년', ok: !!val('subject') && !!val('grade'), focus: val('subject') ? 'grade' : 'subject' },
      { label: '성취기준', ok: !!val('standard'), focus: 'standard', skip: site },
      { label: '학습 목표', ok: !!val('goal'), focus: 'goal', skip: site },
      typeReq, styleReq, descReq,
    ].filter(r => !r.skip);
  }

  /* 형태 이름: '직접 쓰기'는 입력한 글로 바꾼다 */
  const typeName = t => (t.id === 'custom' ? (val('customType') || blank('customType', '결과물 형태')) : t.name);

  /* "○○을(를) 만들어 주세요"의 ○○ */
  function objectPhrase(ts) {
    if (!ts.length) return `${blank('types', '결과물 형태')}을(를)`;
    if (ts.length > 1) return '웹앱을';
    const one = ts[0];
    if (one.id !== 'custom') return one.obj;
    return val('customType') ? `"${val('customType')}" 형태의 웹앱을` : `${blank('customType', '결과물 형태')}을(를)`;
  }

  /* 결과물 형태와 기술 스택 (두 갈래 공통). dataLine = 마지막 줄(내용을 한곳에 모으기) */
  function techLines(ts, dataLine) {
    const tech = [`형태: ${ts.length ? ts.map(typeName).join(' + ') : blank('types', '결과물 형태')}`];
    /* 형태가 여러 개면 형태별로 묶어서 적는다 */
    ts.forEach(t => {
      if (ts.length > 1) tech.push({ sub: typeName(t) });
      t.tech.forEach(l => tech.push(l));
    });
    if (ts.length > 1) tech.push({ sub: '공통' });
    visibleAddons().filter(a => F().addons.includes(a.id)).forEach(a => tech.push((isWork() && a.workLine) || a.line));
    if (S.mode === 'chat') {
      tech.push('모든 코드를 index.html 파일 하나에 담아 주세요(HTML·CSS·JavaScript 포함). 라이브러리는 CDN 주소로 불러옵니다.');
      tech.push('설치나 빌드 없이 파일을 열면 바로 동작하고, Vercel에 그대로 올릴 수 있어야 합니다.');
      tech.push('외부 이미지 파일은 쓰지 말고 도형·아이콘·이모지로 구성해 주세요.');
    } else {
      tech.push('Vite 프로젝트로 구성해 주세요. 화면과 상태가 많으면 React와 Tailwind CSS를 사용합니다.');
      tech.push('npm run build로 배포용 결과물이 만들어지고, Vercel에 배포할 수 있어야 합니다.');
    }
    tech.push(dataLine);
    return tech;
  }

  /* 디자인 (두 갈래 공통). mid = 글꼴 다음 줄, tail = 줄바꿈 규칙 다음 줄 */
  function designLines(mid, tail) {
    const f = F();
    const acc = D.ACCENTS.find(a => a.id === f.accent) || D.ACCENTS[0];
    const sty = D.STYLES.find(s => s.id === f.style) || D.STYLES[0];
    const base = sty.id === 'custom'
      ? [
        `분위기: ${val('customStyle') || blank('customStyle', '원하는 분위기')}`,
        '색: 강조색은 {accent}을(를) 기본으로 하되, 위 분위기에 맞게 바탕색과 글자색을 정하고 글자와 바탕의 대비는 4.5:1 이상으로 맞춥니다.',
      ]
      : sty.lines;
    const design = base.map(l => l.replace('{accent}', `${acc.name}(${acc.hex})`));
    design.push('글꼴: Pretendard(읽기 쉬운 한글 글꼴), 본문 16px 이상, 줄 간격 1.6 이상, 제목과 본문의 크기 차이를 분명하게 합니다.');
    design.push(mid);
    design.push('한글 단어가 줄 중간에서 끊기지 않게 word-break: keep-all을 적용해 주세요.');
    if (tail) design.push(tail);
    if (val('styleNote')) design.push(`추가 요청: ${val('styleNote')}`);
    return design;
  }

  /* 피드백·접근성·완료 조건의 기본 문장 */
  function checkLines(group) {
    const site = isSite();
    return D.CHECKS.filter(c => c.group === group)
      .map(c => (isWork() ? c.workLine : (site && c.siteLine) || c.line))
      .filter(Boolean);
  }

  const lines = k => val(k).split(/\n+/).map(s => s.trim()).filter(Boolean);

  function howLines() {
    const how = [
      '만들기 전에 요구사항과 화면 흐름을 5줄 이내로 요약하고, 사용할 기술 구성을 알려 주세요.',
      '결정에 꼭 필요한 정보가 빠졌다면 추측하지 말고 먼저 질문해 주세요.',
      '위에 적은 기능만 먼저 구현해 주세요. 더 넣고 싶은 기능은 구현하지 말고 맨 끝에 "확장 아이디어"로만 적어 주세요.',
    ];
    how.push(S.mode === 'chat'
      ? '완성된 index.html 코드는 생략 없이 처음부터 끝까지 한 번에 보여 주세요.'
      : '구현이 끝나면 직접 실행해 완료 조건을 하나씩 확인하고, 확인하지 못한 항목은 따로 알려 주세요.');
    return how;
  }

  function buildSections() {
    return isWork() ? buildWork() : buildLesson();
  }

  /* 업무 및 기타: 역할 → 형태·기술 → 디자인 → 앱 설명 → 사용성·접근성 → 완료 조건 → 추가 요청 → 작업 방식 */
  function buildWork() {
    const ts = selectedTypes();
    const out = [];

    const role = [
      '당신은 베테랑 프론트엔드 개발자이자, 사용자 관점에서 화면을 설계하는 UX/UI 디자이너입니다.',
      `${objectPhrase(ts)} 만들어 주세요.`,
    ];
    if (ts.length > 1) role.push(`한 앱 안에 다음 형태를 함께 담습니다: ${ts.map(typeName).join(' / ')}`);
    if (val('appName')) role.push(`이름은 "${val('appName')}"입니다.`);
    role.push('꼭 필요한 기능부터 단순하고 정확하게 만들어 주세요. 화려한 효과보다, 처음 보는 사람도 설명 없이 바로 쓸 수 있는 화면이 먼저입니다.');
    out.push({ title: '역할 및 목적', lines: role, plain: true });

    out.push({ title: '결과물 형태와 기술 스택', lines: techLines(ts,
      '화면에 들어갈 내용(문구·항목·예시 자료)은 코드 맨 위 한곳에 모아, 제가 직접 고치기 쉽게 해 주세요.') });

    out.push({ title: '디자인', lines: designLines(
      '한 화면에서 가장 중요한 정보와 버튼이 먼저 눈에 띄게 하고, 설명 글은 짧게 써 주세요.',
      '움직임은 상태가 바뀌었음을 알려 주는 곳에만 짧게 쓰고, 기기의 "움직임 줄이기" 설정을 따라 주세요.') });

    const desc = lines('desc');
    out.push({
      title: '앱 설명과 작동 방식',
      lead: '아래 설명대로 구현해 주세요. 화면 순서와 기능은 이 설명을 따라 주세요.',
      lines: desc.length ? desc : [blank('desc', '어떤 앱인지, 어떻게 작동하는지')],
    });

    out.push({ title: '사용성과 접근성', lines: checkLines('fb').concat(checkLines('ac')) });
    out.push({ title: '완료 조건', lead: '아래가 모두 확인되면 완성입니다.', lines: checkLines('dn') });

    const extra = lines('extra');
    if (extra.length) out.push({ title: '추가 요청', lines: extra });
    out.push({ title: '작업 방식', lines: howLines() });
    return out;
  }

  /* 성취기준 기반 수업 */
  function buildLesson() {
    const ts = selectedTypes();
    const site = isSite();
    const out = [];

    /* 1. 역할 및 목적 */
    const who = `${val('grade') || blank('grade', '학년')} ${val('subject') || blank('subject', '교과')}`;
    const obj = objectPhrase(ts);
    const role = ['당신은 베테랑 프론트엔드 개발자이자, 학습자 관점에서 화면을 설계하는 UX/UI 디자이너입니다.'];
    if (site) {
      role.push(`${who} 교사가 운영할 ${obj} 만들어 주세요.`);
      if (val('appName')) role.push(`사이트 이름은 "${val('appName')}"입니다.`);
      role.push('이 사이트의 목적은 수업용 웹앱과 학생 결과물을 한곳에 모아, 학생과 동료 교사가 필요한 것을 바로 찾게 하는 것입니다. 꾸밈보다 찾기 쉬운 구성이 먼저입니다.');
    } else {
      role.push(`${who} 수업에서 사용할 ${obj} 만들어 주세요.`);
      if (ts.length > 1) role.push(`한 앱 안에 다음 형태를 함께 담습니다: ${ts.map(typeName).join(' / ')}`);
      if (val('appName')) role.push(`이름은 "${val('appName')}"입니다.`);
      role.push('이 웹앱은 화려함을 보여 주기 위한 것이 아니라, 아래 성취기준을 학생이 달성하도록 돕는 수업 도구입니다. 모든 화면과 기능은 학습 목표에 도움이 되는 만큼만 넣어 주세요.');
    }
    out.push({ title: '역할 및 목적', lines: role, plain: true });

    /* 2. 학습 목표와 근거 */
    const devices = D.DEVICES.filter(d => S.devices.includes(d.id)).map(d => d.name);
    const time = (D.TIMES.find(x => x.id === S.time) || D.TIMES[1]).text;
    const env = site
      ? `사용 환경: ${devices.length ? devices.join(', ') : '휴대전화와 PC'}`
      : `사용 환경: ${time}, ${devices.length ? devices.join(', ') : '노트북·크롬북'}`;
    const goal = [];
    if (site) {
      goal.push('주 사용자: 학생, 동료 교사');
      if (val('standard')) goal.push(`관련 성취기준: ${val('standard')}`);
      goal.push(env);
      goal.push('링크와 설명은 제가 제공한 내용만 사용하고, 비어 있는 곳은 "예시"라고 표시해 주세요.');
    } else {
      goal.push(`성취기준: ${val('standard') || blank('standard', '성취기준')}`);
      goal.push(`학습 목표: 이 웹앱을 사용한 뒤 학생이 자신의 말로 설명할 수 있어야 하는 것 → ${val('goal') || blank('goal', '학습 목표')}`);
      if (val('difficulty')) goal.push(`학생이 어려워하는 점: ${val('difficulty')}`);
      goal.push(env);
      goal.push(S.attach
        ? '함께 첨부한 교과서 발췌와 성취기준 파일의 범위 안에서만 내용을 구성해 주세요. 자료에 없는 성취기준·개념·사례는 만들지 말고, 사용한 내용은 자료의 쪽수를 알려 주세요.'
        : '교과 내용은 2022 개정 교육과정과 교과서 범위를 벗어나지 않게 하고, 확실하지 않은 내용은 넣기 전에 저에게 물어봐 주세요.');
    }
    out.push({ title: site ? '사이트 목적과 대상' : '학습 목표와 근거', lines: goal });

    /* 3. 결과물 형태와 기술 스택 */
    out.push({ title: '결과물 형태와 기술 스택', lines: techLines(ts, site
      ? '링크 목록(제목·주소·분류)은 코드 맨 위 한곳에 모아, 교사가 직접 고치기 쉽게 해 주세요.'
      : '수업 내용(카드·문항·수치·설명 글)은 코드 맨 위 한곳에 모아, 교사가 직접 고치기 쉽게 해 주세요.') });

    /* 4. 디자인 */
    out.push({ title: '디자인', lines: designLines(
      site ? '설명 글은 짧게 쓰고, 카드 제목만 봐도 무엇인지 알 수 있게 해 주세요.'
        : '한 화면에는 한 가지 행동만 요구하고, 설명 글은 짧게 써 주세요.',
      site ? '' : '그림과 움직임은 개념 이해를 돕는 곳에만 쓰고, 보기 좋게 만들려고 개념을 다르게 표현하지 마세요.') });

    /* 5. 앱 설명 — 교사가 쓴 글을 줄 단위로 그대로 넣는다 */
    const desc = lines('desc');
    out.push({
      title: site ? '사이트 설명과 작동 방식' : '앱 설명과 작동 방식',
      lead: site
        ? '아래 설명대로 구현해 주세요. 어디에서든 메뉴로 원하는 곳에 바로 갈 수 있게 해 주세요.'
        : '아래 설명대로 구현해 주세요. 페이지 순서와 기능은 이 설명을 따르고, 지금 몇 번째 단계인지와 다음에 할 일을 항상 보여 주세요.',
      lines: desc.length ? desc : [blank('desc', '어떤 앱인지, 어떻게 작동하는지')],
    });

    /* 6. 피드백과 접근성 · 7. 완료 조건 — 교사가 고르지 않아도 항상 들어가는 기본 문장 */
    out.push({ title: site ? '접근성' : '피드백과 접근성', lines: (site ? [] : checkLines('fb')).concat(checkLines('ac')) });
    out.push({ title: '완료 조건', lead: '아래가 모두 확인되면 완성입니다.', lines: checkLines('dn') });

    /* 8. 추가 요청 — 교사가 자유롭게 쓴 내용을 줄 단위로 넣는다 */
    const extra = lines('extra');
    if (extra.length) out.push({ title: '추가 요청', lines: extra });

    /* 9. 작업 방식 */
    out.push({ title: '작업 방식', lines: howLines() });
    return out;
  }

  function promptText() {
    const strip = s => s.replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '[$1]');
    return buildSections().map(sec => {
      const body = [];
      if (sec.lead) body.push(sec.lead);
      sec.lines.forEach(l => {
        if (typeof l !== 'string') body.push(`▸ ${l.sub}`);
        else if (sec.plain || sec.ordered) body.push(l);
        else body.push('- ' + l);
      });
      return `[${sec.title}]\n${body.map(strip).join('\n')}`;
    }).join('\n\n');
  }

  function renderPrompt() {
    const mark = s => esc(s).replace(/\{\{([^|}]*)\|([^}]*)\}\}/g, (_, focus, label) =>
      `<button type="button" class="blank" data-focus="${focus}">${label}</button>`);
    $('#prompt').innerHTML = buildSections().map(sec => {
      const out = [];
      if (sec.lead) out.push(`<p>${esc(sec.lead)}</p>`);
      sec.lines.forEach(l => {
        if (typeof l !== 'string') out.push(`<p class="sub">▸ ${mark(l.sub)}</p>`);
        else if (sec.plain || sec.ordered) out.push(`<p${sec.ordered ? ' class="li"' : ''}>${mark(l)}</p>`);
        else out.push(`<p class="li">- ${mark(l)}</p>`);
      });
      return `<h4>[${esc(sec.title)}]</h4>${out.join('')}`;
    }).join('');

    const miss = requirements().filter(r => !r.ok);
    const meter = $('#meter');
    meter.classList.toggle('ok', miss.length === 0);
    meter.innerHTML = miss.length
      ? `<span class="big">${miss.length}</span><span class="lbl">빈칸<br>AI가 임의로 채웁니다</span>
         <span class="miss">${miss.map(r => `<button type="button" class="blank" data-focus="${r.focus}">${esc(r.label)}</button>`).join('')}</span>`
      : `<span class="big">✓</span><span class="lbl">빈칸 없음 · 복사해서 AI에게 전달하세요</span>`;

    /* 모호한 말 찾기 */
    const f = F();
    const work = isWork();
    const texts = [work ? '' : S.goal, work ? '' : S.difficulty,
      f.styleNote, f.customStyle, f.extra, f.customType, f.appName, f.desc].join('\n');
    const hits = D.VAGUE.filter(v => (!v.track || v.track === track()) && v.re.test(texts));
    const tips = hits.map(v => `<li><b>“${esc(v.word)}”</b> → ${esc((work && v.workFix) || v.fix)}</li>`);
    /* 앱 설명이 너무 짧으면 무엇을 더 쓸지 알려 준다 */
    const d = val('desc');
    if (d && d.length < 40) {
      tips.push(work
        ? '<li><b>앱 설명이 짧습니다</b> → 누가 왜 쓰는지, 화면별로 어떤 기능이 있으면 좋을지 써 주세요</li>'
        : '<li><b>앱 설명이 짧습니다</b> → 페이지별로 어떤 기능이 있으면 좋을지 써 주세요</li>');
    }
    /* 채팅 AI(파일 하나)인데 설치·빌드가 필요한 도구를 적었으면 알려 준다 */
    if (S.mode === 'chat' && /React|리액트|Vue|뷰\b|Node\.?js|노드|Vite|npm|shadcn|Next\.?js/i.test(`${f.extra}\n${f.desc}`)) {
      tips.push('<li><b>맡길 곳을 확인하세요</b> → React·Vue·Node.js·shadcn/ui는 ‘코딩 에이전트’로 만들 때 씁니다</li>');
    }
    $('#vague').innerHTML = tips.join('');
    renderLibInsert();
  }

  function update() { renderPrompt(); save(); }

  /* ───────── 02: 입력 처리 ───────── */
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.bind) {
      const k = el.dataset.bind;
      owner(k)[k] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.tagName === 'TEXTAREA') grow(el);
      update();
    } else if (el.dataset.fix) {
      S.fix[el.dataset.fix] = el.value;
      renderFix(); save();
    }
  });

  function toggle(list, id) {
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
  }

  function focusTarget(key) {
    const el = key === 'types' ? $('#types .type') : $(`[data-bind="${key}"]`);
    if (!el) return;
    if (!route().sub) location.hash = '#2/' + track();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('button, a');
    if (!b) return;
    const d = b.dataset;
    const f = F();

    if (d.focus !== undefined) { focusTarget(d.focus); return; }
    if (d.device) { toggle(S.devices, d.device); renderDevices(); update(); return; }
    if (d.time) { S.time = d.time; renderDevices(); update(); return; }
    if (d.type) {
      toggle(f.types, d.type);
      renderTypes(); renderDesc(); update();
      /* 터치 화면에는 마우스 올리기가 없으므로, 골랐을 때 예시를 잠깐 보여 준다 */
      if (lastPointer === 'touch' && f.types.includes(d.type)) {
        showTypePv(b, 'touch');
        pvTimer = setTimeout(hideTypePv, 3600);
      }
      if (d.type === 'custom' && f.types.includes('custom')) $('[data-bind="customType"]').focus();
      return;
    }
    if (d.addon) { toggle(f.addons, d.addon); renderAddons(); update(); return; }
    if (d.style) {
      f.style = d.style; renderStyles(); update();
      if (d.style === 'custom') $('[data-bind="customStyle"]').focus();
      return;
    }
    if (d.accent) { f.accent = d.accent; renderStyles(); update(); return; }
    if (d.mode) { S.mode = d.mode; renderMode(); renderTypes(); update(); return; }
    if (d.example) {
      const ex = D.EXAMPLES[track()].find(x => x.id === d.example);
      if (!ex) return;
      const hasWork = isWork() ? (val('appName') || val('desc')) : (val('standard') || val('goal') || val('desc'));
      if (hasWork && !confirm('지금 작성한 내용이 예시로 바뀝니다. 계속할까요?')) return;
      const data = JSON.parse(JSON.stringify(ex.data));
      if (isWork()) S.work = Object.assign(freshWork(), data);
      else Object.assign(S, data);
      renderAll(); save(); return;
    }
    if (b.id === 'reset') {
      const msg = isWork()
        ? '업무 및 기타에 작성한 내용을 모두 지울까요? (수업 쪽 내용은 그대로 남습니다)'
        : '성취기준 기반 수업에 작성한 내용을 모두 지울까요? (업무 및 기타 쪽 내용은 그대로 남습니다)';
      if (!confirm(msg)) return;
      if (isWork()) S.work = freshWork();
      else {
        const keep = { track: S.track, work: S.work, mode: S.mode, review: S.review, fix: S.fix, deploy: S.deploy };
        S = Object.assign(fresh(), keep);
      }
      renderAll(); save(); window.scrollTo(0, 0); return;
    }
    if (d.copyPrompt !== undefined) { copy(promptText(), b, '프롬프트를 복사했습니다'); return; }
    if (d.copyFrom) { copy($(d.copyFrom).textContent, b, '복사했습니다'); return; }
    if (d.dstep !== undefined) { S.deploy = Number(d.dstep); save(); renderDeploy(d.move !== undefined); return; }
  });

  /* ───────── 복사 ───────── */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  async function copy(text, btn, msg) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    toast(ok ? msg : '복사하지 못했습니다. 글을 직접 선택해 복사해 주세요');
    if (ok && btn && btn.classList.contains('primary')) {
      btn.classList.add('done');
      setTimeout(() => btn.classList.remove('done'), 1800);
    }
  }

  /* ───────── 03: 받은 코드 미리보기·저장 ───────── */
  function extractHtml(raw) {
    const s = raw.trim();
    const blocks = [];
    const re = /```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(s))) blocks.push(m[1].trim());
    if (blocks.length) {
      const html = blocks.filter(b => /<html|<!doctype|<body|<div|<script/i.test(b));
      return (html.length ? html : blocks).sort((a, b) => b.length - a.length)[0];
    }
    return s;
  }

  /* 미리보기 창은 저장소가 막혀 있어, 저장을 쓰는 앱이 멈추지 않도록 임시 저장소를 넣어 줍니다. */
  const SHIM = '<script>(function(){try{window.localStorage.getItem("_")}catch(e){var mk=function(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}};try{Object.defineProperty(window,"localStorage",{configurable:true,value:mk()});Object.defineProperty(window,"sessionStorage",{configurable:true,value:mk()})}catch(e2){}}})();<\/script>';

  function withShim(code) {
    if (/<head[^>]*>/i.test(code)) return code.replace(/<head[^>]*>/i, m => m + SHIM);
    if (/<html[^>]*>/i.test(code)) return code.replace(/<html[^>]*>/i, m => m + SHIM);
    if (/^\s*<!doctype[^>]*>/i.test(code)) return code.replace(/^\s*<!doctype[^>]*>/i, m => m + SHIM);
    return SHIM + code;
  }

  function readCode() {
    const msg = $('#codeMsg');
    const code = extractHtml($('#code').value);
    msg.classList.remove('err');
    if (!code) {
      msg.textContent = '먼저 AI가 준 코드를 붙여넣어 주세요.';
      msg.classList.add('err');
      $('#code').focus();
      return null;
    }
    if (!/<[a-z!][\s\S]*>/i.test(code)) {
      msg.textContent = 'HTML 코드가 아닌 것 같습니다. <!DOCTYPE html>로 시작하는 코드를 붙여넣어 주세요.';
      msg.classList.add('err');
      return null;
    }
    msg.textContent = '';
    return code;
  }

  $('#preview').addEventListener('click', () => {
    const code = readCode();
    if (!code) return;
    $('#pv').hidden = false;
    $('#pvFrame').srcdoc = withShim(code);
    $('#pv').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  $('#download').addEventListener('click', () => {
    const code = readCode();
    if (!code) return;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'index.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $('#codeMsg').textContent = 'index.html을 저장했습니다. 04 배포에서 끌어다 놓으세요.';
  });

  $('#pvClose').addEventListener('click', () => { $('#pv').hidden = true; $('#pvFrame').srcdoc = ''; });
  $('#pvSize').addEventListener('click', e => {
    const b = e.target.closest('button[data-size]');
    if (!b) return;
    $$('#pvSize button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#pvStage').classList.toggle('phone', b.dataset.size === 'phone');
  });

  /* 점검표: 고른 갈래의 항목을 보여 준다 */
  const reviewList = () => (isWork() ? D.REVIEW_WORK : D.REVIEW);
  function renderReviewCount() {
    const ids = reviewList().flatMap(g => g.items.map(([id]) => id));
    const done = ids.filter(id => S.review.includes(id)).length;
    const c = $('#reviewCount');
    c.textContent = `${done}/${ids.length}`;
    c.classList.toggle('all', done === ids.length);
  }

  function renderReview() {
    $('#review').innerHTML = reviewList().map(g => `
      <div><h4>${esc(g.group)}</h4>${g.items.map(([id, text]) =>
        `<label class="tick"><input type="checkbox" data-review="${id}" ${S.review.includes(id) ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('')}
      </div>`).join('');
    renderReviewCount();
  }

  $('#review').addEventListener('change', e => {
    const id = e.target.dataset.review;
    if (!id) return;
    toggle(S.review, id);
    renderReviewCount();
    save();
  });

  /* 수정 요청 만들기 (비어 있는 칸은 갈래별 예시로 채운다) */
  function renderFix() {
    const ex = D.FIX_EX[track()];
    $$('[data-fix]').forEach(el => { el.placeholder = ex[el.dataset.fix]; });
    const f = S.fix;
    const w = f.where.trim() || ex.where;
    const n = f.now.trim() || ex.now;
    const t = f.want.trim() || ex.want;
    $('#fixOut').textContent =
      `[수정 요청]\n- 어디에서: ${w}\n- 지금은: ${n}\n- 이렇게 되어야 한다: ${t}\n${ex.after}`;
  }

  /* ───────── 04: 배포 순서 ───────── */
  const CIRCLED = ['①', '②', '③', '④', '⑤'];
  function renderDeploy(moveFocus) {
    const i = Math.min(Math.max(S.deploy || 0, 0), D.DEPLOY.length - 1);
    const st = D.DEPLOY[i];
    $('#dtabs').innerHTML = D.DEPLOY.map((s, k) =>
      `<button type="button" class="dtab" role="tab" id="dtab${k}" aria-selected="${k === i}" aria-controls="dpanel" data-dstep="${k}"><i>${k + 1}</i>${esc(s.title)}</button>`).join('');
    const panel = $('#dpanel');
    panel.setAttribute('aria-labelledby', 'dtab' + i);
    panel.innerHTML = `
      <figure><img src="${st.img}" width="${st.w}" height="${st.h}" alt="${esc(st.alt)}"></figure>
      <div class="dtext">
        <p class="sub">${esc(st.sub)}</p>
        <h3><b>${CIRCLED[i]}</b>${esc(st.title)}</h3>
        <ul>${st.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        ${st.link ? `<div class="btns"><a class="btn primary" href="${st.link[1]}" target="_blank" rel="noopener">${esc(st.link[0])} ↗</a></div>` : ''}
        ${st.copy ? `<div class="req"><p id="dcopy">${esc(st.copy)}</p><button type="button" class="btn small" data-copy-from="#dcopy">복사</button></div>` : ''}
        <div class="dnav">
          ${i > 0 ? `<button type="button" class="btn ghost" data-dstep="${i - 1}" data-move>← 이전</button>` : ''}
          ${i < D.DEPLOY.length - 1 ? `<button type="button" class="btn" data-dstep="${i + 1}" data-move>다음 →</button>` : `<a class="btn" href="#5">05 고급 →</a>`}
        </div>
      </div>`;
    if (moveFocus) panel.focus({ preventScroll: true });
  }

  /* ───────── 시작 ───────── */
  function renderAll() {
    renderTrack();
    syncInputs();
    renderDevices();
    renderTypes();
    renderStyles();
    renderDesc();
    renderMode();
    renderPrompt();
    renderPick();
    renderReview();
    renderFix();
    renderDeploy(false);
  }

  /* 주소로 바로 들어온 경우(#2/work 등) 그 갈래로 시작한다 */
  const start = route();
  if (start.n === 2 && start.sub) S.track = start.sub;
  renderAll();
  showScreen(false);
})();
