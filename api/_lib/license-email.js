import { Resend } from 'resend';

let resend = null;

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function requireEmailFrom() {
  if (!process.env.LICENSE_EMAIL_FROM) {
    throw new Error('LICENSE_EMAIL_FROM is not configured.');
  }
  return process.env.LICENSE_EMAIL_FROM;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailShell(content) {
  return `<!doctype html>
  <html lang="en">
    <body style="margin:0;background:#f5f7fb;color:#172033;font-family:Inter,Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;padding:36px 20px">
        <div style="background:#ffffff;border:1px solid #dbe2ee;border-radius:14px;padding:32px">
          <div style="font-size:13px;font-weight:800;letter-spacing:.08em;color:#2563eb;text-transform:uppercase">ExhibitKIT</div>
          ${content}
        </div>
        <p style="font-size:12px;line-height:1.6;color:#6b7280;text-align:center">
          Exhibit files and filenames are never included in licensing emails.
        </p>
      </div>
    </body>
  </html>`;
}

export async function sendLicenseDelivery({
  to,
  licenseKey,
  checkoutSessionId,
  purchasedAt,
}) {
  const appUrl = process.env.APP_URL || 'https://exhibitkit.patentpreppers.com';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@patentpreppers.com';
  const html = emailShell(`
    <h1 style="margin:22px 0 10px;font-size:26px">Your ExhibitKIT Pro license</h1>
    <p style="font-size:15px;line-height:1.7;color:#48546a">Thank you for purchasing ExhibitKIT Pro. Enter the license key below in ExhibitKIT to activate one workstation.</p>
    <div style="margin:24px 0;padding:18px;border-radius:10px;background:#0f172a;color:#ffffff;font:700 20px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;letter-spacing:.05em">${escapeHtml(licenseKey)}</div>
    <p style="font-size:14px;line-height:1.7;color:#48546a">Your Pro access is perpetual. Twelve months of updates and support are included from ${escapeHtml(new Date(purchasedAt).toLocaleDateString('en-US'))}.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">Open ExhibitKIT</a></p>
    <p style="font-size:13px;line-height:1.7;color:#6b7280">Keep this email for recovery. If you need help, contact <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
  `);

  const { data, error } = await getResend().emails.send(
    {
      from: requireEmailFrom(),
      to,
      subject: 'Your ExhibitKIT Pro license key',
      html,
      replyTo: supportEmail,
    },
    { idempotencyKey: `license-delivery/${checkoutSessionId}` },
  );

  if (error) throw new Error(`License email failed: ${error.name || 'provider_error'}`);
  return data?.id || null;
}

export async function sendLicenseRecovery({ to, licenses, recoveryBucket }) {
  const appUrl = process.env.APP_URL || 'https://exhibitkit.patentpreppers.com';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@patentpreppers.com';
  const licenseBlocks = licenses.map(({ key, purchasedAt }) => `
    <div style="margin:16px 0;padding:16px;border:1px solid #dbe2ee;border-radius:10px">
      <div style="font:700 18px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em">${escapeHtml(key)}</div>
      <div style="margin-top:6px;font-size:12px;color:#6b7280">Purchased ${escapeHtml(new Date(purchasedAt).toLocaleDateString('en-US'))}</div>
    </div>
  `).join('');
  const html = emailShell(`
    <h1 style="margin:22px 0 10px;font-size:26px">Your ExhibitKIT license recovery</h1>
    <p style="font-size:15px;line-height:1.7;color:#48546a">A license recovery was requested for this email address. Your active license ${licenses.length === 1 ? 'is' : 'keys are'} below.</p>
    ${licenseBlocks}
    <p style="margin:24px 0"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">Open ExhibitKIT</a></p>
    <p style="font-size:13px;line-height:1.7;color:#6b7280">If you did not request this email, no action is needed. Contact <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a> with questions.</p>
  `);

  const { data, error } = await getResend().emails.send(
    {
      from: requireEmailFrom(),
      to,
      subject: 'Recover your ExhibitKIT license',
      html,
      replyTo: supportEmail,
    },
    { idempotencyKey: `license-recovery/${recoveryBucket}` },
  );

  if (error) throw new Error(`Recovery email failed: ${error.name || 'provider_error'}`);
  return data?.id || null;
}
