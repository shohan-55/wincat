import * as THREE from "three";
const coats = {
  cream: [0xe5c8a5, 0xfaf0df],
  orange: [0xc98240, 0xffe3b6],
  grey: [0x8c939d, 0xdfe2e4],
  black: [0x30343d, 0x777b82],
  white: [0xeee9df, 0xffffff],
};
export function createCatScene(canvas, { overlay = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  camera.position.set(0, 2.6, 8.6);
  camera.lookAt(0, 1.15, 0);
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0x7b8598, 3));
  const light = new THREE.DirectionalLight(0xfff1d8, 4);
  light.position.set(-3, 6, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -5;
  light.shadow.camera.right = 5;
  light.shadow.camera.top = 5;
  light.shadow.camera.bottom = -5;
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xffffff, 2);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  const root = new THREE.Group();
  scene.add(root);
  const fur = new THREE.MeshStandardMaterial({
    color: 0xe5c8a5,
    roughness: 0.96,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xfaf0df,
    roughness: 1,
  });
  // Original 4K micro-strand bump texture, streamed only for High quality.
  const loader = new THREE.TextureLoader();
  const detailLow = loader.load(
    new URL("../../assets/textures/fur-detail-1k.png", import.meta.url).href,
  );
  let detailHigh = null;
  function configureDetail(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  configureDetail(detailLow);
  fur.bumpMap = detailLow;
  fur.bumpScale = 0.035;
  cream.bumpMap = detailLow;
  cream.bumpScale = 0.018;
  const pink = new THREE.MeshStandardMaterial({
    color: 0xdca4a0,
    roughness: 0.8,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x292d2b,
    roughness: 0.38,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: 0x98ac6c,
    roughness: 0.25,
    metalness: 0.05,
  });
  function ell(parent, mat, pos, scale) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  const body = ell(root, fur, [0, 0.85, 0], [0.66, 0.85, 0.51]);
  ell(root, cream, [0, 0.86, 0.39], [0.48, 0.63, 0.18]);
  const legs = [];
  for (const x of [-0.4, 0.4]) {
    ell(root, fur, [x, 0.34, -0.12], [0.3, 0.33, 0.36]);
    const leg = new THREE.Group();
    leg.position.set(x, 0.54, 0.34);
    root.add(leg);
    ell(leg, fur, [0, -0.2, 0], [0.18, 0.4, 0.19]);
    ell(leg, cream, [0, -0.43, 0.11], [0.22, 0.15, 0.29]);
    for (const dx of [-0.075, 0.075])
      ell(leg, fur, [dx, -0.45, 0.35], [0.012, 0.055, 0.016]);
    legs.push(leg);
  }
  const hindLegs = [];
  for (const x of [-0.43, 0.43]) {
    const joint = new THREE.Group();
    joint.position.set(x, 0.49, -0.23);
    root.add(joint);
    ell(joint, fur, [0, -0.12, 0], [0.25, 0.32, 0.26]);
    ell(joint, cream, [0, -0.37, 0.1], [0.23, 0.15, 0.28]);
    hindLegs.push(joint);
  }
  const head = new THREE.Group();
  head.position.set(0, 1.92, 0.1);
  root.add(head);
  ell(head, fur, [0, 0, 0], [0.83, 0.72, 0.64]);
  ell(head, cream, [0, -0.31, 0.4], [0.62, 0.34, 0.31]);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.56, 0.49, -0.05);
    ear.rotation.z = -side * 0.18;
    head.add(ear);
    const shape = new THREE.Shape();
    shape.moveTo(-0.29, 0);
    shape.quadraticCurveTo(-0.23, 0.45, 0, 0.68);
    shape.quadraticCurveTo(0.25, 0.39, 0.29, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 3,
      steps: 1,
    });
    const mesh = new THREE.Mesh(geo, fur);
    mesh.position.z = -0.04;
    ear.add(mesh);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape), pink);
    inner.scale.set(0.65, 0.71, 1);
    inner.position.set(0, 0.09, 0.16);
    ear.add(inner);
    ears.push(ear);
  }
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.34, 0.06, 0.54);
    eye.rotation.y = side * 0.22;
    head.add(eye);
    ell(eye, dark, [0, 0, 0], [0.235, 0.27, 0.11]);
    ell(eye, iris, [0, 0, 0.075], [0.19, 0.225, 0.075]);
    ell(eye, dark, [0, 0, 0.133], [0.095, 0.19, 0.035]);
    ell(
      eye,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      [-0.06, 0.09, 0.16],
      [0.048, 0.055, 0.025],
    );
    ell(
      eye,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      [0.06, -0.045, 0.166],
      [0.018, 0.02, 0.01],
    );
    eyes.push(eye);
    ell(head, cream, [side * 0.2, -0.25, 0.61], [0.24, 0.17, 0.13]);
  }
  ell(head, pink, [0, -0.22, 0.735], [0.105, 0.065, 0.057]);
  const yawnMouth = ell(head, dark, [0, -0.4, 0.69], [0.12, 0.008, 0.04]);
  const tongue = ell(head, pink, [0, -0.43, 0.73], [0.065, 0.005, 0.015]);
  function line(points, material, parent = root) {
    const g = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const l = new THREE.Line(g, material);
    parent.add(l);
    return l;
  }
  const whisker = new THREE.LineBasicMaterial({
    color: 0xd4c1ab,
    transparent: true,
    opacity: 0.75,
  });
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      line(
        [
          [side * 0.31, -0.29, 0.68],
          [side * 0.69, -0.24 + i * 0.09, 0.7],
          [side * 1.04, -0.24 + i * 0.13, 0.57],
        ],
        whisker,
        head,
      );
  const mouth = new THREE.LineBasicMaterial({ color: 0x7d6358 });
  line(
    [
      [0, -0.26, 0.73],
      [0, -0.34, 0.73],
      [-0.09, -0.38, 0.7],
    ],
    mouth,
    head,
  );
  line(
    [
      [0, -0.34, 0.73],
      [0.09, -0.38, 0.7],
    ],
    mouth,
    head,
  );
  const tail = new THREE.Group();
  tail.position.set(0.43, 0.4, -0.35);
  root.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.6, 0.12, -0.4),
    new THREE.Vector3(0.85, 0.55, -0.25),
    new THREE.Vector3(0.74, 0.9, -0.1),
  ]);
  const tailMesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 32, 0.14, 12, false),
    fur,
  );
  tail.add(tailMesh);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.ShadowMaterial({ opacity: 0.14 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const ball = new THREE.Group();
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x959ad1,
    roughness: 0.9,
  });
  ell(ball, ballMat, [0, 0.18, 0], [0.18, 0.18, 0.18]);
  ball.position.set(1.55, 0, 0.55);
  scene.add(ball);
  ball.visible = false;
  let w = 0,
    h = 0,
    lastRatio = 0,
    lastTime = 0;
  const pose = {
    sleep: 0,
    move: 0,
    paw: 0,
    stretch: 0,
    pounce: 0,
    yawn: 0,
    surprise: 0,
  };
  function smooth(key, target, dt) {
    pose[key] = THREE.MathUtils.damp(pose[key], target, 9, dt);
    return pose[key];
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width !== w || r.height !== h) {
      w = r.width;
      h = r.height;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
  }
  function render(
    t,
    state = "Idle",
    settings = {},
    look = { x: 0, y: 0 },
    velocity = 0,
  ) {
    resize();
    const dt = Math.min(0.1, Math.max(0, t - lastTime) || 1 / 60);
    lastTime = t;
    const high = settings.quality === "high";
    if (high && !detailHigh) {
      detailHigh = configureDetail(
        loader.load(
          new URL("../../assets/textures/fur-detail-4k.png", import.meta.url)
            .href,
        ),
      );
    }
    const detail = high ? detailHigh : detailLow;
    if (fur.bumpMap !== detail) {
      fur.bumpMap = detail;
      cream.bumpMap = detail;
      fur.needsUpdate = cream.needsUpdate = true;
    }
    const coat = coats[settings.appearance] || coats.cream;
    fur.color.setHex(coat[0]);
    cream.color.setHex(coat[1]);
    renderer.shadowMap.enabled = settings.shadows !== false;
    shadow.visible = settings.shadows !== false;
    const ratio = Math.min(
      devicePixelRatio,
      settings.quality === "economy" ? 1 : 2,
    );
    if (ratio !== lastRatio) {
      renderer.setPixelRatio(ratio);
      lastRatio = ratio;
    }
    const moving =
      ["Walking", "Running", "Investigating", "Playing"].includes(state) &&
      Math.abs(velocity) > 0.1;
    const sleep = smooth("sleep", state === "Sleeping" ? 1 : 0, dt);
    const move = smooth("move", moving ? 1 : 0, dt);
    const paw = smooth(
      "paw",
      ["Pawing", "Grooming", "Playing"].includes(state) ? 1 : 0,
      dt,
    );
    const stretch = smooth("stretch", state === "Stretching" ? 1 : 0, dt);
    const pounce = smooth("pounce", state === "Pouncing" ? 1 : 0, dt);
    const yawn = smooth("yawn", state === "Yawning" ? 1 : 0, dt);
    const surprise = smooth("surprise", state === "Surprised" ? 1 : 0, dt);
    const f = t * (state === "Running" ? 12 : 7);
    root.position.y =
      Math.abs(Math.sin(f)) * 0.055 * move +
      Math.sin(t * 2) * 0.012 +
      Math.max(0, Math.sin(t * 5)) * 0.45 * pounce +
      surprise * 0.1;
    root.scale.setScalar(settings.size || 1);
    root.rotation.y = THREE.MathUtils.damp(
      root.rotation.y,
      move
        ? Math.max(-0.9, Math.min(0.9, velocity / 140))
        : Math.sin(t * 0.3) * 0.08,
      7,
      dt,
    );
    root.rotation.x = stretch * 0.12;
    body.scale.y = 0.85 - sleep * 0.2 - stretch * 0.08;
    body.scale.z = 0.51 + move * 0.16 + stretch * 0.08;
    head.position.y = 1.92 - sleep * 0.42 - stretch * 0.28;
    head.rotation.y = THREE.MathUtils.damp(
      head.rotation.y,
      look.x * 0.35,
      9,
      dt,
    );
    head.rotation.x = THREE.MathUtils.damp(
      head.rotation.x,
      look.y * 0.18 + sleep * 0.28 - yawn * 0.15,
      9,
      dt,
    );
    head.rotation.z =
      state === "Grooming" ? Math.sin(t * 5) * 0.13 : Math.sin(t * 0.7) * 0.025;
    const blink =
      sleep > 0.5 ? 0.055 : Math.sin(t * 0.83) > 0.994 ? 0.12 : 1 - yawn * 0.7;
    for (const eye of eyes)
      eye.scale.y = THREE.MathUtils.damp(eye.scale.y, blink, 22, dt);
    legs.forEach((l, i) => {
      l.rotation.x = Math.sin(f + i * Math.PI) * 0.48 * move - stretch * 0.45;
      l.rotation.z = 0;
    });
    hindLegs.forEach(
      (l, i) => (l.rotation.x = Math.sin(f + (1 - i) * Math.PI) * 0.4 * move),
    );
    legs[1].rotation.x += (-1.1 + Math.sin(t * 7) * 0.25) * paw;
    legs[1].rotation.z = -0.25 * paw;
    yawnMouth.scale.y = 0.008 + Math.max(0, Math.sin(t * 1.8)) * 0.18 * yawn;
    tongue.scale.y = 0.005 + 0.045 * yawn;
    tail.rotation.y = Math.sin(t * 1.8) * 0.22;
    tail.rotation.z = Math.sin(t * 1.2) * 0.1;
    ears.forEach(
      (e, i) =>
        (e.rotation.z = (i ? -0.18 : 0.18) + Math.sin(t * 2 + i) * 0.04),
    );
    ball.visible = !!settings.toys && state === "Playing";
    if (ball.visible) ball.position.x = 1.2 + Math.sin(t * 2) * 0.4;
    renderer.render(scene, camera);
  }
  return {
    render,
    dispose() {
      const materials = new Set();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      for (const m of materials) m.dispose();
      detailLow.dispose();
      detailHigh?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
