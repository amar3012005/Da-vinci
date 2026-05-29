import React from 'react';
import Seo from '../components/Seo';

const SectionCard = ({ title, children }) => (
  <section className="border border-white/10 bg-black/90 p-6 mb-6">
    <h2 className="text-xl font-mono text-green-400 mb-4">{title}</h2>
    <div className="space-y-3 text-white/75 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPage = () => {
  return (
    <>
      <Seo
        title="Privacy Policy — Da'vinci Solutions"
        canonical="https://www.davinciai.eu/privacy"
      />
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.04)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.04)_1px)] bg-[size:25px_25px]" />
      </div>

      <div className="max-w-4xl mx-auto pt-32 pb-24 px-8 relative z-10">
        <h1 className="text-3xl font-mono font-bold mb-2">
          <span className="opacity-100">PRIVACY</span>{' '}
          <span className="relative">
            POLICY
            <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
          </span>
        </h1>
        <p className="text-white/50 font-mono text-xs mb-10">
          HIVEMIND · Da'vinci Solutions · last updated {new Date().toISOString().slice(0, 10)}
        </p>

        <SectionCard title="Who we are">
          <p>
            HIVEMIND is a persistent memory engine operated by Da'vinci Solutions.
            We turn stateless LLMs into context-aware assistants by storing the
            information you choose to share in a bi-temporal knowledge graph,
            then making it recallable across every session, machine, and tool.
          </p>
          <p>
            This policy covers the HIVEMIND web app at <code className="text-green-400">hivemind.davinciai.eu</code>,
            the HIVEMIND CLI (<code className="text-green-400">@hivemind/cli</code>), the HIVEMIND MCP server, and the
            HIVEMIND browser extension.
          </p>
        </SectionCard>

        <SectionCard title="What we collect">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Account info</strong> — email and (optional)
              display name from your OAuth provider (Zitadel / Google / GitHub).
            </li>
            <li>
              <strong className="text-white">Memories you explicitly save</strong> —
              facts, decisions, preferences, code snippets, conversations, files,
              connector payloads (Gmail / Slack / Notion / Drive / Calendar) you
              connect via OAuth. Each memory is stored verbatim with the title,
              content, tags, type, and source metadata you provide.
            </li>
            <li>
              <strong className="text-white">Derived data</strong> — vector embeddings,
              extracted facts, graph relationships, bi-temporal versions, and
              search indexes computed from memories you saved.
            </li>
            <li>
              <strong className="text-white">Operational logs</strong> — request
              timestamps, IP, user agent, error traces (retained 30 days, used
              only to diagnose service issues).
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="What we do NOT collect">
          <ul className="list-disc pl-5 space-y-2">
            <li>Passive browsing history. The extension never logs URLs you visit unless you save the page.</li>
            <li>Form data, passwords, payment info, or anything outside the explicit save action.</li>
            <li>Microphone, camera, or geolocation.</li>
            <li>Behavioural/analytics tracking pixels or third-party ad SDKs.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Where data is stored">
          <p>
            <strong className="text-white">EU sovereign infrastructure.</strong>{' '}
            All HIVEMIND data lives on Hetzner servers in Frankfurt, Germany.
            Storage backends: Postgres (memories, edges, users), Qdrant (vector
            indexes), Redis (session state). Replication and backups stay within the EU.
          </p>
          <p>
            <strong className="text-white">In transit</strong> — TLS 1.3 only,
            HSTS enforced.<br />
            <strong className="text-white">At rest</strong> — disk-level encryption
            on Postgres + Qdrant volumes. Tokens (OAuth, API keys) stored
            hash-only or AES-256 encrypted, never plaintext.
          </p>
        </SectionCard>

        <SectionCard title="Third parties (limited, named)">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Zitadel</strong> — identity provider
              (sign-in). Receives only your email + consent grant.
            </li>
            <li>
              <strong className="text-white">Groq</strong> — large-language-model
              inference (US, contractually bound). Your queries and the relevant
              recalled memories pass through Groq at inference time. Groq does
              not retain them per our DPA.
            </li>
            <li>
              <strong className="text-white">Nango</strong> — self-hosted OAuth
              broker, runs on our infrastructure. Token storage stays in our EU
              database.
            </li>
            <li>
              <strong className="text-white">Optional connectors</strong> — Gmail,
              Slack, Google Drive, Calendar, Notion, GitHub, Linear, Jira,
              Confluence. We only access them after you OAuth-connect, and only
              read the scopes you grant. Tokens are revocable at any time from
              Settings → Connectors.
            </li>
          </ul>
          <p className="text-white/55 text-sm">
            We do not sell, rent, or transfer your data to advertisers, data
            brokers, or any party not listed above.
          </p>
        </SectionCard>

        <SectionCard title="Browser extension — specifics">
          <p>The HIVEMIND Chrome extension uses the following permissions:</p>
          <ul className="list-disc pl-5 space-y-2 font-mono text-sm">
            <li><strong>activeTab / tabs</strong> — read URL+title of the focused tab so the sidebar AI can scope its answer.</li>
            <li><strong>scripting</strong> — extract a selection, section, or page only when you click Save / Ingest.</li>
            <li><strong>contextMenus</strong> — right-click "Save selection", "Recall similar".</li>
            <li><strong>identity</strong> — OAuth sign-in via Chrome (no API-key paste).</li>
            <li><strong>storage</strong> — persist your OAuth token + UI prefs in chrome.storage.local on your machine.</li>
            <li><strong>sidePanel</strong> — host the Talk-to-HIVE chat sidebar.</li>
          </ul>
          <p>
            On recognised AI chat platforms (ChatGPT, Claude, Gemini, Perplexity), the
            extension only reads / writes to the page when you click "Save chat
            session". No background scraping.
          </p>
        </SectionCard>

        <SectionCard title="Your rights (GDPR / DSGVO)">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">Access</strong> — list every memory you've saved at <code className="text-green-400">hivemind.davinciai.eu/hivemind/app/memories</code>.</li>
            <li><strong className="text-white">Rectification</strong> — edit / overwrite any memory in place.</li>
            <li><strong className="text-white">Erasure</strong> — delete individual memories or your full account from Settings.</li>
            <li><strong className="text-white">Portability</strong> — export all memories as JSON via Settings → Export, or programmatically via the MCP <code className="text-green-400">hivemind_list_memories</code> tool.</li>
            <li><strong className="text-white">Withdraw consent</strong> — revoke any connector at Settings → Connectors. Token + cached payloads purged within 24h.</li>
            <li><strong className="text-white">Complaint</strong> — you may lodge a complaint with the Bavarian / Hessen DPA (BayLDA / HBDI).</li>
          </ul>
        </SectionCard>

        <SectionCard title="Retention">
          <ul className="list-disc pl-5 space-y-2">
            <li>Memories — kept until you delete them or close your account.</li>
            <li>Bi-temporal history — previous versions retained as long as the parent memory exists (so you can time-travel).</li>
            <li>Operational logs — 30 days rolling.</li>
            <li>OAuth tokens — until you disconnect the integration; then purged in ≤ 24h.</li>
            <li>Account deletion — irreversible purge across Postgres + Qdrant + Redis within 72h, backups within 35 days.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Children">
          <p>
            HIVEMIND is not directed at children under 16. We do not knowingly
            collect data from anyone under 16. If you believe a child has signed
            up, email us and we will delete the account.
          </p>
        </SectionCard>

        <SectionCard title="Security">
          <p>
            We follow standard industry practice: TLS in transit, AES-256 / disk
            encryption at rest, tenant-scoped row-level security in Postgres,
            tenant-scoped Qdrant collections, rate limiting, audit logs, regular
            dependency scans, and least-privilege access for operators.
          </p>
          <p>
            If you find a vulnerability, please email{' '}
            <a href="mailto:security@davinciai.eu" className="text-green-400 underline">security@davinciai.eu</a>.
            We respond within 48h.
          </p>
        </SectionCard>

        <SectionCard title="Changes">
          <p>
            Material changes to this policy will be announced in-app and by
            email at least 14 days before they take effect. The "last updated"
            date at the top of this page always reflects the latest revision.
          </p>
        </SectionCard>

        <SectionCard title="Contact">
          <p>
            Da'vinci Solutions GmbH<br />
            Hannover, Germany
          </p>
          <p>
            Privacy / DPO: <a href="mailto:privacy@davinciai.eu" className="text-green-400 underline">privacy@davinciai.eu</a><br />
            Support: <a href="mailto:support@davinciai.eu" className="text-green-400 underline">support@davinciai.eu</a><br />
            Security: <a href="mailto:security@davinciai.eu" className="text-green-400 underline">security@davinciai.eu</a>
          </p>
        </SectionCard>
      </div>
    </div>
    </>
  );
};

export default PrivacyPage;
