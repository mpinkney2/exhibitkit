// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  activateLicense: vi.fn(),
  transferLicense: vi.fn(),
  getLicenseIdByKeyHash: vi.fn(),
}));

vi.mock('./license-repository.js', () => repository);

import { activateLicenseKey } from './activation-service.js';

const BODY = {
  licenseKey: 'EKIT-TEST-AAAA-BBBB',
  workstationId: 'EKIT-WORKSTATION-ABCDEFGHJKLMNPQR',
};

beforeEach(() => {
  delete process.env.ENTITLEMENT_SIGNING_KEY;
  repository.activateLicense.mockReset();
  repository.transferLicense.mockReset();
  repository.getLicenseIdByKeyHash.mockReset();
});

describe('activateLicenseKey signing guard', () => {
  it('does not write a seat when signing is not configured', async () => {
    await expect(activateLicenseKey(BODY)).rejects.toMatchObject({
      status: 503,
      code: 'ENTITLEMENT_SIGNING_UNAVAILABLE',
    });
    expect(repository.activateLicense).not.toHaveBeenCalled();
    expect(repository.transferLicense).not.toHaveBeenCalled();
  });
});
