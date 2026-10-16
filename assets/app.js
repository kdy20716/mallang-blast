/* ============================================================
   말랑블라스트 Promo Site — shared interactions
   (sound synth, jelly cursor, block-pop reveal, scroll anims, page wipe)
   ============================================================ */
(function () {
  'use strict';
  var IMG = 'assets/img/';
  var CONTACT = 'kdy20716@gmail.com';
  var PALETTE = ['#ff6fa8', '#4fd8b0', '#ffc94d', '#a78bfa', '#6ec1ff', '#f0527f', '#f6d83a', '#dfe9f5'];
  var COLORS = { pink: '#ff6fa8', mint: '#4fd8b0', gold: '#ffc94d', purple: '#a78bfa', blue: '#6ec1ff', berry: '#f0527f', lemon: '#f6d83a', cloud: '#b9c8de' };
  var BLOCK_NAMES = ['pink', 'mint', 'gold', 'purple', 'blue', 'berry', 'lemon', 'cloud'];
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover)').matches;

  /* ---------------- SOUND (WebAudio synth, no files) ---------------- */
  var sfx = (function () {
    var ctx, master, bgmTimer, step = 0;
    var sfxOn = localStorage.getItem('mb_sfx') !== '0';
    var bgmOn = localStorage.getItem('mb_bgm') === '1';
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    function init() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    function tone(freq, t0, dur, type, vol, slideTo) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function noise(dur, vol, f0, f1) {
      var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = ctx.createBufferSource(); s.buffer = buf;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
      var t = ctx.currentTime; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var g = ctx.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    /* HTML5 Audio for real game Lobby BGM */
    var bgmAudio = null;
    function getBgmAudio() {
      if (!bgmAudio) {
        bgmAudio = new Audio('assets/audio/lobby_bgm.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.28; // 잔잔하고 부드러운 볼륨
        bgmAudio.preload = 'auto';
      }
      return bgmAudio;
    }

    /* In-Game SFX Audio (click.wav & grab.wav) */
    var clickAudioPool = [];
    var poolIndex = 0;
    function getClickAudio() {
      if (clickAudioPool.length === 0) {
        for (var i = 0; i < 5; i++) {
          var a = new Audio('assets/audio/click.wav');
          a.volume = 0.55;
          clickAudioPool.push(a);
        }
      }
      var snd = clickAudioPool[poolIndex];
      poolIndex = (poolIndex + 1) % clickAudioPool.length;
      snd.currentTime = 0;
      return snd;
    }

    var api = {
      get sfxOn() { return sfxOn; }, get bgmOn() { return bgmOn; },
      unlock: function () { if (sfxOn) init(); if (bgmOn) api.startBgm(); },
      pop: function () {
        if (!sfxOn) return;
        try {
          var a = getClickAudio();
          a.play().catch(function () {});
        } catch (e) {}
        if (init()) {
          var t = ctx.currentTime;
          noise(0.12, 0.45, 2600, 360);
          tone(rand(520, 680), t, 0.12, 'sine', 0.35, 180);
        }
      },
      click: function () {
        if (!sfxOn) return;
        try {
          var a = getClickAudio();
          a.play().catch(function () {});
        } catch (e) {}
      },
      tick: function () { if (!sfxOn || !init()) return; tone(pick(PENTA) * 1.5, ctx.currentTime, 0.07, 'sine', 0.07); },
      whoosh: function () { if (!sfxOn || !init()) return; noise(0.45, 0.45, 300, 3200); },
      chime: function () { if (!sfxOn || !init()) return; var t = ctx.currentTime; [0, 2, 4, 6].forEach(function (n, i) { tone(PENTA[n], t + i * 0.07, 0.35, 'triangle', 0.16); }); },
      boing: function () { if (!sfxOn || !init()) return; var t = ctx.currentTime; tone(200, t, 0.35, 'sine', 0.4, 520); tone(520, t + 0.1, 0.25, 'sine', 0.2, 260); },
      toggleSfx: function () { sfxOn = !sfxOn; localStorage.setItem('mb_sfx', sfxOn ? '1' : '0'); if (sfxOn) { init(); api.chime(); } return sfxOn; },
      toggleBgm: function () {
        bgmOn = !bgmOn;
        localStorage.setItem('mb_bgm', bgmOn ? '1' : '0');
        if (bgmOn) { api.startBgm(); } else { api.stopBgm(); }
        return bgmOn;
      },
      startBgm: function () {
        var a = getBgmAudio();
        if (a.paused) {
          a.play().catch(function () {
            // Autoplay policy: will start on next user tap/interaction
          });
        }
      },
      stopBgm: function () {
        if (bgmAudio) {
          bgmAudio.pause();
        }
      }
    };
    return api;
  })();
  window.MB = { sfx: sfx };

  /* ---------------- shared header / footer ---------------- */
  var PAGES = [
    ['index.html', '홈'], ['index.html#mascots', '말랑이'], ['play.html', '바로 플레이'],
    ['privacy.html', '개인정보'], ['terms.html', '이용약관'], ['support.html', '고객지원'], ['data-deletion.html', '데이터 삭제']
  ];
  function buildChrome() {
    var cur = (location.pathname.split('/').pop() || 'index.html');
    var hdr = document.getElementById('site-header');
    if (hdr) {
      var links = PAGES.map(function (p) {
        var file = p[0].split('#')[0];
        var active = (file === cur && p[0].indexOf('#') < 0) ? ' active' : '';
        return '<a class="item' + active + '" href="' + p[0] + '">' + p[1] + '</a>';
      }).join('');
      hdr.innerHTML = '<nav class="nav" aria-label="메인 메뉴"><a class="brand" href="index.html"><img src="' + IMG + 'appicon.png" alt="말랑블라스트 아이콘">말랑블라스트</a>' +
        '<div class="links">' + links + '</div>' +
        '<div class="tools"><button class="icon-btn" id="btn-sfx" title="효과음" aria-label="효과음 켜기/끄기">🔊</button>' +
        '<button class="icon-btn" id="btn-bgm" title="배경음악" aria-label="배경음악 켜기/끄기">🎵</button>' +
        '<button class="icon-btn burger" id="btn-burger" aria-label="메뉴 열기">☰</button></div></nav>';
      var sb = document.getElementById('btn-sfx'), bb = document.getElementById('btn-bgm');
      if (!sfx.sfxOn) sb.classList.add('off'); if (!sfx.bgmOn) bb.classList.add('off');
      sb.onclick = function () { sb.classList.toggle('off', !sfx.toggleSfx()); };
      bb.onclick = function () { bb.classList.toggle('off', !sfx.toggleBgm()); };
      document.getElementById('btn-burger').onclick = function () { hdr.firstChild.classList.toggle('open'); };
    }
    var ftr = document.getElementById('site-footer');
    if (ftr) {
      ftr.innerHTML = '<img class="foot-logo" src="' + IMG + 'appicon.png" alt="말랑블라스트">' +
        '<div class="flinks"><a href="index.html">홈</a><a href="play.html">바로 플레이</a><a href="privacy.html">개인정보처리방침</a><a href="terms.html">이용약관</a><a href="support.html">고객지원</a><a href="data-deletion.html">데이터 삭제 안내</a></div>' +
        '<small>© 2026 MallangGames. All rights reserved. · 문의: <a href="mailto:' + CONTACT + '">' + CONTACT + '</a></small>' +
        '<small>말랑블라스트 (Mallang Blast) · Android 8.0 이상</small>';
    }
    var dec = document.createElement('div'); dec.className = 'bg-decor';
    for (var i = 0; i < 18; i++) {
      var d = document.createElement('i'); d.style.left = rand(0, 100) + '%'; d.style.top = rand(0, 100) + '%';
      d.style.background = pick(PALETTE); d.style.animationDelay = rand(0, 8) + 's'; d.style.animationDuration = rand(9, 16) + 's';
      d.dataset.speed = rand(0.02, 0.12).toFixed(3); dec.appendChild(d);
    }
    document.body.prepend(dec);
    var pg = document.createElement('div'); pg.id = 'progress'; document.body.appendChild(pg);
  }

  /* ---------------- jelly cursor ---------------- */
  function initCursor() {
    var svgNormal = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect x="5" y="6" width="24" height="24" rx="8" fill="#ff6fa8" stroke="#fff" stroke-width="3"/><rect x="9" y="10" width="9" height="5" rx="2.5" fill="#fff" opacity=".7"/><circle cx="14" cy="21" r="2" fill="#5a3d7a"/><circle cx="22" cy="21" r="2" fill="#5a3d7a"/><path d="M15 25q3 3 6 0" stroke="#5a3d7a" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
    var svgHot = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#ffc94d" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="19" r="1.8" fill="#5a3d7a"/><circle cx="24" cy="19" r="1.8" fill="#5a3d7a"/></svg>';
    var url = function (s, x, y, fb) { return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '") ' + x + ' ' + y + ', ' + fb; };
    document.body.style.setProperty('--cur', url(svgNormal, 6, 6, 'auto'));
    document.body.style.setProperty('--cur-hover', url(svgHot, 20, 20, 'pointer'));
    if (!finePointer) return;
    var ring = document.createElement('div'); ring.id = 'cursor-follow'; document.body.appendChild(ring);
    var tx = 0, ty = 0, x = 0, y = 0, lastTrail = 0;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; ring.classList.add('show');
      ring.classList.toggle('hot', !!e.target.closest('a,button,.seal,.mascot-card,.rain-block,.gacha-ball,[role="button"]'));
      var now = performance.now();
      if (!reduced && now - lastTrail > 45) {
        lastTrail = now;
        var s = document.createElement('i'); s.className = 'trail'; s.style.left = (tx - 7) + 'px'; s.style.top = (ty - 7) + 'px';
        s.style.setProperty('--tx', rand(-26, 26) + 'px'); s.style.setProperty('--ty', rand(10, 38) + 'px');
        document.body.appendChild(s); setTimeout(function () { s.remove(); }, 800);
      }
    }, { passive: true });
    (function loop() { x += (tx - x) * 0.2; y += (ty - y) * 0.2; ring.style.transform = 'translate(' + x + 'px,' + y + 'px)'; requestAnimationFrame(loop); })();
  }

  /* ---------------- particles ---------------- */
  function burst(x, y, color, n, spread) {
    if (reduced) return;
    var base = COLORS[color] || color || '#ff6fa8';
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i'); el.className = 'pop-fx';
      var size = rand(8, 22), star = Math.random() < 0.4;
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = size + 'px'; el.style.height = size + 'px';
      if (star) { el.style.background = 'url(' + IMG + 'sparkle.png) center/contain no-repeat'; el.style.width = el.style.height = (size * 1.6) + 'px'; }
      else el.style.background = Math.random() < 0.6 ? base : pick(PALETTE);
      document.body.appendChild(el);
      var a = rand(0, Math.PI * 2), dist = rand(0.35, 1) * (spread || 160), dx = Math.cos(a) * dist, dy = Math.sin(a) * dist;
      var rot = rand(-540, 540);
      var anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 1 },
        { transform: 'translate(' + (dx - size / 2) + 'px,' + (dy - size / 2) + 'px) scale(1.15) rotate(' + rot * 0.5 + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (dx * 1.15) + 'px,' + (dy + 140) + 'px) scale(0) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: rand(650, 1050), easing: 'cubic-bezier(.2,.8,.4,1)' });
      anim.onfinish = (function (e) { return function () { e.remove(); }; })(el);
    }
  }
  function popText(x, y, txt) {
    var t = document.createElement('div'); t.className = 'pop-text'; t.textContent = txt || pick(['펑!', '뿅!', '팡!', '짠!', '말랑~']);
    t.style.left = x + 'px'; t.style.top = y + 'px'; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 850);
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 600); }, 2600);
  }
  window.MB.burst = burst; window.MB.popText = popText; window.MB.toast = toast;

  /* ---------------- SEAL: block-pop reveal ---------------- */
  function popSeal(el, auto) {
    if (!el.classList.contains('sealed')) return;
    clearTimeout(el._t);
    var cover = el.querySelector(':scope > .seal-cover'); if (!cover) return;
    el.classList.remove('sealed'); cover.classList.add('boom');
    var r = cover.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    sfx.pop(); burst(cx, cy, el.dataset.color || 'pink', Math.min(34, 14 + Math.floor(r.width / 22)), Math.max(110, Math.min(r.width, 320) * 0.6));
    if (!auto) popText(cx, cy);
    setTimeout(function () { cover.remove(); el.classList.add('revealed'); el.dispatchEvent(new CustomEvent('revealed')); }, 320);
  }
  function initSeals(root) {
    (root || document).querySelectorAll('.seal:not([data-ready])').forEach(function (el) {
      el.dataset.ready = '1';
      var color = el.dataset.color || 'pink';
      el.classList.add('sealed');
      var cover = document.createElement('div'); cover.className = 'seal-cover';
      cover.setAttribute('role', 'button'); cover.setAttribute('tabindex', '0');
      cover.setAttribute('aria-label', '블록을 터뜨려 내용 보기');
      cover.innerHTML = '<img src="' + IMG + 'block_' + color + '.png" alt=""><b>' + (el.dataset.hint || '블록을 터뜨려 보세요!') + '</b>';
      el.appendChild(cover);
      cover.addEventListener('click', function () { popSeal(el); });
      cover.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); popSeal(el); } });
      if (finePointer) {
        el.addEventListener('pointerenter', function () { if (el.classList.contains('sealed')) el._t = setTimeout(function () { popSeal(el); }, 160); });
        el.addEventListener('pointerleave', function () { clearTimeout(el._t); });
      }
    });
  }
  function initOpenAll() {
    document.querySelectorAll('[data-open-all]').forEach(function (b) {
      b.addEventListener('click', function () {
        var list = Array.prototype.slice.call(document.querySelectorAll('.seal.sealed'));
        list.forEach(function (el, i) { setTimeout(function () { popSeal(el, true); }, i * 110); });
        if (!list.length) toast('이미 모두 열려 있어요 ✨');
      });
    });
  }

  /* ---------------- scroll anims / parallax / progress ---------------- */
  function initScroll() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + 'ms';
        el.classList.add('in'); io.unobserve(el);
        if (el.classList.contains('section-title')) sfx.tick();
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-anim]').forEach(function (el) { io.observe(el); });
    var decor = Array.prototype.slice.call(document.querySelectorAll('.bg-decor i')), pg = document.getElementById('progress'), ticking = false;
    function onScroll() {
      var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      if (pg) pg.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      if (!reduced) decor.forEach(function (d) { d.style.marginTop = (-y * parseFloat(d.dataset.speed)) + 'px'; });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    document.querySelectorAll('.tilt').forEach(function (c) {
      if (!finePointer) return;
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(700px) rotateY(' + px * 14 + 'deg) rotateX(' + -py * 14 + 'deg) translateY(-4px)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------------- page transition wipe ---------------- */
  function initWipe() {
    var w = document.createElement('div'); w.id = 'wipe'; w.className = 'cover';
    for (var r = 0; r < 12; r++) for (var c = 0; c < 8; c++) {
      var i = document.createElement('i'); i.style.background = pick(PALETTE); i.style.transitionDelay = ((r + c) * 28) + 'ms'; w.appendChild(i);
    }
    document.body.appendChild(w);
    if (/nowipe/.test(location.search)) w.style.display = 'none';
    requestAnimationFrame(function () { requestAnimationFrame(function () { w.classList.remove('cover'); }); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) w.classList.remove('cover'); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin) return;
      var same = u.pathname === location.pathname;
      if (same && u.hash) return;              // in-page anchor → smooth scroll
      if (same && !u.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      e.preventDefault(); sfx.whoosh(); w.classList.add('cover');
      setTimeout(function () { location.href = a.href; }, reduced ? 0 : 900);
    });
  }

  /* ---------------- global click / hover sounds ---------------- */
  function initGlobalFx() {
    document.addEventListener('pointerdown', function (e) {
      sfx.unlock();
      if (e.target.closest('.seal-cover,.rain-block,.gacha-ball')) return;
      burst(e.clientX, e.clientY, pick(BLOCK_NAMES), 9, 70);
      if (e.target.closest('a,button,.mascot-card')) sfx.click();
    });
    var last = 0;
    document.addEventListener('pointerover', function (e) {
      if (!e.target.closest) return;
      if (e.target.closest('.nav a.item,.btn,.tile,.icon-btn')) { var n = performance.now(); if (n - last > 90) { last = n; sfx.tick(); } }
    });
  }

  /* ---------------- home page modules ---------------- */
  var MASCOTS = [
    { n: '핑크 말랑이', t: 'normal', d: '달콤한 딸기 젤리에서 태어난 말랑월드의 대표 마스코트!', c: 'pink', say: ['안녕~ 오늘도 말랑말랑해!', '달콤한 딸기향 나지?', '까르르~ 간지러워~♥'] },
    { n: '민트 말랑이', t: 'normal', d: '시원한 박하향이 퐁퐁 터지는 청량 젤리.', c: 'mint', say: ['상쾌하게 한 판 어때?', '시원~하다!'] },
    { n: '골드 말랑이', t: 'normal', d: '반짝반짝 황금빛 행운을 불러오는 젤리.', c: 'gold', say: ['오늘은 왠지 대박 날 것 같아!', '반짝반짝~✨'] },
    { n: '퍼플 말랑이', t: 'normal', d: '신비로운 포도빛 꿈을 꾸는 몽환 젤리.', c: 'purple', say: ['신비로운 기운이 느껴져…', '쿨쿨… 아니, 깨어있어!'] },
    { n: '블루 말랑이', t: 'rare', d: '시원한 파도처럼 줄을 싹 쓸어버리는 레어 젤리.', c: 'blue', say: ['파도처럼 쓸어버리자!', '첨벙첨벙~'] },
    { n: '베리 말랑이', t: 'rare', d: '새콤달콤 베리 향이 터지는 레어 젤리.', c: 'berry', say: ['새콤달콤 콤보 가자!', '앙~ 깨물어줘!'] },
    { n: '레몬 말랑이', t: 'rare', d: '상큼함이 톡톡! 피버를 부르는 레어 젤리.', c: 'lemon', say: ['상큼하게 터뜨려 볼까?', '톡톡톡!'] },
    { n: '클라우드 말랑이', t: 'rare', d: '몽글몽글 구름 위를 둥실둥실 떠다니는 레어 젤리.', c: 'cloud', say: ['둥실둥실~', '구름 위에서 한숨 잘까?'] },
    { n: '천사 말랑이', t: 'special', d: '날개와 천사링을 가진 전설의 말랑이. 올 클리어의 주인공!', c: 'gold', say: ['천상의 축복을 내려줄게~', '올 클리어 엔젤 강림!'] }
  ];
  var TAGS = { normal: '노말', rare: '레어', special: '스페셜' };
  function initMascots() {
    var grid = document.getElementById('mascot-grid'); if (!grid) return;
    MASCOTS.forEach(function (m, i) {
      var wrap = document.createElement('div'); wrap.className = 'seal'; wrap.dataset.color = m.c; wrap.dataset.anim = 'zoom'; wrap.dataset.delay = (i % 3) * 120;
      wrap.innerHTML = '<div class="seal-content"><div class="mascot-card tilt" role="button" tabindex="0" aria-label="' + m.n + '"><div class="bubble"></div><img src="' + IMG + 'mascot_' + i + '.png" alt="' + m.n + '" loading="lazy">' +
        '<h3>' + m.n + '</h3><span class="tag ' + m.t + '">' + TAGS[m.t] + '</span><p>' + m.d + '</p></div></div>';
      grid.appendChild(wrap);
      var card = wrap.querySelector('.mascot-card'), bub = wrap.querySelector('.bubble'), bt;
      function talk() {
        card.classList.remove('squish'); void card.offsetWidth; card.classList.add('squish'); sfx.boing();
        bub.textContent = pick(m.say); bub.classList.add('show'); clearTimeout(bt); bt = setTimeout(function () { bub.classList.remove('show'); }, 2200);
        var r = card.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 80, m.c, 10, 90);
      }
      card.addEventListener('click', talk);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') talk(); });
    });
  }
  function initRain() {
    var hero = document.getElementById('hero'); if (!hero || reduced) return;
    var score = 0, badge = document.getElementById('pop-score'), live = 0, visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    function spawn() {
      if (!visible || document.hidden || live > 12) return;
      var color = pick(BLOCK_NAMES), b = document.createElement('img');
      b.className = 'rain-block'; b.src = IMG + 'block_' + color + '.png'; b.alt = ''; b.draggable = false;
      b.style.left = rand(2, 94) + '%'; b.style.width = rand(40, 78) + 'px'; b.style.animationDuration = rand(6, 11) + 's';
      hero.appendChild(b); live++;
      var done = function () { if (b.parentNode) { b.remove(); live--; } };
      b.addEventListener('animationend', done);
      b.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); sfx.unlock(); sfx.pop(); burst(e.clientX, e.clientY, color, 16, 110); popText(e.clientX, e.clientY);
        done(); score++; if (badge) badge.textContent = '🎯 터뜨린 블록 ' + score;
        if (score === 10) toast('10개 돌파! 손맛 좋은데요? 🎉');
        if (score === 30) { toast('블록 마스터! 30개 클리어 ✨'); sfx.chime(); for (var i = 0; i < 5; i++) setTimeout(function () { burst(rand(100, innerWidth - 100), rand(120, 400), pick(BLOCK_NAMES), 22, 200); }, i * 160); }
        if (score === 50) toast('이제 진짜 게임으로 가볼까요? ▶ 바로 플레이');
      });
    }
    setInterval(spawn, 800);
  }
  function initGacha() {
    var machine = document.getElementById('gacha-machine'); if (!machine) return;
    var btn = document.getElementById('gacha-btn'), ball = document.getElementById('gacha-ball'), res = document.getElementById('gacha-res'),
      name = document.getElementById('gacha-name'), tag = document.getElementById('gacha-tag'), msg = document.getElementById('gacha-msg'), busy = false, pending = null;
    function roll() { var r = Math.random(); if (r < 0.06) return 8; if (r < 0.38) return 4 + Math.floor(Math.random() * 4); return Math.floor(Math.random() * 4); }
    btn.addEventListener('click', function () {
      if (busy) return; busy = true; sfx.unlock(); msg.textContent = '두근두근… 돌리는 중!';
      machine.classList.remove('shake'); void machine.offsetWidth; machine.classList.add('shake'); sfx.whoosh();
      ball.className = 'gacha-ball'; void ball.offsetWidth;
      setTimeout(function () { ball.classList.add('drop'); sfx.boing(); }, 600);
      setTimeout(function () { ball.className = 'gacha-ball ready'; msg.textContent = '공을 눌러서 열어보세요!'; pending = roll(); }, 1550);
    });
    ball.addEventListener('click', function () {
      if (pending === null) return;
      var i = pending, m = MASCOTS[i]; pending = null;
      var r = ball.getBoundingClientRect(); sfx.pop(); if (i === 8) setTimeout(function () { sfx.chime(); }, 200);
      burst(r.left + r.width / 2, r.top + r.height / 2, i === 8 ? 'gold' : m.c, i === 8 ? 44 : 26, i === 8 ? 260 : 170); popText(r.left + r.width / 2, r.top, i === 8 ? '대박!!' : '짠!');
      ball.className = 'gacha-ball'; ball.style.opacity = 0; setTimeout(function () { ball.style.opacity = ''; }, 100);
      res.src = IMG + 'mascot_' + i + '.png'; res.alt = m.n; res.classList.remove('show'); void res.offsetWidth; res.classList.add('show');
      name.textContent = m.n; tag.textContent = TAGS[m.t]; tag.className = 'tag ' + m.t; msg.textContent = m.say[0]; busy = false;
    });
  }
  function initPhoneDock() {
    var spans = document.querySelectorAll('.phone .dock span'); if (!spans.length) return;
    var k = 2; setInterval(function () { spans.forEach(function (s, i) { s.classList.toggle('on', i === k); }); k = (k + 1) % spans.length; }, 1500);
  }

  /* ---------------- Interactive Lobby Hero Mascot (Tap Laugh / Drag Panic within Phone) ---------------- */
  function initLobbyMascot() {
    var mascot = document.getElementById('lobby-hero-mascot');
    var stage = document.getElementById('lobby-mascot-stage');
    var bubble = document.getElementById('lobby-bubble');
    var screen = document.querySelector('.phone .screen');
    if (!mascot || !stage || !screen) return;

    var normalSrc = IMG + 'mascot_0.png';
    var laughSrc = IMG + 'mascot_0_laugh.png';
    var panicSrc = IMG + 'mascot_0_panic.png';

    // Preload laugh and panic textures
    var imgL = new Image(); imgL.src = laughSrc;
    var imgP = new Image(); imgP.src = panicSrc;

    var laughQuotes = [
      '안녕~?',
      '하핫, 간지러워~♥',
      '오늘도 말랑말랑한 하루 보내!',
      '에헤헤~ 기분 좋아!',
      '톡톡 건드려줘서 고마워~!'
    ];
    var panicQuotes = [
      '으아아아~!',
      '하지마~! 딸기 시럽 쏟아져!',
      '늘어나버렷...!',
      '살려줘어~!',
      '아야야, 당기지 마~!'
    ];

    var bubbleTimer = null;
    function showBubble(text) {
      if (!bubble) return;
      clearTimeout(bubbleTimer);
      bubble.textContent = text;
      bubble.classList.add('show');
      bubbleTimer = setTimeout(function () {
        bubble.classList.remove('show');
      }, 2200);
    }

    var isPressed = false;
    var isDragging = false;
    var startPointerX = 0, startPointerY = 0;
    var pressTime = 0;
    var curDx = 0, curDy = 0;
    var snapTimer = null;

    mascot.classList.add('idle-float');

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      isPressed = true;
      isDragging = false;
      pressTime = performance.now();
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      curDx = 0;
      curDy = 0;

      if (snapTimer) { cancelAnimationFrame(snapTimer); snapTimer = null; }
      mascot.classList.remove('idle-float');
      mascot.classList.add('dragging');

      sfx.click();

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    function onPointerMove(e) {
      if (!isPressed) return;
      e.preventDefault();

      var rawDx = e.clientX - startPointerX;
      var rawDy = e.clientY - startPointerY;
      var totalDist = Math.hypot(rawDx, rawDy);

      // Clamping within the phone screen bounds
      // Screen width ~276px, mascot width ~170px -> Horizontal clamp ~±48px
      // Screen height ~580px, mascot height ~170px, dock/top margins -> Vertical clamp -90px to +60px
      var clampX = 52;
      var clampYUp = -95;
      var clampYDown = 60;

      curDx = Math.max(-clampX, Math.min(clampX, rawDx));
      curDy = Math.max(clampYUp, Math.min(clampYDown, rawDy));

      if (totalDist > 14) {
        if (!isDragging) {
          isDragging = true;
          mascot.src = panicSrc;
          showBubble(pick(panicQuotes));
          sfx.whoosh();
        }

        // Exact Codex squash & stretch deformation math
        var distX = Math.abs(curDx), distY = Math.abs(curDy);
        var dist = distX + distY;
        var intensity = Math.min(1, dist / 90);
        var ratioX = dist > 0.001 ? (distX / dist) : 0.5;
        var ratioY = 1 - ratioX;
        var axisDelta = (ratioX - ratioY) * intensity * 0.32;
        var scaleX = 1 - axisDelta;
        var scaleY = 1 + axisDelta;

        // Slight wobble when panicked
        var wobble = Math.sin(performance.now() * 0.03) * 6;

        mascot.style.transform = 'translate(' + curDx + 'px, ' + curDy + 'px) scale(' + scaleX.toFixed(3) + ', ' + scaleY.toFixed(3) + ') rotate(' + wobble.toFixed(1) + 'deg)';
      } else {
        // Subtle press squish
        mascot.style.transform = 'translate(' + curDx + 'px, ' + curDy + 'px) scale(1.06, 0.94)';
      }
    }

    function onPointerUp(e) {
      if (!isPressed) return;
      isPressed = false;
      mascot.classList.remove('dragging');

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      var duration = performance.now() - pressTime;
      var moved = Math.hypot(curDx, curDy);

      if (duration < 300 && moved < 15 && !isDragging) {
        // Short Tap Laugh Reaction!
        mascot.src = laughSrc;
        showBubble(pick(laughQuotes));
        sfx.pop();

        // Water-ripple bounce effect
        var t0 = performance.now();
        var rippleAnim = function (now) {
          var t = (now - t0) / 520;
          if (t >= 1) {
            mascot.style.transform = '';
            mascot.src = normalSrc;
            mascot.classList.add('idle-float');
            return;
          }
          var decay = Math.exp(-t * 6);
          var wave = Math.sin(t * 24) * decay;
          var sx = 1 + wave * 0.28;
          var sy = 1 - wave * 0.28;
          mascot.style.transform = 'scale(' + sx.toFixed(3) + ', ' + sy.toFixed(3) + ')';
          requestAnimationFrame(rippleAnim);
        };
        requestAnimationFrame(rippleAnim);
      } else {
        // Elastic Snap Back Routine
        var fromX = curDx, fromY = curDy;
        var snapT0 = performance.now();
        var snapRoutine = function (now) {
          var t = (now - snapT0) / 450;
          if (t >= 1) {
            mascot.style.transform = '';
            mascot.src = normalSrc;
            mascot.classList.add('idle-float');
            isDragging = false;
            return;
          }
          var decay = Math.exp(-t * 5.5);
          var posOsc = Math.cos(t * 18) * decay;
          var curX = fromX * posOsc;
          var curY = fromY * posOsc;

          var wave = Math.sin(t * 20) * decay;
          var sx = 1 + wave * 0.22;
          var sy = 1 - wave * 0.22;

          mascot.style.transform = 'translate(' + curX.toFixed(2) + 'px, ' + curY.toFixed(2) + 'px) scale(' + sx.toFixed(3) + ', ' + sy.toFixed(3) + ')';
          snapTimer = requestAnimationFrame(snapRoutine);
        };
        snapTimer = requestAnimationFrame(snapRoutine);
      }
    }

    mascot.addEventListener('pointerdown', onPointerDown);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    buildChrome(); initCursor(); initSeals(); initMascots(); initSeals(); initOpenAll();
    initScroll(); initGlobalFx(); initWipe(); initRain(); initGacha(); initPhoneDock(); initLobbyMascot();
    if (sfx.bgmOn) { document.addEventListener('pointerdown', function once() { sfx.startBgm(); document.removeEventListener('pointerdown', once); }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
