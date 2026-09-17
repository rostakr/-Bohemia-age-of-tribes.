import { Vec3, type Entity } from 'playcanvas';
import type { TerrainSurface } from '../core/contracts';

export const VIEWS = {
  settlement: { x: -1, z: 2, distance: 67, yaw: 34, pitch: 43 },
  craft: { x: -10, z: 10, distance: 23, yaw: 12, pitch: 32 },
  river: { x: 28, z: 9, distance: 49, yaw: 58, pitch: 40 },
} as const;
export type ViewName = keyof typeof VIEWS;

/** Phase 1 art-inspection controller. Selection/edge-scroll are later gameplay work. */
export class InspectionCamera {
  private readonly events = new AbortController();
  private readonly keys = new Set<string>();
  private targetX = -1;
  private targetZ = 2;
  private x = -1;
  private z = 2;
  private distance = 67;
  private targetDistance = 67;
  private yaw = 34;
  private targetYaw = 34;
  private pitch = 43;
  private targetPitch = 43;
  private pointer: { id: number; x: number; y: number; pan: boolean } | undefined;
  private readonly look = new Vec3();

  constructor(private readonly camera: Entity, private readonly canvas: HTMLCanvasElement, private readonly terrain: TerrainSurface) {
    const options = { signal: this.events.signal };
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    canvas.addEventListener('pointerdown', event => {
      if (event.button > 2) return;
      event.preventDefault();
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: event.button === 1 || event.shiftKey };
      canvas.setPointerCapture(event.pointerId);
    }, options);
    canvas.addEventListener('pointermove', event => {
      const pointer = this.pointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (pointer.pan) {
        const radians = this.yaw * Math.PI / 180;
        const scale = this.distance * 0.0015;
        this.targetX += (-dx * Math.cos(radians) - dy * Math.sin(radians)) * scale;
        this.targetZ += (dx * Math.sin(radians) - dy * Math.cos(radians)) * scale;
      } else {
        this.targetYaw -= dx * 0.22;
        this.targetPitch = Math.max(28, Math.min(72, this.targetPitch + dy * 0.16));
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, options);
    const release = () => { this.pointer = undefined; };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('lostpointercapture', release, options);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      this.targetDistance = Math.max(18, Math.min(125, this.targetDistance * Math.exp(Math.max(-0.35, Math.min(0.35, delta * 0.001)))));
    }, { ...options, passive: false });
    window.addEventListener('keydown', event => {
      if ((event.target as HTMLElement)?.closest('button,input,textarea,select')) return;
      if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) {
        event.preventDefault(); this.keys.add(event.code);
      }
      if (event.code === 'Digit1' || event.code === 'Home') this.setView('settlement');
      if (event.code === 'Digit2') this.setView('craft');
      if (event.code === 'Digit3') this.setView('river');
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => { this.keys.clear(); release(); }, options);
    document.addEventListener('visibilitychange', () => { this.keys.clear(); release(); }, options);
    this.update(1);
  }

  setView(name: ViewName): void {
    const view = VIEWS[name];
    this.targetX = view.x; this.targetZ = view.z;
    this.targetDistance = view.distance; this.targetPitch = view.pitch;
    this.targetYaw += ((view.yaw - this.targetYaw) % 360 + 540) % 360 - 180;
  }

  update(dt: number): void {
    const pressed = (a: string, b: string) => Number(this.keys.has(a) || this.keys.has(b));
    const right = pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft');
    const forward = pressed('KeyW', 'ArrowUp') - pressed('KeyS', 'ArrowDown');
    const speed = this.distance * 0.35 * dt / Math.max(1, Math.hypot(right, forward));
    const yaw = this.yaw * Math.PI / 180;
    this.targetX += (right * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
    this.targetZ += (-right * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
    this.targetYaw += (Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'))) * dt * 50;
    this.targetX = Math.max(-65, Math.min(65, this.targetX));
    this.targetZ = Math.max(-65, Math.min(65, this.targetZ));
    const blend = 1 - Math.exp(-8 * dt);
    this.x += (this.targetX - this.x) * blend; this.z += (this.targetZ - this.z) * blend;
    this.distance += (this.targetDistance - this.distance) * blend;
    this.yaw += (this.targetYaw - this.yaw) * blend; this.pitch += (this.targetPitch - this.pitch) * blend;
    const azimuth = this.yaw * Math.PI / 180, elevation = this.pitch * Math.PI / 180;
    this.look.set(this.x, this.terrain.heightAt(this.x, this.z) + 1, this.z);
    const px = this.x + Math.sin(azimuth) * Math.cos(elevation) * this.distance;
    const pz = this.z + Math.cos(azimuth) * Math.cos(elevation) * this.distance;
    const py = Math.max(this.look.y + Math.sin(elevation) * this.distance, this.terrain.heightAt(px, pz) + 3);
    this.camera.setPosition(px, py, pz);
    this.camera.lookAt(this.look);
  }

  destroy(): void {
    if (this.pointer && this.canvas.hasPointerCapture(this.pointer.id)) this.canvas.releasePointerCapture(this.pointer.id);
    this.events.abort(); this.keys.clear(); this.pointer = undefined;
  }
}
