import { Asset, BoundingBox, Entity, type Application, type ContainerResource, type RenderComponent, type Texture } from 'playcanvas';

/** Scene-scoped ownership; imported glTF assets never escape into simulation data. */
export class SceneAssets {
  private readonly owned = new Set<Asset>();
  private readonly pending = new Set<() => void>();
  private readonly cache = new Map<string, Promise<Asset>>();
  private disposed = false;

  constructor(private readonly app: Application) {}

  load(path: string, type: 'container' | 'texture'): Promise<Asset> {
    if (this.disposed) return Promise.reject(new Error('Scene assets disposed'));
    const key = `${type}:${path}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = new Promise<Asset>((resolve, reject) => {
      const asset = new Asset(path, type, { url: `${import.meta.env.BASE_URL}${path}` });
      this.owned.add(asset);
      const timeout = window.setTimeout(() => fail('Asset load timed out'), 45000);
      const cleanup = () => {
        window.clearTimeout(timeout); asset.off('load', success); asset.off('error', fail);
        this.pending.delete(cancel);
      };
      const fail = (error: unknown) => { cleanup(); reject(new Error(`${path}: ${String(error)}`)); };
      const cancel = () => fail('Scene disposed');
      const success = () => {
        cleanup();
        if (this.disposed) { asset.unload(); reject(new Error('Scene disposed')); }
        else resolve(asset);
      };
      this.pending.add(cancel);
      asset.once('load', success); asset.once('error', fail);
      this.app.assets.add(asset);
      this.app.assets.load(asset);
    });
    this.cache.set(key, promise);
    return promise;
  }

  async texture(path: string): Promise<Texture> {
    const texture = (await this.load(path, 'texture')).resource as Texture;
    texture.anisotropy = 8;
    return texture;
  }

  async model(path: string): Promise<ContainerResource> {
    return (await this.load(path, 'container')).resource as ContainerResource;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cancel of [...this.pending]) cancel();
    for (const asset of this.owned) { asset.unload(); this.app.assets.remove(asset); }
    this.owned.clear(); this.cache.clear();
  }
}

/** Normalize incoming models by visible bounds, keeping a ground-centred origin. */
export function instantiateAtHeight(resource: ContainerResource, name: string, height: number): Entity {
  const root = new Entity(name);
  const model = resource.instantiateRenderEntity();
  root.addChild(model);
  const renders = model.findComponents('render') as RenderComponent[];
  const instances = renders.flatMap(render => render.meshInstances);
  const first = instances[0];
  if (!first) { root.destroy(); throw new Error(`${name}: no renderable meshes`); }
  const bounds = new BoundingBox();
  bounds.copy(first.aabb);
  for (const instance of instances.slice(1)) bounds.add(instance.aabb);
  const sourceHeight = bounds.halfExtents.y * 2;
  if (sourceHeight <= 0 || !Number.isFinite(sourceHeight)) { root.destroy(); throw new Error(`${name}: invalid bounds`); }
  const scale = height / sourceHeight;
  model.setLocalScale(scale, scale, scale);
  model.setLocalPosition(-bounds.center.x * scale, -(bounds.center.y - bounds.halfExtents.y) * scale, -bounds.center.z * scale);
  return root;
}
