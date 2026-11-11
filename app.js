/* 바이브코딩은 도구다 — 화면 전환, 프롬프트 생성, 코드 미리보기·저장
   AI API를 쓰지 않습니다. 입력한 내용을 정해진 틀에 넣어 프롬프트를 조립합니다. */
(() => {
  'use strict';

  const D = window.DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'vibe-dogu-v1';
  const SCREEN_NAMES = ['', '개념', '프롬프트', '제작', '배포', '고급'];

  /* ───────── 상태 ───────── */
  const typeOf = id => D.TYPES.find(t => t.id === id) || null;
  const selectedTypes = () => S.types.map(typeOf).filter(Boolean);

  /* 앱 설명 칸에 보이는 예시 글: 고른 형태의 예시 문장을 페이지별로 한 줄씩 보여 준다.
     형태가 여러 개면 첫 형태의 처음·끝 문장 사이에 각 형태의 가운데 문장을 차례로 넣는다 */
  function exampleText(types) {
    let src;
    if (!types.length) src = D.BASE_PAGES;
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
    return '예)\n' + src.map(([name, hint], i) => `${i + 1}페이지 ${name}: ${hint}`).join('\n');
  }

  function fresh() {
    return {
      subject: '', grade: '', standard: '', goal: '', difficulty: '', attach: true,
      devices: ['laptop', 'phone'], time: '20',
      types: [], customType: '', addons: [],
      style: 'minimal', accent: 'navy', styleNote: '',
      appName: '', desc: '',
      extra: '',
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
      s.types = s.types.filter(id => typeOf(id));
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

  /* ───────── 화면 전환 ───────── */
  function currentScreen() {
    const n = parseInt(location.hash.replace('#', ''), 10);
    return n >= 1 && n <= 5 ? n : 1;
  }

  function showScreen(n, moveFocus) {
    $$('.screen').forEach(s => { s.hidden = Number(s.dataset.screen) !== n; });
    $$('.steps a').forEach(a => {
      if (Number(a.dataset.step) === n) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    const pager = $('#pager');
    const prev = n > 1 ? `<a class="prev" href="#${n - 1}">← ${SCREEN_NAMES[n - 1]}</a>` : '';
    const next = n < 5 ? `<a class="next" href="#${n + 1}"><small>0${n + 1}</small>${SCREEN_NAMES[n + 1]} →</a>` : '';
    pager.innerHTML = prev + next;
    window.scrollTo(0, 0);
    if (moveFocus) {
      const h = $(`.screen[data-screen="${n}"] [tabindex="-1"]`);
      if (h) h.focus({ preventScroll: true });
    }
    document.title = `${SCREEN_NAMES[n]} · 바이브코딩은 도구다`;
  }

  window.addEventListener('hashchange', () => showScreen(currentScreen(), true));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const el = document.activeElement;
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const n = currentScreen();
    if (n === 4) {
      const d = S.deploy + dir;
      if (d >= 0 && d < D.DEPLOY.length) { S.deploy = d; save(); renderDeploy(true); e.preventDefault(); return; }
    }
    const to = n + dir;
    if (to >= 1 && to <= 5) { location.hash = '#' + to; e.preventDefault(); }
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
    const has = (S.extra || '').includes(libLine());
    btn.disabled = has && S.mode === 'agent';
    btn.textContent = btn.disabled ? '넣었습니다 ✓'
      : S.mode === 'agent' ? '이 문장 넣기'
      : has ? '코딩 에이전트로 바꾸기'
      : '코딩 에이전트로 바꾸고 넣기';
  }
  $('#libInsert').addEventListener('click', () => {
    if (S.mode !== 'agent') { S.mode = 'agent'; renderMode(); }
    if (!(S.extra || '').includes(libLine())) {
      const cur = (S.extra || '').trim();
      S.extra = (cur ? cur + '\n' : '') + libLine();
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
      $('#typePvCap').textContent = demo.cap;
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

  /* ───────── 02: 입력 그리기 ───────── */
  const pressed = on => `aria-pressed="${on ? 'true' : 'false'}"`;

  function renderDevices() {
    $('#devices').innerHTML = D.DEVICES.map(d =>
      `<button type="button" class="chip" data-device="${d.id}" ${pressed(S.devices.includes(d.id))}>${esc(d.name)}</button>`).join('');
    $('#times').innerHTML = D.TIMES.map(t =>
      `<button type="button" class="chip" data-time="${t.id}" ${pressed(S.time === t.id)}>${esc(t.name)}</button>`).join('');
  }

  function renderTypes() {
    /* 카드는 처음 한 번만 만들고, 그다음에는 선택 표시만 바꾼다.
       (누를 때마다 다시 만들면 마우스를 올려 띄운 미리보기가 끊긴다) */
    const box = $('#types');
    if (box.children.length !== D.TYPES.length) {
      box.innerHTML = D.TYPES.map(t =>
        `<button type="button" class="type" data-type="${t.id}" ${pressed(S.types.includes(t.id))}><b>${esc(t.name)}</b><small>${esc(t.term)}</small></button>`).join('');
    } else {
      $$('.type', box).forEach(b => b.setAttribute('aria-pressed', String(S.types.includes(b.dataset.type))));
    }
    const picked = selectedTypes();
    $('#customWrap').hidden = !S.types.includes('custom');
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
    return D.ADDONS.filter(a => !(a.hideFor && a.hideFor.some(id => S.types.includes(id))));
  }

  function renderAddons() {
    $('#addons').innerHTML = visibleAddons().map(a =>
      `<button type="button" class="chip" data-addon="${a.id}" title="${esc(a.gloss)}" ${pressed(S.addons.includes(a.id))}>${esc(a.name)}<small>${esc(a.term)}</small></button>`).join('');
  }

  function renderStyles() {
    const acc = D.ACCENTS.find(a => a.id === S.accent) || D.ACCENTS[0];
    $('#styles').style.setProperty('--acc', acc.hex);
    $('#styles').innerHTML = D.STYLES.map(s =>
      `<button type="button" class="style" data-style="${s.id}" ${pressed(S.style === s.id)}>
        <span class="pvw lk-${s.look}" style="--b:${s.bg};--i:${s.ink};--c:${s.card}" aria-hidden="true"><i></i><i></i><span><u></u><s></s></span></span>
        <b>${esc(s.name)}</b></button>`).join('');
    $('#accents').innerHTML = D.ACCENTS.map(a =>
      `<button type="button" class="sw" data-accent="${a.id}" style="--c:${a.hex}" ${pressed(S.accent === a.id)}><i aria-hidden="true"></i>${esc(a.name)}</button>`).join('');
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
      if (el.type === 'checkbox') el.checked = !!S[k];
      else el.value = S[k] || '';
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
  /* 고른 형태가 모두 사이트(아카이브)일 때만 사이트용 문장을 쓴다 */
  const isSite = () => { const ts = selectedTypes(); return ts.length > 0 && ts.every(t => t.kind === 'site'); };
  const val = k => (S[k] || '').trim();
  /* 빈칸 표시: {{이동할 곳|라벨}} — 화면에서는 버튼, 복사할 때는 [라벨] */
  const blank = (focus, label) => `{{${focus}|${label}}}`;

  function requirements() {
    const site = isSite();
    const hasType = S.types.length > 0;
    const customOk = !S.types.includes('custom') || !!val('customType');
    const list = [
      { label: '교과·학년', ok: !!val('subject') && !!val('grade'), focus: val('subject') ? 'grade' : 'subject' },
      { label: '성취기준', ok: !!val('standard'), focus: 'standard', skip: site },
      { label: '학습 목표', ok: !!val('goal'), focus: 'goal', skip: site },
      { label: '결과물 형태', ok: hasType && customOk, focus: hasType ? 'customType' : 'types' },
      { label: '앱 설명', ok: !!val('desc'), focus: 'desc' },
    ];
    return list.filter(r => !r.skip);
  }

  function buildSections() {
    const ts = selectedTypes();
    const one = ts.length === 1 ? ts[0] : null;
    /* 형태 이름: '직접 쓰기'는 입력한 글로 바꾼다 */
    const typeName = t => (t.id === 'custom' ? (val('customType') || blank('customType', '결과물 형태')) : t.name);
    const site = isSite();
    const acc = D.ACCENTS.find(a => a.id === S.accent) || D.ACCENTS[0];
    const sty = D.STYLES.find(s => s.id === S.style) || D.STYLES[0];
    const out = [];

    /* 1. 역할 및 목적 */
    const who = `${val('grade') || blank('grade', '학년')} ${val('subject') || blank('subject', '교과')}`;
    let obj;
    if (!ts.length) obj = `${blank('types', '결과물 형태')}을(를)`;
    else if (!one) obj = '웹앱을';
    else if (one.id === 'custom') obj = val('customType') ? `"${val('customType')}" 형태의 웹앱을` : `${blank('customType', '결과물 형태')}을(를)`;
    else obj = one.obj;

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
    const tech = [];
    if (!ts.length) tech.push(`형태: ${blank('types', '결과물 형태')}`);
    else tech.push(`형태: ${ts.map(typeName).join(' + ')}`);
    /* 형태가 여러 개면 형태별로 묶어서 적는다 */
    ts.forEach(t => {
      if (ts.length > 1) tech.push({ sub: typeName(t) });
      t.tech.forEach(l => tech.push(l));
    });
    if (ts.length > 1) tech.push({ sub: '공통' });
    visibleAddons().filter(a => S.addons.includes(a.id)).forEach(a => tech.push(a.line));
    if (S.mode === 'chat') {
      tech.push('모든 코드를 index.html 파일 하나에 담아 주세요(HTML·CSS·JavaScript 포함). 라이브러리는 CDN 주소로 불러옵니다.');
      tech.push('설치나 빌드 없이 파일을 열면 바로 동작하고, Vercel에 그대로 올릴 수 있어야 합니다.');
      tech.push('외부 이미지 파일은 쓰지 말고 도형·아이콘·이모지로 구성해 주세요.');
    } else {
      tech.push('Vite 프로젝트로 구성해 주세요. 화면과 상태가 많으면 React와 Tailwind CSS를 사용합니다.');
      tech.push('npm run build로 배포용 결과물이 만들어지고, Vercel에 배포할 수 있어야 합니다.');
    }
    tech.push(site
      ? '링크 목록(제목·주소·분류)은 코드 맨 위 한곳에 모아, 교사가 직접 고치기 쉽게 해 주세요.'
      : '수업 내용(카드·문항·수치·설명 글)은 코드 맨 위 한곳에 모아, 교사가 직접 고치기 쉽게 해 주세요.');
    out.push({ title: '결과물 형태와 기술 스택', lines: tech });

    /* 4. 디자인 */
    const design = sty.lines.map(l => l.replace('{accent}', `${acc.name}(${acc.hex})`));
    design.push('글꼴: Pretendard(읽기 쉬운 한글 글꼴), 본문 16px 이상, 줄 간격 1.6 이상, 제목과 본문의 크기 차이를 분명하게 합니다.');
    design.push(site
      ? '설명 글은 짧게 쓰고, 카드 제목만 봐도 무엇인지 알 수 있게 해 주세요.'
      : '한 화면에는 한 가지 행동만 요구하고, 설명 글은 짧게 써 주세요.');
    design.push('한글 단어가 줄 중간에서 끊기지 않게 word-break: keep-all을 적용해 주세요.');
    if (!site) design.push('그림과 움직임은 개념 이해를 돕는 곳에만 쓰고, 보기 좋게 만들려고 개념을 다르게 표현하지 마세요.');
    if (val('styleNote')) design.push(`추가 요청: ${val('styleNote')}`);
    out.push({ title: '디자인', lines: design });

    /* 5. 앱 설명 — 교사가 쓴 글을 줄 단위로 그대로 넣는다 */
    const desc = val('desc').split(/\n+/).map(s => s.trim()).filter(Boolean);
    out.push({
      title: site ? '사이트 설명과 작동 방식' : '앱 설명과 작동 방식',
      lead: site
        ? '아래 설명대로 구현해 주세요. 어디에서든 메뉴로 원하는 곳에 바로 갈 수 있게 해 주세요.'
        : '아래 설명대로 구현해 주세요. 페이지 순서와 기능은 이 설명을 따르고, 지금 몇 번째 단계인지와 다음에 할 일을 항상 보여 주세요.',
      lines: desc.length ? desc : [blank('desc', '어떤 앱인지, 어떻게 작동하는지')],
    });

    /* 6. 피드백과 접근성 · 7. 완료 조건 — 교사가 고르지 않아도 항상 들어가는 기본 문장 */
    const on = g => D.CHECKS.filter(c => c.group === g).map(c => (site && c.siteLine) || c.line);
    out.push({ title: site ? '접근성' : '피드백과 접근성', lines: (site ? [] : on('fb')).concat(on('ac')) });
    out.push({ title: '완료 조건', lead: '아래가 모두 확인되면 완성입니다.', lines: on('dn') });

    /* 8. 추가 요청 — 교사가 자유롭게 쓴 내용을 줄 단위로 넣는다 */
    const extra = val('extra').split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (extra.length) out.push({ title: '추가 요청', lines: extra });

    /* 9. 작업 방식 */
    const how = [
      '만들기 전에 요구사항과 화면 흐름을 5줄 이내로 요약하고, 사용할 기술 구성을 알려 주세요.',
      '결정에 꼭 필요한 정보가 빠졌다면 추측하지 말고 먼저 질문해 주세요.',
      '위에 적은 기능만 먼저 구현해 주세요. 더 넣고 싶은 기능은 구현하지 말고 맨 끝에 "확장 아이디어"로만 적어 주세요.',
    ];
    how.push(S.mode === 'chat'
      ? '완성된 index.html 코드는 생략 없이 처음부터 끝까지 한 번에 보여 주세요.'
      : '구현이 끝나면 직접 실행해 완료 조건을 하나씩 확인하고, 확인하지 못한 항목은 따로 알려 주세요.');
    out.push({ title: '작업 방식', lines: how });

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
      const lines = [];
      if (sec.lead) lines.push(`<p>${esc(sec.lead)}</p>`);
      sec.lines.forEach(l => {
        if (typeof l !== 'string') lines.push(`<p class="sub">▸ ${mark(l.sub)}</p>`);
        else if (sec.plain || sec.ordered) lines.push(`<p${sec.ordered ? ' class="li"' : ''}>${mark(l)}</p>`);
        else lines.push(`<p class="li">- ${mark(l)}</p>`);
      });
      return `<h4>[${esc(sec.title)}]</h4>${lines.join('')}`;
    }).join('');

    const miss = requirements().filter(r => !r.ok);
    const meter = $('#meter');
    meter.classList.toggle('ok', miss.length === 0);
    meter.innerHTML = miss.length
      ? `<span class="big">${miss.length}</span><span class="lbl">빈칸<br>AI가 임의로 채웁니다</span>
         <span class="miss">${miss.map(r => `<button type="button" class="blank" data-focus="${r.focus}">${esc(r.label)}</button>`).join('')}</span>`
      : `<span class="big">✓</span><span class="lbl">빈칸 없음 · 복사해서 AI에게 전달하세요</span>`;

    /* 모호한 말 찾기 */
    const texts = [S.goal, S.difficulty, S.styleNote, S.extra, S.customType, S.appName, S.desc].join('\n');
    const hits = D.VAGUE.filter(v => v.re.test(texts));
    const tips = hits.map(v => `<li><b>“${esc(v.word)}”</b> → ${esc(v.fix)}</li>`);
    /* 앱 설명이 너무 짧으면 무엇을 더 쓸지 알려 준다 */
    const d = val('desc');
    if (d && d.length < 40) tips.push('<li><b>앱 설명이 짧습니다</b> → 페이지별로 어떤 기능이 있으면 좋을지 써 주세요</li>');
    /* 채팅 AI(파일 하나)인데 설치·빌드가 필요한 도구를 적었으면 알려 준다 */
    if (S.mode === 'chat' && /React|리액트|Vue|뷰\b|Node\.?js|노드|Vite|npm/i.test(`${S.extra}\n${S.desc}`)) {
      tips.push('<li><b>맡길 곳을 확인하세요</b> → React·Vue·Node.js는 ‘코딩 에이전트’로 만들 때 씁니다</li>');
    }
    $('#vague').innerHTML = tips.join('');
    renderLibInsert();
  }

  function update() { renderPrompt(); save(); }

  /* ───────── 02: 입력 처리 ───────── */
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.bind) {
      S[el.dataset.bind] = el.type === 'checkbox' ? el.checked : el.value;
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
    let el = null;
    if (key === 'types') el = $('#types .type');
    else el = $(`[data-bind="${key}"]`);
    if (!el) return;
    if (currentScreen() !== 2) location.hash = '#2';
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('button, a');
    if (!b) return;
    const d = b.dataset;

    if (d.focus !== undefined) { focusTarget(d.focus); return; }
    if (d.device) { toggle(S.devices, d.device); renderDevices(); update(); return; }
    if (d.time) { S.time = d.time; renderDevices(); update(); return; }
    if (d.type) {
      toggle(S.types, d.type);
      renderTypes(); renderDesc(); update();
      /* 터치 화면에는 마우스 올리기가 없으므로, 골랐을 때 예시를 잠깐 보여 준다 */
      if (lastPointer === 'touch' && S.types.includes(d.type)) {
        showTypePv(b, 'touch');
        pvTimer = setTimeout(hideTypePv, 3600);
      }
      if (d.type === 'custom' && S.types.includes('custom')) $('[data-bind="customType"]').focus();
      return;
    }
    if (d.addon) { toggle(S.addons, d.addon); renderAddons(); update(); return; }
    if (d.style) { S.style = d.style; renderStyles(); update(); return; }
    if (d.accent) { S.accent = d.accent; renderStyles(); update(); return; }
    if (d.mode) { S.mode = d.mode; renderMode(); update(); return; }
    if (d.example) {
      const hasWork = val('standard') || val('goal') || val('desc');
      if (hasWork && !confirm('지금 작성한 내용이 예시로 바뀝니다. 계속할까요?')) return;
      const ex = JSON.parse(JSON.stringify(D.EXAMPLES[d.example]));
      Object.assign(S, ex);
      renderAll(); save(); return;
    }
    if (b.id === 'reset') {
      if (!confirm('작성한 내용을 모두 지우고 처음부터 시작할까요?')) return;
      const keep = { mode: S.mode, review: S.review, fix: S.fix, deploy: S.deploy };
      S = Object.assign(fresh(), keep);
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

  /* 점검표 */
  function renderReview() {
    const total = D.REVIEW.reduce((n, g) => n + g.items.length, 0);
    $('#review').innerHTML = D.REVIEW.map(g => `
      <div><h4>${esc(g.group)}</h4>${g.items.map(([id, text]) =>
        `<label class="tick"><input type="checkbox" data-review="${id}" ${S.review.includes(id) ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('')}
      </div>`).join('');
    const c = $('#reviewCount');
    c.textContent = `${S.review.length}/${total}`;
    c.classList.toggle('all', S.review.length === total);
  }

  $('#review').addEventListener('change', e => {
    const id = e.target.dataset.review;
    if (!id) return;
    toggle(S.review, id);
    const total = D.REVIEW.reduce((n, g) => n + g.items.length, 0);
    const c = $('#reviewCount');
    c.textContent = `${S.review.length}/${total}`;
    c.classList.toggle('all', S.review.length === total);
    save();
  });

  /* 수정 요청 만들기 */
  function renderFix() {
    const f = S.fix;
    const w = f.where.trim() || '분류하기 화면의 주식 카드';
    const n = f.now.trim() || "'안전성 높음' 칸에 놓아도 정답으로 처리된다";
    const t = f.want.trim() || "'수익성 높음' 칸에 놓을 때만 정답, 오답이면 '원금이 보장되나요?' 힌트";
    $('#fixOut').textContent =
      `[수정 요청]\n- 어디에서: ${w}\n- 지금은: ${n}\n- 이렇게 되어야 한다: ${t}\n고친 뒤 휴대전화 화면에서 오답과 재도전까지 확인해 줘. 다른 기능은 바꾸지 마.`;
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
    syncInputs();
    renderDevices();
    renderTypes();
    renderStyles();
    renderDesc();
    renderMode();
    renderPrompt();
    renderReview();
    renderFix();
    renderDeploy(false);
  }

  renderAll();
  showScreen(currentScreen(), false);
})();
