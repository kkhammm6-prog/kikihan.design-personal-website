(() => {
  const host = document.querySelector('#original-lanyard-canvas');
  if (!host || !window.THREE || !THREE.GLTFLoader) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.setAttribute('aria-label', 'Draggable 3D WeChat contact card');
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-5, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.7); rim.position.set(6, -2, 5); scene.add(rim);

  const anchor = new THREE.Vector3(0, 3.9, 0);
  const position = new THREE.Vector3(2.7, 1.35, 0);
  const velocity = new THREE.Vector3(-0.07, 0.02, 0);
  const dragPoint = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let cardGroup = null;
  let dragging = false;

  const stringTexture = new THREE.TextureLoader().load('https://framerusercontent.com/images/V8VdbvKWpML0Wc6yCb5a35o.png?width=250&height=50');
  stringTexture.wrapS = stringTexture.wrapT = THREE.RepeatWrapping;
  stringTexture.repeat.set(12, 1);
  const ropeMaterial = new THREE.MeshStandardMaterial({ map: stringTexture, roughness: 0.82, metalness: 0.04 });
  const rope = new THREE.Mesh(new THREE.BufferGeometry(), ropeMaterial);
  scene.add(rope);

  const updateRope = () => {
    const connector = position.clone().add(new THREE.Vector3(0, 1.28, 0));
    const midpoint = anchor.clone().lerp(connector, 0.5);
    midpoint.y -= Math.min(1.2, anchor.distanceTo(connector) * 0.19);
    const curve = new THREE.CatmullRomCurve3([anchor, anchor.clone().lerp(midpoint, 0.55), midpoint, connector], false, 'chordal');
    const next = new THREE.TubeGeometry(curve, 36, 0.045, 8, false);
    rope.geometry.dispose();
    rope.geometry = next;
  };

  const loader = new THREE.GLTFLoader();
  loader.load('https://framerusercontent.com/assets/mv3nY4GEDXqOTCVSvcDUNBfFOI.glb', (gltf) => {
    cardGroup = gltf.scene;
    window.__originalLanyardModel = cardGroup;
    cardGroup.scale.setScalar(2.25);
    cardGroup.position.copy(position);
    cardGroup.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      const isMetal = /clip|clamp/i.test(child.name);
      child.material = new THREE.MeshPhysicalMaterial({
        color: isMetal ? 0x787878 : 0xffffff,
        metalness: isMetal ? 0.82 : 0.24,
        roughness: isMetal ? 0.28 : 0.72,
        clearcoat: isMetal ? 0.72 : 0.18,
        clearcoatRoughness: 0.16,
      });
    });
    const sourceImage = new Image();
    sourceImage.crossOrigin = 'anonymous';
    sourceImage.onload = () => {
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = cardCanvas.height = 1024;
      const ctx = cardCanvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(sourceImage, 0, 5, 512, 765);
      const flipped = document.createElement('canvas');
      flipped.width = flipped.height = 1024;
      const flippedCtx = flipped.getContext('2d');
      flippedCtx.scale(1, -1);
      flippedCtx.translate(0, -1024);
      flippedCtx.drawImage(cardCanvas, 0, 0);
      const texture = new THREE.CanvasTexture(flipped);
      texture.encoding = THREE.sRGBEncoding;
      cardGroup.traverse((child) => {
        if (!child.isMesh || /clip|clamp/i.test(child.name) || !child.material) return;
        child.material.map = texture;
        child.material.needsUpdate = true;
      });
    };
    sourceImage.src = 'https://framerusercontent.com/images/m91EJRK8ol36ILeDFi7VA7zUg.png?width=710&height=1060';
    scene.add(cardGroup);
  });

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const setPointer = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  };
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!cardGroup) return;
    setPointer(event);
    const hit = raycaster.intersectObject(cardGroup, true)[0];
    if (!hit) return;
    renderer.domElement.setPointerCapture(event.pointerId);
    dragging = true;
    raycaster.ray.intersectPlane(plane, dragPoint);
    dragPoint.sub(position);
    event.stopPropagation();
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    setPointer(event);
    const next = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, next)) position.copy(next.sub(dragPoint));
    event.stopPropagation();
  });
  const release = (event) => { dragging = false; velocity.set(0, -0.015, 0); event.stopPropagation(); };
  renderer.domElement.addEventListener('pointerup', release);
  renderer.domElement.addEventListener('pointercancel', release);

  const tick = () => {
    requestAnimationFrame(tick);
    if (cardGroup && !dragging) {
      const pull = anchor.clone().sub(position);
      const distance = pull.length();
      pull.normalize().multiplyScalar(Math.max(0, distance - 2.82) * 0.015);
      velocity.add(pull);
      velocity.y -= 0.0037;
      velocity.multiplyScalar(0.986);
      position.add(velocity);
      if (position.y < -2.35) { position.y = -2.35; velocity.y *= -0.32; }
    }
    if (cardGroup) {
      cardGroup.position.copy(position);
      cardGroup.rotation.set(velocity.y * 0.75, Math.PI - velocity.x * 0.75, -velocity.x * 0.32);
    }
    updateRope();
    renderer.render(scene, camera);
  };
  tick();
})();
