let scene, camera, renderer, controls, pizarra, pizarraTexture, canvas, ctx;
// Camera smoothing targets
let cameraTargetPosition, cameraTargetLookAt;
const cameraLerpSpeed = 0.12; // between 0 (no move) and 1 (instant)

// Clock references
let clockGroup = null;
let clockHands = { hour: null, minute: null, second: null };
let currentInfoType = "";
// PointerLock / first-person controls
let pointerControls = null;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();
// Collidable objects list
let collidableMeshes = [];

// Temporary boxes used for collision tests
const playerBox = new THREE.Box3();
const tmpBox = new THREE.Box3();

function playerCollidesAt(position) {
  // player size (width, height, depth)
  const playerSize = new THREE.Vector3(0.6, 1.6, 0.6);
  const center = new THREE.Vector3(position.x, position.y - playerSize.y / 2 + 0.1, position.z);
  playerBox.setFromCenterAndSize(center, playerSize);

  for (let i = 0; i < collidableMeshes.length; i++) {
    const m = collidableMeshes[i];
    if (!m.geometry) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    tmpBox.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
    if (playerBox.intersectsBox(tmpBox)) return true;
  }
  return false;
}

// Room bounds to keep player inside (adjust if walls change)
// Room configuration
const roomConfig = {
  width: 12, // X size
  depth: 12, // Z size
  height: 6,
  wallThickness: 0.12,
};

// Bounds derived from room config (player stays inside unless door opened)
let allowExit = false;
const roomBounds = {
  minX: -roomConfig.width / 2 + 0.5,
  maxX: roomConfig.width / 2 - 0.5,
  minZ: -roomConfig.depth / 2 + 0.5,
  maxZ: roomConfig.depth / 2 - 0.5,
};

// Door state
let doorGroup = null;
let doorOpen = false;
const doorConfig = { width: 1.0, height: 2.1 };

// GLTF chair model
let chairGLTF = null;
let chairReady = false;
let chairMaterial = null;
// reference to furniture group so we can replace procedural chairs after GLTF loads
let furnitureGroup = null;


// Información para la pizarra
const infoData = {
  fechas: "📅 FECHAS IMPORTANTES 2024\n\n📅 Inscripciones: 15/01 - 28/02\n📅 Nivelación: 01/03 - 30/04\n📅 Exámenes: 05-10/05\n📅 Resultados: 15/05\n📅 Inicio Clases: 01/06",
  requisitos: "📋 REQUISITOS DE INGRESO\n\n✅ DNI\n✅ Título secundario\n✅ Certificado estudios\n✅ 2 Fotos 4x4\n✅ Certificado médico\n✅ Formulario completo",
  materias: "📚 MATERIAS NIVELACIÓN\n\n🧮 Matemática\n🔬 Física\n🧪 Química\n💻 Informática\n📝 Comunicación",
  contacto: "📞 CONTACTO\n\n📧 ingreso@universidad.edu.ar\n📞 (011) 1234-5678\n🏢 Av. Universidad 1234\n⏰ Lun-Vie 8:00-18:00\n🌐 www.universidad.edu.ar"
};

// Corrección de textos con caracteres legibles
infoData.fechas =
  "FECHAS IMPORTANTES 2024\n\n" +
  "• Inscripciones: 15/01 - 28/02\n" +
  "• Nivelación: 01/03 - 30/04\n" +
  "• Exámenes: 05-10/05\n" +
  "• Resultados: 15/05\n" +
  "• Inicio de clases: 01/06";
infoData.requisitos =
  "REQUISITOS DE INGRESO\n\n" +
  "• DNI\n" +
  "• Título secundario\n" +
  "• Certificado de estudios\n" +
  "• 2 fotos 4x4\n" +
  "• Certificado médico\n" +
  "• Formulario completo";
infoData.materias =
  "MATERIAS DE NIVELACIÓN\n\n" +
  "• Matemática\n" +
  "• Física\n" +
  "• Química\n" +
  "• Informática\n" +
  "• Comunicación";
infoData.contacto =
  "CONTACTO\n\n" +
  "• Email: ingreso@universidad.edu.ar\n" +
  "• Tel: (011) 1234-5678\n" +
  "• Dirección: Av. Universidad 1234\n" +
  "• Horario: Lun–Vie 8:00–18:00\n" +
  "• Web: www.universidad.edu.ar";

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe6e9);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // place camera inside the room (center) at eye height
  camera.position.set(0, 1.6, 0);
  // initialize smooth camera target positions
  cameraTargetPosition = camera.position.clone();
  cameraTargetLookAt = new THREE.Vector3(0, 2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  // Use physically correct lighting and sRGB output for more realistic colors
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  document.getElementById("canvas-container").appendChild(renderer.domElement);

  // Controles de cámara
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 2;
  controls.maxDistance = 15;

  // PointerLockControls (primera persona)
  pointerControls = new THREE.PointerLockControls(camera, renderer.domElement);
  // The controls contain an Object3D which should be part of the scene
  scene.add(pointerControls.getObject());
  // Ensure the pointer lock object starts where the camera is
  pointerControls.getObject().position.copy(camera.position);
  // keep camera local position at origin relative to the controls object
  camera.position.set(0, 0, 0);
  // keep camera target in sync with controls object
  cameraTargetPosition = pointerControls.getObject().position.clone();

  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.addEventListener('click', function () {
      pointerControls.lock();
    });
  }

  // PointerLock events
  document.addEventListener('pointerlockchange', function () {
    const locked = document.pointerLockElement === renderer.domElement || document.pointerLockElement === document.body;
    if (locked) {
      // disable orbit controls while in first person
      controls.enabled = false;
    } else {
      controls.enabled = true;
    }
  });

  // Load GLTF chair model (if exists)
  try {
    const loader = new THREE.GLTFLoader();
    loader.load('assets/models/scene.gltf', (gltf) => {
      chairGLTF = gltf.scene;
      chairReady = true;
      // capture first mesh material as reference
      chairGLTF.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          if (!chairMaterial) chairMaterial = c.material;
        }
      });
      console.log('Chair GLTF loaded');
  // replace any procedural chairs created before the model finished loading
  try { replaceProceduralChairs(); } catch (e) { /* non-fatal */ }
    }, undefined, (err) => {
      console.warn('Failed to load chair GLTF', err);
    });
  } catch (e) {
    console.warn('GLTFLoader unavailable', e);
  }

  // Keyboard handlers for movement
  const onKeyDown = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        // swapped: A moves right
        moveRight = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        // swapped: D moves left
        moveLeft = true;
        break;
      case 'Space':
        if (canJump === true) velocity.y += 7;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        // swapped: A moves right
        moveRight = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        // swapped: D moves left
        moveLeft = false;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Luces
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b0b0, 0.35));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  // Escena
  createFloor();
  createWalls();
  createPizarra();
  createClassroomFurniture();
  createAirConditioner();
  // Añadir reloj en la pared
  createClock();

  document.querySelector(".loading").style.display = "none";
  animate();

  window.addEventListener("resize", onWindowResize);
}

function createFloor() {
  const textureLoader = new THREE.TextureLoader();
  const woodTexture = textureLoader.load(
    "assets/textures/depositphotos_14119266-stock-photo-wooden-floor.jpg"
  );
  // The wood texture is a color map: use sRGB encoding for correct appearance under PBR lighting
  woodTexture.encoding = THREE.sRGBEncoding;
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  // repeat relative to room size for better tiling
  woodTexture.repeat.set(Math.max(2, roomConfig.width / 2), Math.max(2, roomConfig.depth / 2));
  if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
    woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomConfig.width, roomConfig.depth),
    new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.85, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

function createWalls() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.95, metalness: 0.0 });

  const w = roomConfig.width;
  const d = roomConfig.depth;
  const h = roomConfig.height;
  const t = roomConfig.wallThickness;

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 1.0 }));
  ceiling.position.set(0, h, 0);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Back wall (no door)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMaterial);
  backWall.position.set(0, h / 2, -d / 2 + t / 2);
  scene.add(backWall);

  // Left wall with window
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(d, h, t), wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-w / 2 + t / 2, h / 2, 0);
  scene.add(leftWall);

  // Right wall with window
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(d, h, t), wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(w / 2 - t / 2, h / 2, 0);
  scene.add(rightWall);

  // Front wall with door (we'll create door group that can open)
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMaterial);
  frontWall.position.set(0, h / 2, d / 2 - t / 2);
  scene.add(frontWall);

  // Windows: create glass quads on left & right
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfdfff, transparent: true, opacity: 0.6, roughness: 0.2 });
  const windowLeft = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), glassMat);
  windowLeft.position.set(-w / 2 + 0.02, 3.0, 0);
  windowLeft.rotation.y = Math.PI / 2;
  scene.add(windowLeft);

  const windowRight = windowLeft.clone();
  windowRight.position.set(w / 2 - 0.02, 3.0, 0);
  windowRight.rotation.y = -Math.PI / 2;
  scene.add(windowRight);

  // Door: create as separate group with pivot at hinge (right side of door)
  doorGroup = new THREE.Group();
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b3f1f });
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorConfig.width, doorConfig.height, 0.04), doorMat);
  // place door geometry so its left edge is at x=0, pivot at hinge on left
  door.geometry.translate(doorConfig.width / 2, 0, 0);
  // position the group at hinge location (near front wall, right side)
  const hingeX = w / 2 - 1.1 - doorConfig.width / 2;
  doorGroup.position.set(hingeX, 0, d / 2 - t - 0.02);
  door.position.set(0, doorConfig.height / 2, 0);
  doorGroup.add(door);
  scene.add(doorGroup);

  // Register collidables (walls, windows frames, door when closed)
  [backWall, leftWall, rightWall, frontWall, windowLeft, windowRight].forEach((m) => collidableMeshes.push(m));
  collidableMeshes.push(door);

  // Door interaction: open when near and press E
  function isPlayerNearDoor() {
    const playerPos = pointerControls ? pointerControls.getObject().position : camera.position;
    const doorWorldPos = new THREE.Vector3();
    doorGroup.getWorldPosition(doorWorldPos);
    const dx = playerPos.x - doorWorldPos.x;
    const dz = playerPos.z - doorWorldPos.z;
    return Math.sqrt(dx * dx + dz * dz) < 2.0; // within 2 meters
  }

  // Add key listener for E to toggle door
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
      if (isPlayerNearDoor()) {
        doorOpen = !doorOpen;
        // when opening, allow exit
        if (doorOpen) allowExit = true;
      }
    }
  });
}

function createPizarra() {
  canvas = document.createElement("canvas");
  // Increase canvas resolution for crisper text when used as a texture
  canvas.width = 1024;
  canvas.height = 512;
  ctx = canvas.getContext("2d");

  drawPizarraText("🏫 BIENVENIDO INGRESANTE\n\nSelecciona una opción para ver\ninformación sobre el ingreso\nuniversitario");

  pizarraTexture = new THREE.CanvasTexture(canvas);
  // Make sure canvas texture uses sRGB encoding so colors match the scene
  pizarraTexture.encoding = THREE.sRGBEncoding;
  pizarraTexture.minFilter = THREE.LinearFilter;
  // Forzar mensaje inicial legible en la pizarra
  drawPizarraText("¡Bienvenido/a ingresante!\n\nSeleccioná una opción\npara ver la información\nsobre el ingreso");
  const chalkboard = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 2),
    new THREE.MeshBasicMaterial({ map: pizarraTexture })
  );
  chalkboard.position.set(0, 2.5, -4.9);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
  );
  frame.position.set(0, 2.5, -5);

  pizarra = new THREE.Group();
  pizarra.add(frame);
  pizarra.add(chalkboard);
  scene.add(pizarra);
  pizarra.traverse((c) => { if (c.isMesh) collidableMeshes.push(c); });
}

function drawPizarraText(text) {
  // Verde pizarra
  ctx.fillStyle = "#1d3f2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ecf0f1";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";

  const lines = text.split("\n");
  const lineHeight = 28;
  const startY = canvas.height / 2 - (lines.length / 2) * lineHeight;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });

  if (pizarraTexture) pizarraTexture.needsUpdate = true;
}

function createClassroomFurniture() {
  const group = new THREE.Group();
  // keep reference globally for later replacement
  furnitureGroup = group;

  // Texturas locales para mesas y sillas
  const textureLoader = new THREE.TextureLoader();
  const woodPath = "assets/textures/tablas-madera-textura-madera-rustica-superficie-madera-texto-o-fondo_1021907-9850.avif";
  const deskWoodTex = textureLoader.load(
    woodPath,
    (t) => {
  // Color textures must use sRGB encoding when used with MeshStandardMaterial
  t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2, 2);
      if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    },
    undefined,
    () => console.warn("No se pudo cargar la textura de madera para mesas.")
  );
  const chairWoodTex = textureLoader.load(
    woodPath,
    (t) => {
  t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, 1);
      if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    },
    undefined,
    () => console.warn("No se pudo cargar la textura de madera para sillas.")
  );

  for (let i = -2; i <= 2; i += 2) {
    for (let j = -1; j <= 1; j++) {
      // Mesa: tapa de madera + patas metálicas
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.08, 1),
        new THREE.MeshStandardMaterial({ map: deskWoodTex, roughness: 0.7, metalness: 0.05 })
      );
      deskTop.position.set(i * 2, 0.8, j * 2);
      deskTop.castShadow = true;

      const legMat = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.6, metalness: 0.2 });
      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12);
      const legOffsets = [
        [-0.7, 0.475, -0.45],
        [0.7, 0.475, -0.45],
        [-0.7, 0.475, 0.45],
        [0.7, 0.475, 0.45],
      ];
      legOffsets.forEach(([dx, dy, dz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(i * 2 + dx, dy, j * 2 + dz);
        leg.castShadow = true;
        group.add(leg);
      });

      // Silla: si cargó el modelo GLTF, instanciarlo; si no, fallback a mesh simple
      if (chairReady && chairGLTF) {
        const instance = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(chairGLTF) : chairGLTF.clone();
        // scale and position model to fit seat coords
        instance.scale.set(0.8, 0.8, 0.8);
        instance.position.set(i * 2, 0, j * 2.6);
        // orient the chair to face the pizarra
        faceTowardsPizarra(instance);
        instance.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            // apply GLTF material color so chairs look identical
            if (chairMaterial) c.material = chairMaterial;
            collidableMeshes.push(c);
          }
        });
        group.add(instance);
      } else {
        // Silla simple procedimental: crear un grupo local para la silla y posicionar sus partes en coordenadas locales
        const chairGroup = new THREE.Group();
        chairGroup.position.set(i * 2, 0, j * 2.6);

        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.06, 0.6),
          new THREE.MeshStandardMaterial({ map: chairWoodTex, roughness: 0.75, metalness: 0.05 })
        );
        seat.position.set(0, 0.45, 0);
        seat.castShadow = true;

        const back = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.5, 0.06),
          new THREE.MeshStandardMaterial({ map: chairWoodTex, roughness: 0.75, metalness: 0.05 })
        );
        back.position.set(0, 0.7, 0.25);
        back.castShadow = true;

        const chairLegGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 10);
        const chairLegMat = legMat;
        const chairLegOffsets = [
          [-0.35, 0.25, -0.25],
          [0.35, 0.25, -0.25],
          [-0.35, 0.25, 0.25],
          [0.35, 0.25, 0.25],
        ];
        chairLegOffsets.forEach(([dx, dy, dz]) => {
          const cleg = new THREE.Mesh(chairLegGeo, chairLegMat);
          cleg.position.set(dx, dy, dz);
          cleg.castShadow = true;
          chairGroup.add(cleg);
        });

        chairGroup.add(seat, back);
        // mark for replacement later when GLTF is available
        chairGroup.userData.isProceduralChair = true;
        // orient the chair to face the pizarra
        faceTowardsPizarra(chairGroup);
        group.add(deskTop, chairGroup);
      }
    }
  }

  scene.add(group);
  // Register furniture pieces for collisions
  group.traverse((child) => {
    if (child.isMesh) collidableMeshes.push(child);
  });
}

// Make an object face the chalkboard (pizarra). Accepts Group or Mesh.
function faceTowardsPizarra(obj) {
  if (!pizarra) return;
  // Chalkboard position in world
  const boardPos = new THREE.Vector3();
  pizarra.getWorldPosition(boardPos);
  // Target look direction from object to board
  const objPos = new THREE.Vector3();
  obj.getWorldPosition(objPos);
  const dir = new THREE.Vector3().subVectors(boardPos, objPos);
  // Compute angle around Y axis
  const angle = Math.atan2(dir.x, dir.z);
  // set rotation so the chair faces the board (rotate Y by angle +/- correction)
  obj.rotation.y = angle + Math.PI; // add PI so front of chair points to board
}

// Replace procedural chairs in the furnitureGroup with GLTF clones preserving transform and applying chairMaterial
function replaceProceduralChairs() {
  if (!furnitureGroup || !chairReady || !chairGLTF) return;
  // iterate children to find procedural chairs by heuristic (Group containing seat/back) or Mesh with box geometry
  const children = furnitureGroup.children.slice();
  for (let k = 0; k < children.length; k++) {
    const child = children[k];
    // Only replace groups explicitly marked as procedural chairs
    if (!child.userData || !child.userData.isProceduralChair) continue;
      // create a GLTF clone and place it where the procedural chair group is
      const clone = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(chairGLTF) : chairGLTF.clone();
      // copy world transform from procedural group
      clone.position.copy(child.position);
      clone.rotation.copy(child.rotation);
      clone.scale.set(0.8, 0.8, 0.8);
      clone.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          if (chairMaterial) c.material = chairMaterial;
          // ensure collidables contain this mesh
          if (collidableMeshes.indexOf(c) === -1) collidableMeshes.push(c);
        }
      });
      // replace in scene
      furnitureGroup.add(clone);
      // remove old child meshes from collidables
      child.traverse((m) => {
        if (m.isMesh) {
          const idx = collidableMeshes.indexOf(m);
          if (idx !== -1) collidableMeshes.splice(idx, 1);
        }
      });
      furnitureGroup.remove(child);
  }
}

// Aire acondicionado de pared
function createAirConditioner() {
  const acGroup = new THREE.Group();

  // Cuerpo principal
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.3, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.7, metalness: 0.05 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  acGroup.add(body);

  // Tapa frontal ligeramente hundida
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.26, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.85 })
  );
  front.position.z = 0.12;
  acGroup.add(front);

  // Rejillas (louvres)
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xd0d3d4, roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.01, 0.05),
      slatMat
    );
    slat.position.set(0, -0.05 + i * 0.02, 0.1);
    acGroup.add(slat);
  }

  // LED indicador
  const led = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.01, 12),
    new THREE.MeshStandardMaterial({ color: 0x27ae60, emissive: 0x27ae60, emissiveIntensity: 0.6 })
  );
  led.rotation.x = Math.PI / 2;
  led.position.set(0.45, 0.09, 0.13);
  acGroup.add(led);

  // Posición en pared derecha, alto, mirando al interior
  acGroup.position.set(4.7, 4.8, 0);
  acGroup.rotation.y = -Math.PI / 2;

  scene.add(acGroup);
}

window.showInfo = function (type) {
  document.querySelectorAll(".info-display").forEach((p) => (p.style.display = "none"));
  document.getElementById(`${type}-info`).style.display = "block";

  currentInfoType = type;
  drawPizarraText(infoData[type]);
};

window.moveCamera = function (direction) {
  const speed = 0.8;
  // Move the camera target smoothly instead of teleporting the camera
  switch (direction) {
    case "forward":
      cameraTargetPosition.z -= speed;
      break;
    case "backward":
      cameraTargetPosition.z += speed;
      break;
    case "left":
      cameraTargetPosition.x -= speed;
      break;
    case "right":
      cameraTargetPosition.x += speed;
      break;
  }
};

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (pointerControls && pointerControls.isLocked === true) {
    // First-person movement
    // apply gravity
    velocity.y -= 5.0 * 5.0 * delta; // mass multiplier for snappier fall

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

  // Reduced movement force for slower, more natural walking speed
  if (moveForward || moveBackward) velocity.z -= direction.z * 180.0 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 180.0 * delta;

    // move the pointerControls' object (which is camera's parent)
    const obj = pointerControls.getObject();
    const prevPos = obj.position.clone();

    // X axis movement + collision
    obj.translateX(velocity.x * delta);
    if (playerCollidesAt(obj.position)) {
      obj.position.x = prevPos.x; // revert X
      velocity.x = 0;
    }

    // Z axis movement + collision
    obj.translateZ(velocity.z * delta);
    if (playerCollidesAt(obj.position)) {
      obj.position.z = prevPos.z; // revert Z
      velocity.z = 0;
    }

    // Vertical movement + collision
    obj.position.y += velocity.y * delta;
    if (playerCollidesAt(obj.position)) {
      // revert vertical move
      obj.position.y = prevPos.y;
      velocity.y = 0;
      canJump = true;
    }

    // simple ground collision
    if (pointerControls.getObject().position.y < 1.6) {
      velocity.y = 0;
      pointerControls.getObject().position.y = 1.6;
      canJump = true;
    }

    // damping
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

  // Clamp inside room bounds so player cannot exit through walls
  obj.position.x = Math.max(roomBounds.minX, Math.min(roomBounds.maxX, obj.position.x));
  obj.position.z = Math.max(roomBounds.minZ, Math.min(roomBounds.maxZ, obj.position.z));
  } else {
    // Smooth orbit camera movement towards target
    if (camera && cameraTargetPosition) {
      camera.position.lerp(cameraTargetPosition, cameraLerpSpeed);
      controls.target.lerp(cameraTargetLookAt, cameraLerpSpeed);
      controls.update();
    } else {
      controls.update();
    }
  }

  // Update clock hands if present
  if (clockGroup) updateClockHands();

  // Door animation: rotate toward target
  if (doorGroup) {
    const targetY = doorOpen ? -Math.PI / 2 : 0; // open rotates -90 degrees
    // slerp-ish for numbers
    doorGroup.rotation.y += (targetY - doorGroup.rotation.y) * 6.0 * delta;
    // when sufficiently open, remove door from collidables so player can exit
    if (Math.abs(doorGroup.rotation.y - (-Math.PI / 2)) < 0.05 && doorOpen) {
      // remove door mesh from collidableMeshes
      for (let i = collidableMeshes.length - 1; i >= 0; i--) {
        if (collidableMeshes[i].geometry && collidableMeshes[i].geometry.parameters && collidableMeshes[i].geometry.parameters.height === doorConfig.height) {
          collidableMeshes.splice(i, 1);
        }
      }
    }
    if (!doorOpen && doorGroup.rotation.y !== 0) {
      // ensure door is collidable again (if not present)
      const doorMesh = doorGroup.children[0];
      if (collidableMeshes.indexOf(doorMesh) === -1) collidableMeshes.push(doorMesh);
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("load", init);

// Create a simple analog clock on the back wall
function createClock() {
  const group = new THREE.Group();

  // Clock face
  const faceGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 32);
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 4.2, -4.98);
  group.add(face);

  // Hour/minute/second hands (simple boxes)
  const hourGeo = new THREE.BoxGeometry(0.03, 0.18, 0.02);
  const minuteGeo = new THREE.BoxGeometry(0.02, 0.26, 0.02);
  const secondGeo = new THREE.BoxGeometry(0.01, 0.3, 0.01);

  const handMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4 });
  const secondMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.2, emissive: 0xe74c3c, emissiveIntensity: 0.2 });

  const hour = new THREE.Mesh(hourGeo, handMat);
  const minute = new THREE.Mesh(minuteGeo, handMat);
  const second = new THREE.Mesh(secondGeo, secondMat);

  // Pivot points: move geometry so rotation occurs at one end
  hour.geometry.translate(0, 0.09, 0);
  minute.geometry.translate(0, 0.13, 0);
  second.geometry.translate(0, 0.15, 0);

  hour.position.set(0, 4.2, -4.95);
  minute.position.set(0, 4.2, -4.94);
  second.position.set(0, 4.2, -4.93);

  group.add(hour, minute, second);

  clockGroup = group;
  clockHands.hour = hour;
  clockHands.minute = minute;
  clockHands.second = second;

  scene.add(group);
}

function updateClockHands() {
  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  // Convert to radians (clock rotates around Z axis in our setup)
  clockHands.hour.rotation.z = -hours * (Math.PI * 2) / 12;
  clockHands.minute.rotation.z = -minutes * (Math.PI * 2) / 60;
  clockHands.second.rotation.z = -seconds * (Math.PI * 2) / 60;
}
