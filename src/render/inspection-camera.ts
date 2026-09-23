import { Vec3, type Entity } from 'playcanvas';
import type { TerrainSurface } from '../core/contracts';

export const VIEWS = {
  settlement: { x: -1, z: 2, distance: 67, yaw: 34, pitch: 43 },
  craft: { x: -10, z: 10, distance: 23, yaw: 12, pitch: 32 },
  river: { x: 28, z: 9, distance: 49, yaw: 58, pitch: 40 },
} as const;
export type ViewName = keyof typeof VIEWS;

/** RTS-ready benchmark camera. Gameplay owns left/right pointer input; camera owns middle drag and keyboard/edge motion. */
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
  private pointerInside = false;
  private pointerX = 0;
  private pointerY = 0;
  private middleDrag: { id: number; x: number; y: number } | undefined;
  private focused = true;
  private readonly look = new Vec3();

  constructor(private readonly camera: Entity, private readonly canvas: HTMLCanvasElement, private readonly terrain: TerrainSurface) {
    const options = { signal: this.events.signal };
    canvas.addEventListener('pointerenter', event => {
      this.pointerInside = true;
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
    }, options);
    canvas.addEventListener('pointerleave', event => {
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      if (!this.middleDrag) this.pointerInside = false;
    }, options);
    canvas.addEventListener('pointermove', event => {
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      if (!this.middleDrag || this.middleDrag.id !== event.pointerId) return;
      const dx = event.clientX - this.middleDrag.x;
      const dy = event.clientY - this.middleDrag.y;
      const radians = this.yaw * Math.PI / 180;
      const scale = this.distance * 0.00155;
      this.targetX += (-dx * Math.cos(radians) - dy * Math.sin(radians)) * scale;
      this.targetZ += (dx * Math.sin(radians) - dy * Math.cos(radians)) * scale;
      this.middleDrag.x = event.clientX;
      this.middleDrag.y = event.clientY;
    }, options);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 1) return;
      event.preventDefault();
      this.middleDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    }, options);
    const release = (event?: PointerEvent) => {
      if (event && this.middleDrag && event.pointerId !== this.middleDrag.id) return;
      if (this.middleDrag && canvas.hasPointerCapture(this.middleDrag.id)) canvas.releasePointerCapture(this.middleDrag.id);
      this.middleDrag = undefined;
    };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('lostpointercapture', () => { this.middleDrag = undefined; }, options);
    canvas.addEventListener('wheel', event => {
      if (!this.pointerInside) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      this.targetDistance = Math.max(18, Math.min(120,
        this.targetDistance * Math.exp(Math.max(-0.35, Math.min(0.35, delta * 0.001)))));
    }, { ...options, passive: false });
    window.addEventListener('keydown', event => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button,input,textarea,select,[data-rts-ui]')) return;
      if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
      }
      if (event.code === 'Digit1' || event.code === 'Home') this.setView('settlement');
      if (event.code === 'Digit2') this.setView('craft');
      if (event.code === 'Digit3') this.setView('river');
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => {
      this.focused = false;
      this.keys.clear();
      release();
    }, options);
    window.addEventListener('focus', () => { this.focused = true; }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys.clear();
        release();
      }
    }, options);
    this.update(1);
  }

  setView(name: ViewName): void {
    const view = VIEWS[name];
    this.targetX = view.x;
    this.targetZ = view.z;
    this.targetDistance = view.distance;
    this.targetPitch = view.pitch;
    this.targetYaw += ((view.yaw - this.targetYaw) % 360 + 540) % 360 - 180;
  }

  private edgeVector(): { right: number; forward: number } {
    if (!this.pointerInside || !this.focused || document.hidden || this.middleDrag) return { right: 0, forward: 0 };
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { right: 0, forward: 0 };
    const x = this.pointerX - rect.left;
    const y = this.pointerY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return { right: 0, forward: 0 };
    const edge = 14;
    return {
      right: x <= edge ? -1 : x >= rect.width - edge ? 1 : 0,
      forward: y <= edge ? 1 : y >= rect.height - edge ? -1 : 0,
    };
  }

  update(dt: number): void {
    const pressed = (positive: string, negative: string) => Number(this.keys.has(positive)) - Number(this.keys.has(negative));
    const edge = this.edgeVector();
    let right = Math.max(-1, Math.min(1, pressed('KeyD', 'KeyA') + pressed('ArrowRight', 'ArrowLeft') + edge.right));
    let forward = Math.max(-1, Math.min(1, pressed('KeyW', 'KeyS') + pressed('ArrowUp', 'ArrowDown') + edge.forward));
    const magnitude = Math.hypot(right, forward);
    if (magnitude > 1) { right /= magnitude; forward /= magnitude; }
    const speed = this.distance * 0.36 * dt;
    const yaw = this.yaw * Math.PI / 180;
    this.targetX += (right * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
    this.targetZ += (-right * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
    this.targetYaw += (Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'))) * dt * 52;
    this.targetX = Math.max(-92, Math.min(92, this.targetX));
    this.targetZ = Math.max(-92, Math.min(92, this.targetZ));

    const blend = 1 - Math.exp(-8 * Math.max(0, dt));
    this.x += (this.targetX - this.x) * blend;
    this.z += (this.targetZ - this.z) * blend;
    this.distance += (this.targetDistance - this.distance) * blend;
    this.yaw += (this.targetYaw - this.yaw) * blend;
    this.pitch += (this.targetPitch - this.pitch) * blend;
    const azimuth = this.yaw * Math.PI / 180;
    const elevation = this.pitch * Math.PI / 180;
    this.look.set(this.x, this.terrain.heightAt(this.x, this.z) + 1, this.z);
    const px = this.x + Math.sin(azimuth) * Math.cos(elevation) * this.distance;
    const pz = this.z + Math.cos(azimuth) * Math.cos(elevation) * this.distance;
    const py = Math.max(this.look.y + Math.sin(elevation) * this.distance, this.terrain.heightAt(px, pz) + 3.5);
    this.camera.setPosition(px, py, pz);
    this.camera.lookAt(this.look);
  }

  destroy(): void {
    if (this.middleDrag && this.canvas.hasPointerCapture(this.middleDrag.id)) this.canvas.releasePointerCapture(this.middleDrag.id);
    this.events.abort();
    this.keys.clear();
    this.middleDrag = undefined;
    this.pointerInside = false;
  }
}
