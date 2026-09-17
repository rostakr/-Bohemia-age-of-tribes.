export type AssetResolver = (assetPath: string) => string;

function viteBaseUrl(): string {
  const meta = import.meta as ImportMeta & { env?: { BASE_URL?: string } };
  return meta.env?.BASE_URL || './';
}

export function normalizeAssetPath(assetPath: string): string {
  const trimmed = assetPath.trim();
  if (!trimmed) throw new Error('Asset path must not be empty');
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error(`Asset path must be project-relative: ${assetPath}`);
  }
  const normalized = trimmed.replace(/^\/+/, '');
  if (normalized.split('/').some(segment => segment === '..')) {
    throw new Error(`Asset path must not escape the asset root: ${assetPath}`);
  }
  return normalized;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim() || './';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * Resolve a logical asset such as `environment/tree_oak.glb` beneath public/assets.
 * The deployment base may be relative (`./`), a repository subpath, or an injected host URL.
 */
export function createAssetResolver(baseUrl = viteBaseUrl()): AssetResolver {
  const base = normalizeBaseUrl(baseUrl);
  return assetPath => {
    const relativeAsset = `assets/${normalizeAssetPath(assetPath)}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(base)) return new URL(relativeAsset, base).toString();
    return `${base}${relativeAsset}`;
  };
}

/** Default Vite/static-host resolver. A Floot/React shell may inject another resolver later. */
export const resolveAsset = createAssetResolver();
