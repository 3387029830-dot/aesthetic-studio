import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── 平滑滚动 ── */
if (!reduce) {
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ── 序：刀光一闪，三字落下 ── */
if (!reduce) {
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(".hero-blade", { scaleX: 0, duration: 1.1, ease: "expo.inOut" })
    .from(".hero-title span", { yPercent: -30, opacity: 0, duration: 1.4, stagger: 0.09 }, "-=0.35")
    .from(".hero-line, .hero-hint", { opacity: 0, duration: 1.2 }, "-=1");

  // 滚动时刀光被拉长、字向上退
  gsap.to(".hero-title", {
    yPercent: -62, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
}

/* ── 弐：低语逐字浮现 ── */
const whisper = document.querySelector(".whisper");
whisper.innerHTML = [...whisper.textContent].map((c) => `<span class="ch">${c}</span>`).join("");
if (!reduce) {
  gsap.to(".whisper .ch", {
    opacity: 1, stagger: 0.05, ease: "none",
    scrollTrigger: { trigger: ".taiwa", start: "top 65%", end: "bottom 75%", scrub: true },
  });
}

/* ── 参：始解横向卷轴 ── */
const track = document.querySelector(".shikai-track");
const intro = document.querySelector(".shikai-intro");
track.prepend(intro);
const distance = () => track.scrollWidth - innerWidth;
gsap.to(track, {
  x: () => -distance(),
  ease: "none",
  scrollTrigger: {
    trigger: ".shikai",
    start: "top top",
    end: () => "+=" + distance() * 1.5,
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

/* ── 肆：卍解 ── */
const bankai = document.querySelector(".bankai");
const setAngle = () => {
  // 斜线从左 62% 到右 38%，角度随视口比例变化
  const a = -Math.atan2(0.24 * bankai.clientHeight, bankai.clientWidth) * (180 / Math.PI);
  gsap.set(".slash-wrap", { rotation: a });
};
setAngle();
addEventListener("resize", setAngle);

const reiatsu = startReiatsu(document.querySelector(".reiatsu"));

if (!reduce) {
  gsap.set(".bankai-word", { scale: 1.25, opacity: 0, filter: "blur(14px)" });
  gsap.set(".bankai-sub, .stage-mark--light", { opacity: 0 });
  gsap.set(".slash", { scaleX: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".bankai",
      start: "top top",
      end: "+=260%",
      pin: true,
      scrub: 0.6,
      onUpdate: (st) => (reiatsu.power = gsap.utils.clamp(0, 1, (st.progress - 0.35) / 0.4)),
    },
  });

  tl.from(".sheet-text", { opacity: 0, y: 24, stagger: 0.15, duration: 0.2 })
    // 灵压上升：纸面颤抖
    .to(".sheets", { x: "random(-7, 7)", y: "random(-5, 5)", duration: 0.02, repeat: 9, yoyo: true, ease: "none" }, "+=0.1")
    .to(".sheets", { x: 0, y: 0, duration: 0.01 })
    // 一刀
    .to(".slash", { opacity: 1, duration: 0.01 })
    .to(".slash", { scaleX: 1, duration: 0.12, ease: "power4.in" })
    .set(".sheet-base", { autoAlpha: 0 })
    // 纸面沿刀痕分离
    .to(".sheet-a", { xPercent: -6, yPercent: -70, rotate: -2, duration: 0.5, ease: "power3.in" }, "+=0.04")
    .to(".sheet-b", { xPercent: 6, yPercent: 70, rotate: 2, duration: 0.5, ease: "power3.in" }, "<")
    .to(".slash", { opacity: 0, duration: 0.15 }, "<0.1")
    // 本体显现
    .to(".bankai-word", { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, "<0.15")
    .to(".bankai-sub, .stage-mark--light", { opacity: 1, duration: 0.25 }, "-=0.1")
    .to({}, { duration: 0.3 });
} else {
  reiatsu.power = 0.6;
}

/* ── 灵压粒子：黑底上升起的白色火星 ── */
function startReiatsu(canvas) {
  const ctx = canvas.getContext("2d");
  const state = { power: 0 };
  let w, h, dpr, parts = [];
  const mouse = { x: -1e4, y: -1e4 };

  const resize = () => {
    dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });

  const spawn = () => ({
    x: Math.random() * w,
    y: h + 10,
    vy: -(0.6 + Math.random() * 2.2),
    vx: (Math.random() - 0.5) * 0.3,
    len: 6 + Math.random() * 26,
    life: 1,
    a: 0.25 + Math.random() * 0.6,
  });

  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    const target = Math.floor(260 * state.power);
    while (parts.length < target) parts.push(spawn());
    if (parts.length > target) parts.length = Math.max(target, parts.length - 4);

    ctx.lineCap = "round";
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 22000) { p.vx += dx / 4000; }
      p.x += p.vx; p.y += p.vy * (0.6 + state.power);
      p.vx *= 0.98;
      if (p.y < -40) Object.assign(p, spawn());
      ctx.strokeStyle = `rgba(236,235,230,${p.a * state.power})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 4, p.y + p.len);
      ctx.stroke();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return state;
}

// 字体加载后重新计算滚动长度
document.fonts?.ready.then(() => ScrollTrigger.refresh());
