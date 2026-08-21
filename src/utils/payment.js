const DEFAULT_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/cNicN59My1tC6VN0ayg7e00';

export const PRO_PRICE_USD = 149;
export const PRO_PRICE_LABEL = `$${PRO_PRICE_USD}`;

function sanitizeClientReference(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 200);
}

export function buildStripePaymentLink({
  paymentLink = import.meta.env?.VITE_STRIPE_PAYMENT_LINK || DEFAULT_STRIPE_PAYMENT_LINK,
  workstationId = ''
} = {}) {
  try {
    const url = new URL(paymentLink);
    if (url.protocol !== 'https:' || url.username || url.password) return null;

    const clientReferenceId = sanitizeClientReference(workstationId);
    if (clientReferenceId) {
      url.searchParams.set('client_reference_id', clientReferenceId);
    }

    url.searchParams.set('utm_source', 'exhibitkit');
    url.searchParams.set('utm_medium', 'app');
    url.searchParams.set('utm_campaign', 'pro_perpetual_license');
    return url.toString();
  } catch {
    return null;
  }
}

export function isUsingDefaultPaymentLink() {
  return !import.meta.env?.VITE_STRIPE_PAYMENT_LINK;
}
