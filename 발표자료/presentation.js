/* ============================================================
   말랑블라스트 발표자료 프레젠테이션 스크립트 (HTML5 Presentation Deck Engine)
   - 키보드 제어 (스페이스바, 방향키, PageUp/Down, Fullscreen, 전체 열기)
   - 슬라이드 전환 및 프로그레스 연동
   - 원본 인터랙션 (파티클 버스트, 젤리 커서, 씰 팝, 가챠, 로비 말랑이, BGM/SFX)
   ============================================================ */
(function () {
  'use strict';

  var IMG = 'assets/img/';
  var AUDIO = 'assets/audio/';
  var PALETTE = ['#ff6fa8', '#4fd8b0', '#ffc94d', '#a78bfa', '#6ec1ff', '#f0527f', '#f6d83a', '#dfe9f5'];
  var COLORS = { pink: '#ff6fa8', mint: '#4fd8b0', gold: '#ffc94d', purple: '#a78bfa', blue: '#6ec1ff', berry: '#f0527f', lemon: '#f6d83a', cloud: '#b9c8de' };
  var BLOCK_NAMES = ['pink', 'mint', 'gold', 'purple', 'blue', 'berry', 'lemon', 'cloud'];
  var mascotFor = function (c) { var i = BLOCK_NAMES.indexOf(c); return IMG + 'mascot_' + (i < 0 ? 0 : i) + '.png'; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover)').matches;

  /* ---------------- SOUND (WebAudio synth & HTML5 Audio) ---------------- */
  var sfx = (function () {
    var ctx, master;
    var sfxOn = localStorage.getItem('mb_sfx') !== '0';
    var bgmOn = localStorage.getItem('mb_bgm') === '1';
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];

    function init() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }

    function tone(freq, t0, dur, type, vol, slideTo) {
      if (!init()) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }

    function noise(dur, vol, f0, f1) {
      if (!init()) return;
      var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = ctx.createBufferSource();
      s.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.9;
      var t = ctx.currentTime;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var g = ctx.createGain();
      g.gain.value = vol;
      s.connect(f);
      f.connect(g);
      g.connect(master);
      s.start(t);
    }

    var bgmAudio = null;
    function getBgmAudio() {
      if (!bgmAudio) {
        bgmAudio = new Audio(AUDIO + 'lobby_bgm.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.14;
        bgmAudio.preload = 'auto';
      }
      return bgmAudio;
    }

    var clickAudioPool = [];
    var poolIndex = 0;
    function getClickAudio() {
      if (clickAudioPool.length === 0) {
        for (var i = 0; i < 5; i++) {
          var a = new Audio(AUDIO + 'click.wav');
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
      get sfxOn() { return sfxOn; },
      get bgmOn() { return bgmOn; },
      unlock: function () {
        if (sfxOn) init();
        if (bgmOn) api.startBgm();
      },
      pop: function () {
        if (!sfxOn) return;
        try { var a = getClickAudio(); a.play().catch(function () {}); } catch (e) {}
        if (init()) {
          var t = ctx.currentTime;
          noise(0.12, 0.45, 2600, 360);
          tone(rand(520, 680), t, 0.12, 'sine', 0.35, 180);
        }
      },
      click: function () {
        if (!sfxOn) return;
        try { var a = getClickAudio(); a.play().catch(function () {}); } catch (e) {}
      },
      tick: function () {
        if (!sfxOn || !init()) return;
        tone(pick(PENTA) * 1.5, ctx.currentTime, 0.07, 'sine', 0.07);
      },
      whoosh: function () {
        if (!sfxOn || !init()) return;
        noise(0.35, 0.3, 300, 2400);
      },
      chime: function () {
        if (!sfxOn || !init()) return;
        var t = ctx.currentTime;
        [0, 2, 4, 6].forEach(function (n, i) { tone(PENTA[n], t + i * 0.07, 0.35, 'triangle', 0.16); });
      },
      boing: function () {
        if (!sfxOn || !init()) return;
        var t = ctx.currentTime;
        tone(200, t, 0.35, 'sine', 0.4, 520);
        tone(520, t + 0.1, 0.25, 'sine', 0.2, 260);
      },
      toggleSfx: function () {
        sfxOn = !sfxOn;
        localStorage.setItem('mb_sfx', sfxOn ? '1' : '0');
        if (sfxOn) { init(); api.chime(); }
        return sfxOn;
      },
      toggleBgm: function () {
        bgmOn = !bgmOn;
        localStorage.setItem('mb_bgm', bgmOn ? '1' : '0');
        if (bgmOn) { api.startBgm(); } else { api.stopBgm(); }
        return bgmOn;
      },
      startBgm: function () {
        var a = getBgmAudio();
        if (a.paused) {
          a.play().catch(function () {});
        }
      },
      stopBgm: function () {
        if (bgmAudio) bgmAudio.pause();
      }
    };
    return api;
  })();
  window.MB = { sfx: sfx };

  /* ---------------- PARTICLES ---------------- */
  function burst(x, y, color, n, spread) {
    if (reduced) return;
    var base = COLORS[color] || color || '#ff6fa8';
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      el.className = 'pop-fx';
      var size = rand(8, 22), star = Math.random() < 0.4;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      if (star) {
        el.style.background = 'url(' + IMG + 'sparkle.png) center/contain no-repeat';
        el.style.width = el.style.height = (size * 1.6) + 'px';
      } else {
        el.style.background = Math.random() < 0.6 ? base : pick(PALETTE);
      }
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
    var t = document.createElement('div');
    t.className = 'pop-text';
    t.textContent = txt || pick(['펑!', '뿅!', '팡!', '짠!', '말랑~']);
    t.style.left = x + 'px';
    t.style.top = y + 'px';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 850);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 600);
    }, 2400);
  }
  window.MB.burst = burst;
  window.MB.popText = popText;
  window.MB.toast = toast;
  window.MB.MASCOTS = function () { return MASCOTS; };

  /* ---------------- CURSOR ---------------- */
  var cursorUrls = null, cursorLaughTimer = null;
  function setCursor(kind) {
    if (!cursorUrls) return;
    document.body.style.setProperty('--cur', kind === 'laugh' ? cursorUrls.laugh : cursorUrls.normal);
    document.body.style.setProperty('--cur-hover', cursorUrls.laugh);
  }
  function cursorLaugh() {
    if (!cursorUrls) return;
    setCursor('laugh');
    clearTimeout(cursorLaughTimer);
    cursorLaughTimer = setTimeout(function () { setCursor('normal'); }, 650);
  }
  function initCursor() {
    var SIZE = 52;
    function makeCursor(src, cb) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas');
        c.width = c.height = SIZE;
        var g = c.getContext('2d'), r = Math.min(SIZE / im.width, SIZE / im.height);
        var w = im.width * r, h = im.height * r;
        g.drawImage(im, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        cb('url("' + c.toDataURL('image/png') + '") ' + SIZE / 2 + ' ' + SIZE / 2 + ', auto');
      };
      im.src = src;
    }
    var tmp = {};
    function ready() { cursorUrls = tmp; setCursor('normal'); }
    makeCursor(IMG + 'mascot_0.png', function (u) { tmp.normal = u; if (tmp.laugh) ready(); });
    makeCursor(IMG + 'mascot_0_laugh.png', function (u) { tmp.laugh = u; if (tmp.normal) ready(); });

    if (!finePointer) return;
    var ring = document.createElement('div');
    ring.id = 'cursor-follow';
    document.body.appendChild(ring);
    var tx = 0, ty = 0, x = 0, y = 0, lastTrail = 0;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      ring.classList.add('show');
      ring.classList.toggle('hot', !!e.target.closest('a,button,.seal,.mascot-card,.rain-block,.gacha-ball,[role="button"],.deck-btn,.nav-arrow-btn,.deck-dot'));
      var now = performance.now();
      if (!reduced && now - lastTrail > 45) {
        lastTrail = now;
        var s = document.createElement('i');
        s.className = 'trail';
        s.style.left = (tx - 7) + 'px';
        s.style.top = (ty - 7) + 'px';
        s.style.setProperty('--tx', rand(-26, 26) + 'px');
        s.style.setProperty('--ty', rand(10, 38) + 'px');
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 800);
      }
    }, { passive: true });
    (function loop() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      ring.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- SEAL BLOCK POP REVEAL ---------------- */
  function popSeal(el, auto) {
    if (!el.classList.contains('sealed')) return;
    clearTimeout(el._t);
    var cover = el.querySelector(':scope > .seal-cover');
    if (!cover) return;
    el.classList.remove('sealed');
    cover.classList.add('boom');
    var r = cover.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    sfx.pop();
    cursorLaugh();
    burst(cx, cy, el.dataset.color || 'pink', Math.min(34, 14 + Math.floor(r.width / 22)), Math.max(110, Math.min(r.width, 320) * 0.6));
    if (!auto) popText(cx, cy);
    setTimeout(function () {
      cover.remove();
      el.classList.add('revealed');
      el.dispatchEvent(new CustomEvent('revealed'));
    }, 320);
  }

  function initSeals(root) {
    (root || document).querySelectorAll('.seal:not([data-ready])').forEach(function (el) {
      el.dataset.ready = '1';
      var color = el.dataset.color || 'pink';
      el.classList.add('sealed');
      var cover = document.createElement('div');
      cover.className = 'seal-cover';
      cover.setAttribute('role', 'button');
      cover.setAttribute('tabindex', '0');
      cover.setAttribute('aria-label', '블록을 터뜨려 내용 보기');
      cover.innerHTML = '<img src="' + mascotFor(color) + '" alt=""><b>' + (el.dataset.hint || '블록을 터뜨려 보세요!') + '</b>';
      el.appendChild(cover);
      cover.addEventListener('click', function (e) {
        e.stopPropagation();
        popSeal(el);
      });
      cover.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); popSeal(el); }
      });
      if (finePointer) {
        el.addEventListener('pointerenter', function () {
          if (el.classList.contains('sealed')) el._t = setTimeout(function () { popSeal(el); }, 200);
        });
        el.addEventListener('pointerleave', function () { clearTimeout(el._t); });
      }
    });
  }

  function openAllSeals(scope) {
    var target = scope || document;
    var list = Array.prototype.slice.call(target.querySelectorAll('.seal.sealed'));
    list.forEach(function (el, i) {
      setTimeout(function () { popSeal(el, true); }, i * 90);
    });
    if (!list.length) toast('모든 블록이 이미 열려 있어요 ✨');
    else toast(list.length + '개의 블록을 팡! 터뜨렸어요 🎉');
  }

  /* ---------------- BACKGROUND FLOATING DECOR ---------------- */
  function initDecor() {
    var dec = document.createElement('div');
    dec.className = 'bg-decor';
    for (var i = 0; i < 22; i++) {
      var d = document.createElement('i');
      d.style.left = rand(0, 100) + '%';
      d.style.top = rand(0, 100) + '%';
      d.style.background = pick(PALETTE);
      d.style.animationDelay = rand(0, 8) + 's';
      d.style.animationDuration = rand(9, 16) + 's';
      dec.appendChild(d);
    }
    document.body.prepend(dec);
  }

  /* ---------------- 3D TILT ---------------- */
  function initTilt() {
    if (!finePointer) return;
    document.querySelectorAll('.tilt').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(700px) rotateY(' + px * 14 + 'deg) rotateX(' + -py * 14 + 'deg) translateY(-4px)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------------- MASCOTS DATA & INIT ---------------- */
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
    var grid = document.getElementById('mascot-grid');
    if (!grid) return;
    grid.innerHTML = '';
    MASCOTS.forEach(function (m, i) {
      var wrap = document.createElement('div');
      wrap.className = 'seal';
      wrap.dataset.color = m.c;
      wrap.dataset.anim = 'zoom';
      wrap.dataset.delay = (i % 3) * 100;
      wrap.innerHTML = '<div class="seal-content"><div class="mascot-card tilt" role="button" tabindex="0" aria-label="' + m.n + '"><div class="bubble"></div><img src="' + IMG + 'mascot_' + i + '.png" alt="' + m.n + '" loading="lazy">' +
        '<h3>' + m.n + '</h3><span class="tag ' + m.t + '">' + TAGS[m.t] + '</span><p>' + m.d + '</p></div></div>';
      grid.appendChild(wrap);

      var card = wrap.querySelector('.mascot-card'), bub = wrap.querySelector('.bubble'), bt;
      function talk(e) {
        if (e) e.stopPropagation();
        card.classList.remove('squish');
        void card.offsetWidth;
        card.classList.add('squish');
        sfx.boing();
        bub.textContent = pick(m.say);
        bub.classList.add('show');
        clearTimeout(bt);
        bt = setTimeout(function () { bub.classList.remove('show'); }, 2200);
        var r = card.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + 80, m.c, 10, 90);
      }
      card.addEventListener('click', talk);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') talk(e); });
    });
  }

  /* ---------------- FALLING RAIN BLOCKS (HERO SLIDE) ---------------- */
  var rainTimer = null;
  var rainScore = 0;
  function startRain() {
    var hero = document.getElementById('slide-hero');
    if (!hero || reduced || rainTimer) return;
    var badge = document.getElementById('pop-score');
    var live = 0;

    function spawn() {
      if (document.hidden || live > 10) return;
      var color = pick(BLOCK_NAMES), b = document.createElement('img');
      b.className = 'rain-block';
      b.src = mascotFor(color);
      b.alt = '';
      b.draggable = false;
      b.style.left = rand(4, 92) + '%';
      b.style.width = rand(42, 72) + 'px';
      b.style.animationDuration = rand(6, 10) + 's';
      hero.appendChild(b);
      live++;

      var done = function () { if (b.parentNode) { b.remove(); live--; } };
      b.addEventListener('animationend', done);
      b.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        sfx.unlock();
        sfx.pop();
        cursorLaugh();
        burst(e.clientX, e.clientY, color, 16, 110);
        popText(e.clientX, e.clientY);
        done();
        rainScore++;
        if (badge) badge.textContent = '🎯 터뜨린 블록 ' + rainScore;
        if (rainScore === 10) toast('10개 돌파! 손맛 좋은데요? 🎉');
        if (rainScore === 30) {
          toast('블록 마스터! 30개 클리어 ✨');
          sfx.chime();
          for (var i = 0; i < 5; i++) {
            setTimeout(function () { burst(rand(100, innerWidth - 100), rand(120, 400), pick(BLOCK_NAMES), 22, 200); }, i * 160);
          }
        }
      });
    }
    rainTimer = setInterval(spawn, 900);
  }

  function stopRain() {
    if (rainTimer) {
      clearInterval(rainTimer);
      rainTimer = null;
    }
    var hero = document.getElementById('slide-hero');
    if (hero) {
      hero.querySelectorAll('.rain-block').forEach(function (el) { el.remove(); });
    }
  }

  /* ---------------- PHONE DOCK ANIMATION ---------------- */
  function initPhoneDock() {
    var spans = document.querySelectorAll('.phone .dock span');
    if (!spans.length) return;
    var k = 2;
    setInterval(function () {
      spans.forEach(function (s, i) { s.classList.toggle('on', i === k); });
      k = (k + 1) % spans.length;
    }, 1800);
  }

  /* ---------------- LOBBY MASCOT DRAG & TAP ---------------- */
  function initLobbyMascot() {
    var mascot = document.getElementById('lobby-hero-mascot');
    var stage = document.getElementById('lobby-mascot-stage');
    var bubble = document.getElementById('lobby-bubble');
    var screen = document.querySelector('.phone .screen');
    if (!mascot || !stage || !screen) return;

    var normalSrc = IMG + 'mascot_0.png';
    var laughSrc = IMG + 'mascot_0_laugh.png';
    var panicSrc = IMG + 'mascot_0_panic.png';

    var laughQuotes = ['안녕~?', '하핫, 간지러워~♥', '오늘도 말랑말랑한 하루 보내!', '에헤헤~ 기분 좋아!', '톡톡 건드려줘서 고마워~!'];
    var panicQuotes = ['으아아아~!', '하지마~! 딸기 시럽 쏟아져!', '늘어나버렷...!', '살려줘어~!', '아야야, 당기지 마~!'];

    var bubbleTimer = null;
    function showBubble(text) {
      if (!bubble) return;
      clearTimeout(bubbleTimer);
      bubble.textContent = text;
      bubble.classList.add('show');
      bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 2200);
    }

    var isPressed = false, isDragging = false, startPointerX = 0, startPointerY = 0, pressTime = 0, curDx = 0, curDy = 0, snapTimer = null;
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
      curDx = 0; curDy = 0;
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
      var rawDx = e.clientX - startPointerX, rawDy = e.clientY - startPointerY;
      var totalDist = Math.hypot(rawDx, rawDy);
      var clampX = 52, clampYUp = -95, clampYDown = 60;
      curDx = Math.max(-clampX, Math.min(clampX, rawDx));
      curDy = Math.max(clampYUp, Math.min(clampYDown, rawDy));

      if (totalDist > 14) {
        if (!isDragging) {
          isDragging = true;
          mascot.src = panicSrc;
          showBubble(pick(panicQuotes));
          sfx.whoosh();
        }
        var distX = Math.abs(curDx), distY = Math.abs(curDy);
        var dist = distX + distY;
        var intensity = Math.min(1, dist / 90);
        var ratioX = dist > 0.001 ? (distX / dist) : 0.5;
        var ratioY = 1 - ratioX;
        var axisDelta = (ratioX - ratioY) * intensity * 0.32;
        var scaleX = 1 - axisDelta, scaleY = 1 + axisDelta;
        var wobble = Math.sin(performance.now() * 0.03) * 6;
        mascot.style.transform = 'translate(' + curDx + 'px, ' + curDy + 'px) scale(' + scaleX.toFixed(3) + ', ' + scaleY.toFixed(3) + ') rotate(' + wobble.toFixed(1) + 'deg)';
      } else {
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

      var duration = performance.now() - pressTime, moved = Math.hypot(curDx, curDy);
      if (duration < 300 && moved < 15 && !isDragging) {
        mascot.src = laughSrc;
        showBubble(pick(laughQuotes));
        sfx.pop();
        var t0 = performance.now();
        var rippleAnim = function (now) {
          var t = (now - t0) / 520;
          if (t >= 1) {
            mascot.style.transform = '';
            mascot.src = normalSrc;
            mascot.classList.add('idle-float');
            return;
          }
          var decay = Math.exp(-t * 6), wave = Math.sin(t * 24) * decay;
          var sx = 1 + wave * 0.28, sy = 1 - wave * 0.28;
          mascot.style.transform = 'scale(' + sx.toFixed(3) + ', ' + sy.toFixed(3) + ')';
          requestAnimationFrame(rippleAnim);
        };
        requestAnimationFrame(rippleAnim);
      } else {
        var fromX = curDx, fromY = curDy, snapT0 = performance.now();
        var snapRoutine = function (now) {
          var t = (now - snapT0) / 450;
          if (t >= 1) {
            mascot.style.transform = '';
            mascot.src = normalSrc;
            mascot.classList.add('idle-float');
            isDragging = false;
            return;
          }
          var decay = Math.exp(-t * 5.5), posOsc = Math.cos(t * 18) * decay;
          var curX = fromX * posOsc, curY = fromY * posOsc;
          var wave = Math.sin(t * 20) * decay;
          var sx = 1 + wave * 0.22, sy = 1 - wave * 0.22;
          mascot.style.transform = 'translate(' + curX.toFixed(2) + 'px, ' + curY.toFixed(2) + 'px) scale(' + sx.toFixed(3) + ', ' + sy.toFixed(3) + ')';
          snapTimer = requestAnimationFrame(snapRoutine);
        };
        snapTimer = requestAnimationFrame(snapRoutine);
      }
    }
    mascot.addEventListener('pointerdown', onPointerDown);
  }

  /* ---------------- PRESENTATION SLIDE ENGINE ---------------- */
  var slides = [];
  var currentSlide = 0;
  var isTransitioning = false;

  function initPresentationEngine() {
    slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if (!slides.length) return;

    var numEl = document.getElementById('slide-num');
    var titleEl = document.getElementById('slide-title-label');
    var prevBtn = document.getElementById('btn-prev-slide');
    var nextBtn = document.getElementById('btn-next-slide');
    var progressBar = document.getElementById('deck-progress');
    var pagination = document.getElementById('deck-pagination');

    // Create pagination dots
    if (pagination) {
      pagination.innerHTML = '';
      slides.forEach(function (slide, idx) {
        var dot = document.createElement('button');
        dot.className = 'deck-dot' + (idx === 0 ? ' active' : '');
        dot.title = (idx + 1) + '. ' + (slide.dataset.title || '슬라이드 ' + (idx + 1));
        dot.setAttribute('aria-label', dot.title);
        dot.addEventListener('click', function () { goToSlide(idx); });
        pagination.appendChild(dot);
      });
    }

    function animateSlideIn(slide) {
      // Trigger animations inside the active slide
      var animElements = slide.querySelectorAll('[data-anim]');
      animElements.forEach(function (el, i) {
        el.classList.remove('in');
        var delay = el.dataset.delay ? parseInt(el.dataset.delay, 10) : (i * 90);
        setTimeout(function () {
          el.classList.add('in');
        }, delay + 60);
      });
    }

    function goToSlide(targetIdx, playSound) {
      if (targetIdx < 0 || targetIdx >= slides.length) return;
      if (targetIdx === currentSlide && slides[currentSlide].classList.contains('active')) return;

      var prevIdx = currentSlide;
      currentSlide = targetIdx;

      if (playSound !== false) {
        sfx.whoosh();
      }

      // Update slide active classes
      slides.forEach(function (s, i) {
        if (i === currentSlide) {
          s.classList.add('active');
          s.scrollTop = 0;
          animateSlideIn(s);
        } else {
          s.classList.remove('active');
        }
      });

      // Special handling for Hero falling blocks
      if (slides[currentSlide].id === 'slide-hero') {
        startRain();
      } else {
        stopRain();
      }

      // Handle Video autoplay/pause on slide transition
      var vid = document.getElementById('main-gameplay-video');
      if (vid) {
        if (slides[currentSlide].id === 'slide-video') {
          // Do not autoplay immediately - keep paused and set comfortable volume (50%)
          vid.pause();
          var savedVol = parseFloat(localStorage.getItem('mb_video_vol') || '0.5');
          vid.volume = isNaN(savedVol) ? 0.5 : savedVol;
        } else {
          // Pause video when leaving video slide
          vid.pause();
        }
      }

      // Handle Ad Shorts Video autoplay/pause on slide transition
      var adVid = document.getElementById('ad-shorts-video');
      if (adVid) {
        if (slides[currentSlide].id === 'slide-ad') {
          adVid.muted = true;
          adVid.currentTime = 0;
          adVid.play().catch(function () {});
        } else {
          adVid.pause();
        }
      }

      // Update Indicators
      var curNumStr = (currentSlide + 1 < 10 ? '0' : '') + (currentSlide + 1);
      var totalNumStr = (slides.length < 10 ? '0' : '') + slides.length;
      if (numEl) numEl.textContent = curNumStr + ' / ' + totalNumStr;

      var currentTitle = slides[currentSlide].dataset.title || '파트 ' + (currentSlide + 1);
      if (titleEl) titleEl.textContent = currentTitle;

      if (prevBtn) prevBtn.disabled = (currentSlide === 0);
      if (nextBtn) {
        nextBtn.disabled = (currentSlide === slides.length - 1);
        nextBtn.innerHTML = (currentSlide === slides.length - 1) ? '완료 ✨' : '다음 [→] ▶';
      }

      // Progress bar
      if (progressBar) {
        var pct = ((currentSlide + 1) / slides.length) * 100;
        progressBar.style.width = pct + '%';
      }

      // Pagination dots
      if (pagination) {
        var dots = pagination.querySelectorAll('.deck-dot');
        dots.forEach(function (d, i) {
          d.classList.toggle('active', i === currentSlide);
        });
      }
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        goToSlide(currentSlide + 1);
      } else {
        toast('마지막 슬라이드입니다 ✨');
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
      }
    }

    // Bind controls
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Keyboard Shortcuts
    window.addEventListener('keydown', function (e) {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(e.target.tagName) >= 0) return;
      // 뽑기 연출(전체화면) 진행 중에는 슬라이드 이동 단축키를 막고 gacha.js 가 키 입력을 처리한다
      if (document.body.classList.contains('gacha-open')) return;

      switch (e.key) {
        case ' ':
        case 'ArrowRight':
        case 'PageDown':
        case 'KeyL':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
        case 'KeyH':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(slides.length - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          openAllSeals(slides[currentSlide]);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          var btnBgm = document.getElementById('btn-bgm');
          var bgmState = sfx.toggleBgm();
          if (btnBgm) btnBgm.classList.toggle('off', !bgmState);
          toast(bgmState ? '배경음악 ON 🎵' : '배경음악 OFF 🔇');
          break;
      }
    });

    // Touch Swipe support
    var touchStartX = 0, touchStartY = 0;
    window.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      var touchEndX = e.changedTouches[0].screenX;
      var touchEndY = e.changedTouches[0].screenY;
      var dx = touchEndX - touchStartX;
      var dy = touchEndY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
        if (dx < 0) nextSlide();
        else prevSlide();
      }
    }, { passive: true });

    // Initialize first slide
    window.Deck = { goTo: goToSlide, next: nextSlide, prev: prevSlide };
    goToSlide(0, false);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
      var fsBtn = document.getElementById('btn-fullscreen');
      if (fsBtn) fsBtn.textContent = '축소 🗗';
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      var fsBtn = document.getElementById('btn-fullscreen');
      if (fsBtn) fsBtn.textContent = '전체화면 ⛶';
    }
  }

  /* ---------------- GLOBAL POINTER CLICKS ---------------- */
  function initGlobalFx() {
    document.addEventListener('pointerdown', function (e) {
      sfx.unlock();
      if (e.target.closest('.seal-cover,.rain-block,.gacha-ball,.deck-btn,.nav-arrow-btn,.deck-dot,#gacha-stage')) return;
      burst(e.clientX, e.clientY, pick(BLOCK_NAMES), 9, 70);
      sfx.click();
      cursorLaugh();
    });
  }

  /* ---------------- BOOTSTRAP ---------------- */
  function boot() {
    initCursor();
    initDecor();
    initSeals();
    initMascots();
    initSeals(); // seal the newly added mascot cards
    initTilt();
    initPhoneDock();
    initLobbyMascot();
    initGlobalFx();
    initPresentationEngine();

    // Topbar Tools binding
    var sb = document.getElementById('btn-sfx');
    var bb = document.getElementById('btn-bgm');
    var fs = document.getElementById('btn-fullscreen');
    var ob = document.getElementById('btn-open-seals');

    if (sb) {
      if (!sfx.sfxOn) sb.classList.add('off');
      sb.onclick = function (e) {
        e.stopPropagation();
        var on = sfx.toggleSfx();
        sb.classList.toggle('off', !on);
        toast(on ? '효과음 ON 🔊' : '효과음 OFF 🔇');
      };
    }
    if (bb) {
      if (!sfx.bgmOn) bb.classList.add('off');
      bb.onclick = function (e) {
        e.stopPropagation();
        var on = sfx.toggleBgm();
        bb.classList.toggle('off', !on);
        toast(on ? '배경음악 ON 🎵' : '배경음악 OFF 🔇');
      };
    }
    if (fs) {
      fs.onclick = function (e) {
        e.stopPropagation();
        toggleFullscreen();
      };
    }
    if (ob) {
      ob.onclick = function (e) {
        e.stopPropagation();
        var activeSlide = slides[currentSlide] || document;
        openAllSeals(activeSlide);
      };
    }

    // Open-all buttons inside slide
    document.querySelectorAll('[data-open-all]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openAllSeals(btn.closest('.slide'));
      });
    });

    
    // Video volume & playback controls setup
    var mainVid = document.getElementById('main-gameplay-video');
    var volSlider = document.getElementById('video-volume-slider');
    var volText = document.getElementById('video-volume-pct');
    var volIcon = document.getElementById('vol-icon-btn');
    var playTriggerBtn = document.getElementById('video-manual-play-btn');
    var quickVolBtns = document.querySelectorAll('.video-quick-vol-btn');

    if (mainVid) {
      // Default volume: 50%
      var initVol = parseFloat(localStorage.getItem('mb_video_vol') || '0.5');
      if (isNaN(initVol)) initVol = 0.5;
      mainVid.volume = initVol;
      if (volSlider) volSlider.value = initVol;
      if (volText) volText.textContent = Math.round(initVol * 100) + '%';

      function updateVolDisplay(v) {
        if (volText) volText.textContent = Math.round(v * 100) + '%';
        if (volSlider) volSlider.value = v;
        if (volIcon) {
          volIcon.textContent = v === 0 ? '🔇' : (v < 0.4 ? '🔉' : '🔊');
        }
        quickVolBtns.forEach(function (btn) {
          var bVal = parseFloat(btn.dataset.vol);
          if (Math.abs(bVal - v) < 0.05) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
      updateVolDisplay(initVol);

      if (volSlider) {
        volSlider.addEventListener('input', function () {
          var v = parseFloat(volSlider.value);
          mainVid.volume = v;
          mainVid.muted = (v === 0);
          localStorage.setItem('mb_video_vol', v);
          updateVolDisplay(v);
        });
      }

      quickVolBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var v = parseFloat(btn.dataset.vol);
          mainVid.volume = v;
          mainVid.muted = (v === 0);
          localStorage.setItem('mb_video_vol', v);
          updateVolDisplay(v);
        });
      });

      if (volIcon) {
        volIcon.addEventListener('click', function (e) {
          e.stopPropagation();
          if (mainVid.muted || mainVid.volume === 0) {
            mainVid.muted = false;
            var v = parseFloat(localStorage.getItem('mb_video_vol') || '0.5');
            if (v === 0) v = 0.5;
            mainVid.volume = v;
            updateVolDisplay(v);
          } else {
            mainVid.muted = true;
            updateVolDisplay(0);
          }
        });
      }

      if (playTriggerBtn) {
        playTriggerBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (mainVid.paused) {
            mainVid.play();
            playTriggerBtn.textContent = '⏸ 일시정지';
          } else {
            mainVid.pause();
            playTriggerBtn.textContent = '▶ 영상 재생';
          }
        });

        mainVid.addEventListener('play', function () {
          playTriggerBtn.textContent = '⏸ 일시정지';
        });
        mainVid.addEventListener('pause', function () {
          playTriggerBtn.textContent = '▶ 영상 재생';
        });
      }
    }

    if (sfx.bgmOn) {
      document.addEventListener('pointerdown', function once() {
        sfx.startBgm();
        document.removeEventListener('pointerdown', once);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
