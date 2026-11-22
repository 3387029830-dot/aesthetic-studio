/* 《二环夜驰》 — 每一帧只由时间 t 决定（HyperFrames 逐帧 seek 渲染）
   两辆原创跑车：银（SILVER）与黑（BLACK），无品牌标识。 */
(() => {
  const W = 1920, H = 1080;
  const cv = document.getElementById("film");
  const ctx = cv.getContext("2d");
  const BEATS = window.BEATS || [];
  const END = 108.5;
  const BAR0 = 0.205, BAR = 2.4;
  const bar = (n) => BAR0 + n * BAR;

  /* ── 工具 ── */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const mod = (a, n) => ((a % n) + n) % n;

  function beatAt(t) {
    let lo = 0, hi = BEATS.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (BEATS[m] <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
    const since = idx >= 0 ? t - BEATS[idx] : 99;
    return { idx, since, pulse: Math.exp(-since * 7) };
  }

  function glow(x, y, r, color, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  /* ── 预生成素材 ── */
  function makeSkyline(seed, w, h, minH, maxH, lit, shade) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); const r = rng(seed);
    let x = 0;
    while (x < w) {
      const bw = 40 + r() * 140, bh = minH + Math.pow(r(), 1.6) * (maxH - minH);
      g.fillStyle = shade; g.fillRect(x, h - bh, bw, bh);
      if (r() < 0.25) g.fillRect(x + bw * 0.4, h - bh - 30 - r() * 40, 3, 70);
      for (let wy = h - bh + 10; wy < h - 6; wy += 9) {
        for (let wx = x + 5; wx < x + bw - 5; wx += 8) {
          if (r() < lit) {
            const k = r();
            g.fillStyle = k < 0.7 ? `rgba(255,196,120,${0.35 + r() * 0.5})` : `rgba(170,205,255,${0.3 + r() * 0.5})`;
            g.fillRect(wx, wy, 3, 4);
          }
        }
      }
      x += bw + r() * 6;
    }
    return c;
  }
  const skyFar = makeSkyline(11, 3840, 380, 60, 300, 0.07, "#0c0f18");
  const skyMid = makeSkyline(29, 3840, 520, 120, 480, 0.12, "#07080d");

  const city = (() => { // 俯视城市
    const c = document.createElement("canvas"); c.width = 1300; c.height = 1300;
    const g = c.getContext("2d"); const r = rng(7);
    g.fillStyle = "#040507"; g.fillRect(0, 0, 1300, 1300);
    for (let by = 0; by < 1300; by += 130) for (let bx = 0; bx < 1300; bx += 130) {
      g.fillStyle = `rgb(${10 + r() * 8},${11 + r() * 8},${16 + r() * 10})`;
      g.fillRect(bx + 14, by + 14, 102, 102);
      for (let i = 0; i < 26; i++) if (r() < 0.5) {
        g.fillStyle = r() < 0.75 ? `rgba(255,190,110,${0.3 + r() * 0.6})` : `rgba(160,200,255,${0.3 + r() * 0.5})`;
        g.fillRect(bx + 18 + r() * 92, by + 18 + r() * 92, 2, 2);
      }
    }
    g.strokeStyle = "rgba(255,170,80,0.10)"; g.lineWidth = 6;
    for (let i = 0; i <= 1300; i += 130) { g.beginPath(); g.moveTo(i + 7, 0); g.lineTo(i + 7, 1300); g.moveTo(0, i + 7); g.lineTo(1300, i + 7); g.stroke(); }
    return c;
  })();

  const grain = (() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 512;
    const g = c.getContext("2d"); const img = g.createImageData(512, 512); const r = rng(3);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  })();

  /* ── 车 ── */
  const PAINT = {
    silver: { body: "#7b848e", hi: "#e3e9ef", lo: "#1a1e23", glass: "#0b0e13" },
    black:  { body: "#111216", hi: "#6f7f96", lo: "#020203", glass: "#050608" },
  };

  // 背面：x,y 为车底中心，w 为车宽
  function carRear(x, y, w, kind, lights = 1, brake = 0) {
    const p = PAINT[kind], h = w * 0.34;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    // 轮胎
    ctx.fillStyle = "#040404";
    ctx.beginPath(); ctx.roundRect(-w * 0.49, -h * 0.3, w * 0.15, h * 0.3, w * 0.012); ctx.fill();
    ctx.beginPath(); ctx.roundRect(w * 0.34, -h * 0.3, w * 0.15, h * 0.3, w * 0.012); ctx.fill();
    // 车身：宽后轮拱 + 收窄的座舱
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, p.hi); g.addColorStop(0.42, p.body); g.addColorStop(0.75, p.lo); g.addColorStop(1, "#050506");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, -h * 0.14);
    ctx.bezierCurveTo(-w * 0.52, -h * 0.3, -w * 0.53, -h * 0.5, -w * 0.47, -h * 0.58);
    ctx.bezierCurveTo(-w * 0.43, -h * 0.66, -w * 0.36, -h * 0.66, -w * 0.3, -h * 0.66);
    ctx.lineTo(-w * 0.2, -h * 1.02);
    ctx.quadraticCurveTo(-w * 0.18, -h * 1.07, -w * 0.14, -h * 1.07);
    ctx.lineTo(w * 0.14, -h * 1.07);
    ctx.quadraticCurveTo(w * 0.18, -h * 1.07, w * 0.2, -h * 1.02);
    ctx.lineTo(w * 0.3, -h * 0.66);
    ctx.bezierCurveTo(w * 0.36, -h * 0.66, w * 0.43, -h * 0.66, w * 0.47, -h * 0.58);
    ctx.bezierCurveTo(w * 0.53, -h * 0.5, w * 0.52, -h * 0.3, w * 0.46, -h * 0.14);
    ctx.closePath(); ctx.fill();
    // 后窗
    ctx.fillStyle = p.glass;
    ctx.beginPath();
    ctx.moveTo(-w * 0.24, -h * 0.7); ctx.lineTo(-w * 0.165, -h * 0.99); ctx.lineTo(w * 0.165, -h * 0.99); ctx.lineTo(w * 0.24, -h * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.06)"; // 后窗反光
    ctx.beginPath(); ctx.moveTo(-w * 0.2, -h * 0.72); ctx.lineTo(-w * 0.12, -h * 0.97); ctx.lineTo(-w * 0.06, -h * 0.97); ctx.lineTo(-w * 0.13, -h * 0.72); ctx.fill();
    // 鸭尾 + 肩线高光
    ctx.strokeStyle = kind === "silver" ? "rgba(240,245,250,0.7)" : "rgba(130,150,185,0.45)";
    ctx.lineWidth = Math.max(1, w * 0.004);
    for (const sd of [-1, 1]) { // 左右后轮拱高光
      ctx.beginPath(); ctx.moveTo(sd * w * 0.5, -h * 0.42); ctx.quadraticCurveTo(sd * w * 0.49, -h * 0.6, sd * w * 0.36, -h * 0.65); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.63); ctx.lineTo(w * 0.28, -h * 0.63); ctx.stroke();
    // 扩散器 + 排气
    ctx.fillStyle = "#060607";
    ctx.beginPath(); ctx.moveTo(-w * 0.36, -h * 0.22); ctx.lineTo(w * 0.36, -h * 0.22); ctx.lineTo(w * 0.32, -h * 0.06); ctx.lineTo(-w * 0.32, -h * 0.06); ctx.fill();
    ctx.strokeStyle = "#16171b"; ctx.lineWidth = Math.max(1, w * 0.004);
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.07, -h * 0.21); ctx.lineTo(i * w * 0.065, -h * 0.07); ctx.stroke(); }
    ctx.fillStyle = "#1d1e22";
    for (const ex of [-0.27, -0.21, 0.21, 0.27]) { ctx.beginPath(); ctx.ellipse(ex * w, -h * 0.12, w * 0.022, h * 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#0a0a0c"; ctx.fillRect(-w * 0.09, -h * 0.38, w * 0.18, h * 0.09);
    // 贯穿尾灯（两端 L 形）
    if (lights > 0) {
      const lw = w * 0.88 * lights, ly = -h * 0.5, th = Math.max(2, h * 0.035);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,${28 + brake * 50},${38 + brake * 20},1)`;
      ctx.fillRect(-lw / 2, ly, lw, th);
      if (lights > 0.95) {
        ctx.fillRect(-w * 0.44, ly, th * 1.4, h * 0.1);
        ctx.fillRect(w * 0.44 - th * 1.4, ly, th * 1.4, h * 0.1);
      }
      glow(-w * 0.4 * lights, ly, w * (0.16 + brake * 0.18), "rgba(255,20,40,0.6)");
      glow(w * 0.4 * lights, ly, w * (0.16 + brake * 0.18), "rgba(255,20,40,0.6)");
      glow(0, ly, w * 0.42, `rgba(255,0,30,${0.16 + brake * 0.15})`);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  // 正面：大灯分段点亮 progress 0..1
  function carFront(x, y, w, kind, progress) {
    const p = PAINT[kind], h = w * 0.34;
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, "#1a1d24"); g.addColorStop(1, "#030304");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0); ctx.lineTo(-w * 0.52, -h * 0.42);
    ctx.quadraticCurveTo(-w * 0.3, -h * 0.62, -w * 0.24, -h * 0.66);
    ctx.quadraticCurveTo(0, -h * 1.0, w * 0.24, -h * 0.66);
    ctx.quadraticCurveTo(w * 0.3, -h * 0.62, w * 0.52, -h * 0.42);
    ctx.lineTo(w * 0.5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.hi; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w * 0.52, -h * 0.42); ctx.quadraticCurveTo(-w * 0.3, -h * 0.62, -w * 0.24, -h * 0.66);
    ctx.quadraticCurveTo(0, -h * 1.0, w * 0.24, -h * 0.66); ctx.quadraticCurveTo(w * 0.3, -h * 0.62, w * 0.52, -h * 0.42); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#020203"; ctx.fillRect(-w * 0.22, -h * 0.24, w * 0.44, h * 0.12);
    ctx.globalCompositeOperation = "lighter";
    const segs = 7;
    for (const s of [-1, 1]) {
      for (let i = 0; i < segs; i++) {
        const on = clamp(progress * segs - i, 0, 1);
        if (on <= 0) continue;
        const sx = s * (w * 0.47 - i * w * 0.028), sy = -h * 0.42 + i * h * 0.022;
        ctx.fillStyle = `rgba(225,240,255,${on})`;
        ctx.fillRect(sx - w * 0.012, sy, w * 0.024, h * 0.03);
      }
      if (progress > 0.15) glow(s * w * 0.4, -h * 0.4, w * 0.35 * progress, "rgba(190,220,255,0.6)", progress);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // 侧面：x 为车头位置，车身向右延伸 L
  function carSide(x, y, L, kind, wheelA, sweep, faceRight = false) {
    const p = PAINT[kind], s = L;
    ctx.save(); ctx.translate(x, y);
    if (faceRight) { ctx.scale(-1, 1); ctx.translate(-L, 0); }
    const P = [[0, 0.19], [0.1, 0.15], [0.36, 0.1], [0.5, 0.0], [0.66, 0.012], [0.86, 0.09], [0.99, 0.12], [1, 0.2], [0.97, 0.265], [0.03, 0.265]];
    const top = -0.265 * s;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath(); ctx.ellipse(s * 0.5, 2, s * 0.55, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(0, top, 0, 0);
    g.addColorStop(0, p.hi); g.addColorStop(0.35, p.body); g.addColorStop(1, p.lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    P.forEach(([px, py], i) => { const X = px * s, Y = top + py * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath(); ctx.fill();
    // 光带扫过车身
    ctx.save(); ctx.clip();
    const sx = lerp(-0.3, 1.3, sweep) * s;
    const sg = ctx.createLinearGradient(sx - s * 0.12, 0, sx + s * 0.12, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, kind === "silver" ? "rgba(255,255,255,0.75)" : "rgba(160,190,255,0.35)"); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(sx - s * 0.12, top, s * 0.24, s * 0.3);
    ctx.restore();
    // 车窗
    ctx.fillStyle = p.glass;
    ctx.beginPath();
    ctx.moveTo(0.38 * s, top + 0.1 * s); ctx.lineTo(0.5 * s, top + 0.02 * s); ctx.lineTo(0.65 * s, top + 0.03 * s); ctx.lineTo(0.8 * s, top + 0.1 * s);
    ctx.closePath(); ctx.fill();
    // 腰线
    ctx.strokeStyle = kind === "silver" ? "rgba(255,255,255,0.5)" : "rgba(120,150,200,0.4)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0.06 * s, top + 0.17 * s); ctx.lineTo(0.95 * s, top + 0.15 * s); ctx.stroke();
    // 轮子
    for (const wx of [0.19, 0.8]) {
      const cx = wx * s, cy = -0.05 * s, r = 0.072 * s;
      ctx.fillStyle = "#020202"; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#0a0a0b"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(200,205,215,0.55)"; ctx.lineWidth = r * 0.12;
      for (let k = 0; k < 5; k++) {
        const a = wheelA + (k * Math.PI * 2) / 5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); ctx.stroke();
      }
      ctx.fillStyle = "#c33"; ctx.fillRect(cx - r * 0.5, cy - r * 0.15, r * 0.2, r * 0.3);
    }
    // 灯
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(230,240,255,0.95)"; ctx.fillRect(0.005 * s, top + 0.16 * s, 0.07 * s, 0.012 * s);
    glow(0, top + 0.17 * s, s * 0.12, "rgba(200,225,255,0.5)");
    ctx.fillStyle = "rgba(255,30,40,0.95)"; ctx.fillRect(0.95 * s, top + 0.135 * s, 0.05 * s, 0.014 * s);
    glow(s, top + 0.14 * s, s * 0.1, "rgba(255,20,40,0.5)");
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  /* ── 天空 ── */
  function sky(horizon, dawn = 0) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, `rgb(${lerp(4, 40, dawn)},${lerp(6, 58, dawn)},${lerp(14, 96, dawn)})`);
    g.addColorStop(0.75, `rgb(${lerp(18, 170, dawn)},${lerp(16, 140, dawn)},${lerp(32, 150, dawn)})`);
    g.addColorStop(1, `rgb(${lerp(58, 245, dawn)},${lerp(34, 170, dawn)},${lerp(28, 120, dawn)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);
  }
  function skyline(img, y, offset, scale = 1, alpha = 1) {
    const w = img.width * scale, h = img.height * scale;
    const o = mod(offset, w);
    ctx.globalAlpha = alpha;
    for (let x = -o; x < W; x += w) ctx.drawImage(img, x, y - h, w, h);
    ctx.globalAlpha = 1;
  }

  /* ═════════ 镜头 ═════════ */

  // 1. 城市全景 + 高架光轨
  function shotSkyline(lt, d) {
    const z = 1 + 0.06 * (lt / d);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    sky(760);
    skyline(skyFar, 760, lt * 8, 1);
    skyline(skyMid, 820, lt * 18, 1);
    ctx.fillStyle = "#030305"; ctx.fillRect(0, 818, W, H);
    const deckY = (x) => 610 + 70 * Math.sin(x / 640 + 0.8);
    for (let x = -100; x < W + 200; x += 260) { // 桥墩
      ctx.fillStyle = "#050609"; ctx.fillRect(x - 14, deckY(x) + 20, 28, 900);
    }
    ctx.strokeStyle = "#08090d"; ctx.lineWidth = 34;
    ctx.beginPath(); for (let x = -50; x <= W + 50; x += 20) x === -50 ? ctx.moveTo(x, deckY(x) + 12) : ctx.lineTo(x, deckY(x) + 12); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    for (let x = -60; x < W + 60; x += 120) { // 钠灯
      const y = deckY(x) - 40;
      ctx.fillStyle = "rgba(255,170,70,0.9)"; ctx.fillRect(x - 3, y, 6, 3);
      glow(x, y, 60, "rgba(255,150,50,0.35)");
    }
    const r = rng(5);
    for (let i = 0; i < 90; i++) { // 光轨
      const lane = i % 2, speed = 380 + r() * 260, len = 90 + r() * 180;
      const x0 = r() * (W + 600);
      const x = lane ? mod(x0 + lt * speed, W + 600) - 300 : W + 300 - mod(x0 + lt * speed, W + 600);
      const y = deckY(x) + (lane ? 6 : -4);
      const gr = ctx.createLinearGradient(x, 0, x + (lane ? -len : len), 0);
      gr.addColorStop(0, lane ? "rgba(235,240,255,0.95)" : "rgba(255,40,50,0.95)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = gr; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (lane ? -len : len), deckY(x + (lane ? -len : len)) + (lane ? 6 : -4)); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // 2. 桥下立柱掠过
  function shotUnderpass(lt, d) {
    ctx.fillStyle = "#020203"; ctx.fillRect(0, 0, W, H);
    const vy = 560;
    const g = ctx.createRadialGradient(W * 0.62, vy, 0, W * 0.62, vy, 700);
    g.addColorStop(0, "rgba(255,150,70,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    skyline(skyMid, vy + 60, lt * 40, 0.5, 0.8);
    ctx.fillStyle = "#06070a"; ctx.fillRect(0, 0, W, 300);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = "#0b0c10"; ctx.fillRect(0, 230 + i * 12, W, 4); }
    ctx.fillStyle = "#040405"; ctx.fillRect(0, vy + 60, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 14; k++) { // 路面反光
      const x = mod(k * 260 - lt * 1400, W + 400) - 200;
      ctx.fillStyle = "rgba(255,150,60,0.08)"; ctx.fillRect(x, 760 + (k % 3) * 60, 220, 3);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const [sp, sc, alpha] of [[700, 0.5, 0.8], [2200, 1.1, 1]]) {
      const gap = 680 * sc;
      for (let i = -1; i < W / gap + 2; i++) {
        const x = mod(i * gap - lt * sp, W + gap) - gap / 2;
        const pw = 150 * sc;
        ctx.globalAlpha = alpha; ctx.fillStyle = sc > 1 ? "#010101" : "#08090c";
        ctx.fillRect(x - pw / 2, 300 - 40 * sc, pw, H);
        ctx.globalAlpha = 1;
        const eg = ctx.createLinearGradient(x + pw / 2 - 16 * sc, 0, x + pw / 2, 0);
        eg.addColorStop(0, "rgba(255,150,70,0)"); eg.addColorStop(1, `rgba(255,150,70,${sc > 1 ? 0.28 : 0.18})`);
        ctx.fillStyle = eg; ctx.fillRect(x + pw / 2 - 16 * sc, 300 - 40 * sc, 16 * sc, H);
        if (sc < 1) { ctx.globalCompositeOperation = "lighter"; glow(x, 330, 70, "rgba(255,160,60,0.45)"); ctx.globalCompositeOperation = "source-over"; }
      }
    }
    // 一辆车的大灯闪过
    const pass = clamp((lt - d * 0.55) / 0.5, 0, 1);
    if (pass > 0 && pass < 1) {
      ctx.globalCompositeOperation = "lighter";
      const x = lerp(-300, W + 300, pass);
      glow(x, 760, 520, "rgba(210,230,255,0.55)");
      ctx.fillStyle = "rgba(230,240,255,0.8)"; ctx.fillRect(x - 600, 752, 600, 4);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // 3. 大灯 / 尾灯特写
  function shotHeadlight(lt, d, kind, rear) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const z = 1 + 0.05 * (lt / d);
    ctx.save(); ctx.translate(W / 2, H * 0.62); ctx.scale(z, z);
    const g = ctx.createRadialGradient(0, 40, 0, 0, 40, 900);
    g.addColorStop(0, "rgba(40,50,70,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(-1000, -600, 2000, 1200);
    const prog = smooth((lt - 0.25) / (d * 0.55));
    if (rear) {
      carRear(0, 260, 1700, kind, prog, 0);
    } else {
      carFront(0, 280, 1700, kind, prog);
    }
    ctx.restore();
  }

  // 4. 侧面跟拍
  function shotSide(lt, d, opts) {
    const { kind = "silver", both = false, speed = 1, slow = 1 } = opts;
    const t = lt * slow;
    sky(620);
    skyline(skyFar, 620, t * 120 * speed, 1, 0.9);
    ctx.fillStyle = "#030304"; ctx.fillRect(0, 618, W, H);
    ctx.globalCompositeOperation = "lighter";
    const r = rng(19);
    for (let i = 0; i < 70; i++) { // 背景光线拉丝
      const y = 520 + r() * 220, len = 120 + r() * 520 * speed;
      const x = W + 200 - mod(r() * 4000 + t * (1800 + r() * 900) * speed, W + 1400);
      const c = r() < 0.7 ? "255,170,80" : "170,205,255";
      const gr = ctx.createLinearGradient(x, 0, x + len, 0);
      gr.addColorStop(0, `rgba(${c},0.0)`); gr.addColorStop(0.5, `rgba(${c},${0.25 + r() * 0.4})`); gr.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = gr; ctx.fillRect(x, y, len, 2 + r() * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    // 护栏
    ctx.fillStyle = "#0d0e12"; ctx.fillRect(0, 700, W, 14);
    for (let i = 0; i < 30; i++) { const x = mod(i * 90 - t * 2600 * speed, W + 180) - 90; ctx.fillStyle = "#0a0b0e"; ctx.fillRect(x, 700, 10, 110); }
    ctx.fillStyle = "#050506"; ctx.fillRect(0, 800, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 12; i++) { const x = mod(i * 220 - t * 3200 * speed, W + 300) - 150; ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(x, 905, 120, 4); }
    ctx.globalCompositeOperation = "source-over";
    const b = beatAt(lt + opts.t0).since;
    const sweep = mod(b / 0.6, 1);
    const bob = Math.sin(t * 9) * 2;
    const L = 1000;
    if (both) {
      carSide(W / 2 - L / 2 - 340 + Math.sin(t * 0.8) * 60, 860 + bob, L * 0.82, kind === "silver" ? "black" : "silver", t * 40, mod(sweep + 0.4, 1));
    }
    carSide(W / 2 - L / 2 + (both ? 220 : 0), 880 + bob, L, kind, t * 40, sweep);
  }

  // 5. 追车视角（伪 3D 道路）
  function shotChase(lt, d, opts) {
    const { speed = 1, curve = 0, dawn = 0, recede = 0, slow = 1, weave = 1 } = opts;
    const t = lt * slow;
    const horizon = 470;
    sky(horizon, dawn);
    skyline(skyFar, horizon + 4, t * 10, 1, lerp(1, 0.6, dawn));
    ctx.fillStyle = `rgb(${lerp(3, 52, dawn)},${lerp(3, 48, dawn)},${lerp(5, 58, dawn)})`; ctx.fillRect(0, horizon, W, H);
    const D = 1.2, camH = 560, roadW = 950, seg = 140, N = 90;
    const travel = t * 3600 * speed;
    const bendAt = (z) => curve * Math.sin(t * 0.35 + 0.3) * z * z * 0.00012;
    const proj = (z, x, y = 0) => { const s = D * 600 / z; return [W / 2 + (x - bendAt(z)) * s, horizon + (camH - y) * s * 0.55, s]; };
    let prev = null;
    for (let i = N; i >= 1; i--) {
      const z = i * seg - mod(travel, seg) + 60;
      const [cx, cy, s] = proj(z, 0);
      const hw = roadW * s;
      if (prev) {
        const [pcx, pcy, phw] = prev;
        const k = Math.floor((travel + z) / seg) % 2 ? 1 : 0;
        const fog = clamp(1 - z / (N * seg), 0, 1);
        ctx.fillStyle = `rgba(${lerp(14, 80, dawn) + k * 3},${lerp(15, 74, dawn) + k * 3},${lerp(20, 84, dawn) + k * 4},${fog})`;
        ctx.beginPath(); ctx.moveTo(pcx - phw, pcy); ctx.lineTo(pcx + phw, pcy); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx - hw, cy); ctx.fill();
        if (k) { // 车道线
          ctx.fillStyle = `rgba(240,240,240,${0.55 * fog})`;
          for (const lx of [-0.33, 0.33]) {
            ctx.beginPath();
            ctx.moveTo(pcx + phw * lx - phw * 0.006, pcy); ctx.lineTo(pcx + phw * lx + phw * 0.006, pcy);
            ctx.lineTo(cx + hw * lx + hw * 0.006, cy); ctx.lineTo(cx + hw * lx - hw * 0.006, cy); ctx.fill();
          }
        }
        const ps = prev[3];
        for (const sd of [-1, 1]) { // 护栏：连续的面 + 顶部反光线
          const x0 = pcx + sd * phw, x1 = cx + sd * hw;
          ctx.fillStyle = `rgba(${lerp(22, 110, dawn)},${lerp(24, 104, dawn)},${lerp(30, 112, dawn)},${fog})`;
          ctx.beginPath(); ctx.moveTo(x0, pcy); ctx.lineTo(x0, pcy - 70 * ps); ctx.lineTo(x1, cy - 70 * s); ctx.lineTo(x1, cy); ctx.fill();
          ctx.strokeStyle = `rgba(255,170,90,${0.35 * fog * (1 - dawn * 0.6)})`; ctx.lineWidth = Math.max(1, 3 * s);
          ctx.beginPath(); ctx.moveTo(x0, pcy - 70 * ps); ctx.lineTo(x1, cy - 70 * s); ctx.stroke();
        }
      }
      prev = [cx, cy, hw, s];
    }
    // 路灯
    ctx.globalCompositeOperation = "lighter";
    for (let i = 20; i >= 1; i--) {
      const z = i * seg * 4 - mod(travel, seg * 4) + 60;
      for (const side of [-1, 1]) {
        const [x, y, s] = proj(z, side * (roadW + 80), 900);
        const fog = clamp(1 - z / (20 * seg * 4), 0, 1);
        glow(x, y, 220 * s * 1.6 + 6, `rgba(255,160,60,${0.5 * fog * (1 - dawn * 0.8)})`);
        ctx.fillStyle = `rgba(255,190,110,${fog})`; ctx.fillRect(x - 8 * s, y, 16 * s, 4 * s);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    // 两车
    const bt = beatAt(lt + opts.t0);
    const zBase = 900 + recede * smooth(lt / d) * 5200;
    const cars = [
      { kind: "silver", lane: -0.3 + weave * 0.18 * Math.sin(t * 2.6), z: zBase + 140 * Math.sin(t * 0.9) },
      { kind: "black", lane: 0.3 - weave * 0.18 * Math.sin(t * 2.6 + 1.3), z: zBase + 260 - 140 * Math.sin(t * 0.9) },
    ].sort((a, b) => b.z - a.z);
    for (const c of cars) {
      const [x, y, s] = proj(c.z, c.lane * roadW, 0);
      ctx.globalCompositeOperation = "lighter"; // 尾灯在路面上的倒影
      for (const sd of [-0.4, 0.4]) {
        ctx.save(); ctx.translate(x + sd * 900 * s, y + 20 * s); ctx.scale(0.35, 1.6);
        glow(0, 60 * s, 260 * s, `rgba(255,20,40,${0.35 * (1 - dawn * 0.6)})`);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      carRear(x, y - bt.pulse * 6 * s, 900 * s * 1.05, c.kind, 1, bt.pulse * 0.6);
    }
  }

  // 6. 航拍俯视：环线
  function shotOverhead(lt, d, opts) {
    const { slow = 1 } = opts;
    const t = lt * slow;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const R = 1100, theta = -0.4 + t * 0.32;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-theta - Math.PI / 2 + 0.25 * Math.sin(t * 0.2));
    const sc = 0.95 + 0.08 * Math.sin(t * 0.3);
    ctx.scale(sc, sc);
    ctx.translate(-Math.cos(theta) * R, -Math.sin(theta) * R);
    const cxw = Math.cos(theta) * R, cyw = Math.sin(theta) * R, span = 2400 / sc;
    for (let tx = Math.floor((cxw - span) / 1300) * 1300; tx < cxw + span; tx += 1300)
      for (let ty = Math.floor((cyw - span) / 1300) * 1300; ty < cyw + span; ty += 1300) ctx.drawImage(city, tx, ty);
    ctx.strokeStyle = "#101116"; ctx.lineWidth = 150; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#1b1c22"; ctx.lineWidth = 6;
    for (const rr of [R - 72, R + 72]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([30, 40]); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3;
    for (const rr of [R - 25, R + 25]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 40; k++) { const a = k * 0.157; glow(Math.cos(a) * (R + 95), Math.sin(a) * (R + 95), 50, "rgba(255,150,50,0.3)"); }
    const r = rng(41); // 其他车流
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28 + t * (0.2 + r() * 0.15), rr = R + (r() < 0.5 ? -50 : 50);
      ctx.strokeStyle = "rgba(255,40,40,0.5)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, rr, a - 0.05, a); ctx.stroke();
    }
    for (const [off, kind, lane] of [[0.0, "silver", -28], [-0.035, "black", 28]]) {
      const a = theta + off + 0.012 * Math.sin(t * 2.6 + (kind === "black" ? 1.3 : 0));
      const rr = R + lane;
      ctx.lineWidth = 7; // 拖尾
      for (let j = 0; j < 12; j++) {
        ctx.strokeStyle = `rgba(255,30,40,${0.5 * (1 - j / 12)})`;
        ctx.beginPath(); ctx.arc(0, 0, rr, a - 0.02 - j * 0.012, a - 0.02 - (j - 1) * 0.012); ctx.stroke();
      }
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      glow(0, -60, 90, "rgba(210,230,255,0.45)");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = kind === "silver" ? "#b9c1ca" : "#15161b";
      ctx.fillRect(-14, -26, 28, 52);
      ctx.fillStyle = "#0a0c10"; ctx.fillRect(-11, -8, 22, 16);
      ctx.globalCompositeOperation = "lighter";
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // 7. 隧道：每拍一圈灯
  function shotTunnel(lt, d, opts) {
    ctx.fillStyle = "#020203"; ctx.fillRect(0, 0, W, H);
    const vx = W / 2, vy = 500;
    const ring = 1, period = 0.6;
    const ph = mod((lt + opts.t0 - BAR0) / period, 1);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 14; i >= 0; i--) {
      const z = (i + 1 - ph) * ring;
      const s = 1 / z;
      const w = 1100 * s, h = 620 * s;
      const a = clamp(1 - z / 15, 0, 1);
      ctx.strokeStyle = `rgba(255,150,60,${0.12 * a})`; ctx.lineWidth = 2 * s;
      ctx.strokeRect(vx - w, vy - h, w * 2, h * 2);
      for (const sx of [-1, 1]) {
        const x = vx + sx * w * 0.86, y = vy - h * 0.86;
        ctx.fillStyle = `rgba(255,190,110,${a})`; ctx.fillRect(x - 30 * s, y - 3 * s, 60 * s, 6 * s);
        glow(x, y, 160 * s + 4, `rgba(255,150,50,${0.5 * a})`);
      }
    }
    const exit = smooth((lt - (d - 1.4)) / 1.2) * (opts.exit ? 1 : 0);
    if (exit > 0) glow(vx, vy, 200 + exit * 2200, `rgba(255,245,235,${exit})`);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(6,6,8,0.9)";
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(vx - 30, vy + 20); ctx.lineTo(vx + 30, vy + 20); ctx.lineTo(W, H); ctx.fill();
    const bt = beatAt(lt + opts.t0);
    carRear(vx - 330 + Math.sin(lt * 2) * 30, 930, 560, "silver", 1, bt.pulse * 0.7);
    carRear(vx + 360 - Math.sin(lt * 2 + 1) * 30, 990, 640, "black", 1, bt.pulse * 0.7);
    if (exit > 0) { ctx.fillStyle = `rgba(255,250,245,${exit * exit})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ═════════ 剪辑表（按小节）═════════ */
  const S = [];
  const add = (b0, b1, fn, opts = {}) => S.push({ t0: bar(b0), t1: bar(b1), fn, opts });
  // 前奏
  add(-0.1, 2, (lt, d) => shotSkyline(lt, d));
  add(2, 4, (lt, d) => shotUnderpass(lt, d));
  add(4, 6, (lt, d) => shotHeadlight(lt, d, "black", false));
  add(6, 7, (lt, d) => shotHeadlight(lt, d, "silver", true));
  add(7, 8, (lt, d, o) => shotSide(lt, d, o), { kind: "silver", speed: 0.4 });
  // 第二段
  add(8, 10, (lt, d, o) => shotChase(lt, d, o), { speed: 0.9 });
  add(10, 12, (lt, d, o) => shotOverhead(lt, d, o));
  add(12, 14, (lt, d, o) => shotSide(lt, d, o), { kind: "black", speed: 1 });
  add(14, 16, (lt, d, o) => shotChase(lt, d, o), { speed: 1.2, curve: 1 });
  // 第三段：隧道
  add(16, 22, (lt, d, o) => shotTunnel(lt, d, o), { exit: true });
  add(22, 24, (lt, d, o) => shotChase(lt, d, o), { speed: 1.4, curve: 1.4 });
  // 第四段：高潮压弯
  add(24, 27, (lt, d, o) => shotChase(lt, d, o), { speed: 0.55, curve: 2.6, weave: 0.4 });
  add(27, 29, (lt, d, o) => shotOverhead(lt, d, o), { slow: 0.6 });
  add(29, 32, (lt, d, o) => shotSide(lt, d, o), { kind: "silver", both: true, speed: 0.6 });
  // 第五段：每小节快切
  const cut = [
    [(lt, d, o) => shotChase(lt, d, o), { speed: 1.5, curve: 1 }],
    [(lt, d, o) => shotTunnel(lt, d, o), {}],
    [(lt, d, o) => shotOverhead(lt, d, o), { slow: 1.4 }],
    [(lt, d, o) => shotSide(lt, d, o), { kind: "silver", speed: 1.4 }],
    [(lt, d) => shotUnderpass(lt, d)],
    [(lt, d, o) => shotChase(lt, d, o), { speed: 1.6, curve: -1.5 }],
    [(lt, d) => shotHeadlight(lt, d, "black", false)],
    [(lt, d, o) => shotSide(lt, d, o), { kind: "black", both: true, speed: 1.5 }],
  ];
  cut.forEach(([fn, o], i) => add(32 + i, 33 + i, fn, o || {}));
  // 尾声：天亮，远去
  add(40, 46, (lt, d, o) => shotChase(lt, d, o), { speed: 0.7, dawn: 1, recede: 1 });

  const SECTIONS = [bar(8), bar(16), bar(24), bar(32), bar(40)];

  /* ═════════ 合成 ═════════ */
  function renderAt(t) {
    t = clamp(t, 0, END);
    let shot = S[S.length - 1];
    for (const s of S) if (t >= s.t0 && t < s.t1) { shot = s; break; }
    const lt = t - shot.t0, d = shot.t1 - shot.t0;
    shot.opts.t0 = shot.t0;

    const bt = beatAt(t);
    const energy = t >= bar(16) && t < bar(40) ? 1 : t >= bar(8) ? 0.5 : 0.15;
    const z = 1 + 0.018 * bt.pulse * energy;
    const sh = (t >= bar(24) && t < bar(27)) || (t >= bar(32) && t < bar(40)) ? 1 : 0;
    const shx = sh * Math.sin(t * 91) * 4 * bt.pulse, shy = sh * Math.cos(t * 77) * 3 * bt.pulse;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    shot.fn(lt, d, shot.opts);
    ctx.restore();

    // 段落开头的白闪
    for (const s0 of SECTIONS) {
      const k = t - s0;
      if (k >= 0 && k < 0.35) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k / 0.35)})`; ctx.fillRect(0, 0, W, H); }
    }
    // 镜头切换处的短暗场
    const cutK = Math.min(lt, d - lt);
    if (cutK < 0.06) { ctx.fillStyle = `rgba(0,0,0,${0.5 * (1 - cutK / 0.06)})`; ctx.fillRect(0, 0, W, H); }

    // 暗角
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // 胶片颗粒
    const fr = Math.floor(t * 30), r = rng(fr + 1);
    ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = "overlay";
    const ox = -Math.floor(r() * 512), oy = -Math.floor(r() * 512);
    for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(grain, x, y);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    // 遮幅
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, 96); ctx.fillRect(0, H - 96, W, 96);
    // 开头淡入 / 结尾淡出
    const fade = Math.max(1 - smooth(t / 1.6), smooth((t - (END - 2.4)) / 2.2));
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  window.__renderFilm = renderAt;
  renderAt(0);
})();
