import { useEffect, useRef } from 'react';

/**
 * Desktop-only 3D "living cell" for the home hero — a rotating cell mid-division
 * (mitosis): two translucent membranes pinching at a cleavage furrow with a spindle
 * and paired chromosomes, glowing over the dark hero. Three.js is dynamic-imported so it becomes its own
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
      const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const sphere = (r: number, seg = 32) => new THREE.SphereGeometry(r, seg, seg);
      const fresnel = (color: number, pow = 2.6, int = 1.15) =>
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: pow }, uInt: { value: int } },
          vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }',
          fragmentShader: 'uniform vec3 uColor; uniform float uPow; uniform float uInt; varying vec3 vN; varying vec3 vP; void main(){ vec3 Vv=normalize(-vP); float f=pow(1.0-max(dot(normalize(vN),Vv),0.0),uPow); gl_FragColor=vec4(uColor, f*uInt); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        });

      // --- dividing cell / mitosis (design 3) ---
      // two membranes pinching at a cleavage furrow, a spindle and paired chromosomes
      const mk = (x: number) => {
        const c = new THREE.Group();
        c.add(new THREE.Mesh(sphere(0.92, 48), fresnel(0x59b6ff, 2.4, 1.0)));
        c.add(new THREE.Mesh(sphere(0.4, 24), new THREE.MeshStandardMaterial({ color: 0x2b6fd6, emissive: 0x14346e, roughness: 0.4, transparent: true, opacity: 0.85 })));
        c.position.x = x;
        return c;
      };
      const cellL = mk(-0.62), cellR = mk(0.62); group.add(cellL, cellR);

      // spindle fibres between the poles
      const segs: InstanceType<typeof THREE.Vector3>[] = [];
      const pL = V(-1.5, 0, 0), pR = V(1.5, 0, 0);
      for (let i = 0; i < 24; i++) {
        const a = rnd(0, 6.28);
        const off = V(0, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        segs.push(pL.clone().add(off.clone().multiplyScalar(0.3)), off.clone(), off.clone(), pR.clone().add(off.clone().multiplyScalar(0.3)));
      }
      const lg = new THREE.BufferGeometry().setFromPoints(segs);
      const spindle = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(spindle);

      // chromosomes (small V pairs) at the metaphase plate
      const chr = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(sphere(0.06, 10), new THREE.MeshStandardMaterial({ color: 0x35d0c0, emissive: 0x0e5a50, roughness: 0.4 }));
        m.scale.set(1, 2.4, 1);
        const a = (i / 6) * 6.28;
        m.position.set(0, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        m.rotation.z = rnd(-0.5, 0.5);
        chr.add(m);
      }
      group.add(chr);

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
        group.rotation.y += reduce ? 0.0012 : 0.0028;
        group.rotation.x = Math.sin(t * 0.25) * 0.1;
        // cleavage: the two poles drift apart and back — "life happening"
        const s = 0.62 + Math.abs(Math.sin(t * (reduce ? 0.2 : 0.5))) * 0.28;
        cellL.position.x = -s; cellR.position.x = s;
        renderer.render(scene, camera);
      }
      const onVis = () => { if (document.hidden) { running = false; } else if (!running) { running = true; raf = requestAnimationFrame(frame); } };
      document.addEventListener('visibilitychange', onVis);
      frame();

      cleanup = () => {
        running = false; cancelAnimationFrame(raf); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        group.traverse((o) => {
          const a = o as unknown as { geometry?: { dispose(): void }; material?: unknown };
          if (a.geometry) a.geometry.dispose();
          if (a.material) (Array.isArray(a.material) ? a.material : [a.material]).forEach((m: { dispose?: () => void }) => m.dispose && m.dispose());
        });
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
