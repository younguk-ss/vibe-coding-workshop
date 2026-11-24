/* 형태 미리보기: '어떤 형태인가' 카드에 마우스를 올리면 뜨는 예시 움직임.
   영상 파일이 아니라 CSS 애니메이션으로 그린 약 3초짜리 반복 화면입니다(모양은 demos.css).
   cap = 미리보기 아래 한 줄 설명(workCap = 업무 및 기타에서 바꿔 쓰는 설명), html = 예시 화면.
   '직접 쓰기'는 미리보기가 없습니다. 지도·3D·2D 게임은 두 갈래가 같은 미리보기를 씁니다. */
window.DEMOS = (() => {
  'use strict';

  const cursor = '<i class="d-cur"></i>';
  const WEEK = ['월', '화', '수', '목', '금', '토', '일'];

  /* 3D 상자 하나: 가로 x, 깊이 z 위치와 크기(w·h·d), 색 */
  const cube = (x, z, w, h, d, color) =>
    `<div class="d-cube" style="--x:${x}px;--z:${z}px;--w:${w}px;--h:${h}px;--d:${d}px;--c:${color}">` +
    '<i class="d-f"></i><i class="d-b"></i><i class="d-r"></i><i class="d-l"></i><i class="d-t"></i></div>';

  const cards = n => Array.from({ length: n }, () => '<i></i>').join('');

  return {
    page: {
      cap: '스크롤하며 읽는 한 장짜리 안내 페이지',
      html: `<div class="dm d-page">
        <div class="d-doc">
          <i class="d-goal" style="top:40px">학습 목표</i>
          <i class="d-ln" style="top:66px;width:210px"></i>
          <i class="d-ln" style="top:78px;width:170px"></i>
          <i class="d-pic" style="top:96px"></i>
          <i class="d-h2" style="top:164px"></i>
          <i class="d-ln" style="top:184px;width:220px"></i>
          <i class="d-ln d-hl" style="top:196px;width:130px"></i>
          <i class="d-ln" style="top:208px;width:180px"></i>
          <i class="d-h2" style="top:234px"></i>
          <i class="d-ln" style="top:254px;width:200px"></i>
          <i class="d-ln" style="top:266px;width:150px"></i>
        </div>
        <i class="d-hd"></i><i class="d-sb"></i>
      </div>`,
    },

    sort: {
      cap: '카드를 끌어 기준 칸에 놓으면 바로 확인',
      html: `<div class="dm d-sort">
        <i class="d-bin d-b1"><u>기준 A</u></i>
        <i class="d-bin d-b2"><u>기준 B</u></i>
        <i class="d-card d-c1">카드 1</i>
        <i class="d-card d-c2">카드 2</i>
        <i class="d-ok d-o1">✓</i>
        <i class="d-ok d-o2">✓</i>
        ${cursor}
      </div>`,
    },

    quiz: {
      cap: '한 문제씩 풀고, 고르면 바로 해설',
      html: `<div class="dm d-quiz">
        <i class="d-pg">문제 1 / 3</i>
        <i class="d-q"></i><i class="d-q d-q2"></i>
        <i class="d-op" style="top:62px"><u style="width:120px"></u></i>
        <i class="d-op d-o2" style="top:92px"><u style="width:150px"></u><s>✓ 정답</s></i>
        <i class="d-op" style="top:122px"><u style="width:100px"></u></i>
        <i class="d-ex">해설<u></u></i>
        ${cursor}
      </div>`,
    },

    sim: {
      cap: '조건을 바꾸면 결과가 바로 변하는 시뮬레이션',
      html: `<div class="dm d-sim">
        <i class="d-lb" style="left:34px;top:5px">결과</i>
        <i class="d-lb" style="left:164px;top:5px">관계</i>
        <i class="d-tank"><u class="d-water"></u></i>
        <i class="d-graph"><u class="d-line"></u><u class="d-dot"></u></i>
        <i class="d-lb" style="left:34px;top:128px">조건</i>
        <i class="d-track"></i><i class="d-thumb"></i>
      </div>`,
    },

    chart: {
      cap: '항목을 고르면 그래프가 바뀌는 자료 탐구',
      html: `<div class="dm d-chart">
        <i class="d-chip d-ca">자료 A</i><i class="d-chip d-cb">자료 B</i>
        <i class="d-ax"></i>
        <i class="d-bar d-b1"></i><i class="d-bar d-b2"></i><i class="d-bar d-b3"></i><i class="d-bar d-b4"></i><i class="d-bar d-b5"></i>
        ${cursor}
      </div>`,
    },

    map: {
      cap: '지도 위 표시를 누르면 설명 카드가 열림',
      html: `<div class="dm d-map">
        <i class="d-river"></i><i class="d-road d-r1"></i><i class="d-road d-r2"></i>
        <i class="d-pin d-p1"></i><i class="d-pin d-p2"></i><i class="d-pin d-p3"></i>
        <i class="d-pop"><u></u><u></u><u></u></i>
        ${cursor}
      </div>`,
    },

    game3d: {
      cap: '3D 공간을 돌아다니며 고르고 관찰하는 게임',
      workCap: '시점을 돌려 보며 돌아다니는 3D 공간',
      html: `<div class="dm d-3d">
        <div class="d-world">
          <i class="d-ground"></i>
          ${cube(-74, -34, 44, 58, 44, '#5B8CFF')}
          ${cube(6, -66, 50, 86, 40, '#FF9F43')}
          ${cube(76, 6, 40, 44, 40, '#B37BFF')}
          <div class="d-mover">${cube(0, 0, 16, 16, 16, '#34E05B')}</div>
        </div>
        <i class="d-hud">라운드 1</i><i class="d-keys">W A S D</i>
      </div>`,
    },

    game2d: {
      cap: '캐릭터를 움직여 개념을 적용하는 2D 게임',
      workCap: '장애물을 넘고 별을 모으는 2D 게임',
      html: `<div class="dm d-2d">
        <i class="d-sun"></i><i class="d-hill d-h1"></i><i class="d-hill d-h2"></i>
        <i class="d-gnd"></i>
        <div class="d-run"><i class="d-ob"></i><i class="d-star">★</i></div>
        <i class="d-me"><u></u><u></u></i>
        <i class="d-score">★ 3</i>
      </div>`,
    },

    cam: {
      cap: '웹캠이 손동작을 숫자로 인식',
      html: `<div class="dm d-cam">
        <i class="d-view"></i>
        <i class="d-fg d-f1"></i><i class="d-fg d-f2"></i><i class="d-fg d-f3"></i><i class="d-fg d-f4"></i><i class="d-fg d-f5"></i>
        <i class="d-palm"></i>
        <i class="d-note">영상은 기기 안에서만 처리</i>
        <i class="d-out"><u class="d-ttl">펼친 손가락</u><u class="d-n d-n2">2</u><u class="d-n d-n3">3</u><u class="d-n d-n5">5</u></i>
      </div>`,
    },

    ai: {
      cap: '카메라에 보여 주면 AI가 분류하고 확률을 표시',
      html: `<div class="dm d-ai">
        <i class="d-shot"><u class="d-ea">🍎</u><u class="d-eb">🍌</u></i>
        <i class="d-sub">카메라 화면</i>
        <i class="d-row d-r1"><u class="d-nm">사과</u><u class="d-tr"><s class="d-fill"></s></u></i>
        <i class="d-row d-r2"><u class="d-nm">바나나</u><u class="d-tr"><s class="d-fill"></s></u></i>
      </div>`,
    },

    archive: {
      cap: '수업 웹앱과 학생 작품 링크를 모은 사이트',
      html: `<div class="dm d-arc">
        <i class="d-hd"></i>
        <i class="d-tab d-t1">1반</i><i class="d-tab d-t2">2반</i><i class="d-tab d-t3">3반</i>
        <div class="d-grid d-g1">${cards(8)}</div>
        <div class="d-grid d-g2">${cards(8)}</div>
        ${cursor}
      </div>`,
    },

    /* ───── 업무 및 기타 ───── */
    landing: {
      cap: '첫 화면 소개와 버튼, 스크롤하면 나타나는 섹션',
      html: `<div class="dm d-land">
        <div class="d-pg">
          <i class="d-hero"><u class="d-k">NEW</u><u class="d-t1"></u><u class="d-t2"></u><u class="d-sub"></u><u class="d-cta">신청하기</u></i>
          <i class="d-fc d-fc1"><u></u><u></u></i>
          <i class="d-fc d-fc2"><u></u><u></u></i>
          <i class="d-fc d-fc3"><u></u><u></u></i>
          <i class="d-faq" style="top:228px"><u></u><s>+</s></i>
          <i class="d-faq" style="top:254px"><u></u><s>+</s></i>
        </div>
        <i class="d-nav"><u class="d-logo"></u><u class="d-nb">신청</u></i>
      </div>`,
    },

    dash: {
      cap: '필터를 바꾸면 숫자 카드와 그래프가 함께 바뀜',
      html: `<div class="dm d-dash">
        <i class="d-side"><u></u><u></u><u></u><u></u></i>
        <i class="d-chip d-ca">이번 달</i><i class="d-chip d-cb">지난 달</i>
        <i class="d-kpi" style="left:52px"><u class="d-kl">신청</u><u class="d-kv d-va">128</u><u class="d-kv d-vb">96</u></i>
        <i class="d-kpi" style="left:134px"><u class="d-kl">완료율</u><u class="d-kv d-va">87%</u><u class="d-kv d-vb">72%</u></i>
        <i class="d-kpi" style="left:216px"><u class="d-kl">대기</u><u class="d-kv d-va">12</u><u class="d-kv d-vb">27</u></i>
        <i class="d-panel"></i>
        <svg class="d-svg" viewBox="0 0 220 76" aria-hidden="true">
          <polyline class="d-la" points="0,66 31,54 62,58 93,36 124,42 155,20 186,26 220,8"/>
          <polyline class="d-lb" points="0,56 31,62 62,46 93,52 124,34 155,40 186,48 220,32"/>
        </svg>
        ${cursor}
      </div>`,
    },

    kanban: {
      cap: '업무 카드를 끌어 다음 단계 칸으로 옮기기',
      html: `<div class="dm d-kan">
        <i class="d-col" style="left:8px"><u>할 일</u></i>
        <i class="d-col" style="left:104px"><u>진행 중</u></i>
        <i class="d-col" style="left:200px"><u>완료</u></i>
        <i class="d-kc" style="left:15px;top:62px"><u></u><u></u></i>
        <i class="d-kc" style="left:15px;top:94px"><u></u><u></u></i>
        <i class="d-kc" style="left:111px;top:30px"><u></u><u></u></i>
        <i class="d-kc" style="left:207px;top:30px"><u></u><u></u></i>
        <i class="d-kc d-mv"><u></u><u></u><s>✓</s></i>
        ${cursor}
      </div>`,
    },

    calendar: {
      cap: '날짜를 누르면 일정 추가, 달력에 바로 표시',
      html: `<div class="dm d-cal">
        <i class="d-mh">11월</i>
        <i class="d-vw"><u class="d-on">월</u><u>주</u><u>목록</u></i>
        <i class="d-wd">${WEEK.map((d, i) => `<u style="left:${i * 40 + 15}px">${d}</u>`).join('')}</i>
        <i class="d-grid">${Array.from({ length: 28 }, (_, k) =>
          `<u style="left:${(k % 7) * 40 + 4}px;top:${Math.floor(k / 7) * 33 + 2}px">${k + 3}</u>`).join('')}</i>
        <i class="d-ev" style="left:53px;top:55px;background:#DBEAFE;color:#1D4ED8">회의</i>
        <i class="d-ev" style="left:173px;top:88px;width:74px;background:#FFE4CC;color:#B45309">체육대회</i>
        <i class="d-ev" style="left:93px;top:154px;background:#FCE7F3;color:#BE185D">마감</i>
        <i class="d-sel"></i>
        <i class="d-ev d-new">상담</i>
        <i class="d-pop"><u class="d-pt">일정 추가</u><u class="d-pf"><s></s></u><u class="d-pf d-pf2"><s></s></u><u class="d-pb">저장</u></i>
        ${cursor}
      </div>`,
    },

    sheet: {
      cap: '엑셀 파일을 올리면 표로 정리하고 다시 저장',
      html: `<div class="dm d-sheet">
        <i class="d-drop"><u class="d-dl1">끌어다 놓기</u><u class="d-dl2">명단.xlsx ✓</u></i>
        <i class="d-file"><u>XLSX</u></i>
        <i class="d-tbl">
          <u class="d-th"><s class="d-sort">이름 ▲</s><s style="left:80px">반</s><s style="left:118px">강좌</s></u>
          ${[44, 26, 50, 34, 30].map((w, i) =>
            `<u class="d-tr d-r${i + 1}" style="top:${20 + i * 20}px"><s class="d-nm" style="width:${w}px"></s><s class="d-bn"></s><s class="d-cs" style="width:${[40, 28, 46, 32, 38][i]}px"></s></u>`).join('')}
        </i>
        <i class="d-save">엑셀로 저장 ↓</i>
        ${cursor}
      </div>`,
    },

    docgen: {
      cap: '입력하면 양식 문서가 채워지고 PDF로 저장',
      html: `<div class="dm d-doc">
        <i class="d-form">
          <u class="d-lb" style="top:9px">제목</u><u class="d-in" style="top:21px"><s class="d-ty d-ty1"></s></u>
          <u class="d-lb" style="top:43px">날짜</u><u class="d-in" style="top:55px"><s class="d-ty d-ty2"></s></u>
          <u class="d-lb" style="top:77px">내용</u><u class="d-in d-in3" style="top:89px"><s class="d-ty d-ty3"></s><s class="d-ty d-ty4"></s></u>
        </i>
        <i class="d-btn">PDF 저장 ↓</i>
        <i class="d-a4">
          <u class="d-ah"></u><u class="d-at"></u><u class="d-ad"></u>
          <u class="d-ab d-ab1"></u><u class="d-ab d-ab2"></u><u class="d-ab d-ab3"></u>
          <u class="d-seal"></u>
        </i>
        <i class="d-pdf">PDF ✓</i>
        ${cursor}
      </div>`,
    },

    slides: {
      cap: '화살표 키로 넘기는 웹 발표 슬라이드',
      html: `<div class="dm d-slide">
        <div class="d-vp"><div class="d-strip">
          <i class="d-sl d-sl1"><u class="d-a"></u><u class="d-b"></u><u class="d-c">2026 학년 협의회</u></i>
          <i class="d-sl d-sl2"><u class="d-h"></u><u class="d-li" style="top:46px"></u><u class="d-li" style="top:64px;width:84px"></u><u class="d-li" style="top:82px;width:72px"></u><u class="d-im"></u></i>
          <i class="d-sl d-sl3"><u>감사합니다</u></i>
        </div></div>
        <i class="d-prog"><u></u></i>
        <i class="d-no"><u class="d-n1">1 / 3</u><u class="d-n2">2 / 3</u><u class="d-n3">3 / 3</u></i>
        <i class="d-key">→</i>
      </div>`,
    },

    diagram: {
      cap: '글로 쓴 절차가 흐름도로 그려짐',
      html: `<div class="dm d-flow">
        <i class="d-code">
          <u style="top:12px">flowchart TD</u>
          <u class="d-c1" style="top:30px">A[기안]-->B[검토]</u>
          <u class="d-c2" style="top:48px">B-->C{승인?}</u>
          <u class="d-c3" style="top:66px">C-->D[완료]</u>
        </i>
        <i class="d-nd d-g1" style="left:180px;top:12px;border-radius:11px">기안</i>
        <i class="d-ar d-g1" style="left:209px;top:35px;height:8px"></i>
        <i class="d-nd d-g1" style="left:180px;top:48px">검토</i>
        <i class="d-ar d-g2" style="left:209px;top:71px;height:7px"></i>
        <i class="d-dia d-g2"></i><i class="d-dt d-g2">승인?</i>
        <i class="d-ar d-ah d-g3"></i>
        <i class="d-nd d-ok d-g3">완료</i>
      </div>`,
    },
  };
})();
