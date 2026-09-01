import { useEffect, useRef } from 'react';

/**
 * Desktop-only 3D "living cell" for the home hero — a rotating cluster of shaded
 * spheres (nucleus + cytoplasm) with organelles "firing" and faint connections,
 * glowing over the dark hero. Three.js is dynamic-imported so it becomes its own
 * chunk that is fetched ONLY on desktop (the wrapper is `hidden lg:block`, and the
 * effect bails out below the lg breakpoint), never loading on phones.
 */
export default function HeroCell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    if (!mq.matches) return;               // never run on mobile / small screens
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const cv = canvasRef.current;
      if (disposed || !cv) return;

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 3.05);
      scene.add(new THREE.AmbientLight(0x3a4a66, 0.75));
      const key = new THREE.DirectionalLight(0xbfd8ff, 1.1); key.position.set(2, 2, 3); scene.add(key);
      const rim = new THREE.PointLight(0x35d0c0, 0.8, 20); rim.position.set(-3, -1, -2); scene.add(rim);

      const group = new THREE.Group(); scene.add(group);
      group.scale.setScalar(0.42);      // fits inside the target circle
      group.position.y = 0.38;          // sit slightly above centre in the right zone

      // helpers
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);
      const pointInSphere = (R: number) => {
        const u = Math.random(), v = Math.random(), th = u * 6.283, ph = Math.acos(2 * v - 1);
        const rr = R * Math.cbrt(Math.random());
        return new THREE.Vector3(rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th), rr * Math.cos(ph) * 0.82);
      };

      // --- sphere-cluster cell (design 5) ---
      const N = 1700;
      const CORE = Math.floor(N * 0.34);
      const pos: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i < N; i++) pos.push(pointInSphere(i < CORE ? 0.6 : 1.25));

      const geo = new THREE.IcosahedronGeometry(0.028, 1);
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.0 });
      const mesh = new THREE.InstancedMesh(geo, mat, N);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const dummy = new THREE.Object3D();
      const base = new THREE.Color(0x2f7ad6), coreCol = new THREE.Color(0x6fb0ff);
      const fire = new THREE.Color(0xffd23f), fire2 = new THREE.Color(0x39e08a);
      const act = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const core = i < CORE;
        dummy.position.copy(pos[i]); dummy.scale.setScalar(core ? rnd(0.9, 1.5) : rnd(0.7, 1.25)); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, core ? coreCol : base);
      }
      group.add(mesh);

      // faint connections
      const segs: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i < 260; i++) {
        const a = Math.floor(rnd(0, N)); let best = -1, bd = 9;
        for (let k = 0; k < 6; k++) { const b = Math.floor(rnd(0, N)); const d = pos[a].distanceTo(pos[b]); if (d < bd && d > 0.05) { bd = d; best = b; } }
        if (best >= 0 && bd < 0.5) segs.push(pos[a], pos[best]);
      }
      const lg = new THREE.BufferGeometry().setFromPoints(segs);
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.12, depthWrite: false }));
      group.add(lines);

      // membrane glow (fresnel rim)
      const membrane = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 48, 48),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(0x3a86ff) }, uPow: { value: 3.0 }, uInt: { value: 0.4 } },
          vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }',
          fragmentShader: 'uniform vec3 uColor; uniform float uPow; uniform float uInt; varying vec3 vN; varying vec3 vP; void main(){ vec3 V=normalize(-vP); float f=pow(1.0-max(dot(normalize(vN),V),0.0),uPow); gl_FragColor=vec4(uColor,f*uInt); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      group.add(membrane);

      const tmp = new THREE.Color();
      function resize() {
        const r = renderer.domElement.getBoundingClientRect();
        if (!r.width || !r.height) return;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
      }
      const ro = new ResizeObserver(resize); ro.observe(renderer.domElement); resize();

      let raf = 0, running = true, t = 0;
      function frame() {
        if (!running) return;
        raf = requestAnimationFrame(frame);
        t += 0.016;
        group.rotation.y += reduce ? 0.0012 : 0.0032;
        group.rotation.x = Math.sin(t * 0.25) * 0.12;
        if (!reduce) {
          for (let s = 0; s < 7; s++) act[Math.floor(rnd(0, N))] = 1;
          for (let i = 0; i < N; i++) if (act[i] > 0.001) { act[i] *= 0.94; const core = i < CORE; tmp.copy(core ? coreCol : base).lerp(i % 3 ? fire : fire2, Math.min(1, act[i])); mesh.setColorAt(i, tmp); }
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        renderer.render(scene, camera);
      }
      const onVis = () => { if (document.hidden) { running = false; } else if (!running) { running = true; raf = requestAnimationFrame(frame); } };
      document.addEventListener('visibilitychange', onVis);
      frame();

      cleanup = () => {
        running = false; cancelAnimationFrame(raf); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        geo.dispose(); mat.dispose(); lg.dispose(); (membrane.material as any).dispose(); membrane.geometry.dispose();
        renderer.dispose();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50%] lg:block"
      aria-hidden="true"
      style={{
        // Fade the left edge so the cell dissolves into the hero black
        // instead of ending in a hard round-blob crescent.
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 20%, #000 42%)',
        maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 20%, #000 42%)',
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
