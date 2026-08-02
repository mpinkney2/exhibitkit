/**
 * Evidence-processing network guard.
 * Blocks outbound requests that look like evidence uploads from the browser app.
 * Payment navigations to Stripe are allowlisted by host only — never with evidence payloads.
 */

const ALLOWED_HOST_SUFFIXES = [
  'stripe.com',
  'stripe.network',
  'js.stripe.com',
];

const EVIDENCE_HINT =
  /(message|exhibit|evidence|redact|sha-?256|conversation|caption|caseName|filename)/i;

function hostAllowed(urlString) {
  try {
    const url = new URL(urlString, window.location.origin);
    if (url.origin === window.location.origin) return true;
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

function looksLikeEvidenceUpload(input, init) {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (hostAllowed(url)) {
    // Even on allowlisted hosts, reject bodies that embed evidence-looking fields
    const body = init?.body;
    if (typeof body === 'string' && EVIDENCE_HINT.test(body)) return true;
    return false;
  }

  // Any cross-origin request from the evidence UI is treated as suspicious
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Install fetch/XHR guards. Returns an uninstall function.
 */
export function installEvidenceNetworkGuard() {
  if (typeof window === 'undefined') return () => {};

  const originalFetch = window.fetch.bind(window);
  const OriginalXHR = window.XMLHttpRequest;

  window.fetch = async (input, init) => {
    if (looksLikeEvidenceUpload(input, init)) {
      const error = new Error(
        'Blocked outbound request: ExhibitKit does not upload evidence from the processing workflow.'
      );
      error.name = 'EvidenceUploadBlocked';
      console.warn(error.message);
      throw error;
    }
    return originalFetch(input, init);
  };

  function GuardedXHR() {
    const xhr = new OriginalXHR();
    const open = xhr.open;
    xhr.open = function patchedOpen(method, url, ...rest) {
      this.__ekitUrl = url;
      return open.call(this, method, url, ...rest);
    };
    const send = xhr.send;
    xhr.send = function patchedSend(body) {
      if (looksLikeEvidenceUpload(this.__ekitUrl || '', { body })) {
        const error = new Error(
          'Blocked outbound request: ExhibitKit does not upload evidence from the processing workflow.'
        );
        error.name = 'EvidenceUploadBlocked';
        console.warn(error.message);
        throw error;
      }
      return send.call(this, body);
    };
    return xhr;
  }
  GuardedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = GuardedXHR;

  return () => {
    window.fetch = originalFetch;
    window.XMLHttpRequest = OriginalXHR;
  };
}

/** Pure helper for tests */
export function wouldBlockEvidenceUpload(url, init = {}) {
  return looksLikeEvidenceUpload(url, init);
}
