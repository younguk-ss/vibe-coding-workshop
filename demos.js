/* 형태 미리보기: '어떤 형태인가' 카드에 마우스를 올리면 뜨는 예시 움직임.
   영상 파일이 아니라 CSS 애니메이션으로 그린 약 3초짜리 반복 화면입니다(모양은 demos.css).
   cap = 미리보기 아래 한 줄 설명, html = 예시 화면. '직접 쓰기'는 미리보기가 없습니다. */
window.DEMOS = (() => {
  'use strict';

  const cursor = '<i class="d-cur"></i>';

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
  };
})();
