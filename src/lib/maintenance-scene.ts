/**
 * Cảnh trang bảo trì: robot công nhân đi từ mép màn hình vào, vác biển «BẢO TRÌ», cắm xuống ngay dưới logo,
 * rồi chữ và lời nhắn hiện ra. Chỉ chạy ở trình duyệt, được gọi từ `SiteMaintenancePage`.
 *
 * Mọi chuyển động dùng `transform` và `opacity` (Web Animations API và một vòng requestAnimationFrame cho hạt lửa),
 * nên máy yếu vẫn mượt. Bật «giảm chuyển động» thì nhảy thẳng tới cảnh cuối, không rung, không hạt.
 * `dispose()` hủy mọi hoạt ảnh và trả DOM về lúc đầu, để chạy được hai lần (React StrictMode) và không rò khi rời trang.
 */

export type SceneHandle = {
  dispose: () => void;
  /** Lời nhắn đổi sau khi cảnh đã chạy xong thì cập nhật ngay, không gõ lại. */
  setMessage: (text: string) => void;
};

/** Tọa độ trong SVG robot (khung 260 × 440, mặt đất ở y = 440). */
const SVG_H = 440;
const POLE_X = 80; // trục cột biển trong hệ của biển
const HAND_Y = 195; // chỗ tay nắm trên cột
/** Vai phải. Tay vẽ hai đoạn với khuỷu gập nhẹ ra ngoài; độ dài đoạn co giãn theo khoảng vai–tay nên luôn nối liền. */
const SHOULDER = { x: 170, y: 318 };
const ELBOW_BEND = 0.2;
/** Sau khi cắm xong robot buông biển, tay thả xuôi bên hông (đối xứng với tay trái). */
const REST_HAND = { x: 192, y: 378 };
const PIVOT_Y = 200; // biển xoay quanh điểm này
const BASE_TX = 50; // biển nằm lệch 50 so với khung robot
const PLANT_TX = 160;
const PLANT_TY = 240;
/** Tư thế lấy đà trước khi đập biển. */
const BACK_TX = -8;
const BACK_TY = -42;
const BACK_ROT = -16;
/** Cột biển lúc cắm xong nằm ở x này trong SVG: robot phải dừng sao cho điểm này trùng giữa màn hình. */
const PLANTED_X = BASE_TX + PLANT_TX + POLE_X;

type Spark = { k: 0; x: number; y: number; px: number; py: number; vx: number; vy: number; l: number; m: number; c: string };
type Dust = { k: 1; x: number; y: number; vx: number; vy: number; l: number; m: number; r: number };
type Ember = { k: 2; x: number; y: number; vx: number; vy: number; l: number; m: number; r: number; ph: number };
type Particle = Spark | Dust | Ember;

class Stop extends Error {}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeIn = (p: number) => p * p * p;
const linear = (p: number) => p;

export function startMaintenanceScene(root: HTMLElement, getMessage: () => string): SceneHandle {
  const q = <T extends Element>(name: string): T => {
    const el = root.querySelector<T>(`[data-mt="${name}"]`);
    if (!el) throw new Error(`Thiếu phần tử ${name} của trang bảo trì.`);
    return el;
  };

  const stage = q<HTMLElement>("stage");
  const robot = q<HTMLElement>("robot");
  const ground = q<HTMLElement>("ground");
  const floor = q<HTMLElement>("floor");
  const logo = q<HTMLElement>("logo");
  const glow = q<HTMLElement>("glow");
  const flash = q<HTMLElement>("flash");
  const bar = q<HTMLElement>("bar");
  const eta = root.querySelector<HTMLElement>('[data-mt="eta"]');
  const keep = root.querySelector<HTMLElement>('[data-mt="keep"]');
  const typed = q<HTMLElement>("typed");
  const caret = q<HTMLElement>("caret");
  const cv = q<HTMLCanvasElement>("fx");
  const signG = q<SVGGElement>("sign");
  const armR = q<SVGPathElement>("armR");
  const armRh = q<SVGPathElement>("armRh");
  const elbowEl = q<SVGCircleElement>("elbow");
  const handR = q<SVGCircleElement>("handR");
  const armL = q<SVGGElement>("armL");
  const mound = q<SVGEllipseElement>("mound");
  const letters = [...root.querySelectorAll<HTMLElement>(".mt-c")];

  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint = (expr: string, fallback: string) => {
    const probe = document.createElement("span");
    probe.style.color = expr;
    root.appendChild(probe);
    const color = getComputedStyle(probe).color || fallback;
    probe.remove();
    return color;
  };
  const sparkColors = [
    paint("color-mix(in srgb, var(--color-warning) 45%, white)", "#fff2b0"),
    paint("var(--color-warning)", "#ffb020"),
    paint("color-mix(in srgb, var(--color-warning) 70%, black)", "#ff6a00"),
    paint("color-mix(in srgb, var(--color-warning) 55%, var(--color-error))", "#ff3d00"),
  ];
  const emberColor = sparkColors[1] ?? "#ffb020";
  const K = reduce ? 0 : 1;

  let dead = false;
  let message = getMessage();
  let typedDone = false;
  const anims = new Set<Animation>();
  const state = { walking: false, planted: false, intense: false };

  /* ---------- tiện ích thời gian ---------- */
  const alive = () => {
    if (dead) throw new Stop();
  };
  const sleep = async (ms: number) => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms * K));
    alive();
  };
  const tween = (dur: number, ease: (p: number) => number, fn: (p: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const t0 = performance.now();
      const frame = (now: number) => {
        if (dead) return reject(new Stop());
        const p = Math.min(1, (now - t0) / (dur * K || 1));
        fn(ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  const play = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { ...options, duration: Number(options.duration ?? 0) * K, delay: Number(options.delay ?? 0) * K });
    anims.add(a);
    return a;
  };
  const finished = async (a: Animation) => {
    try {
      await a.finished;
    } catch {
      throw new Stop();
    }
    alive();
  };

  /* ---------- hạt: tia lửa, bụi, đốm than ---------- */
  let W = 0;
  let H = 0;
  let GY = 0;
  let robotX1 = 0;
  const measure = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = root.clientWidth;
    H = root.clientHeight;
    cv.width = Math.round(W * d);
    cv.height = Math.round(H * d);
    ctx?.setTransform(d, 0, 0, d, 0, 0);
    GY = ground.getBoundingClientRect().top;
  };
  const P: Particle[] = [];
  const MAX_P = 800;
  function spark(x: number, y: number, n: number, power = 1) {
    if (reduce) return;
    for (let i = 0; i < n && P.length < MAX_P; i++) {
      const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = rnd(140, 700) * power;
      P.push({ k: 0, x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0, m: rnd(0.5, 1.2), c: sparkColors[(Math.random() * 4) | 0] ?? emberColor });
    }
  }
  function dust(x: number, y: number, n: number) {
    if (reduce) return;
    for (let i = 0; i < n && P.length < MAX_P; i++) {
      P.push({ k: 1, x: x + rnd(-30, 30), y: y - rnd(0, 6), vx: rnd(-130, 130), vy: rnd(-80, -10), l: 0, m: rnd(0.7, 1.4), r: rnd(8, 22) });
    }
  }
  function ember() {
    if (P.length < MAX_P) P.push({ k: 2, x: rnd(0, W), y: H + 10, vx: rnd(-10, 10), vy: -rnd(40, 110), l: 0, m: rnd(4, 8), r: rnd(1, 2.6), ph: rnd(0, 6.28) });
  }

  let raf = 0;
  let last = performance.now();
  let eAcc = 0;
  let sAcc = 0;
  let wAcc = 0;
  let nextSpark = 1;
  function loop(now: number) {
    if (dead || !ctx) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    eAcc += dt * (state.intense ? 28 : 12);
    while (eAcc > 1) {
      ember();
      eAcc--;
    }
    if (state.walking) {
      wAcc += dt;
      if (wAcc > 0.27) {
        wAcc = 0;
        const r = robot.getBoundingClientRect();
        dust(r.left + r.width * 0.5 + rnd(-12, 12), GY, 3);
      }
    }
    if (state.planted) {
      sAcc += dt;
      if (sAcc > nextSpark) {
        sAcc = 0;
        nextSpark = rnd(0.5, 1.3);
        spark(W / 2 + rnd(-8, 8), GY, 7, 0.35);
      }
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (!p) continue;
      p.l += dt;
      if (p.l >= p.m) {
        P.splice(i, 1);
        continue;
      }
      const t = p.l / p.m;
      if (p.k === 0) {
        p.px = p.x;
        p.py = p.y;
        p.vy += 950 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > GY && p.vy > 0) {
          p.y = GY;
          p.vy *= -0.35;
          p.vx *= 0.7;
        }
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 2.2 * (1 - t) + 0.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (p.k === 1) {
        p.x += p.vx * dt;
        p.vx *= 0.96;
        p.y += p.vy * dt;
        const r = p.r * (1 + p.l * 2.2);
        const a = (1 - t) * 0.32;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(190,175,160,${a})`);
        g.addColorStop(1, "rgba(190,175,160,0)");
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.283);
        ctx.fill();
      } else {
        p.x += (p.vx + Math.sin(p.ph + p.l * 2) * 18) * dt;
        p.y += p.vy * dt;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.sin(Math.PI * t) * 0.85;
        ctx.fillStyle = emberColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(loop);
  }

  /* ---------- biển và cánh tay phải ---------- */
  const S = { tx: 0, ty: 0, rot: 0, release: 0 };
  function applySign() {
    signG.setAttribute("transform", `translate(${BASE_TX + S.tx} ${S.ty}) rotate(${S.rot} ${POLE_X} ${PIVOT_Y})`);
    const a = (S.rot * Math.PI) / 180;
    const off = PIVOT_Y - HAND_Y;
    const poleX = POLE_X + BASE_TX + S.tx + off * Math.sin(a);
    const poleY = S.ty + PIVOT_Y - off * Math.cos(a);
    const hx = poleX + (REST_HAND.x - poleX) * S.release;
    const hy = poleY + (REST_HAND.y - poleY) * S.release;
    // Hai đoạn tay: khuỷu cong ra phía ngoài (bên phải) tìm theo hình học hai đường tròn.
    const dx = hx - SHOULDER.x;
    const dy = hy - SHOULDER.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Khuỷu nằm giữa vai và tay, đẩy ra vuông góc về phía bên phải để không đâm vào thân.
    const bend = dist * ELBOW_BEND;
    const nx = -dy / dist;
    const ny = dx / dist;
    const side = nx >= 0 ? 1 : -1;
    const ex = SHOULDER.x + dx / 2 + side * nx * bend;
    const ey = SHOULDER.y + dy / 2 + side * ny * bend;
    const path = `M${SHOULDER.x} ${SHOULDER.y} ${ex.toFixed(1)} ${ey.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
    armR.setAttribute("d", path);
    armRh.setAttribute("d", path);
    elbowEl.setAttribute("cx", ex.toFixed(1));
    elbowEl.setAttribute("cy", ey.toFixed(1));
    handR.setAttribute("cx", String(hx));
    handR.setAttribute("cy", String(hy));
  }

  /* ---------- va chạm ---------- */
  function shake(amp = 12, dur = 560) {
    if (reduce) return;
    const frames: Keyframe[] = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const d = 1 - i / n;
      frames.push({ transform: `translate(${rnd(-amp, amp) * d}px,${rnd(-amp, amp) * d}px)` });
    }
    play(stage, frames, { duration: dur });
  }
  function rings() {
    if (reduce) return;
    [0, 120].forEach((delay) => {
      const r = document.createElement("div");
      r.className = "mt-ring";
      stage.appendChild(r);
      const a = play(r, [{ transform: "scale(.1,.03)", opacity: 0.95 }, { transform: "scale(11,2.6)", opacity: 0 }], {
        duration: 950,
        delay,
        easing: "cubic-bezier(.1,.7,.3,1)",
        fill: "both",
      });
      a.finished.then(() => r.remove(), () => r.remove());
    });
  }
  function impact() {
    spark(W / 2, GY, 90, 1.1);
    dust(W / 2, GY, 28);
    rings();
    shake(12, 560);
    play(flash, [{ opacity: 0.6 }, { opacity: 0 }], { duration: 520, easing: "ease-out" });
    play(logo, [{ transform: "scale(1)" }, { transform: "scale(1.09) translateY(-8px)" }, { transform: "scale(1)" }], {
      duration: 600,
      easing: "cubic-bezier(.2,.9,.3,1.4)",
    });
    play(logo, [{ filter: "brightness(1)" }, { filter: "brightness(2.2)" }, { filter: "brightness(1)" }], { duration: 480 });
  }

  /* ---------- đặt lại khi hủy ---------- */
  function reset() {
    for (const a of anims) a.cancel();
    anims.clear();
    robot.classList.remove("walking", "idle");
    robot.style.removeProperty("transform");
    S.tx = 0;
    S.ty = 0;
    S.rot = 0;
    S.release = 0;
    applySign();
    mound.setAttribute("rx", "0");
    mound.setAttribute("ry", "0");
    typed.textContent = "";
    caret.hidden = true;
    root.dataset.phase = "init";
    root.removeAttribute("data-title");
    ctx?.clearRect(0, 0, W, H);
    P.length = 0;
  }

  /* ---------- kịch bản ---------- */
  function finalRobotX() {
    const s = robot.getBoundingClientRect().height / SVG_H;
    return W / 2 - PLANTED_X * s;
  }
  function placeGlow() {
    const r = signG.getBoundingClientRect();
    glow.style.left = `${r.left + r.width / 2}px`;
    glow.style.top = `${r.top + r.height / 2}px`;
  }

  async function main() {
    if (document.readyState !== "complete") await new Promise<void>((r) => addEventListener("load", () => r(), { once: true }));
    alive();
    measure();
    root.dataset.phase = "logo";

    // 1. Logo và mặt đất hiện ra
    play(ground, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    play(floor, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" });
    play(
      logo,
      [
        { opacity: 0, transform: "scale(.45)", filter: "blur(22px)" },
        { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
      ],
      { duration: 1000, easing: "cubic-bezier(.2,.9,.3,1.25)", fill: "forwards" },
    );
    await sleep(1000);

    // 2. Robot đi từ mép màn hình vào, vác biển trên tay
    const rr = robot.getBoundingClientRect();
    const x0 = -(rr.width + 30);
    robotX1 = finalRobotX();
    robot.style.visibility = "visible";
    robot.classList.add("walking");
    state.walking = true;
    root.dataset.phase = "walk";
    const sway = (now: number) => {
      if (!state.walking || dead) return;
      S.rot = Math.sin(now / 170) * 2.6;
      applySign();
      requestAnimationFrame(sway);
    };
    requestAnimationFrame(sway);
    const walk = play(robot, [{ transform: `translateX(${x0}px)` }, { transform: `translateX(${robotX1}px)` }], {
      duration: 4000,
      easing: "cubic-bezier(.16,.6,.3,1)",
      fill: "forwards",
    });
    await finished(walk);
    state.walking = false;
    robot.classList.remove("walking");
    robot.classList.add("idle");
    const rot0 = S.rot;
    await tween(180, easeOut, (p) => {
      S.rot = rot0 * (1 - p);
      applySign();
    });
    await sleep(200);

    // 3. Lấy đà
    root.dataset.phase = "plant";
    await tween(340, easeOut, (p) => {
      S.tx = BACK_TX * p;
      S.ty = BACK_TY * p;
      S.rot = BACK_ROT * p;
      applySign();
    });
    await sleep(90);

    // 4. Đập biển xuống đất
    await tween(230, easeIn, (p) => {
      S.tx = BACK_TX + (PLANT_TX - BACK_TX) * p;
      S.ty = BACK_TY + (PLANT_TY - BACK_TY) * p;
      S.rot = BACK_ROT * (1 - p);
      applySign();
    });
    state.planted = true;
    state.intense = true;
    root.dataset.phase = "planted";
    mound.setAttribute("rx", "40");
    mound.setAttribute("ry", "9");
    placeGlow();
    play(glow, [{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }], {
      duration: 700,
      easing: "cubic-bezier(.2,.9,.3,1.2)",
      fill: "forwards",
    });
    impact();
    void tween(170, easeOut, (p) => {
      S.ty = PLANT_TY - 10 * p;
      applySign();
    }).catch(() => undefined);
    void tween(1100, linear, (p) => {
      S.rot = Math.sin(p * Math.PI * 6) * 8 * Math.pow(1 - p, 1.5);
      applySign();
    }).catch(() => undefined);

    // Sau khi biển hết rung, robot buông tay khỏi cột và chống hông.
    void sleep(1250)
      .then(() => tween(520, easeOut, (p) => {
        S.release = p;
        applySign();
      }))
      .catch(() => undefined);

    // 5. Robot vẫy tay
    const up = play(armL, [{ transform: "rotate(0deg)" }, { transform: "rotate(120deg)" }], { duration: 380, easing: "ease-out", fill: "forwards" });
    up.finished
      .then(() => {
        if (dead) return;
        play(armL, [{ transform: "rotate(120deg)" }, { transform: "rotate(152deg)" }], { duration: 360, direction: "alternate", iterations: Infinity, easing: "ease-in-out" });
      })
      .catch(() => undefined);

    // 6. Chữ chạy ra, rồi lời nhắn được gõ
    await sleep(350);
    root.dataset.title = "go";
    shake(5, 320);
    await sleep(letters.length * 48 + 640 + 150);
    caret.hidden = false;
    message = getMessage();
    const text = message;
    await tween(text.length * 34, linear, (p) => {
      typed.textContent = text.slice(0, Math.ceil(p * text.length));
    });
    typedDone = true;
    typed.textContent = message;
    for (const el of [eta, keep]) if (el) play(el, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: "ease-out", fill: "forwards" });
    play(bar, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards" });
    root.dataset.phase = "done";
  }

  /** Cảnh hỏng giữa chừng thì hiện nguyên trạng cuối, khách vẫn đọc được chữ. */
  function showStatic() {
    reset();
    root.dataset.phase = "static";
    root.dataset.title = "go";
    typed.textContent = message;
    typedDone = true;
  }

  const onResize = () => {
    measure();
    if (state.planted) {
      // Robot đã dừng: dời theo kích thước mới để cột biển vẫn nằm giữa.
      for (const a of anims) if (a.effect && (a.effect as KeyframeEffect).target === robot) a.cancel();
      robotX1 = finalRobotX();
      robot.style.transform = `translateX(${robotX1}px)`;
      placeGlow();
    }
  };
  addEventListener("resize", onResize);

  if (ctx && !reduce) raf = requestAnimationFrame(loop);
  main().catch((error) => {
    if (error instanceof Stop) return;
    console.error(error);
    if (!dead) showStatic();
  });

  return {
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      reset();
    },
    setMessage(text: string) {
      message = text;
      if (typedDone) typed.textContent = text;
    },
  };
}
