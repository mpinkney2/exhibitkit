import { useState } from 'react';
import { Mail, Download } from 'lucide-react';
import { inviteBetaTester, inviteBetaTesters, fetchBetaInviteReport } from '../utils/founder.js';
import { betaInvitesToCsv } from '../../api/_lib/beta-invite-report.js';

const DAY_PRESETS = [10, 20, 30];

const RESULT_LABEL = {
  sent: 'sent',
  email_failed: 'email failed',
  skipped: 'key minted, email not configured',
  invalid: 'skipped, invalid address',
  already_active: 'already has an active beta',
  rate_limited: 'not sent, rate limit',
};

function formatWhen(iso) {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function resultLabel(result) {
  const label = RESULT_LABEL[result.status] || result.status;
  if (result.status === 'already_active' && result.expiresAt) {
    return `${label} until ${new Date(result.expiresAt).toLocaleDateString('en-US')}`;
  }
  return label;
}

export default function FounderBetaInvites({
  inviteInputStyle,
  btn,
  btnPrimary,
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteList, setInviteList] = useState('');
  const [inviteDays, setInviteDays] = useState('30');
  const [inviteSecret, setInviteSecret] = useState('');
  const [needsInviteSecret, setNeedsInviteSecret] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const [reportStatus, setReportStatus] = useState('all');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [report, setReport] = useState(null);

  const days = Number(inviteDays) || 30;

  const handleInvite = async (event) => {
    event.preventDefault();
    setInviteBusy(true);
    setInviteError('');
    setInviteResult(null);
    setBulkResult(null);
    try {
      const result = await inviteBetaTester({
        email: inviteEmail,
        name: inviteName,
        note: inviteNote,
        days,
        secret: inviteSecret || undefined,
      });
      if (!result.ok) {
        setInviteError(result.error || 'Could not send the beta invitation.');
        setNeedsInviteSecret(Boolean(result.needsSecret));
        return;
      }
      setInviteResult(result);
      setNeedsInviteSecret(false);
      setInviteEmail('');
      setInviteName('');
      setInviteNote('');
      setInviteSecret('');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleBulk = async (event) => {
    event.preventDefault();
    setInviteBusy(true);
    setInviteError('');
    setInviteResult(null);
    setBulkResult(null);
    try {
      const result = await inviteBetaTesters({
        emails: inviteList,
        note: inviteNote,
        days,
        secret: inviteSecret || undefined,
      });
      if (!result.ok && !(result.results || []).length) {
        setInviteError(result.error || 'Could not send the beta invitations.');
        setNeedsInviteSecret(Boolean(result.needsSecret));
        return;
      }
      setBulkResult(result);
      setNeedsInviteSecret(false);
      if (result.ok) setInviteList('');
      setInviteSecret('');
    } finally {
      setInviteBusy(false);
    }
  };

  const loadReport = async (status = reportStatus) => {
    setReportBusy(true);
    setReportError('');
    try {
      const result = await fetchBetaInviteReport({
        status,
        secret: inviteSecret || undefined,
      });
      if (!result.ok) {
        setReportError(result.error || 'Could not load the invite report.');
        setNeedsInviteSecret(Boolean(result.needsSecret));
        return;
      }
      setNeedsInviteSecret(false);
      setReport(result);
    } finally {
      setReportBusy(false);
    }
  };

  const exportCsv = () => {
    const csv = betaInvitesToCsv(report?.invites || []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'beta-invites.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section style={{ display: 'grid', gap: 6 }} data-testid="founder-beta-invites">
        <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
          Beta invites
        </strong>
        <div style={{ color: 'var(--color-text-muted, #9ca3af)', lineHeight: 1.4 }}>
          Mints a real, server-verified Pro license. The tester activates it with Restore license. One address uses the form below. A pasted list shares one Days value and one note. Duplicate addresses in the paste are removed. An address that already has an active beta is skipped and is not sent a new key. Invalid addresses are skipped. A list is capped at 50 addresses. Each list is one request. Each minted address counts toward 200 invitations an hour, and the rest of that list is marked not sent.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>Days</span>
          {DAY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              style={{
                ...btn,
                padding: '4px 8px',
                fontWeight: String(preset) === inviteDays ? 700 : 500,
                borderColor: String(preset) === inviteDays ? 'rgba(245, 158, 11, 0.7)' : undefined,
              }}
              onClick={() => setInviteDays(String(preset))}
            >
              {preset}
            </button>
          ))}
          <input
            type="number"
            min="1"
            max="180"
            value={inviteDays}
            onChange={(event) => setInviteDays(event.target.value)}
            aria-label="Beta days"
            style={{ ...inviteInputStyle, width: 72 }}
          />
        </div>
        <form onSubmit={handleInvite} style={{ display: 'grid', gap: 6 }}>
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="Tester email (required)"
            autoComplete="off"
            style={inviteInputStyle}
          />
          <input
            type="text"
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Name (optional, single invite)"
            autoComplete="off"
            style={inviteInputStyle}
          />
          <input
            type="text"
            value={inviteNote}
            onChange={(event) => setInviteNote(event.target.value)}
            placeholder="Note (optional, shared by a list)"
            autoComplete="off"
            style={inviteInputStyle}
          />
          {needsInviteSecret && (
            <input
              type="password"
              value={inviteSecret}
              onChange={(event) => setInviteSecret(event.target.value)}
              placeholder="Re-enter founder secret"
              autoComplete="off"
              style={inviteInputStyle}
            />
          )}
          <button type="submit" style={btnPrimary} disabled={inviteBusy}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} /> {inviteBusy ? 'Sending…' : 'Send beta invite'}
            </span>
          </button>
        </form>
        <form onSubmit={handleBulk} style={{ display: 'grid', gap: 6 }} data-testid="founder-bulk-invite">
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>
              Paste a list (comma, newline, or semicolon)
            </span>
            <textarea
              value={inviteList}
              onChange={(event) => setInviteList(event.target.value)}
              placeholder={'one@example.com\ntwo@example.com, three@example.com'}
              rows={5}
              style={{ ...inviteInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          <button type="submit" style={btnPrimary} disabled={inviteBusy || !inviteList.trim()}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} /> {inviteBusy ? 'Sending…' : 'Send to list'}
            </span>
          </button>
        </form>
        {inviteError && <div style={{ color: '#f87171' }}>{inviteError}</div>}
        {inviteResult && (
          <div style={{ display: 'grid', gap: 3, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', padding: 8, borderRadius: 8 }}>
            <div>Invited: <strong>{inviteResult.email}</strong></div>
            <div>Key: <code style={{ fontSize: 11 }}>{inviteResult.key}</code></div>
            <div>Fingerprint: <code>{inviteResult.fingerprint}</code></div>
            <div>Expires: <strong>{new Date(inviteResult.expiresAt).toLocaleDateString('en-US')}</strong> ({inviteResult.days} days)</div>
            <div>Email delivery: <strong>{inviteResult.emailStatus}</strong></div>
            <button
              type="button"
              style={btn}
              onClick={() => navigator.clipboard?.writeText(inviteResult.key)}
            >
              Copy license key
            </button>
          </div>
        )}
        {bulkResult && (
          <div data-testid="founder-bulk-results" style={{ display: 'grid', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: 8, borderRadius: 8 }}>
            <div>
              {bulkResult.duplicatesRemoved ? `${bulkResult.duplicatesRemoved} duplicate ${bulkResult.duplicatesRemoved === 1 ? 'address was' : 'addresses were'} removed. ` : ''}
              {bulkResult.error || 'List processed.'}
            </div>
            {(bulkResult.results || []).map((result) => (
              <div key={`${result.email}-${result.status}`}>
                <strong>{result.email}</strong> — {resultLabel(result)}
                {result.key ? <div><code style={{ fontSize: 10 }}>{result.key}</code></div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 6 }} data-testid="founder-invite-report">
        <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
          Invite report
        </strong>
        <div style={{ color: 'var(--color-text-muted, #9ca3af)', lineHeight: 1.4 }}>
          Beta invites sent from this deployment. Activity uses activation time, the latest status check, and email events when tracking is configured.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select
            aria-label="Filter invites by status"
            value={reportStatus}
            onChange={(event) => {
              const next = event.target.value;
              setReportStatus(next);
              if (report) loadReport(next);
            }}
            style={inviteInputStyle}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="activated">Activated</option>
            <option value="expired">Expired</option>
            <option value="email_failed">Email failed</option>
            <option value="bounced">Bounced</option>
          </select>
          <button type="button" style={btnPrimary} disabled={reportBusy} onClick={() => loadReport(reportStatus)}>
            {reportBusy ? 'Loading…' : 'Load report'}
          </button>
          <button type="button" style={btn} disabled={!report?.invites?.length} onClick={exportCsv}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Download size={12} /> Export CSV
            </span>
          </button>
        </div>
        {reportError && <div style={{ color: '#f87171' }}>{reportError}</div>}
        {report?.emailTrackingMessage && (
          <div style={{ color: '#fbbf24' }} data-testid="email-tracking-message">{report.emailTrackingMessage}</div>
        )}
        {report && (
          <div style={{ display: 'grid', gap: 6, maxHeight: 280, overflow: 'auto' }}>
            {report.invites.length === 0 && (
              <div style={{ color: 'var(--color-text-muted, #9ca3af)' }}>No invites for this filter.</div>
            )}
            {report.invites.map((invite) => (
              <article key={`${invite.email}-${invite.sentAt}`} style={{ display: 'grid', gap: 2, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <strong>{invite.email}</strong>
                <div>{invite.name || invite.note || 'No name or note'}</div>
                <div>Sent {formatWhen(invite.sentAt)} · {invite.days ?? '—'} days · expires {formatWhen(invite.expiresAt)}</div>
                <div>Email: {invite.emailStatus} · {invite.daysLeftLabel || (invite.expired ? 'Expired' : '—')}</div>
                <div>
                  {invite.activatedAt ? `Activated ${formatWhen(invite.activatedAt)}` : 'Not activated'}
                  {' · '}
                  {invite.lastSeenAt ? `Last seen ${formatWhen(invite.lastSeenAt)}` : 'No status check yet'}
                </div>
                <div>
                  {invite.emailEvents?.length
                    ? invite.emailEvents.map((event) => `${event.type} ${formatWhen(event.at)}`).join(' · ')
                    : 'No email events'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
