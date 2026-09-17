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

export function createAssetResolver(baseUrl = viteBaseUrl()): AssetResolver {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return assetPath => `${base}${normalizeAssetPath(assetPath)}`;
}

/** Default Vite/static-host resolver. A Floot/React shell may inject another resolver later. */
export const resolveAsset = createAssetResolver();
