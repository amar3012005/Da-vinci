import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from './Seo';

/**
 * PrivacySecurity — Privacy Policy + Security page, supermemory.ai/privacy
 * layout (bordered header card, sticky left TOC, right content column)
 * re-skinned in SINGULANCE's own marketing tokens (see NewsArticleLayout.jsx):
 * paper canvas, ink text, ember accent, Space Grotesk headings, mono
 * uppercase labels. Two documents on one page — Privacy then Security —
 * since they share one TOC/scroll-spy and most visitors want both.
 */
const PAPER = '#FBFBF8';
const INK = '#0a0a0a';
const EMBER = '#FF5229';
const BORDER = '#E4E3DE';
const MUTED = '#6b6b64';

const SECTIONS = [
  { id: 'overview', label: 'Overview', group: 'privacy' },
  { id: 'info-collection', label: 'Information We Collect', group: 'privacy' },
  { id: 'website-data', label: 'Website & Cookies', group: 'privacy' },
  { id: 'legal-bases', label: 'Lawful Bases', group: 'privacy' },
  { id: 'connected-services', label: 'Connected Services', group: 'privacy' },
  { id: 'ai-processing', label: 'AI Processing', group: 'privacy' },
  { id: 'use-of-information', label: 'Use of Information', group: 'privacy' },
  { id: 'data-residency', label: 'Data Residency & Hosting', group: 'privacy' },
  { id: 'disclosure', label: 'Information Disclosure', group: 'privacy' },
  { id: 'subprocessors', label: 'Service Providers', group: 'privacy' },
  { id: 'retention', label: 'Data Retention & Deletion', group: 'privacy' },
  { id: 'your-rights', label: 'Your Rights (GDPR)', group: 'privacy' },
  { id: 'international-transfers', label: 'International Transfers', group: 'privacy' },
  { id: 'policy-updates', label: 'Policy Updates', group: 'privacy' },
  { id: 'security', label: 'Security Overview', group: 'security' },
  { id: 'encryption', label: 'Encryption', group: 'security' },
  { id: 'tenant-isolation', label: 'Tenant Isolation', group: 'security' },
  { id: 'infra-partners', label: 'Infrastructure Partners', group: 'security' },
  { id: 'access-control', label: 'Access Control & Auth', group: 'security' },
  { id: 'incident-response', label: 'Incident Response', group: 'security' },
  { id: 'contact', label: 'Contact', group: 'both' },
];

const H2 = ({ id, children }) => (
  <h2
    id={id}
    className="font-['Space_Grotesk'] scroll-mt-28 border-b pb-3 text-[22px] font-semibold tracking-tight md:text-[26px]"
    style={{ color: INK, borderColor: BORDER }}
  >
    {children}
  </h2>
);

const P = ({ children }) => (
  <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: '#3a3a36' }}>{children}</p>
);

const Ul = ({ items }) => (
  <ul className="mt-4 space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 text-[15.5px] leading-relaxed" style={{ color: '#3a3a36' }}>
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: EMBER }} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Section = ({ children }) => <div className="mt-14 first:mt-0">{children}</div>;

const PrivacySecurity = ({ mode = 'privacy' }) => {
  const navigate = useNavigate();
  const isSecurity = mode === 'security';
  const visibleSections = React.useMemo(() => SECTIONS.filter((section) => section.group === mode || section.group === 'both'), [mode]);
  const [active, setActive] = useState(isSecurity ? 'security' : 'overview');

  useEffect(() => {
    const onScroll = () => {
      let current = visibleSections[0].id;
      for (const s of visibleSections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [visibleSections]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter']">
      <Seo
        title={`${isSecurity ? 'Security' : 'Privacy Policy'} — SINGULANCE`}
        description={isSecurity ? 'The technical and organizational security controls protecting SINGULANCE and HIVEMIND.' : 'How SINGULANCE collects, uses, retains, and protects personal data, and how to exercise your privacy rights.'}
        canonical={`https://singulancelabs.com/${isSecurity ? 'security' : 'privacy'}`}
      />

      {/* top bar */}
      <div className="flex items-center justify-between border-b px-6 py-4 md:px-10" style={{ borderColor: BORDER }}>
        <button onClick={() => navigate('/')} className="bg-transparent font-['Space_Grotesk'] text-[15px] font-semibold" style={{ color: INK }}>
          SINGULANCE
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Legal</span>
      </div>

      {/* header card */}
      <div className="mx-6 mt-6 rounded-xl border px-8 py-14 text-center md:mx-10 md:py-20" style={{ borderColor: BORDER }}>
        <h1 className="font-['Space_Grotesk'] mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl" style={{ color: INK }}>
          {isSecurity ? 'Security' : 'Privacy Policy'}
        </h1>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
          Last updated: August 27, 2026 &nbsp;·&nbsp; SINGULANCE, Hannover, Germany
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-[1200px] grid-cols-1 gap-0 px-6 pb-24 md:grid-cols-[240px_1fr] md:gap-16 md:px-10">
        {/* sticky TOC */}
        <aside className="hidden md:block">
          <div className="sticky top-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>Contents</p>
            <nav className="mt-4 space-y-1 border-l" style={{ borderColor: BORDER }}>
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="block w-full pl-4 py-1.5 text-left text-[13px] transition-colors"
                  style={{
                    borderLeft: active === s.id ? `2px solid ${EMBER}` : '2px solid transparent',
                    marginLeft: '-1px',
                    color: active === s.id ? INK : MUTED,
                    fontWeight: active === s.id ? 600 : 400,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* content */}
        <article className="min-w-0 pt-10 md:pt-0">
          {!isSecurity && <>
          {/* ── PRIVACY POLICY ── */}
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: EMBER }}>Part I</p>
          <h2 className="font-['Space_Grotesk'] mt-2 text-3xl font-semibold tracking-tight">Privacy Policy</h2>

          <Section>
            <H2 id="overview">Overview</H2>
            <P>
              This policy describes how SINGULANCE (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) collects, processes, and
              protects information across our products — HIVEMIND (memory engine), Tara (voice agent), and Sentinel Agents
              (autonomous digital employees), together the &ldquo;Services.&rdquo; SINGULANCE is built EU-first: single-tenant
              deployments, EU-hosted infrastructure, and data handling designed around GDPR, DORA, and the EU AI Act from
              day one. These design goals support customer compliance obligations; they are not a legal certification or
              a substitute for each customer&rsquo;s own assessment.
            </P>
          </Section>

          <Section>
            <H2 id="website-data">Website Data, Cookies &amp; Similar Technology</H2>
            <P>
              Our edge provider necessarily processes request information such as IP address, user agent, requested URL,
              status code, and timestamp to deliver and protect the site. We store your versioned cookie choices in the
              strictly necessary first-party cookie <code>singulance_cookie_consent_v1</code>. Optional preferences,
              PostHog EU product analytics, autocapture, and session replay remain disabled until you opt in. We currently
              install no advertising or retargeting tracker. See our <a href="/cookies" style={{ color: EMBER }}>Cookie Policy</a>{' '}
              for the provider, purpose, category, and duration of each browser technology.
            </P>
          </Section>

          <Section>
            <H2 id="legal-bases">Lawful Bases</H2>
            <Ul items={[
              'Contract or steps requested before contract (GDPR Art. 6(1)(b)): accounts, authentication, requested product functions, support, and billing',
              'Consent (Art. 6(1)(a)): optional analytics, session replay, marketing technology, and consent-based communications; consent can be withdrawn at any time',
              'Legitimate interests (Art. 6(1)(f)): essential security, fraud prevention, service reliability, and responding to business inquiries, balanced against your rights',
              'Legal obligation (Art. 6(1)(c)): tax, accounting, regulatory, and lawful-request records where applicable',
            ]} />
            <P>Access to the public site and core contractual service is not conditional on accepting optional analytics or marketing technology.</P>
          </Section>

          <Section>
            <H2 id="info-collection">Information We Collect</H2>
            <P>Account information you provide directly:</P>
            <Ul items={[
              'Full name and email address',
              'Organization name and role',
              'Billing and plan information (processed via our payment provider — we do not store card numbers)',
            ]} />
            <P>Content and data created within the Services:</P>
            <Ul items={[
              'Memories, documents, and conversations you save to HIVEMIND',
              'Voice recordings and transcripts processed by Tara, where enabled',
              'Configuration, agent instructions, and workflow data for Sentinel Agents',
            ]} />
            <P>Technical information necessary for security and operation:</P>
            <Ul items={[
              'Authentication and session logs',
              'API and connector usage logs',
              'System performance and error metrics',
            ]} />
          </Section>

          <Section>
            <H2 id="connected-services">Connected Services</H2>
            <P>
              With your explicit consent, you may connect third-party services so HIVEMIND can ingest, recall, or act on
              your behalf — for example Gmail, Google Calendar, Google Drive, Slack, Notion, GitHub, LinkedIn, and others
              available in your Connectors page. Each connection requires:
            </P>
            <Ul items={[
              'Explicit authorization through that service’s own OAuth consent screen — we never see your password',
              'A scope grant limited to what the connected feature actually uses',
              'Your ability to disconnect and revoke access at any time from the Connectors page',
            ]} />
            <P>
              Data accessed through a connected service is processed only for the purpose you authorized (ingestion,
              recall, or an action you requested) and is subject to that service&rsquo;s own terms as well.
            </P>
          </Section>

          <Section>
            <H2 id="ai-processing">AI Processing</H2>
            <P>
              When you use HIVEMIND&rsquo;s recall, chat, or agent features, your content may be processed by
              model providers routed through our controlled AI gateway solely to generate the
              response or action you requested. We do not permit these providers to train on your data. Where a
              connector routes execution through a third-party platform (for example, Composio for certain tool
              integrations), the same principle applies — processing happens at your direction, for your request, and
              nothing else.
            </P>
          </Section>

          <Section>
            <H2 id="use-of-information">Use of Information</H2>
            <Ul items={[
              'Operating and authenticating your account',
              'Storing, indexing, and recalling memory as you request it',
              'Executing connector actions you explicitly authorize',
              'Billing, plan enforcement, and fraud prevention',
              'Essential service communications',
              'Security monitoring and abuse prevention',
              'Compliance with legal obligations under GDPR, DORA, and applicable law',
            ]} />
          </Section>

          <Section>
            <H2 id="data-residency">Data Residency &amp; Hosting</H2>
            <P>
              Hosted HIVEMIND workspaces apply organization and user scope across application, database, vector-search,
              and graph paths. Dedicated and self-hosted deployment options provide additional physical isolation where
              contracted. Primary application and memory infrastructure is operated in Europe; a connector or model
              provider you deliberately invoke may process the minimum necessary request outside the EEA under an
              applicable transfer mechanism described below.
            </P>
          </Section>

          <Section>
            <H2 id="subprocessors">Service Providers &amp; Sub-processors</H2>
            <P>Depending on the product and configuration you use, service providers may include:</P>
            <Ul items={[
              'Cloudflare for DNS, edge delivery, security controls, Workers, and controlled AI routing',
              'EU infrastructure providers, including Hetzner, for application, database, and memory services',
              'PostHog EU Cloud for optional product analytics and session replay only after consent',
              'Stripe for checkout, subscriptions, and payment records; SINGULANCE does not store full card numbers',
              'Google or other identity providers when you choose their sign-in method',
              'Model and connector providers needed for a feature you request, subject to the selected deployment and routing configuration',
            ]} />
            <P>We review this list when providers or processing purposes change and update this notice before materially different optional processing is enabled.</P>
          </Section>

          <Section>
            <H2 id="disclosure">Information Disclosure</H2>
            <P>We do not sell, rent, or commercially trade your personal information. We disclose information only:</P>
            <Ul items={[
              'To infrastructure and processing subprocessors necessary to run the Services (see Infrastructure Partners)',
              'To third-party AI providers, solely to fulfil a request you made',
              'To services you explicitly connected, per the scope you authorized',
              'When required by law, regulation, or valid legal process',
              'To protect the rights, safety, or property of SINGULANCE, our users, or others',
              'In connection with a merger, acquisition, or asset transfer, with continuity of this policy',
            ]} />
          </Section>

          <Section>
            <H2 id="retention">Data Retention &amp; Deletion</H2>
            <P>
              We retain account and memory data for as long as your account is active, or as needed to provide the
              Services, subject to configured retention and legal obligations. Consent records are retained for the
              stated cookie lifetime, optional analytics identifiers for the period listed in the Cookie Policy, and
              payment or tax records for applicable statutory periods. You may delete individual memories, disconnect a connector, or request full account deletion at
              any time. Disconnecting a service stops new sync but does not automatically delete previously ingested
              data unless you request it. Full-account deletion requests are honored subject to legal retention
              requirements and reasonable processing time.
            </P>
          </Section>

          <Section>
            <H2 id="your-rights">Your Rights (GDPR)</H2>
            <P>As a data subject under GDPR (and equivalent rights under other applicable law), you may:</P>
            <Ul items={[
              'Request access to the personal data we hold about you',
              'Request correction of inaccurate data',
              'Request erasure of your data (&ldquo;right to be forgotten&rdquo;)',
              'Request restriction of, or object to, certain processing',
              'Request data portability in a structured, commonly-used format',
              'Withdraw consent for a connected service at any time',
              'Lodge a complaint with your local data protection authority',
            ]} />
            <P>To exercise any of these rights, contact us — see Contact below.</P>
            <P>We normally respond within one month after verifying the request. You may also complain to your competent supervisory authority, including the State Commissioner for Data Protection of Lower Saxony where applicable.</P>
          </Section>

          <Section>
            <H2 id="international-transfers">International Transfers</H2>
            <P>
              Where a connected service or AI provider you authorize is based outside the EU/EEA, we rely on that
              provider&rsquo;s Standard Contractual Clauses or equivalent safeguard, and only transfer the minimum data
              necessary to fulfil the request you made.
            </P>
          </Section>

          <Section>
            <H2 id="policy-updates">Policy Updates</H2>
            <P>
              We may update this policy as our Services evolve. Material changes are communicated by email to account
              holders or a prominent notice in the product before they take effect.
            </P>
          </Section>
          </>}

          {/* ── SECURITY ── */}
          {isSecurity && <>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: EMBER }}>Part II</p>
            <h2 className="font-['Space_Grotesk'] mt-2 text-3xl font-semibold tracking-tight">Security</h2>
          </div>

          <Section>
            <H2 id="security">Security Overview</H2>
            <P>
              Security is architectural at SINGULANCE, not a policy layer bolted on afterward. Every design decision —
              tenant isolation, dedicated-deployment options, encryption defaults, credential handling — starts from &ldquo;what does a
              regulated European enterprise&rsquo;s security team need to see&rdquo; rather than being retrofitted later.
            </P>
          </Section>

          <Section>
            <H2 id="encryption">Encryption</H2>
            <Ul items={[
              'All data in transit is encrypted via TLS',
              'Connector access tokens and refresh tokens are encrypted at rest (AES-256-GCM) before storage — never stored in plaintext',
              'Encryption keys are managed separately from application data',
            ]} />
          </Section>

          <Section>
            <H2 id="tenant-isolation">Tenant Isolation</H2>
            <P>
              Every hosted request is scoped to the authenticated user and organization across database, vector, and graph
              access paths. Dedicated and self-hosted deployments are available for customers that require physical
              isolation contractually. Logical isolation and dedicated deployment are distinct controls and are not
              represented as the same thing.
            </P>
          </Section>

          <Section>
            <H2 id="infra-partners">Infrastructure Partners</H2>
            <P>We rely on a small number of vetted infrastructure providers, each contractually bound to appropriate security standards:</P>
            <Ul items={[
              'EU-based hosting for primary application and database infrastructure',
              'Cloudflare AI Gateway and configured model providers for inference invoked by a requested feature',
              'Composio, where used, for specific third-party tool execution you authorize',
            ]} />
          </Section>

          <Section>
            <H2 id="access-control">Access Control &amp; Authentication</H2>
            <Ul items={[
              'OAuth2-based authentication for every connected service — no shared or hardcoded credentials',
              'Role-based access control within an organization (admin vs. member permissions)',
              'Session-based authentication with configurable expiry',
              'Rate limiting on public-facing endpoints',
            ]} />
          </Section>

          <Section>
            <H2 id="incident-response">Incident Response</H2>
            <P>
              In the event of a personal-data breach, we notify affected controllers without undue delay and support the
              information they need for their own obligations. Where SINGULANCE is the controller, we assess notification
              to the competent supervisory authority within GDPR&rsquo;s 72-hour window and notify affected individuals when
              the law requires it.
            </P>
          </Section>
          </>}

          <Section>
            <H2 id="contact">Contact</H2>
            <P>
              For privacy requests, security disclosures, or general questions about this policy, contact us at{' '}
              <a href="mailto:privacy@singulancelabs.com" style={{ color: EMBER }}>privacy@singulancelabs.com</a>.
              For security vulnerability reports specifically, use{' '}
              <a href="mailto:security@singulancelabs.com" style={{ color: EMBER }}>security@singulancelabs.com</a>.
            </P>
            <P>SINGULANCE &middot; Hannover, Germany</P>
          </Section>
        </article>
      </div>
    </div>
  );
};

export default PrivacySecurity;
