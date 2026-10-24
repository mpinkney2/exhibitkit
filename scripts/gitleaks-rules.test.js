// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const configPath = fileURLToPath(new URL('../.gitleaks.toml', import.meta.url));

function gitleaksBin() {
  const candidates = [process.env.GITLEAKS_BIN, '/tmp/gitleaks/gitleaks'].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

const gitleaksBinary = gitleaksBin();

function scan(source) {
  const dir = mkdtempSync(join(tmpdir(), 'gitleaks-fixture-'));
  try {
    writeFileSync(join(dir, 'fixture.js'), source);
    const report = join(dir, 'report.json');
    const result = spawnSync(gitleaksBinary, [
      'detect',
      '--no-git',
      '--source',
      dir,
      '--config',
      configPath,
      '--report-format',
      'json',
      '--report-path',
      report,
      '--no-banner',
      '--exit-code',
      '0',
    ], { encoding: 'utf8' });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    return JSON.parse(readFileSync(report, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!gitleaksBinary && !process.env.CI)('gitleaks founder secret rules', () => {
  it('flags a quoted fallback and ignores a bare process.env assignment', () => {
    expect(gitleaksBinary, 'gitleaks binary is required in CI').toBeTruthy();
    const secretName = 'FOUNDER_ADMIN_SECRET';
    const literal = "'fallback-secret'";
    const doubleQuoted = '"fallback-secret"';
    const shortLiteral = "'short'";

    const plain = scan(`const secret = process.env.${secretName};\n${secretName}=process.env.X\n`);
    expect(plain).toEqual([]);

    const orFallback = scan(`const expected = process.env.${secretName} || ${literal};\n`);
    expect(orFallback.map((finding) => finding.RuleID)).toContain('exhibitkit-secret-fallback');

    const nullishFallback = scan(`const expected = process.env.${secretName} ?? ${doubleQuoted};\n`);
    expect(nullishFallback.map((finding) => finding.RuleID)).toContain('exhibitkit-secret-fallback');

    const sameLine = scan(`${secretName}=process.env.${secretName} || ${literal}\n`);
    expect(sameLine.map((finding) => finding.RuleID)).toContain('exhibitkit-secret-fallback');
    expect(sameLine.every((finding) => finding.RuleID !== 'exhibitkit-founder-or-passphrase')).toBe(true);

    const shortFallback = scan(`const expected = process.env.${secretName} || ${shortLiteral};\n`);
    expect(shortFallback.map((finding) => finding.RuleID)).not.toContain('exhibitkit-secret-fallback');

    const nextLine = scan(`const expected = process.env.${secretName}\n  || ${literal};\n`);
    expect(nextLine.map((finding) => finding.RuleID)).toContain('exhibitkit-secret-fallback');
  });
});
