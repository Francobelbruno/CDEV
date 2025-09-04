let scene, camera, renderer, controls, pizarra, pizarraTexture, canvas, ctx;
let currentInfoType = "";

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
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.getElementById("canvas-container").appendChild(renderer.domElement);

  // Controles de cámara
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 2;
  controls.maxDistance = 15;

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

  document.querySelector(".loading").style.display = "none";
  animate();

  window.addEventListener("resize", onWindowResize);
}

function createFloor() {
  const textureLoader = new THREE.TextureLoader();
  const woodTexture = textureLoader.load(
    "assets/textures/depositphotos_14119266-stock-photo-wooden-floor.jpg"
  );
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(6, 6);
  if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
    woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.85, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

function createWalls() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.95, metalness: 0.0 });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMaterial);
  backWall.position.set(0, 3, -5);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = backWall.clone();
  leftWall.position.set(-5, 3, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = backWall.clone();
  rightWall.position.set(5, 3, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Zócalos para mayor realismo
  const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
  const baseboardBack = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.05), baseboardMat);
  baseboardBack.position.set(0, 0.05, -4.975);
  scene.add(baseboardBack);

  const baseboardLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.05), baseboardMat);
  baseboardLeft.position.set(-4.975, 0.05, 0);
  baseboardLeft.rotation.y = Math.PI / 2;
  scene.add(baseboardLeft);

  const baseboardRight = baseboardLeft.clone();
  baseboardRight.position.set(4.975, 0.05, 0);
  scene.add(baseboardRight);

  // Techo
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 1.0 })
  );
  ceiling.position.set(0, 6, 0);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Ventana simple en pared izquierda
  const windowGroup = new THREE.Group();
  const windowGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xbfdfff, transparent: true, opacity: 0.6, roughness: 0.2, metalness: 0.0 })
  );
  windowGlass.position.set(-4.99, 2.4, 0);
  windowGlass.rotation.y = Math.PI / 2;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.05), frameMat);
  const frameBottom = frameTop.clone();
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.45, 0.05), frameMat);
  const frameRight = frameLeft.clone();
  frameTop.position.set(-4.98, 3.125, 0);
  frameTop.rotation.y = Math.PI / 2;
  frameBottom.position.set(-4.98, 1.675, 0);
  frameBottom.rotation.y = Math.PI / 2;
  frameLeft.position.set(-4.98, 2.4, -1.1);
  frameRight.position.set(-4.98, 2.4, 1.1);
  windowGroup.add(windowGlass, frameTop, frameBottom, frameLeft, frameRight);
  scene.add(windowGroup);
}

function createPizarra() {
  canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  ctx = canvas.getContext("2d");

  drawPizarraText("🏫 BIENVENIDO INGRESANTE\n\nSelecciona una opción para ver\ninformación sobre el ingreso\nuniversitario");

  pizarraTexture = new THREE.CanvasTexture(canvas);
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

  // Texturas locales para mesas y sillas
  const textureLoader = new THREE.TextureLoader();
  const woodPath = "assets/textures/tablas-madera-textura-madera-rustica-superficie-madera-texto-o-fondo_1021907-9850.avif";
  const deskWoodTex = textureLoader.load(
    woodPath,
    (t) => {
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

      // Silla: asiento + respaldo + patas
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.06, 0.6),
        new THREE.MeshStandardMaterial({ map: chairWoodTex, roughness: 0.75, metalness: 0.05 })
      );
      seat.position.set(i * 2, 0.45, j * 2.6);
      seat.castShadow = true;

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.06),
        new THREE.MeshStandardMaterial({ map: chairWoodTex, roughness: 0.75, metalness: 0.05 })
      );
      back.position.set(i * 2, 0.7, j * 2.85);
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
        cleg.position.set(i * 2 + dx, dy, j * 2.6 + dz);
        cleg.castShadow = true;
        group.add(cleg);
      });

      group.add(deskTop, seat, back);
    }
  }

  scene.add(group);
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
  const speed = 0.5;
  switch (direction) {
    case "forward":
      camera.position.z -= speed;
      break;
    case "backward":
      camera.position.z += speed;
      break;
    case "left":
      camera.position.x -= speed;
      break;
    case "right":
      camera.position.x += speed;
      break;
  }
};

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("load", init);
