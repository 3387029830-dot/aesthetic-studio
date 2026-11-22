import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 平滑滚动（Lenis）与 ScrollTrigger 同步
if (!reduce) {
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// 1. Hero 入场：逐层淡入上浮
gsap.from(".hero > *", { y: 40, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.12 });

// 2. Pin 场景：固定画面，随滚动依次出现
const tl = gsap.timeline({
  scrollTrigger: { trigger: ".pin", start: "top top", end: "+=150%", scrub: 1, pin: true },
});
tl.from(".reveal", { y: 80, opacity: 0, scale: 0.96, stagger: 0.5, ease: "power2.out" });

// 3. 逐词点亮的大字
const p = document.querySelector(".big-type");
p.innerHTML = p.textContent.split(" ").map((w) => `<span class="word">${w}</span>`).join(" ");
gsap.to(".big-type .word", {
  opacity: 1, stagger: 0.1, ease: "none",
  scrollTrigger: { trigger: ".statement", start: "top 70%", end: "bottom 60%", scrub: true },
});
