/** Whether the standalone ExhibitKit storefront is retired (suite consolidation). */
export function isSuiteRetired() {
  const flag = import.meta.env.VITE_SUITE_RETIREMENT;
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return import.meta.env.PROD;
}

export function isLegacyWorkspaceEntry(search = '') {
  const params = new URLSearchParams(search);
  return params.get('legacy') === 'workspace';
}

export const SUITE_URL = 'https://patentpreppers.com';
export const SUITE_MODULES_URL = 'https://patentpreppers.com/modules';
export const SUITE_EXHIBIT_RENAMER_URL = 'https://patentpreppers.com/trial-tools/exhibit-renamer';
export const SUITE_RESOURCES_URL = 'https://patentpreppers.com/resources';