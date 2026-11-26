# ExhibitKit suite consolidation (retirement)

The standalone **ExhibitKit** product and storefront at `exhibitkit.patentpreppers.com` are retired in favor of the [PatentPreppers](https://patentpreppers.com) litigation suite. This repository, domains, license database, and backups are **not** deleted.

## Visitor experience

When `VITE_SUITE_RETIREMENT` is unset, production builds (`import.meta.env.PROD`) show a **minimal retirement page** with links to:

| Destination | URL |
|-------------|-----|
| Suite module catalog | https://patentpreppers.com/modules |
| Built-in Exhibit Renamer (workspace login) | https://patentpreppers.com/trial-tools/exhibit-renamer |
| Resources | https://patentpreppers.com/resources |
| Suite home | https://patentpreppers.com |

Set `VITE_SUITE_RETIREMENT=false` on a preview deployment to restore the legacy landing for QA only.

### Legacy workspace (existing licenses)

- URL: `https://exhibitkit.patentpreppers.com/?legacy=workspace`
- Or: **Open legacy workspace** on the retirement page when a license is already active on the device.
- Stripe return URLs (`stripe_status=success|cancel`) still render so purchasers can activate keys.
- **No new purchase CTAs** are shown while retirement mode is on.

### Optional edge redirect (Vercel)

To send all HTML traffic to the suite catalog without loading the SPA, add a Vercel redirect (keep `/api/*` untouched):

```json
{
  "source": "/((?!api/).*)",
  "destination": "https://patentpreppers.com/modules",
  "permanent": false,
  "missing": [{ "type": "query", "key": "legacy" }]
}
```

Omit this if you prefer the in-app retirement page (recommended for license recovery copy and legacy workspace entry).

## Deploy / unpause

Production is currently served from Vercel. Unpausing the project is required before any redirect or retirement page is visible to visitors. **Do not** auto-deploy this consolidation to production without an explicit release step.

After unpause, set `VITE_SUITE_RETIREMENT=true` in the Vercel project (optional; production defaults to retired when unset).

## Unique ExhibitKit capabilities (do not delete in this pass)

The built-in **PatentPreppers Exhibit Renamer** may still need parity with engines that live only in this repo. Keep these modules until a deliberate merge:

| Area | Location | Capability |
|------|----------|------------|
| Rename core | `src/utils/renamer.js` | OnCue / TrialDirector / DOD structured parsing, year-aware sorting, Bates modes (`sequential` vs `as-exhibit-id`), multi-practice presets |
| Outline staging | `src/utils/outlineImport.js` | Hearing-outline import, official exhibit number matching, outline-ordered staging preset |
| In-place rename | `src/App.jsx` + File System Access API | Chromium `showDirectoryPicker` batch rename on disk |
| Matter profiles | `src/utils/project.js` | Per-matter saved prefix, padding, preset, template (Pro) |
| Crosswalk export | `src/utils/crosswalk.js` | CSV/JSON audit logs with original ↔ final mapping |
| Message exhibits | `src/utils/messageParse.js`, `src/utils/exhibitPdf.js`, `src/utils/redact.js` | Local message export parse, redaction, tamper-evident PDF exhibit generation |
| Licensing / fulfillment | `api/*`, `src/utils/entitlement.js` | Stripe webhook fulfillment, device-bound Pro, Case Pass (historical), founder admin |

None of the above engines are removed or merged in the consolidation PR; only customer-facing storefront marketing and purchase flows are retired.