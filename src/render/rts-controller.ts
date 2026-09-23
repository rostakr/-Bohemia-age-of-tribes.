import { Vec3, type Entity } from 'playcanvas';
import type { EntityId, TerrainSurface, WorldPoint } from '../core/contracts';
import type { NavigationGrid } from '../core/navigation-grid';
import type { RtsSimulation } from '../core/rts-simulation';

interface DragState {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  shift: boolean;
}

interface FeedbackMarker {
  element: HTMLDivElement;
  world: WorldPoint;
  expiresAt: number;
}

export class RtsController {
  private readonly events = new AbortController();
  private readonly selected = new Set<EntityId>();
  private readonly rings = new Map<EntityId, HTMLDivElement>();
  private readonly markers: FeedbackMarker[] = [];
  private readonly overlay: HTMLDivElement;
  private readonly dragBox: HTMLDivElement;
  private readonly countLabel: HTMLDivElement;
  private readonly feedback: HTMLDivElement;
  private drag: DragState | undefined;
  private lastContextMoveAt = Number.NEGATIVE_INFINITY;
  private lastContextMoveX = Number.NaN;
  private lastContextMoveY = Number.NaN;
  private readonly tempWorld = new Vec3();
  private readonly tempScreen = new Vec3();
  private readonly cameraPosition = new Vec3();

  constructor(
    private readonly cameraEntity: Entity,
    private readonly canvas: HTMLCanvasElement,
    private readonly terrain: TerrainSurface,
    private readonly navigation: NavigationGrid,
    private readonly simulation: RtsSimulation,
    private readonly unitEntities: ReadonlyMap<EntityId, Entity>,
    private readonly currentTick: () => number,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'rts-overlay';
    this.overlay.dataset.rtsUi = 'true';
    this.dragBox = document.createElement('div');
    this.dragBox.className = 'rts-drag-box';
    this.dragBox.hidden = true;
    this.countLabel = document.createElement('div');
    this.countLabel.className = 'rts-count';
    this.feedback = document.createElement('div');
    this.feedback.className = 'rts-feedback';
    this.overlay.append(this.dragBox, this.countLabel, this.feedback);
    document.body.appendChild(this.overlay);
    this.syncCount();

    const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        shift: event.shiftKey,
      };
      canvas.setPointerCapture(event.pointerId);
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      const distance = Math.hypot(this.drag.x - this.drag.startX, this.drag.y - this.drag.startY);
      if (distance >= 6) this.showDragBox();
    }, options);
    canvas.addEventListener('pointerup', event => {
      if (event.button === 2) {
        event.preventDefault();
        this.issueContextMove(event.clientX, event.clientY);
        return;
      }
      if (event.button !== 0 || !this.drag || this.drag.id !== event.pointerId) return;
      const drag = this.drag;
      const distance = Math.hypot(drag.x - drag.startX, drag.y - drag.startY);
      if (distance < 6) this.clickSelect(event.clientX, event.clientY, event.shiftKey || drag.shift);
      else this.boxSelect(drag, event.shiftKey || drag.shift);
      this.finishDrag();
    }, options);
    canvas.addEventListener('pointercancel', () => this.finishDrag(), options);
    canvas.addEventListener('lostpointercapture', () => this.finishDrag(), options);
    canvas.addEventListener('contextmenu', event => {
      event.preventDefault();
      this.issueContextMove(event.clientX, event.clientY);
    }, options);
    window.addEventListener('blur', () => this.finishDrag(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.finishDrag(); }, options);
  }

  get selectedCount(): number { return this.selected.size; }

  private issueContextMove(clientX: number, clientY: number): void {
    const now = performance.now();
    const duplicate = now - this.lastContextMoveAt < 250 &&
      Math.hypot(clientX - this.lastContextMoveX, clientY - this.lastContextMoveY) < 2;
    if (duplicate) return;
    this.lastContextMoveAt = now;
    this.lastContextMoveX = clientX;
    this.lastContextMoveY = clientY;

    if (this.selected.size === 0) {
      this.setFeedback('Select workers first', false);
      return;
    }
    const ground = this.screenGround(clientX, clientY);
    if (!ground) {
      this.setFeedback('Invalid destination', false);
      return;
    }
    const resolved = this.navigation.resolveNearestReachable(ground, 8);
    if (!resolved) {
      this.addMarker(ground, false);
      this.setFeedback('Destination is unreachable', false);
      return;
    }
    this.simulation.issueMove([...this.selected], resolved, this.currentTick() + 1);
    this.addMarker(resolved, true);
    this.setFeedback('Move', true);
  }

  private finishDrag(): void {
    if (this.drag && this.canvas.hasPointerCapture(this.drag.id)) this.canvas.releasePointerCapture(this.drag.id);
    this.drag = undefined;
    this.dragBox.hidden = true;
  }

  private showDragBox(): void {
    if (!this.drag) return;
    const left = Math.min(this.drag.startX, this.drag.x);
    const top = Math.min(this.drag.startY, this.drag.y);
    this.dragBox.hidden = false;
    this.dragBox.style.left = `${left}px`;
    this.dragBox.style.top = `${top}px`;
    this.dragBox.style.width = `${Math.abs(this.drag.x - this.drag.startX)}px`;
    this.dragBox.style.height = `${Math.abs(this.drag.y - this.drag.startY)}px`;
  }

  private clickSelect(clientX: number, clientY: number, shift: boolean): void {
    const hit = this.pickUnit(clientX, clientY);
    if (!hit) {
      if (!shift) this.selected.clear();
      this.syncSelectionUi();
      return;
    }
    if (!shift) {
      this.selected.clear();
      this.selected.add(hit);
    } else if (this.selected.has(hit)) this.selected.delete(hit);
    else this.selected.add(hit);
    this.syncSelectionUi();
  }

  private boxSelect(drag: DragState, shift: boolean): void {
    const left = Math.min(drag.startX, drag.x);
    const right = Math.max(drag.startX, drag.x);
    const top = Math.min(drag.startY, drag.y);
    const bottom = Math.max(drag.startY, drag.y);
    const hits: EntityId[] = [];
    for (const [id, entity] of this.unitEntities) {
      const screen = this.projectEntity(entity);
      if (!screen) continue;
      if (screen.x >= left && screen.x <= right && screen.y >= top && screen.y <= bottom) hits.push(id);
    }
    hits.sort((a, b) => a - b);
    if (!shift) {
      this.selected.clear();
      for (const id of hits) this.selected.add(id);
    } else {
      for (const id of hits) {
        if (this.selected.has(id)) this.selected.delete(id);
        else this.selected.add(id);
      }
    }
    this.syncSelectionUi();
  }

  private pickUnit(clientX: number, clientY: number): EntityId | null {
    let best: { id: EntityId; distance: number } | null = null;
    for (const [id, entity] of this.unitEntities) {
      const screen = this.projectEntity(entity);
      if (!screen) continue;
      const distance = Math.hypot(screen.x - clientX, screen.y - clientY);
      if (distance <= 24 && (!best || distance < best.distance)) best = { id, distance };
    }
    return best?.id ?? null;
  }

  private projectEntity(entity: Entity): { x: number; y: number } | null {
    if (!entity.enabled || !this.cameraEntity.camera) return null;
    const position = entity.getPosition();
    this.tempWorld.set(position.x, position.y + 0.9, position.z);
    this.cameraPosition.copy(this.cameraEntity.getPosition());
    const dx = this.tempWorld.x - this.cameraPosition.x;
    const dy = this.tempWorld.y - this.cameraPosition.y;
    const dz = this.tempWorld.z - this.cameraPosition.z;
    const forward = this.cameraEntity.forward;
    if (dx * forward.x + dy * forward.y + dz * forward.z <= 0) return null;
    const screen = this.cameraEntity.camera.worldToScreen(this.tempWorld, this.tempScreen);
    const rect = this.canvas.getBoundingClientRect();
    if (screen.x < 0 || screen.y < 0 || screen.x > rect.width || screen.y > rect.height) return null;
    return { x: rect.left + screen.x, y: rect.top + screen.y };
  }

  private screenGround(clientX: number, clientY: number): WorldPoint | null {
    const camera = this.cameraEntity.camera;
    if (!camera) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const start = camera.screenToWorld(x, y, camera.nearClip);
    const end = camera.screenToWorld(x, y, Math.min(camera.farClip, 340));
    const sample = (t: number) => ({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    });
    let previousT = 0;
    let previous = sample(0);
    let previousDelta = previous.y - this.terrain.heightAt(previous.x, previous.z);
    for (let step = 1; step <= 96; step++) {
      const t = step / 96;
      const point = sample(t);
      const delta = point.y - this.terrain.heightAt(point.x, point.z);
      if (delta <= 0 && previousDelta > 0) {
        let low = previousT;
        let high = t;
        for (let iteration = 0; iteration < 14; iteration++) {
          const mid = (low + high) * 0.5;
          const midPoint = sample(mid);
          const midDelta = midPoint.y - this.terrain.heightAt(midPoint.x, midPoint.z);
          if (midDelta > 0) low = mid;
          else high = mid;
        }
        const hit = sample((low + high) * 0.5);
        return { x: hit.x, z: hit.z };
      }
      previousT = t;
      previous = point;
      previousDelta = delta;
    }
    return null;
  }

  private syncSelectionUi(): void {
    for (const [id, ring] of this.rings) if (!this.selected.has(id)) { ring.remove(); this.rings.delete(id); }
    for (const id of this.selected) {
      if (this.rings.has(id)) continue;
      const ring = document.createElement('div');
      ring.className = 'rts-selection-ring';
      ring.dataset.rtsUi = 'true';
      this.overlay.appendChild(ring);
      this.rings.set(id, ring);
    }
    this.syncCount();
  }

  private syncCount(): void {
    this.countLabel.textContent = `${this.selected.size} selected`;
  }

  private setFeedback(message: string, valid: boolean): void {
    this.feedback.textContent = message;
    this.feedback.dataset.valid = String(valid);
    this.feedback.dataset.until = String(performance.now() + 1200);
  }

  private addMarker(world: WorldPoint, valid: boolean): void {
    const element = document.createElement('div');
    element.className = `rts-move-marker ${valid ? 'valid' : 'invalid'}`;
    element.dataset.rtsUi = 'true';
    this.overlay.appendChild(element);
    this.markers.push({ element, world, expiresAt: performance.now() + 950 });
  }

  private projectWorld(world: WorldPoint): { x: number; y: number } | null {
    if (!this.cameraEntity.camera) return null;
    this.tempWorld.set(world.x, this.terrain.heightAt(world.x, world.z) + 0.12, world.z);
    this.cameraPosition.copy(this.cameraEntity.getPosition());
    const dx = this.tempWorld.x - this.cameraPosition.x;
    const dy = this.tempWorld.y - this.cameraPosition.y;
    const dz = this.tempWorld.z - this.cameraPosition.z;
    const forward = this.cameraEntity.forward;
    if (dx * forward.x + dy * forward.y + dz * forward.z <= 0) return null;
    const screen = this.cameraEntity.camera.worldToScreen(this.tempWorld, this.tempScreen);
    const rect = this.canvas.getBoundingClientRect();
    if (screen.x < 0 || screen.y < 0 || screen.x > rect.width || screen.y > rect.height) return null;
    return { x: rect.left + screen.x, y: rect.top + screen.y };
  }

  update(): void {
    for (const [id, ring] of this.rings) {
      const entity = this.unitEntities.get(id);
      const projected = entity ? this.projectEntity(entity) : null;
      ring.hidden = !projected;
      if (projected) ring.style.transform = `translate(${projected.x}px, ${projected.y + 10}px)`;
    }
    const now = performance.now();
    for (let index = this.markers.length - 1; index >= 0; index--) {
      const marker = this.markers[index]!;
      if (now >= marker.expiresAt) {
        marker.element.remove();
        this.markers.splice(index, 1);
        continue;
      }
      const projected = this.projectWorld(marker.world);
      marker.element.hidden = !projected;
      if (projected) marker.element.style.transform = `translate(${projected.x}px, ${projected.y}px)`;
    }
    const feedbackUntil = Number(this.feedback.dataset.until ?? 0);
    this.feedback.hidden = now >= feedbackUntil;
  }

  destroy(): void {
    this.finishDrag();
    this.events.abort();
    for (const marker of this.markers) marker.element.remove();
    this.markers.length = 0;
    this.rings.clear();
    this.selected.clear();
    this.overlay.remove();
  }
}
