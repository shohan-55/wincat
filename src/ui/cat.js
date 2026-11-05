import * as THREE from "three";
import { FelineMotion, solveTwoBone } from "../shared/locomotion.mjs";

const coats = {
  cream: [0xc6ad8b, 0xe6dccb],
  orange: [0xb77942, 0xe7cba4],
  grey: [0x737a7d, 0xb9bdb9],
  black: [0x292d30, 0x656969],
  white: [0xe2dfd5, 0xf0eee6],
};
export function createCatScene(canvas, { overlay = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(3.8, 2.7, 5.8);
  camera.lookAt(0, 0.91, 0);
  const azimuth = Math.atan2(camera.position.x, camera.position.z);
  scene.add(new THREE.HemisphereLight(0xf3f3ee, 0x737b83, 2.2));
  const key = new THREE.DirectionalLight(0xffeddb, 3.1);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0001;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f1ff, 1.2);
  fill.position.set(3, 2, -3);
  scene.add(fill);
  const root = new THREE.Group();
  root.rotation.y = -0.25;
  scene.add(root);
  const fur = new THREE.MeshStandardMaterial({
    color: coats.cream[0],
    roughness: 0.95,
  });
  const pale = new THREE.MeshStandardMaterial({
    color: coats.cream[1],
    roughness: 0.98,
  });
  const earSkin = new THREE.MeshStandardMaterial({
    color: 0xb88b86,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0x976a66,
    roughness: 0.66,
  });
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x3a302b,
    roughness: 0.92,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x899b66,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const pupilMat = new THREE.MeshPhysicalMaterial({
    color: 0x070c09,
    roughness: 0.13,
    clearcoat: 1,
  });
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x5b3436,
    roughness: 0.9,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xc88c8e,
    roughness: 0.8,
  });
  const loader = new THREE.TextureLoader();
  const low = loader.load(
    new URL("../../assets/textures/fur-detail-1k.png", import.meta.url).href,
  );
  let high = null;
  function detail(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  detail(low);
  fur.bumpMap = pale.bumpMap = low;
  fur.bumpScale = 0.012;
  pale.bumpScale = 0.008;
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  function ell(parent, material, p, s) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(...p);
    mesh.scale.set(...s);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const torso = new THREE.Group();
  root.add(torso);
  // A single continuous ribcage/waist/haunch surface, not a stack of spheres.
  const bodyProfile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.035, 0.07, 0.025),
    new THREE.Vector3(0.3, 0.33, 0.015),
    new THREE.Vector3(0.375, 0.39, 0.015),
    new THREE.Vector3(0.33, 0.35, 0),
    new THREE.Vector3(0.325, 0.36, 0.015),
    new THREE.Vector3(0.355, 0.43, 0.025),
    new THREE.Vector3(0.265, 0.36, 0.07),
    new THREE.Vector3(0.14, 0.225, 0.16),
    new THREE.Vector3(0.035, 0.09, 0.2),
  ]);
  const bodyGeometry = new THREE.BufferGeometry(),
    bodyPositions = [],
    bodyColors = [],
    bodyIndices = [];
  const bodyRings = 56,
    bodySides = 32;
  for (let i = 0; i <= bodyRings; i++) {
    const t = i / bodyRings,
      profile = bodyProfile.getPoint(t),
      z = -0.99 + t * 1.94;
    for (let j = 0; j <= bodySides; j++) {
      const angle = (j / bodySides) * Math.PI * 2,
        top = Math.sin(angle);
      bodyPositions.push(
        Math.cos(angle) * profile.x,
        profile.z + top * profile.y,
        z,
      );
      const stripe = Math.max(0, Math.sin(z * 22 + Math.cos(angle) * 1.7));
      const shade = 1 - stripe * 0.095 * Math.max(0, top + 0.35);
      bodyColors.push(shade, shade, shade);
      if (i < bodyRings && j < bodySides) {
        const a = i * (bodySides + 1) + j,
          b = a + bodySides + 1;
        bodyIndices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  bodyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bodyPositions, 3),
  );
  bodyGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(bodyColors, 3),
  );
  bodyGeometry.setIndex(bodyIndices);
  bodyGeometry.computeVertexNormals();
  const bodyMaterial = fur.clone();
  bodyMaterial.vertexColors = true;
  const abdomen = new THREE.Mesh(bodyGeometry, bodyMaterial);
  abdomen.castShadow = true;
  torso.add(abdomen);
  const neck = ell(root, fur, [0, 1.23, 0.77], [0.215, 0.29, 0.245]);
  neck.rotation.x = -0.28;
  // Short hair silhouette attached to the actual body parts, not a fuzzy screen-space blob.
  let seed = 17;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const hairs = [];
  const hairMat = new THREE.LineBasicMaterial({
    color: 0xd1bc9d,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  function hair(parent, scale, count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1,
        a = random() * Math.PI * 2,
        r = Math.sqrt(1 - y * y);
      const n = new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
      const p = new THREE.Vector3(
        n.x * scale[0],
        n.y * scale[1],
        n.z * scale[2],
      );
      const normal = new THREE.Vector3(
        n.x / scale[0],
        n.y / scale[1],
        n.z / scale[2],
      ).normalize();
      const q = p.clone().addScaledVector(normal, 0.012 + random() * 0.018);
      points.push(...p.toArray(), ...q.toArray());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(g, hairMat);
    parent.add(lines);
    hairs.push(lines);
  }
  // Hair coordinates are unit-sphere-local; the parent supplies anatomical scale.

  const head = new THREE.Group();
  root.add(head);
  const skull = ell(head, fur, [0, 0.02, 0], [0.365, 0.335, 0.35]);
  hair(skull, [1, 1, 1], 1000);
  ell(head, fur, [0, 0.08, 0.2], [0.235, 0.22, 0.235]);
  ell(head, pale, [-0.095, -0.105, 0.29], [0.115, 0.085, 0.135]);
  ell(head, pale, [0.095, -0.105, 0.29], [0.115, 0.085, 0.135]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.14, 0.19);
  head.add(jaw);
  ell(jaw, pale, [0, -0.042, 0.09], [0.155, 0.065, 0.15]);
  const mouth = ell(jaw, mouthMat, [0, 0.009, 0.12], [0.105, 0.014, 0.095]);
  const tongue = ell(jaw, tongueMat, [0, 0.027, 0.15], [0.055, 0.011, 0.045]);
  tongue.visible = false;
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-0.055, 0.022);
  noseShape.quadraticCurveTo(0, 0.04, 0.055, 0.022);
  noseShape.lineTo(0, -0.025);
  noseShape.closePath();
  const nose = new THREE.Mesh(new THREE.ShapeGeometry(noseShape), noseMat);
  nose.position.set(0, -0.09, 0.424);
  head.add(nose);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x6f5c4e,
    transparent: true,
    opacity: 0.65,
  });
  function line(parent, points, material = lineMat) {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Line(geo, material);
    parent.add(mesh);
    return mesh;
  }
  line(head, [
    [0, -0.112, 0.417],
    [0, -0.154, 0.406],
    [-0.045, -0.173, 0.393],
  ]);
  line(head, [
    [0, -0.154, 0.406],
    [0.045, -0.173, 0.393],
  ]);
  const whiskers = new THREE.LineBasicMaterial({
    color: 0xe5dfce,
    transparent: true,
    opacity: 0.65,
  });
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++)
      line(
        head,
        [
          [side * 0.115, -0.12, 0.37],
          [side * 0.29, -0.1 + (i - 1.5) * 0.035, 0.4],
          [
            side * (0.51 + Math.abs(i - 1.5) * 0.025),
            -0.11 + (i - 1.5) * 0.066,
            0.34,
          ],
        ],
        whiskers,
      );
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.255, 0.255, -0.065);
    ear.rotation.z = -side * 0.19;
    head.add(ear);
    const shape = new THREE.Shape();
    shape.moveTo(-0.135, 0);
    shape.quadraticCurveTo(-0.1, 0.21, -0.015, 0.345);
    shape.quadraticCurveTo(0.085, 0.23, 0.14, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.025,
      bevelSegments: 3,
      steps: 1,
    });
    const mesh = new THREE.Mesh(geo, fur);
    mesh.position.z = -0.02;
    ear.add(mesh);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape), earSkin);
    inner.scale.set(0.65, 0.72, 1);
    inner.position.set(0, 0.035, 0.034);
    ear.add(inner);
    ears.push(ear);
  }
  const eyes = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Group();
    socket.position.set(side * 0.181, 0.057, 0.277);
    socket.rotation.y = side * 0.37;
    head.add(socket);
    ell(socket, lidMat, [0, 0, 0], [0.105, 0.073, 0.047]);
    ell(socket, eyeMat, [0, 0, 0.017], [0.087, 0.065, 0.041]);
    const pupil = ell(socket, pupilMat, [0, 0, 0.055], [0.018, 0.058, 0.01]);
    // Physical, small catchlight; no giant painted cartoon highlights or white eyeballs.
    const shine = ell(
      socket,
      new THREE.MeshBasicMaterial({ color: 0xe6eeea }),
      [-0.023, 0.022, 0.065],
      [0.011, 0.014, 0.003],
    );
    const upper = ell(socket, fur, [0, 0.077, 0.024], [0.114, 0.038, 0.048]);
    const lower = ell(socket, fur, [0, -0.076, 0.018], [0.112, 0.027, 0.047]);
    eyes.push({ socket, pupil, shine, upper, lower });
  }
  const limbs = [];
  for (const [name, x, z, rear] of [
    ["hindLeft", -0.26, -0.64, true],
    ["frontLeft", -0.255, 0.54, false],
    ["hindRight", 0.26, -0.64, true],
    ["frontRight", 0.255, 0.54, false],
  ]) {
    const group = new THREE.Group();
    root.add(group);
    const limbGeometry = new THREE.BufferGeometry();
    const limbRings = 20,
      limbSides = 10;
    limbGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        new Float32Array((limbRings + 1) * (limbSides + 1) * 3),
        3,
      ),
    );
    const indices = [];
    for (let r = 0; r < limbRings; r++)
      for (let j = 0; j < limbSides; j++) {
        const a = r * (limbSides + 1) + j,
          b = a + limbSides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    limbGeometry.setIndex(indices);
    const surface = new THREE.Mesh(limbGeometry, fur);
    surface.castShadow = true;
    surface.frustumCulled = false;
    group.add(surface);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const paw = new THREE.Group();
    group.add(paw);
    ell(paw, pale, [0, 0.041, 0.026], [0.082, 0.062, 0.132]);
    const toeMat = new THREE.LineBasicMaterial({
      color: 0xa89a83,
      transparent: true,
      opacity: 0.22,
    });
    for (const dx of [-0.027, 0.027])
      line(
        paw,
        [
          [dx, 0.047, 0.148],
          [dx, 0.066, 0.109],
        ],
        toeMat,
      );
    limbs.push({ name, x, z, rear, surface, curve, paw });
  }
  // A continuous, tapered skinned tail. No independent cylinders or stiff pendulum.
  const tailLength = 1.45,
    tailBones = 9,
    tailGeo = new THREE.CylinderGeometry(
      0.026,
      0.092,
      tailLength,
      10,
      36,
      true,
    );
  tailGeo.rotateX(-Math.PI / 2);
  tailGeo.translate(0, 0, -tailLength / 2);
  const skinIndices = [],
    skinWeights = [];
  for (let i = 0; i < tailGeo.attributes.position.count; i++) {
    const z =
      (-tailGeo.attributes.position.getZ(i) / tailLength) * (tailBones - 1);
    const index = Math.min(tailBones - 2, Math.floor(Math.max(0, z)));
    const f = Math.min(1, z - index);
    skinIndices.push(index, index + 1, 0, 0);
    skinWeights.push(1 - f, f, 0, 0);
  }
  tailGeo.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndices, 4),
  );
  tailGeo.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeights, 4),
  );
  const tail = new THREE.SkinnedMesh(tailGeo, fur);
  const bones = [];
  for (let i = 0; i < tailBones; i++) {
    const bone = new THREE.Bone();
    bone.position.z = i ? -tailLength / (tailBones - 1) : 0;
    if (i) bones[i - 1].add(bone);
    bones.push(bone);
  }
  ell(bones[tailBones - 1], fur, [0, 0, -0.015], [0.043, 0.043, 0.05]);
  tail.add(bones[0]);
  tail.bind(new THREE.Skeleton(bones));
  tail.castShadow = true;
  root.add(tail);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.003;
  ground.receiveShadow = true;
  scene.add(ground);
  const ball = ell(
    scene,
    new THREE.MeshStandardMaterial({ color: 0x929cc5, roughness: 0.85 }),
    [1.25, 0.12, 0.8],
    [0.12, 0.12, 0.12],
  );
  ball.visible = false;
  const motion = new FelineMotion();
  let width = 0,
    height = 0,
    ratio = 0,
    lastTime = null,
    yaw = -0.25,
    blinkTime = 2.1,
    blinkAge = -1,
    eyeOpen = 1;
  function render(
    t,
    state = "Idle",
    settings = {},
    look = { x: 0, y: 0 },
    velocity = 0,
  ) {
    const rect = canvas.getBoundingClientRect();
    const nextRatio = Math.min(
      devicePixelRatio,
      settings.quality === "economy" ? 1 : 2,
    );
    if (nextRatio !== ratio) {
      ratio = nextRatio;
      renderer.setPixelRatio(ratio);
    }
    if (rect.width !== width || rect.height !== height) {
      width = rect.width;
      height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
    const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, t - lastTime));
    lastTime = t;
    const v = typeof velocity === "number" ? { x: velocity, y: 0 } : velocity;
    const pose = motion.update(dt, state, v, settings.size || 1),
      w = pose.weights;
    const coat = coats[settings.appearance] || coats.cream;
    fur.color.setHex(coat[0]);
    bodyMaterial.color.setHex(coat[0]);
    pale.color.setHex(coat[1]);
    hairMat.color.setHex(coat[1]);
    if (settings.quality === "high" && !high)
      high = detail(
        loader.load(
          new URL("../../assets/textures/fur-detail-4k.png", import.meta.url)
            .href,
        ),
      );
    const texture = settings.quality === "high" ? high : low;
    if (fur.bumpMap !== texture) {
      fur.bumpMap = pale.bumpMap = texture;
      bodyMaterial.bumpMap = texture;
      bodyMaterial.needsUpdate = true;
      fur.needsUpdate = pale.needsUpdate = true;
    }
    renderer.shadowMap.enabled = settings.shadows !== false;
    ground.visible = settings.shadows !== false;
    for (const hair of hairs) hair.visible = settings.quality !== "economy";
    root.scale.setScalar(settings.size || 1);
    let targetYaw = yaw;
    if (pose.speed > 8 && Math.hypot(v.x || 0, v.y || 0) > 1) {
      const sx = v.x || 0,
        sy = v.y || 0;
      const wx = Math.cos(azimuth) * sx - Math.sin(azimuth) * sy * 1.8,
        wz = -Math.sin(azimuth) * sx - Math.cos(azimuth) * sy * 1.8;
      targetYaw = Math.atan2(wx, wz);
    }
    if (v.preview && Math.hypot(v.x || 0, v.y || 0) < 1) targetYaw = -0.25;
    const delta = Math.atan2(
      Math.sin(targetYaw - yaw),
      Math.cos(targetYaw - yaw),
    );
    yaw += delta * (1 - Math.exp(-7 * dt));
    root.rotation.y = yaw;
    const cycle = pose.phase * Math.PI * 2;
    let pounce = 0;
    if (state === "Pouncing") {
      const age = pose.stateTime;
      pounce =
        age > 0.25 && age < 1
          ? Math.sin(((age - 0.25) / 0.75) * Math.PI) * 0.48
          : 0;
    }
    root.position.y = pounce;
    const anticipation =
      state === "Pouncing" && pose.stateTime < 0.35
        ? pose.stateTime < 0.25
          ? Math.sin(((pose.stateTime / 0.25) * Math.PI) / 2) * 0.1
          : 0.1 * (1 - (pose.stateTime - 0.25) / 0.1)
        : 0;
    const breathing = Math.sin(t * 2.15) * 0.004;
    torso.position.set(
      0,
      1.06 -
        0.22 * w.sit -
        0.64 * w.sleep -
        0.17 * w.stretch +
        breathing -
        anticipation,
      0,
    );
    torso.rotation.x = -0.36 * w.sit + 0.24 * w.stretch;
    torso.rotation.y = Math.sin(cycle) * 0.015 * pose.move;
    torso.rotation.z = Math.sin(cycle) * 0.012 * pose.move;
    abdomen.scale.y = 1 + breathing;
    const suspension = Math.cos(cycle * 2) * 0.024 * pose.move * pose.trot;
    torso.position.y += suspension;
    neck.position.set(
      0,
      1.23 + 0.07 * w.sit - 0.67 * w.sleep - 0.39 * w.stretch,
      0.77 - 0.12 * w.sit + 0.1 * w.stretch,
    );
    neck.rotation.x = -0.28 - 0.18 * w.sit + 0.2 * w.sleep;
    head.position.set(
      0.025 * w.sleep,
      1.43 +
        0.1 * w.sit -
        0.94 * w.sleep -
        0.6 * w.stretch -
        0.32 * w.groom -
        anticipation,
      0.99 - 0.18 * w.sit - 0.17 * w.sleep + 0.12 * w.stretch,
    );
    const attention = Math.hypot(look.x || 0, look.y || 0);
    const attentionX =
      Math.cos(azimuth) * (look.x || 0) -
      Math.sin(azimuth) * (look.y || 0) * 1.8;
    const attentionZ =
      -Math.sin(azimuth) * (look.x || 0) -
      Math.cos(azimuth) * (look.y || 0) * 1.8;
    const relativeAttention = Math.atan2(
      Math.sin(Math.atan2(attentionX, attentionZ) - yaw),
      Math.cos(Math.atan2(attentionX, attentionZ) - yaw),
    );
    const headYaw =
      attention > 0.04
        ? Math.max(-0.55, Math.min(0.55, relativeAttention)) *
          Math.min(1, attention * 2)
        : 0;
    head.rotation.y = THREE.MathUtils.damp(
      head.rotation.y,
      headYaw * (1 - w.sleep) + 0.08 * w.sleep,
      7,
      dt,
    );
    head.rotation.x = THREE.MathUtils.damp(
      head.rotation.x,
      (look.y || 0) * 0.18 + 0.18 * w.sleep - 0.22 * w.yawn + 0.35 * w.groom,
      7,
      dt,
    );
    head.rotation.z = THREE.MathUtils.damp(
      head.rotation.z,
      -0.1 * w.groom + 0.025 * Math.sin(t * 0.7) * (1 - w.sleep),
      5,
      dt,
    );
    for (const leg of limbs) {
      const foot = pose.feet[leg.name];
      const side = leg.x < 0 ? -1 : 1;
      let hipY = leg.rear
        ? 1.07 - 0.47 * w.sit - 0.65 * w.sleep
        : 1.1 - 0.05 * w.sit - 0.65 * w.sleep - 0.42 * w.stretch;
      let hipZ = leg.z + (leg.rear ? -0.06 * w.sit : -0.13 * w.sit);
      let footY = 0.055 + foot.y,
        footZ = leg.z + foot.z;
      footZ += leg.rear ? -0.06 * w.sit : 0.4 * w.stretch - 0.03 * w.sit;
      footZ += leg.rear ? 0.12 * w.sleep : -0.12 * w.sleep;
      let x = leg.x + side * 0.05 * w.sit;
      if (leg.name === "frontRight") {
        const reach =
          w.paw *
          (0.5 + 0.5 * Math.sin(Math.min(1, pose.stateTime / 1.2) * Math.PI));
        footY += reach * 0.35 + w.groom * 0.82;
        footZ += reach * 0.2 + w.groom * 0.48;
      }
      const hip = { y: hipY + suspension - anticipation, z: hipZ };
      const ankle = {
        y: footY + (leg.rear ? 0.19 : 0.12),
        z: footZ - (leg.rear ? 0.12 : 0),
      };
      const joint = solveTwoBone(
        hip,
        ankle,
        leg.rear ? 0.5 : 0.5,
        leg.rear ? 0.49 : 0.5,
        leg.rear ? -1 : 1,
      );
      if (!leg.rear && w.sleep > 0) {
        const folded = solveTwoBone(hip, ankle, 0.5, 0.5, -1);
        joint.y = THREE.MathUtils.lerp(joint.y, folded.y, w.sleep);
        joint.z = THREE.MathUtils.lerp(joint.z, folded.z, w.sleep);
      }
      leg.curve.points[0].set(x, hip.y, hip.z);
      leg.curve.points[1].set(x, joint.y, joint.z);
      leg.curve.points[2].set(x, ankle.y, ankle.z);
      leg.curve.points[3].set(x, footY + 0.025, footZ);
      const vertices = leg.surface.geometry.attributes.position;
      for (let r = 0; r <= 20; r++) {
        const t = r / 20,
          point = leg.curve.getPoint(t),
          tangent = leg.curve.getTangent(t);
        const radius = (leg.rear ? 0.145 : 0.094) * (1 - t) + 0.041 * t;
        const len = Math.hypot(tangent.y, tangent.z) || 1;
        for (let j = 0; j <= 10; j++) {
          const angle = (j / 10) * Math.PI * 2;
          vertices.setXYZ(
            r * 11 + j,
            point.x + Math.cos(angle) * radius,
            point.y - (Math.sin(angle) * radius * tangent.z) / len,
            point.z + (Math.sin(angle) * radius * tangent.y) / len,
          );
        }
      }
      vertices.needsUpdate = true;
      leg.surface.geometry.computeVertexNormals();
      leg.paw.position.set(x, footY - 0.025, footZ);
      leg.paw.rotation.x =
        -Math.sin(foot.phase * Math.PI * 2) *
        0.14 *
        pose.move *
        (foot.stance ? 0 : 1);
    }
    tail.position.set(0, 1.11 - 0.47 * w.sit - 0.69 * w.sleep, -0.89);
    bones[0].rotation.x =
      0.5 * (1 - pose.move) - 0.12 * pose.move - 0.25 * w.sleep;
    bones[0].rotation.y = 0.45 * w.sit + 1.25 * w.sleep;
    for (let i = 1; i < bones.length; i++) {
      bones[i].rotation.x =
        0.075 * (1 - pose.move) + 0.035 * Math.sin(t * 0.9 - i * 0.5);
      bones[i].rotation.y =
        0.06 * (1 - 0.85 * w.sleep) * Math.sin(t * 1.35 - i * 0.55) +
        0.11 * w.sleep;
    }
    // Irregular timed blinks; eye surface and pupils do not squash like rubber.
    if (dt > 0) {
      blinkTime -= dt;
      if (blinkTime <= 0 && blinkAge < 0) {
        blinkAge = 0;
        blinkTime = 2.4 + random() * 4.3;
      }
      if (blinkAge >= 0) {
        blinkAge += dt;
        if (blinkAge > 0.23) blinkAge = -1;
      }
    }
    const closed =
      blinkAge >= 0 ? Math.sin(Math.min(1, blinkAge / 0.23) * Math.PI) : 0;
    const openness = (1 - closed) * (1 - w.sleep * 0.98) * (1 - w.yawn * 0.65);
    eyeOpen = THREE.MathUtils.damp(eyeOpen, openness, 30, dt);
    for (const eye of eyes) {
      eye.upper.position.y = 0.077 - (1 - eyeOpen) * 0.085;
      eye.upper.scale.y = 0.038 + (1 - eyeOpen) * 0.055;
      eye.lower.position.y = -0.076 + (1 - eyeOpen) * 0.025;
      eye.pupil.position.x = Math.max(
        -0.015,
        Math.min(0.015, (look.x || 0) * 0.015 * (1 - w.sleep)),
      );
      eye.pupil.scale.x = 0.018 + 0.013 * w.surprise;
    }
    const earAttention = Math.sin(t * 0.63) > 0.97 ? 0.07 : 0;
    ears.forEach((ear, i) => {
      const side = i ? 1 : -1;
      ear.rotation.y = THREE.MathUtils.damp(
        ear.rotation.y,
        Math.max(
          -0.65,
          Math.min(
            0.65,
            Math.atan2(Math.sin(azimuth - yaw), Math.cos(azimuth - yaw)) * 0.55,
          ),
        ) +
          (look.x || 0) * 0.22 * (1 - w.sleep) -
          side * 0.22 * w.sleep +
          side * 0.38 * w.surprise,
        6,
        dt,
      );
      ear.rotation.z =
        -side * (0.19 + 0.18 * w.sleep + 0.28 * w.surprise) + earAttention;
    });
    const mouthOpening =
      w.yawn * Math.sin(Math.min(1, pose.stateTime / 2.5) * Math.PI) * 0.65;
    jaw.rotation.x =
      mouthOpening + w.groom * Math.max(0, Math.sin(t * 7)) * 0.1;
    mouth.visible = mouthOpening > 0.04 || w.groom > 0.3;
    tongue.visible =
      mouthOpening > 0.12 || (w.groom > 0.5 && Math.sin(t * 7) > 0.2);
    ball.visible = !!settings.toys && state === "Playing";
    ball.position.x = 1.2 + Math.sin(t * 1.8) * 0.25;
    ball.rotation.z = t * 1.8;
    canvas.dataset.motion = state;
    canvas.dataset.gait = pose.running ? "diagonal-trot" : "four-beat-walk";
    renderer.render(scene, camera);
  }
  return {
    render,
    dispose() {
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material])
            materials.add(material);
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      tail.skeleton.dispose();
      low.dispose();
      high?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
