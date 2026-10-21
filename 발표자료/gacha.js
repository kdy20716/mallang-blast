/* ============================================================
   말랑블라스트 발표자료 - 말랑이 픽업 10연차 소환 (인게임 가챠 연출 재현)
   원본: mobile-game/Assets/Scripts/BlockBlast/GachaPresentationController.cs
   흐름: 코인 투입 → 머신 흔들림 → 줌아웃 → 가챠볼 배출(돔) → 한 개씩 개봉
         (일반=젤리 팝 / 희귀=황금빛 폭발 / 스페셜=무지개빛 + 천사 말랑이 강림) → 5x2 결과 요약
   확률: 스페셜(천사 말랑이) 1.0% / 그 외 말랑이 0~7 균등, 조각 1개 또는 5개(50:50)
   ============================================================ */
(function () {
  'use strict';

  var G = 'assets/gacha/';
  var IMG = 'assets/img/';
  var CANCEL = { cancelled: true };
  var TILES = ['Pink', 'Mint', 'Gold', 'Purple', 'Blue', 'Berry', 'Lemon', 'Cloud', 'Special'];
  var NAMES = ['핑크 말랑이', '민트 말랑이', '골드 말랑이', '퍼플 말랑이', '블루 말랑이', '베리 말랑이', '레몬 말랑이', '클라우드 말랑이', '천사 말랑이'];
  var RARITY_COLOR = { common: '#5973a6', rare: '#ffb81a', special: '#ff66d9' };
  var RARITY_LABEL = { common: '일반', rare: '희귀', special: '스페셜' };
  var BALL_SRC = { common: G + 'UI_Gacha_Ball_Grey.png', rare: G + 'Gacha_Ball_Gold.png', special: G + 'UI_Gacha_Ball_Rainbow.png' };

  var $ = function (id) { return document.getElementById(id); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var stage, instr, machineWrap, machine, dome, coin, reveal, flare, aura, ball, reward, rAvatar, rRarity, rName, rShards,
    summary, climax, climaxMascot, climaxTitle, climaxSub, bloom, btnAll, btnConfirm;

  var running = false;     // 연출 스테이지가 열려 있는지
  var skipping = false;    // '모두 열기' → 요약으로 바로 이동
  var cancelled = false;   // 닫기(Esc/✕)
  var tapResolve = null;
  var activeAnims = [];
  var sleepers = [];
  var angelOwned = false;  // 세션 중 천사 말랑이 보유 여부 (중복 획득 처리)

  /* ---------------- 천장 및 마일스톤 게이지 (기본값: 50뽑 상태) ---------------- */
  var PITY_KEY = 'MB_PRESENTATION_PITY_COUNT';
  // 새로고침 시 기본 50뽑 상태로 복구되도록 세션 기본값 50 제공
  var pityCount = 50;
  try {
    var stored = sessionStorage.getItem(PITY_KEY);
    if (stored !== null) pityCount = parseInt(stored, 10) || 0;
  } catch (e) {}

  function updatePityUI() {
    var fillBar = $('pity-fill-bar');
    var pct = Math.min(100, (pityCount / 60) * 100);
    if (fillBar) fillBar.style.width = pct.toFixed(2) + '%';
  }

  function advancePity() {
    var isPity60 = (pityCount + 10 >= 60);
    if (isPity60) {
      pityCount = 0; // 60뽑째 특별 말랑이 나오고 0으로 낮춤
    } else {
      pityCount = Math.min(60, pityCount + 10);
    }
    try { sessionStorage.setItem(PITY_KEY, pityCount); } catch (e) {}
    updatePityUI();
    return isPity60;
  }

  /* ---------------- 사운드 (인게임 SFX/BGM 재사용) ---------------- */
  var audioCache = {};
  function sfxOn() { return !(window.MB && window.MB.sfx) || window.MB.sfx.sfxOn; }
  function playSfx(name, vol) {
    if (!sfxOn()) return;
    try {
      var a = new Audio(G + name);
      a.volume = vol == null ? 0.7 : vol;
      a.play().catch(function () {});
    } catch (e) {}
  }
  function getBgm() {
    if (!audioCache.bgm) {
      audioCache.bgm = new Audio(G + 'pick-up.mp3');
      audioCache.bgm.loop = true;
      audioCache.bgm.volume = 0.32;
    }
    return audioCache.bgm;
  }
  function startBgm() {
    if (!sfxOn()) return;
    if (window.MB && window.MB.sfx) window.MB.sfx.stopBgm();  // 로비 BGM 정지, 픽업 BGM만 재생
    getBgm().currentTime = 0;
    getBgm().play().catch(function () {});
  }
  function stopBgm() {
    if (audioCache.bgm) audioCache.bgm.pause();
    if (window.MB && window.MB.sfx && window.MB.sfx.bgmOn) window.MB.sfx.startBgm();
  }

  /* ---------------- 비동기 유틸 (건너뛰기/취소 지원) ---------------- */
  function check() { if (cancelled) throw CANCEL; }

  function applyFinal(el, frame) {
    Object.keys(frame).forEach(function (k) {
      if (k === 'offset' || k === 'easing') return;
      el.style[k] = frame[k];
    });
  }
  function A(el, kf, opt) {
    var a = el.animate(kf, opt);
    var last = kf[kf.length - 1];
    var p = new Promise(function (res) {
      a.onfinish = function () {
        applyFinal(el, last);
        var i = activeAnims.indexOf(a); if (i >= 0) activeAnims.splice(i, 1);
        a.cancel();
        res();
      };
      a.oncancel = function () { res(); };
    });
    activeAnims.push(a);
    if (skipping || cancelled) { try { a.finish(); } catch (e) {} }
    return p.then(check);
  }
  function sleep(ms) {
    return new Promise(function (res) {
      if (skipping || cancelled) return res();
      var t = setTimeout(res, ms);
      sleepers.push(function () { clearTimeout(t); res(); });
    }).then(check);
  }
  function waitTap() {
    if (skipping) return Promise.resolve();
    return new Promise(function (res) { tapResolve = res; }).then(check);
  }
  function tap() {
    if (tapResolve) { var r = tapResolve; tapResolve = null; r(); }
  }
  function flushAll() {
    activeAnims.slice().forEach(function (a) { try { a.finish(); } catch (e) {} });
    sleepers.splice(0).forEach(function (f) { f(); });
    tap();
  }

  function setInstr(html) { instr.innerHTML = html; }
  function show(el, disp) { el.style.display = disp || 'block'; }
  function hide(el) { el.style.display = 'none'; }

  /* ---------------- 드롭 생성 (LobbyManager.SummonPickup 확률 동일) ---------------- */
  function makeDrops(count, forceAngel) {
    var drops = [], angelSlot = forceAngel ? 2 + Math.floor(Math.random() * (count - 2)) : -1;
    for (var i = 0; i < count; i++) {
      var special = (i === angelSlot) || (!forceAngel && Math.random() * 100 < 1.0);
      if (special) {
        drops.push({ special: true, idx: 8, shards: angelOwned ? 60 : 0, dup: angelOwned });
        angelOwned = true;
      } else {
        drops.push({ special: false, idx: Math.floor(Math.random() * 8), shards: Math.random() < 0.5 ? 1 : 5, dup: false });
      }
    }
    return drops;
  }
  function rarityOf(d) { return d.special ? 'special' : (d.idx >= 4 ? 'rare' : 'common'); }

  /* ---------------- STEP 1 : 머신 연출 ---------------- */
  async function playMachine(drops) {
    var count = drops.length;
    show(machineWrap, 'grid');
    machine.style.opacity = 1;
    machine.style.transform = 'scale(2.2)';
    dome.innerHTML = '';
    var M = machine.offsetWidth;

    setInstr('코인을 투입하여 ' + count + '회 연속 소환을 시작합니다!');

    // A. 코인 투입 (슬롯: 머신 좌표 61.2% / 59.8%)
    var cs = M * 0.09;
    coin.style.left = (M * 0.612 - cs / 2) + 'px';
    coin.style.top = (M * 0.598 - cs / 2) + 'px';
    show(coin);
    playSfx('gacha_coin_jingle.wav', 0.75);
    await A(coin, [
      { transform: 'translateY(' + (-M * 0.55) + 'px) scale(1.3) rotate(0deg)' },
      { transform: 'translateY(0px) scale(0.45) rotate(540deg)' }
    ], { duration: 500, easing: 'ease-in-out' });
    hide(coin);
    if (skipping) return;

    // B-1. 슬롯에 포커스 된 채로 좌우 흔들림 (2 사이클)
    playSfx('gacha_machine_rattle.wav', 0.8);
    var kf = [], steps = 28, amp = M * 0.022;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps;
      var sx = Math.sin(t * Math.PI * 4) * (1 - t * 0.25) * amp;
      kf.push({ transform: 'scale(2.2) translateX(' + sx.toFixed(2) + 'px)' });
    }
    await A(machine, kf, { duration: 450, easing: 'linear' });
    machine.style.transform = 'scale(2.2)';
    if (skipping) return;

    // B-2. 줌아웃
    await A(machine, [{ transform: 'scale(2.2)' }, { transform: 'scale(1.0)' }], { duration: 350, easing: 'ease-in-out' });
    if (skipping) return;

    // C. 가챠볼 배출 (돔 안으로 낙하 + 가벼운 바운스)
    setInstr('가챠볼이 나오고 있습니다...!');
    var drops_ = [];
    for (var i = 0; i < count; i++) {
      if (skipping) return;
      drops_.push(dropBall(drops[i], M));
      await sleep(80);
    }
    await Promise.all(drops_);
    if (skipping) return;

    // D. 볼 확인 대기 → E. 머신 퇴장
    await sleep(650);
    if (skipping) return;
    await A(machine, [{ transform: 'scale(1.0)', opacity: 1 }, { transform: 'scale(0.92)', opacity: 0 }], { duration: 280, easing: 'ease-out' });
    hide(machineWrap);
    dome.innerHTML = '';
  }

  async function dropBall(drop, M) {
    var kind = rarityOf(drop);
    var bs = M * 0.095;
    var el = document.createElement('img');
    el.className = 'gs-dome-ball' + (drop.special ? ' special' : '');
    el.src = BALL_SRC[kind];
    var fx = M * (0.51 + rand(-0.15, 0.15)) - bs / 2;
    var fy = M * rand(0.28, 0.43) - bs / 2;
    el.style.left = fx + 'px';
    el.style.top = fy + 'px';
    dome.appendChild(el);

    var sx = rand(-0.08, 0.08) * M, sy = -(fy + bs + M * 0.12);
    var spin = drop.special ? 130 : rand(-60, 60);
    await A(el, [
      { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(0deg)' },
      { transform: 'translate(0px,0px) rotate(' + spin + 'deg)' }
    ], { duration: 500, easing: 'cubic-bezier(.55,.085,.68,.53)' });
    await A(el, [
      { transform: 'translate(0px,0px) rotate(' + spin + 'deg)' },
      { transform: 'translate(0px,' + (-M * 0.02) + 'px) rotate(' + spin + 'deg)', offset: 0.5 },
      { transform: 'translate(0px,0px) rotate(' + spin + 'deg)' }
    ], { duration: 200, easing: 'ease-in-out' });
  }

  /* ---------------- STEP 2 : 한 개씩 개봉 ---------------- */
  var POP = function (peak) {
    return [{ transform: 'scale(0)' }, { transform: 'scale(' + peak + ')', offset: 0.8 }, { transform: 'scale(1)' }];
  };

  function fillReward(d) {
    var kind = rarityOf(d);
    rAvatar.src = IMG + 'mascot_' + d.idx + '.png';
    rRarity.innerHTML = '<span style="color:' + RARITY_COLOR[kind] + '">【 ' + RARITY_LABEL[kind] + ' 】</span>';
    rName.textContent = NAMES[d.idx];
    rShards.innerHTML = d.special
      ? '<span style="color:#FFDF00">★ 스페셜 강림! ★</span>'
      : '<span style="color:#00E5FF">+' + d.shards + ' 조각 획득!</span>';
  }
  async function popReward(peak, dur) {
    show(reward, 'flex');
    reward.style.transform = 'scale(0)';
    await A(reward, POP(peak), { duration: dur, easing: 'ease-out' });
  }

  async function revealOne(d, i, total) {
    var kind = rarityOf(d);
    hide(reward); hide(flare); hide(aura);
    flare.classList.remove('gold');
    ball.src = BALL_SRC[kind];
    ball.classList.remove('pulse');
    ball.style.opacity = 1;
    ball.style.transform = 'scale(0)';
    show(ball);

    setInstr(total > 1 ? '가챠볼을 터치하여 열어보세요! (' + (i + 1) + '/' + total + ')' : '가챠볼을 터치하여 열어보세요!');
    await A(ball, POP(1.18), { duration: 280, easing: 'ease-out' });
    if (skipping) return;

    ball.classList.add('pulse');
    await waitTap();
    ball.classList.remove('pulse');
    ball.style.transform = 'scale(1)';
    if (skipping) return;

    if (kind === 'special') {
      await openSpecial(d);
    } else if (kind === 'rare') {
      await openRare(d);
    } else {
      playSfx('gacha_ball_crack.wav', 0.8);
      hide(ball);
      fillReward(d);
      await popReward(1.22, 260);
    }
    if (skipping) return;

    setInstr(i < total - 1 ? '화면을 터치하여 다음으로 (' + (i + 1) + '/' + total + ')' : '화면을 터치하여 계속하기');
    await waitTap();
  }

  async function openRare(d) {
    playSfx('gacha_ball_crack.wav', 0.9);
    flare.classList.add('gold');
    show(flare); show(aura);
    aura.classList.remove('rainbow');
    flare.style.opacity = 0;
    if (window.MB) window.MB.burst(innerWidth / 2, innerHeight * 0.52, 'gold', 26, 200);
    // 황금빛 광선 + 아우라 확산 (0.42s), 볼은 커지며 사라짐
    var p1 = A(flare, [
      { transform: 'scale(0.2) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1.1) rotate(-30deg)', opacity: 0.9, offset: 0.3 },
      { transform: 'scale(2.8) rotate(-63deg)', opacity: 0 }
    ], { duration: 420, easing: 'ease-out' });
    var p2 = A(aura, [
      { transform: 'scale(0.4) rotate(0deg)', opacity: 0.95 },
      { transform: 'scale(1.6) rotate(76deg)', opacity: 0 }
    ], { duration: 420, easing: 'ease-out' });
    var p3 = A(ball, [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.17)', opacity: 1, offset: 0.4 },
      { transform: 'scale(1.35)', opacity: 0 }
    ], { duration: 420, easing: 'ease-out' });
    await Promise.all([p1, p2, p3]);
    hide(ball); hide(flare); hide(aura);
    fillReward(d);
    await popReward(1.25, 280);
  }

  async function openSpecial(d) {
    playSfx('gacha_ball_crack.wav', 1);
    flare.classList.remove('gold');
    show(flare); show(aura);
    aura.classList.add('rainbow');
    flare.style.opacity = 0;
    aura.style.opacity = 0.85;
    aura.style.transform = 'scale(1)';
    show(bloom);
    bloom.style.opacity = 0;

    // Phase 1: 에너지 응집 - 진동 (0.42s)
    var kf = [], steps = 22;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps, ang = t * 0.42 * 50, mag = 3 + (14 - 3) * t, sc = 1 + 0.15 * t;
      kf.push({ transform: 'translate(' + (Math.sin(ang) * mag).toFixed(1) + 'px,' + (Math.cos(ang * 1.3) * mag * 0.5).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')' });
    }
    var pa = A(aura, [{ transform: 'scale(1) rotate(0deg)', opacity: 0.85 }, { transform: 'scale(1.15) rotate(-151deg)', opacity: 1 }], { duration: 420, easing: 'ease-in' });
    await Promise.all([A(ball, kf, { duration: 420, easing: 'linear' }), pa]);
    ball.style.transform = 'scale(1.15)';
    if (window.MB) { window.MB.burst(innerWidth * 0.12, innerHeight * 0.12, 'gold', 14, 160); window.MB.burst(innerWidth * 0.88, innerHeight * 0.12, 'gold', 14, 160); }

    // Phase 2: 빛줄기 확산 + 화면 전체가 파스텔 화이트로 번짐 (0.95s)
    var f1 = A(flare, [
      { transform: 'scale(0.2) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1.9) rotate(-27deg)', opacity: 1, offset: 0.35 },
      { transform: 'scale(4.8) rotate(-76deg)', opacity: 0.85 }
    ], { duration: 950, easing: 'ease-out' });
    var b1 = A(bloom, [{ opacity: 0 }, { opacity: 0.92 }], { duration: 950, easing: 'cubic-bezier(.55,.085,.68,.53)' });
    var ba = A(ball, [{ transform: 'scale(1.15)', opacity: 1 }, { transform: 'scale(1.55)', opacity: 0.05 }], { duration: 950, easing: 'ease-in' });
    await Promise.all([f1, b1, ba]);
    hide(ball); hide(flare); hide(aura);
    if (skipping) { hide(bloom); fillReward(d); show(reward, 'flex'); reward.style.transform = 'scale(1)'; return; }

    // Phase 3: 클라이막스 - 천사 말랑이 강림
    hide(reveal);
    await playClimax(d);
    show(reveal, 'grid');
    fillReward(d);
    show(reward, 'flex');
    reward.style.transform = 'scale(1)';
  }

  async function playClimax(d) {
    show(climax, 'grid');
    climaxMascot.classList.remove('bob');
    climaxMascot.style.transform = 'scale(0)';
    climaxTitle.innerHTML = '<span class="big">★ SPECIAL MASCOT! ★</span><span class="mid">천사 말랑이 강림!</span>';
    climaxSub.innerHTML = d.dup
      ? '<b style="color:#00FFAA">중복 획득! (+60)</b><small>화면을 터치하여 계속하기</small>'
      : '<b style="color:#FFF070">획득 완료!</b><small>화면을 터치하여 계속하기</small>';
    show(bloom);
    bloom.style.opacity = 0.92;
    playSfx('gacha_coin_jingle.wav', 0.6);
    if (window.MB && window.MB.sfx && window.MB.sfx.chime) window.MB.sfx.chime();
    var m = A(climaxMascot, POP(1.2), { duration: 550, easing: 'ease-out' });
    var b = A(bloom, [{ opacity: 0.92 }, { opacity: 0 }], { duration: 550, easing: 'linear' });
    await Promise.all([m, b]);
    hide(bloom);
    if (window.MB) for (var k = 0; k < 4; k++) (function (k) { setTimeout(function () { if (running) window.MB.burst(rand(innerWidth * 0.2, innerWidth * 0.8), rand(innerHeight * 0.15, innerHeight * 0.5), 'gold', 22, 220); }, k * 180); })(k);
    climaxMascot.style.transform = '';
    climaxMascot.classList.add('bob');
    if (!skipping) await waitTap();
    hide(climax);
    climaxMascot.classList.remove('bob');
  }

  /* ---------------- STEP 3 : 결과 요약 5x2 ---------------- */
  function showSummary(drops) {
    flushAnimsOnly();
    hide(machineWrap); hide(reveal); hide(climax); hide(bloom); hide(btnAll);
    summary.innerHTML = '';
    setInstr('★ <b>말랑이 픽업 소환 결과</b> ★<br><small>획득한 마스코트 조각들이 도감에 누적되었습니다!</small>');

    drops.forEach(function (d) {
      var kind = rarityOf(d);
      var slot = document.createElement('div');
      slot.className = 'gs-slot';
      var box = '<div class="gs-slot-box">';
      box += '<img class="gs-slot-tile" src="' + G + 'Block_Tile_' + TILES[d.idx] + '.png" alt="">';
      if (d.special) box += '<img class="gs-slot-aura" src="' + G + 'UI_Gacha_Rainbow_Aura.png" alt="">';
      box += '<img class="gs-slot-avatar" src="' + IMG + 'mascot_' + d.idx + '.png" alt="' + NAMES[d.idx] + '"></div>';
      var txt;
      if (d.special) {
        txt = '<span style="color:#FFDF00">★스페셜!★</span>' + (d.dup ? '<br><small style="color:#00FFAA;font-size:.8em">(+60 조각)</small>' : '');
      } else {
        txt = '<span style="color:' + (kind === 'rare' ? RARITY_COLOR.rare : '#9fb6e8') + '">+' + d.shards + ' 조각</span>';
      }
      slot.innerHTML = box + '<div class="gs-slot-text">' + txt + '</div>';
      summary.appendChild(slot);
    });
    show(summary, 'grid');
    show(btnConfirm, 'block');

    var slots = summary.querySelectorAll('.gs-slot');
    slots.forEach(function (s, i) {
      setTimeout(function () {
        if (!running) return;
        s.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
        if (window.MB && window.MB.sfx && i % 2 === 0) window.MB.sfx.tick();
      }, i * 70);
    });
    if (drops.some(function (d) { return d.special; })) {
      setTimeout(function () { if (running && window.MB) { window.MB.sfx.chime(); for (var k = 0; k < 3; k++) window.MB.burst(rand(innerWidth * 0.25, innerWidth * 0.75), rand(innerHeight * 0.25, innerHeight * 0.6), 'gold', 24, 240); } }, 650);
    }
  }
  function flushAnimsOnly() {
    activeAnims.slice().forEach(function (a) { try { a.finish(); } catch (e) {} });
  }

  /* ---------------- 전체 흐름 ---------------- */
  async function pull(forceAngel) {
    if (running) return;
    running = true; skipping = false; cancelled = false; tapResolve = null;
    activeAnims.length = 0; sleepers.length = 0;

    // 천장 판정: 현재 50뽑 상태에서 10뽑을 하면 60회 천장 달성 -> 특별 말랑이 확정 등장
    var isPityTrigger = advancePity();
    var guaranteeAngel = !!forceAngel || isPityTrigger;

    var drops = makeDrops(10, guaranteeAngel);
    document.body.classList.add('gacha-open');
    stage.classList.add('show');
    stage.setAttribute('aria-hidden', 'false');
    resetStage();
    startBgm();
    show(btnAll, 'block');

    try {
      await playMachine(drops);
      if (!skipping) {
        hide(machineWrap);
        show(reveal, 'grid');
        for (var i = 0; i < drops.length; i++) {
          if (skipping) break;
          await revealOne(drops[i], i, drops.length);
        }
      }
      showSummary(drops);
    } catch (e) {
      if (e !== CANCEL) console.error(e);
    }
  }

  function resetStage() {
    [machineWrap, reveal, summary, climax, bloom, coin, ball, flare, aura, reward, btnAll, btnConfirm].forEach(hide);
    ball.classList.remove('pulse');
    ball.style.opacity = ''; ball.style.transform = '';
    reward.style.transform = '';
    summary.innerHTML = '';
    dome.innerHTML = '';
    setInstr('');
  }

  function closeStage() {
    if (!running) return;
    cancelled = true;
    flushAll();
    running = false;
    stage.classList.remove('show');
    stage.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gacha-open');
    resetStage();
    stopBgm();
  }

  function onSkipAll() {
    if (!running || skipping || summary.style.display === 'grid') return;
    skipping = true;
    hide(btnAll);
    flushAll();
  }

  /* ---------------- 이벤트 바인딩 ---------------- */
  function init() {
    stage = $('gacha-stage');
    if (!stage) return;
    instr = $('gs-instr'); machineWrap = $('gs-machine-wrap'); machine = $('gs-machine'); dome = $('gs-dome'); coin = $('gs-coin');
    reveal = $('gs-reveal'); flare = $('gs-flare'); aura = $('gs-aura'); ball = $('gs-ball'); reward = $('gs-reward');
    rAvatar = $('gs-reward-avatar'); rRarity = $('gs-reward-rarity'); rName = $('gs-reward-name'); rShards = $('gs-reward-shards');
    summary = $('gs-summary'); climax = $('gs-climax'); climaxMascot = $('gs-climax-mascot');
    climaxTitle = $('gs-climax-title'); climaxSub = $('gs-climax-sub'); bloom = $('gs-bloom');
    btnAll = $('gs-open-all'); btnConfirm = $('gs-confirm');
    if (window.MB && window.MB.MASCOTS) {
      var m = window.MB.MASCOTS();
      for (var i = 0; i < m.length && i < NAMES.length; i++) NAMES[i] = m[i].n;
    }

    // 이미지 미리 로드 (연출 끊김 방지)
    ['Gacha_Machine_Cutout.png', 'Gacha_Machine_Glass.png', 'Gacha_Ball_Gold.png', 'UI_Gacha_Ball_Grey.png', 'UI_Gacha_Ball_Rainbow.png',
      'Gacha_Coin_Gold.png', 'UI_Gacha_Atmosphere_Bg.png', 'UI_Gacha_Sunburst_Rays.png', 'UI_Gacha_Rainbow_Burst.png']
      .concat(TILES.map(function (t) { return 'Block_Tile_' + t + '.png'; }))
      .forEach(function (f) { var im = new Image(); im.src = G + f; });

    var startBtn = $('gacha-start-10');
    if (startBtn) startBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.MB && window.MB.sfx) window.MB.sfx.unlock();
      pull(e.shiftKey);
    });

    updatePityUI();

    // 화면 어디를 눌러도 다음 단계 (버튼 제외)
    stage.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.gs-btn, .gs-close')) return;
      tap();
    });
    btnAll.addEventListener('click', function (e) { e.stopPropagation(); onSkipAll(); });
    btnConfirm.addEventListener('click', function (e) { e.stopPropagation(); closeStage(); });
    $('gs-close').addEventListener('click', function (e) { e.stopPropagation(); closeStage(); });

    window.addEventListener('keydown', function (e) {
      if (!running) return;
      if (e.key === 'Escape') { e.preventDefault(); closeStage(); return; }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (summary.style.display === 'grid') { if (e.key !== ' ') closeStage(); return; }
        tap();
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
