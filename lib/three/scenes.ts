import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type SceneKind = "bricks" | "monogram" | "phone";

export interface SceneOptions {
  /** Called if the animation runs too slowly on this device. */
  onSlow: (fps: number) => void;
  /** Called about once a second with the measured frame rate. */
  onFps?: (fps: number) => void;
}

export interface SceneHandle {
  dispose: () => void;
  replay: () => void;
}

const GOLD = 0xe8a93a;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const easeOutBack = (v: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

interface Built {
  group: THREE.Group;
  update: (t: number, pointer: { x: number; y: number }) => void;
  replay?: () => void;
  dispose: () => void;
}

function goldMaterial(hueShift = 0): THREE.MeshStandardMaterial {
  const color = new THREE.Color(GOLD);
  color.offsetHSL(hueShift, 0, 0);
  return new THREE.MeshStandardMaterial({ color, metalness: 0.88, roughness: 0.3, envMapIntensity: 1.15 });
}

// ---- 1. a wall of gold bricks that lays itself ----

function buildBricks(): Built {
  const group = new THREE.Group();
  const geometry = new RoundedBoxGeometry(2, 0.8, 1, 3, 0.08);
  const materials: THREE.MeshStandardMaterial[] = [];
  const bricks: { mesh: THREE.Mesh; target: THREE.Vector3; delay: number; spin: number }[] = [];
  let n = 0;
  for (let row = 0; row < 4; row++) {
    const xs = row % 2 === 0 ? [-2.1, 0, 2.1] : [-1.05, 1.05];
    for (const x of xs) {
      const material = goldMaterial((Math.sin(n * 7.3) * 0.012));
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      const target = new THREE.Vector3(x, row * 0.87 - 1.3, 0);
      mesh.position.set(x, target.y + 5, 0);
      group.add(mesh);
      bricks.push({ mesh, target, delay: n * 0.14, spin: (n % 2 ? 1 : -1) * (0.4 + (n % 3) * 0.2) });
      n++;
    }
  }
  // The last brick glows: the one you are laying today.
  const glow = bricks[bricks.length - 1].mesh.material as THREE.MeshStandardMaterial;
  glow.emissive = new THREE.Color(0xf59e0b);
  let start = -1;

  return {
    group,
    replay: () => {
      start = -1;
    },
    update(t, pointer) {
      if (start < 0) start = t;
      const age = t - start;
      let built = true;
      for (const b of bricks) {
        const p = clamp((age - b.delay) / 0.75, 0, 1);
        if (p < 1) built = false;
        const e = easeOutBack(p);
        b.mesh.position.y = b.target.y + (1 - e) * 5;
        b.mesh.rotation.z = (1 - p) * b.spin;
        b.mesh.visible = p > 0;
      }
      glow.emissiveIntensity = built ? 0.22 + Math.sin(age * 2.4) * 0.16 : 0;
      group.rotation.y = -0.5 + Math.sin(t * 0.4) * 0.22 + pointer.x * 0.55;
      group.rotation.x = 0.14 - pointer.y * 0.25;
      group.position.y = Math.sin(t * 0.8) * 0.06;
    },
    dispose() {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}

// ---- 2. a gold GV monogram ----

function gShape(): THREE.Shape {
  const R = 1.2;
  const r = 0.78;
  const a0 = Math.PI / 4;
  const shape = new THREE.Shape();
  shape.moveTo(R * Math.cos(a0), R * Math.sin(a0));
  const steps = 56;
  for (let i = 1; i <= steps; i++) {
    const a = a0 + ((2 * Math.PI - a0) * i) / steps;
    shape.lineTo(R * Math.cos(a), R * Math.sin(a));
  }
  shape.lineTo(0.1, 0);
  shape.lineTo(0.1, -0.3);
  const aBar = 2 * Math.PI + Math.asin(-0.3 / r);
  shape.lineTo(r * Math.cos(aBar), r * Math.sin(aBar));
  for (let i = 1; i <= steps; i++) {
    const a = aBar - ((aBar - a0) * i) / steps;
    shape.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  shape.closePath();
  return shape;
}

function vShape(): THREE.Shape {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [-0.85, 1.2],
    [-0.3, 1.2],
    [0, 0.2],
    [0.3, 1.2],
    [0.85, 1.2],
    [0.3, -1.2],
    [-0.3, -1.2],
  ];
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}

function buildMonogram(): Built {
  const group = new THREE.Group();
  const settings = { depth: 0.55, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.07, bevelSegments: 3, curveSegments: 40 };
  const g = new THREE.ExtrudeGeometry(gShape(), settings);
  const v = new THREE.ExtrudeGeometry(vShape(), settings);
  g.center();
  v.center();
  const material = goldMaterial();
  const gMesh = new THREE.Mesh(g, material);
  const vMesh = new THREE.Mesh(v, material);
  gMesh.position.x = -1.25;
  vMesh.position.x = 1.3;
  group.add(gMesh, vMesh);
  group.scale.setScalar(1.2);

  return {
    group,
    update(t, pointer) {
      group.rotation.y = Math.sin(t * 0.5) * 0.45 + pointer.x * 0.6;
      group.rotation.x = -pointer.y * 0.3 + Math.sin(t * 0.7) * 0.05;
      group.position.y = Math.sin(t * 0.9) * 0.1;
    },
    dispose() {
      g.dispose();
      v.dispose();
      material.dispose();
    },
  };
}

// ---- 3. a phone showing the Video Studio ----

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function buildPhone(): Built {
  const group = new THREE.Group();
  const body = new RoundedBoxGeometry(2.1, 4.3, 0.24, 4, 0.3);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1e27, metalness: 0.7, roughness: 0.32 });
  group.add(new THREE.Mesh(body, bodyMat));

  const sw = 1.9;
  const sh = 4.1;
  const screenGeo = new THREE.ShapeGeometry(roundedRect(sw, sh, 0.24), 10);
  const uv = screenGeo.attributes.uv;
  const pos = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);

  const canvas = document.createElement("canvas");
  canvas.width = 380;
  canvas.height = 820;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.125;
  group.add(screen);

  let lastDraw = -1;
  const draw = (t: number) => {
    if (!ctx || t - lastDraw < 0.08) return;
    lastDraw = t;
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = "#0B0F17";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#E8A93A";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText("VAL STUDIO", 28, 62);
    // preview
    const grad = ctx.createLinearGradient(0, 100, W, 460);
    grad.addColorStop(0, "#2a1c05");
    grad.addColorStop(1, "#0f2a33");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(28, 96, W - 56, 380, 22);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 44px system-ui, sans-serif";
    ctx.textAlign = "center";
    const words = ["BUILDING", "IDEAS", "CREATING", "VALUE"];
    const wi = Math.abs(Math.floor(t * 1.4)) % words.length;
    const pop = 1 + 0.12 * Math.max(0, 1 - ((t * 1.4) % 1) * 4);
    ctx.save();
    ctx.translate(W / 2, 300);
    ctx.scale(pop, pop);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0,0,0,.7)";
    ctx.strokeText(words[wi], 0, 0);
    ctx.fillStyle = wi % 2 ? "#E8A93A" : "#fff";
    ctx.fillText(words[wi], 0, 0);
    ctx.restore();
    ctx.textAlign = "left";
    // timeline
    const rows: [number, number, string][][] = [
      [[0.02, 0.4, "#E8A93A"], [0.42, 0.78, "#E8A93A"]],
      [[0.1, 0.5, "#22D3EE"]],
      [[0.0, 0.7, "#6b7280"]],
    ];
    rows.forEach((row, i) => {
      row.forEach(([a, b, c]) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(28 + a * (W - 56), 520 + i * 52, (b - a) * (W - 56), 40, 10);
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
    const px = 28 + ((t * 0.12) % 1) * (W - 56);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px - 1.5, 500, 3, 180);
    // tabs
    ["Edit", "Look", "Audio", "Text"].forEach((label, i) => {
      ctx.fillStyle = i === 0 ? "#E8A93A" : "rgba(255,255,255,.1)";
      ctx.beginPath();
      ctx.roundRect(28 + i * 82, 722, 74, 46, 23);
      ctx.fill();
      ctx.fillStyle = i === 0 ? "#0B0F17" : "#cbd5e1";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText(label, 28 + i * 82 + 16, 752);
    });
    texture.needsUpdate = true;
  };

  group.scale.setScalar(1.15);
  return {
    group,
    update(t, pointer) {
      draw(t);
      group.rotation.y = -0.4 + Math.sin(t * 0.6) * 0.25 + pointer.x * 0.5;
      group.rotation.x = 0.06 - pointer.y * 0.2;
      group.position.y = Math.sin(t * 0.9) * 0.12;
    },
    dispose() {
      body.dispose();
      bodyMat.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      texture.dispose();
    },
  };
}

// ---- shared stage ----

export function createScene(kind: SceneKind, canvas: HTMLCanvasElement, options: SceneOptions): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffdca8, 2.2);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight(0x9fe8ff, 1.2);
  rim.position.set(-5, 2, -4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.25));

  const built = kind === "bricks" ? buildBricks() : kind === "monogram" ? buildMonogram() : buildPhone();
  scene.add(built.group);

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    target.x = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    target.y = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
  };
  const onDown = () => built.replay?.();
  window.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointerdown", onDown);

  const resize = () => {
    const parent = canvas.parentElement ?? canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0.5, 10.5 * Math.max(1, 1.05 / camera.aspect));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement ?? canvas);

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(canvas);

  // Speed watchdog: after a short warm-up, measure the frame rate. If it is poor, give up on 3D.
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let frames = 0;
  let windowStart = 0;
  let warm = 0;
  let measured = false;
  let disposed = false;

  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    if (!visible || document.hidden) {
      frames = 0;
      windowStart = 0;
      return;
    }
    clock += dt;
    pointer.x += (target.x - pointer.x) * Math.min(1, dt * 6);
    pointer.y += (target.y - pointer.y) * Math.min(1, dt * 6);
    built.update(clock, pointer);
    renderer.render(scene, camera);

    warm += dt;
    if (warm < 1.2) return;
    if (!windowStart) {
      windowStart = now;
      frames = 0;
    }
    frames++;
    const span = now - windowStart;
    if (span >= 1000) {
      const fps = (frames * 1000) / span;
      options.onFps?.(Math.round(fps));
      if (!measured && fps < 24) {
        measured = true;
        options.onSlow(Math.round(fps));
      }
      if (warm > 3.5) measured = true;
      windowStart = now;
      frames = 0;
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    replay: () => built.replay?.(),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      built.dispose();
      envTarget.dispose();
      pmrem.dispose();
      room.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
