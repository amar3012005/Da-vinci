// Founder notification for new in-app bug reports, sent with the Cloudflare Email Workers `send_email` binding
// (BUG_REPORT_EMAIL, destination restricted in wrangler.jsonc). Reports are user text and are never trusted in headers.
export const BUG_REPORT_TO = 'support@singulancelabs.com';
export const BUG_REPORT_FROM = 'bugs@singulancelabs.com';
export const ADMIN_BUG_REPORTS_URL = 'https://admin.hivemind.singulancelabs.com/?section=bug-reports';

const oneLine = value => String(value ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
const base64 = text => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const wrap = text => text.replace(/(.{76})/g, '$1\r\n');
/** RFC 2047 encoded-word for any subject that is not plain printable ASCII. */
const subjectHeader = subject => (/^[\x20-\x7e]*$/.test(subject) ? subject : `=?UTF-8?B?${base64(subject)}?=`);

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

/** Minimal RFC 5322 message with a base64 UTF-8 body. */
export function buildMime({ from, to, subject, body, id, date = new Date() }) {
  return [
    `From: HIVEMIND bug reports <${from}>`, `To: ${to}`, `Subject: ${subjectHeader(oneLine(subject))}`, `Date: ${date.toUTCString()}`,
    `Message-ID: <${id}@${from.split('@')[1]}>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '',
    wrap(base64(body.replace(/\r?\n/g, '\r\n'))), '',
  ].join('\r\n');
}

/**
 * Sends one notification through `env.BUG_REPORT_EMAIL`. Does nothing when the binding is absent. Throws on send failure;
 * the caller logs it. `EmailMessage` is injectable because `cloudflare:email` only resolves inside the Workers runtime.
 */
export async function sendBugReportEmail(env, report, { EmailMessage } = {}) {
  if (!env?.BUG_REPORT_EMAIL) return false;
  const Message = EmailMessage || (await import('cloudflare:email')).EmailMessage;
  const from = env.BUG_REPORT_FROM || BUG_REPORT_FROM;
  const { subject, body } = bugReportMessage(report);
  await env.BUG_REPORT_EMAIL.send(new Message(from, BUG_REPORT_TO, buildMime({ from, to: BUG_REPORT_TO, subject, body, id: report.id })));
  return true;
}
