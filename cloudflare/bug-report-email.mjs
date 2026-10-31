// Founder notification for new in-app bug reports, sent with the Cloudflare Email Service binding (BUG_REPORT_EMAIL,
// recipients restricted in wrangler.jsonc) from an onboarded sending subdomain. Report text is sanitised before it reaches the subject.
export const BUG_REPORT_TO = 'support@singulancelabs.com';
export const BUG_REPORT_FROM = 'bugs@admin.singulancelabs.com';
export const ADMIN_BUG_REPORTS_URL = 'https://admin.hivemind.singulancelabs.com/?section=bug-reports';

const oneLine = value => String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
/** Builds the subject and plain-text body for a stored report. Only report fields are included, no tokens or cookies. */
export function bugReportMessage(report) {
  const first = oneLine(report.text).slice(0, 60);
  const subject = `[HIVEMIND bug] ${report.platform} · ${first}`;
  const body = [
    `New bug report ${report.id}`, '',
    `Platform: ${report.platform}`, `Company (org id): ${oneLine(report.orgId) || '-'}`, `User id: ${report.userId}`,
    `Route: ${oneLine(report.route) || '-'}`, `Version: ${oneLine(report.appVersion) || '-'} (build ${oneLine(report.build) || '-'})`,
    `User agent: ${oneLine(report.userAgent) || '-'}`, `Received: ${report.at}`, '', 'Report:', report.text, '',
    `Review and mark it seen or fixed: ${ADMIN_BUG_REPORTS_URL}`,
  ].join('\n');
  return { subject, body };
}

/**
 * Sends one notification through the Email Service binding `env.BUG_REPORT_EMAIL` (object API). Does nothing when the
 * binding is absent. Throws on send failure; the caller logs it.
 */
export async function sendBugReportEmail(env, report) {
  if (!env?.BUG_REPORT_EMAIL) return false;
  const { subject, body } = bugReportMessage(report);
  const from = env.BUG_REPORT_FROM || BUG_REPORT_FROM;
  try {
    const result = await env.BUG_REPORT_EMAIL.send({ to: BUG_REPORT_TO, from: { email: from, name: 'HIVEMIND bug reports' }, subject, text: body });
    console.log(`[bug-report-email] accepted report=${report.id} messageId=${result?.messageId ?? 'none'}`);
  } catch (error) {
    // The Email Service rejects with an Error carrying a `code` such as E_SENDER_NOT_VERIFIED or E_RECIPIENT_NOT_ALLOWED.
    console.error(`[bug-report-email] send failed report=${report.id} code=${error?.code ?? 'none'} message=${error?.message ?? error}`);
    throw error;
  }
  return true;
}
