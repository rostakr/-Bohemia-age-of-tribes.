import * as pc from 'playcanvas';
import './styles.css';

const canvas = document.getElementById('game-canvas');
const status = document.getElementById('status');

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: {
    antialias: true,
    powerPreference: 'high-performance'
  }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

window.addEventListener('resize', () => app.resizeCanvas());

app.scene.ambientLight = new pc.Color(0.32, 0.34, 0.29);
app.scene.exposure = 1.1;

const material = (diffuse, roughness = 0.8) => {
  const mat = new pc.StandardMaterial();
  mat.diffuse = diffuse;
  mat.metalness = 0;
  mat.gloss = 1 - roughness;
  mat.update();
  return mat;
};

const grassMat = material(new pc.Color(0.26, 0.34, 0.19), 0.95);
const earthMat = material(new pc.Color(0.34, 0.25, 0.16), 0.95);
const timberMat = material(new pc.Color(0.34, 0.22, 0.12), 0.88);
const daubMat = material(new pc.Color(0.64, 0.55, 0.39), 0.93);
const thatchMat = material(new pc.Color(0.52, 0.43, 0.23), 0.98);
const stoneMat = material(new pc.Color(0.38, 0.39, 0.35), 0.96);

function primitive(name, type, position, scale, mat) {
  const entity = new pc.Entity(name);
  entity.addComponent('model', { type });
  entity.setPosition(...position);
  entity.setLocalScale(...scale);
  entity.model.meshInstances.forEach((meshInstance) => {
    meshInstance.material = mat;
  });
  app.root.addChild(entity);
  return entity;
}

// Terrain placeholder: intentionally simple geometry until the terrain milestone.
primitive('Ground', 'plane', [0, 0, 0], [90, 1, 90], grassMat);
primitive('Village clearing', 'cylinder', [0, 0.015, 0], [16, 0.03, 16], earthMat);

// A small Boii settlement readability blockout: forms and materials, not final art.
const housePositions = [
  [-7, 0.8, -5], [-2, 0.8, -7], [4, 0.8, -5], [8, 0.8, 0],
  [4, 0.8, 5], [-3, 0.8, 6], [-8, 0.8, 2]
];

housePositions.forEach((position, index) => {
  const [x, y, z] = position;
  primitive(`House ${index + 1}`, 'box', [x, y, z], [3.8, 1.6, 2.8], index % 2 ? daubMat : timberMat);
  const roof = primitive(`Roof ${index + 1}`, 'cone', [x, y + 1.65, z], [2.9, 1.7, 2.4], thatchMat);
  roof.setEulerAngles(0, 45, 0);
});

primitive('Central store', 'cylinder', [0, 1.1, 0], [3.6, 2.2, 3.6], timberMat);
primitive('Central store roof', 'cone', [0, 3.0, 0], [3.1, 2.2, 3.1], thatchMat);

for (let i = 0; i < 18; i += 1) {
  const angle = (i / 18) * Math.PI * 2;
  const radius = 12.5 + (i % 3) * 0.35;
  primitive(`Palisade ${i + 1}`, 'cylinder', [Math.cos(angle) * radius, 1.15, Math.sin(angle) * radius], [0.28, 2.3, 0.28], timberMat);
}

for (let i = 0; i < 10; i += 1) {
  const angle = (i / 10) * Math.PI * 2 + 0.2;
  const radius = 20 + (i % 2) * 4;
  primitive(`Stone marker ${i + 1}`, 'box', [Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius], [0.7, 0.7 + (i % 3) * 0.25, 0.7], stoneMat);
}

const sun = new pc.Entity('Sun');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1.0, 0.91, 0.72),
  intensity: 1.8,
  castShadows: true,
  shadowResolution: 1024
});
sun.setEulerAngles(48, -35, 0);
app.root.addChild(sun);

const fill = new pc.Entity('Sky fill');
fill.addComponent('light', {
  type: 'directional',
  color: new pc.Color(0.45, 0.58, 0.72),
  intensity: 0.35,
  castShadows: false
});
fill.setEulerAngles(-55, 125, 0);
app.root.addChild(fill);

const camera = new pc.Entity('RTS Camera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.45, 0.55, 0.60),
  farClip: 350,
  fov: 47
});
app.root.addChild(camera);

const cameraState = {
  focus: new pc.Vec3(0, 0, 0),
  yaw: 45,
  distance: 39,
  height: 27
};

function updateCameraTransform() {
  const yaw = cameraState.yaw * pc.math.DEG_TO_RAD;
  const horizontal = Math.max(8, cameraState.distance);
  camera.setPosition(
    cameraState.focus.x + Math.sin(yaw) * horizontal,
    cameraState.height,
    cameraState.focus.z + Math.cos(yaw) * horizontal
  );
  camera.lookAt(cameraState.focus.x, 0, cameraState.focus.z);
}

updateCameraTransform();

const pressed = new Set();
window.addEventListener('keydown', (event) => pressed.add(event.code));
window.addEventListener('keyup', (event) => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const delta = Math.sign(event.deltaY);
  cameraState.distance = pc.math.clamp(cameraState.distance + delta * 3, 16, 68);
  cameraState.height = pc.math.clamp(cameraState.height + delta * 1.8, 12, 48);
  updateCameraTransform();
}, { passive: false });

app.on('update', (dt) => {
  const moveSpeed = 13 * dt * (cameraState.distance / 39);
  const rotationSpeed = 55 * dt;
  const yaw = cameraState.yaw * pc.math.DEG_TO_RAD;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  let forward = 0;
  let right = 0;
  if (pressed.has('KeyW') || pressed.has('ArrowUp')) forward += 1;
  if (pressed.has('KeyS') || pressed.has('ArrowDown')) forward -= 1;
  if (pressed.has('KeyD') || pressed.has('ArrowRight')) right += 1;
  if (pressed.has('KeyA') || pressed.has('ArrowLeft')) right -= 1;
  if (pressed.has('KeyQ')) cameraState.yaw -= rotationSpeed;
  if (pressed.has('KeyE')) cameraState.yaw += rotationSpeed;

  if (forward || right || pressed.has('KeyQ') || pressed.has('KeyE')) {
    cameraState.focus.x += (forwardX * forward + rightX * right) * moveSpeed;
    cameraState.focus.z += (forwardZ * forward + rightZ * right) * moveSpeed;
    cameraState.focus.x = pc.math.clamp(cameraState.focus.x, -32, 32);
    cameraState.focus.z = pc.math.clamp(cameraState.focus.z, -32, 32);
    updateCameraTransform();
  }
});

status.textContent = `M0 foundation · PlayCanvas ${pc.version ?? '2.x'} · ${app.graphicsDevice.isWebGPU ? 'WebGPU' : 'WebGL'}`;
