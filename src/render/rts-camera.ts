import { Vec3, type Entity } from 'playcanvas';
import type { TerrainSurface } from '../core/contracts';
import { VIEWS, type ViewName } from './camera-views';

export interface RtsCameraOptions {
  edgeScroll?: boolean;
  edgePixels?: number;
  minDistance?: number;
  maxDistance?: number;
  minBound?: number;
  maxBound?: number;
}

export class RtsCamera {
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
  private readonly edgeScroll: boolean;
  private readonly edgePixels: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly minBound: number;
  private readonly maxBound: number;

  constructor(
    private readonly camera: Entity,
    private readonly canvas: HTMLCanvasElement,
    private readonly terrain: TerrainSurface,
    options: RtsCameraOptions = {},
  ) {
    this.edgeScroll = options.edgeScroll ?? true;
    this.edgePixels = options.edgePixels ?? 14;
    this.minDistance = options.minDistance ?? 18;
    this.maxDistance = options.maxDistance ?? 120;
    this.minBound = options.minBound ?? -92;
    this.maxBound = options.maxBound ?? 92;
    const listenerOptions = { signal: this.events.signal };

    canvas.addEventListener('pointerenter', event => {
      this.pointerInside = true;
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
    }, listenerOptions);
    canvas.addEventListener('pointerleave', event => {
      this.pointerX = event.clientX;
      this.pointerY = event.clientY;
      if (!this.middleDrag) this.pointerInside = false;
    }, listenerOptions);
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
    }, listenerOptions);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 1) return;
      event.preventDefault();
      this.middleDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    }, listenerOptions);
    const releaseDrag = (event?: PointerEvent) => {
      if (event && this.middleDrag && event.pointerId !== this.middleDrag.id) return;
      if (this.middleDrag && canvas.hasPointerCapture(this.middleDrag.id)) canvas.releasePointerCapture(this.middleDrag.id);
      this.middleDrag = undefined;
    };
    canvas.addEventListener('pointerup', releaseDrag, listenerOptions);
    canvas.addEventListener('pointercancel', releaseDrag, listenerOptions);
    canvas.addEventListener('lostpointercapture', () => { this.middleDrag = undefined; }, listenerOptions);
    canvas.addEventListener('wheel', event => {
      if (!this.pointerInside) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance,
        this.targetDistance * Math.exp(Math.max(-0.35, Math.min(0.35, delta * 0.001)))));
    }, { ...listenerOptions, passive: false });

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
    }, listenerOptions);
    window.addEventListener('keyup', event => this.keys.delete(event.code), listenerOptions);
    window.addEventListener('blur', () => {
      this.focused = false;
      this.keys.clear();
      releaseDrag();
    }, listenerOptions);
    window.addEventListener('focus', () => { this.focused = true; }, listenerOptions);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys.clear();
        releaseDrag();
      }
    }, listenerOptions);
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
    if (!this.edgeScroll || !this.pointerInside || !this.focused || document.hidden || this.middleDrag) return { right: 0, forward: 0 };
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { right: 0, forward: 0 };
    const x = this.pointerX - rect.left;
    const y = this.pointerY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return { right: 0, forward: 0 };
    const right = x <= this.edgePixels ? -1 : x >= rect.width - this.edgePixels ? 1 : 0;
    const forward = y <= this.edgePixels ? 1 : y >= rect.height - this.edgePixels ? -1 : 0;
    return { right, forward };
  }

  update(dt: number): void {
    const pressed = (positive: string, negative: string) => Number(this.keys.has(positive)) - Number(this.keys.has(negative));
    const keyboardRight = pressed('KeyD', 'KeyA') + pressed('ArrowRight', 'ArrowLeft');
    const keyboardForward = pressed('KeyW', 'KeyS') + pressed('ArrowUp', 'ArrowDown');
    const edge = this.edgeVector();
    let right = Math.max(-1, Math.min(1, keyboardRight + edge.right));
    let forward = Math.max(-1, Math.min(1, keyboardForward + edge.forward));
    const magnitude = Math.hypot(right, forward);
    if (magnitude > 1) { right /= magnitude; forward /= magnitude; }
    const speed = this.distance * 0.36 * dt;
    const yaw = this.yaw * Math.PI / 180;
    this.targetX += (right * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
    this.targetZ += (-right * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
    this.targetYaw += (Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'))) * dt * 52;
    this.targetX = Math.max(this.minBound, Math.min(this.maxBound, this.targetX));
    this.targetZ = Math.max(this.minBound, Math.min(this.maxBound, this.targetZ));

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
