import React, { useEffect, useState } from "react";
import apiClient from "../shared/api-client";
import AccessApplicationsPanel from "./AccessApplicationsPanel";

const when = (value) => (value ? new Date(value).toLocaleString() : "Never");
const emptyLogs = { mixed: [], core: [], control: [], employees: [] };
const stateColor = (state) =>
  state === "critical"
    ? "text-red-700 bg-red-50 border-red-200"
    : state === "warning"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : state === "healthy"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-[#525252] bg-[#f5f4f0] border-[#e3e0db]";
const mib = (value) =>
  Number.isFinite(value) ? `${value.toLocaleString()} MiB` : "Unavailable";
const seconds = (value) =>
  value
    ? `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`
    : "Unavailable";
// The backend (normalizeAccountProfile, billing/promotion-service.js) rejects
// any account_type + storage_mode pairing outside this exact set — but the
// old promotions form showed all three storage_mode options regardless of
// account_type, so picking e.g. Personal while storage_mode stayed on its
// default Hybrid always threw 'invalid account type and storage combination'.
// Deriving the select's options FROM account_type makes an invalid pairing
// unselectable, rather than a validation error the admin has to decode.
const STORAGE_MODE_OPTIONS = {
  personal: [["amr_embedded", "Embedded AMR"]],
  enterprise_managed: [
    ["hybrid", "Hybrid"],
    ["hybrid_amr_index", "Hybrid + AMR index"],
  ],
  enterprise_self_hosted: [
    ["byod_amr", "BYOD agent"],
    ["byod_hybrid", "BYOD + Hybrid"],
  ],
};
const PLAN_DETAILS = {
  free: "Hard caps",
  pro: "Individual work",
  scale: "Growing teams",
  enterprise: "Managed or self-hosted",
};
const CAP_LABELS = {
  maxMemories: "Memory capacity",
  llmTokensPerDay: "LLM tokens per day",
  llmTokensPerMonth: "LLM tokens per month",
  searchQueriesPerDay: "Search queries per day",
  searchQueriesPerMonth: "Search queries per month",
  deepResearchPerDay: "Deep research per day",
  deepResearchPerMonth: "Deep research per month",
  webIntelPerDay: "Web Intel jobs per day",
  maxUsers: "Seats",
  maxProjects: "Projects",
  maxConnectors: "Connectors",
  knowledgeBasePagesPerDay: "Knowledge Base pages per day",
  knowledgeBasePagesPerMonth: "Knowledge Base pages per month",
  maxHyperRooms: "HyperAgents rooms",
  meetingMinutesPerMonth: "Meeting minutes per month",
  hyperAgentRunsPerDay: "HyperAgents runs per day",
  hyperAgentRunsPerMonth: "HyperAgents runs per month",
  taraTalkSecondsPerDay: "TARA seconds per day",
  taraTalkSecondsPerMonth: "TARA seconds per month",
};

const SECURITY_CONTROLS = [
  [
    "verified",
    "Identity and access",
    "Session-bound organization selection; privileged HyperAgents and TARA access checks.",
  ],
  [
    "verified",
    "Tenant boundaries",
    "Engine and BYOD queries are organization-scoped.",
  ],
  [
    "verified",
    "Central integrity",
    "PQC memory and audit signing keys are configured in the central engine.",
  ],
  [
    "verified",
    "BYOD request containment",
    "Agent/broker body limits, rate limits, registry permissions, and container limits are committed.",
  ],
  [
    "in_progress",
    "BYOD transport PQC",
    "External Box transport and local PQC envelope signing still require rollout.",
  ],
  [
    "in_progress",
    "Cost controls",
    "Validate each feature’s quota check and post-success meter as one pair.",
  ],
  [
    "in_progress",
    "Backup and restore",
    "Local encrypted PostgreSQL/Qdrant jobs and a PostgreSQL restore drill are verified; off-host replication remains open.",
  ],
  [
    "open",
    "Host capacity",
    "Disk is at 85%; retire canaries only after route, rollback, and volume verification.",
  ],
  [
    "in_progress",
    "Secrets rotation",
    "Master key rotation is verified; Stripe webhook, BYOD agent token, and PQC key rotation drills remain.",
  ],
  [
    "open",
    "Audit coverage",
    "Prove enrollment, rotation, deletion, auth, and admin operations are append-only and redacted.",
  ],
];

function SecurityChecklist() {
  const labels = {
    verified: "Verified",
    in_progress: "In progress",
    open: "Open",
  };
  const colors = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    open: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <section className="mb-6 rounded-2xl border border-[#dfddd5] bg-white p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-[#161616]">
          Security hardening checklist
        </h2>
        <p className="text-xs text-[#737373]">
          Execution ledger. Status reflects verified evidence, not a compliance
          certification.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {SECURITY_CONTROLS.map(([state, title, detail]) => (
          <div
            key={title}
            className="flex gap-3 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3"
          >
            <span
              className={`mt-0.5 h-5 min-w-5 rounded-full border text-center text-[11px] leading-[18px] font-bold ${colors[state]}`}
            >
              {state === "verified" ? "✓" : "!"}
            </span>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#161616]">{title}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[state]}`}
                >
                  {labels[state]}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#525252]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapacityPanel({ metrics }) {
  if (!metrics) return null;
  const disk = metrics.filesystem || {};
  const database = metrics.postgres || {};
  const core = metrics.core || {};
  return (
    <section className="mb-6 rounded-2xl border border-[#dfddd5] bg-[#f8f7f3] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-[#161616]">
            Capacity and scale signals
          </h2>
          <p className="text-xs text-[#737373]">
            Observed {when(metrics.observed_at)}. Storage alerts at 70%;
            critical at 85%.
          </p>
        </div>
        <span
          className={`border rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${stateColor(disk.state)}`}
        >
          {disk.state || "unknown"} storage
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#e3e0db] bg-white p-4">
          <p className="text-xs text-[#737373]">Runtime disk</p>
          <p className="mt-1 text-2xl font-semibold text-[#161616]">
            {Number.isFinite(disk.used_percent)
              ? `${disk.used_percent}%`
              : "Unavailable"}
          </p>
          <p className="mt-1 text-xs text-[#525252]">
            {mib(disk.used_mib)} used of {mib(disk.total_mib)}
          </p>
          <p className="mt-2 text-[11px] text-[#737373]">
            {disk.source || disk.error || "No capacity source"}
          </p>
        </div>
        <div className="rounded-xl border border-[#e3e0db] bg-white p-4">
          <p className="text-xs text-[#737373]">PostgreSQL footprint</p>
          <p className="mt-1 text-2xl font-semibold text-[#161616]">
            {mib(database.database_mib)}
          </p>
          <p className="mt-1 text-xs text-[#525252]">Current database size</p>
          <p className="mt-2 text-[11px] text-[#737373]">
            Track this against your backup and volume plan.
          </p>
        </div>
        <div className="rounded-xl border border-[#e3e0db] bg-white p-4">
          <p className="text-xs text-[#737373]">Core runtime</p>
          <p className="mt-1 text-2xl font-semibold text-[#161616]">
            {mib(core.rss_mib)} RSS
          </p>
          <p className="mt-1 text-xs text-[#525252]">
            Heap {mib(core.heap_used_mib)} · up {seconds(core.uptime_seconds)}
          </p>
          <p className="mt-2 text-[11px] text-[#737373]">
            Load avg 1m: {metrics.load_average?.one_minute ?? "Unavailable"}
          </p>
        </div>
      </div>
      <div className="mt-4 border-t border-[#e3e0db] pt-3 text-sm text-[#313131]">
        {(metrics.recommendations || []).map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}

function CommercialManager() {
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("free");
  const [planDraft, setPlanDraft] = useState({});
  const [planHistory, setPlanHistory] = useState([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [referralCampaigns, setReferralCampaigns] = useState([]);
  const [enterpriseInvitations, setEnterpriseInvitations] = useState([]);
  const [invitationAudience, setInvitationAudience] = useState("b2c");
  const [enterpriseInvitationForm, setEnterpriseInvitationForm] = useState({
    company_name: "",
    workspace_name: "",
    recipient_email: "",
    account_type: "enterprise_managed",
    storage_mode: "hybrid",
    onboarding_days: 14,
    invitation_expires_at: "",
    welcome_message: "",
    private_notes: "",
    send_email: false,
  });
  const [enterpriseEmailPreview, setEnterpriseEmailPreview] = useState(null);
  const [oneTimeInvitationCode, setOneTimeInvitationCode] = useState("");
  const [oneTimeInvitationId, setOneTimeInvitationId] = useState("");
  const [oneTimeInvitationUrl, setOneTimeInvitationUrl] = useState("");
  const [personalInvitationForm, setPersonalInvitationForm] = useState({
    invitation_code: "",
    validity_days: 14,
  });
  const [personalInvitationUrl, setPersonalInvitationUrl] = useState("");
  const [invitationDetail, setInvitationDetail] = useState(null);
  const [emailForm, setEmailForm] = useState({
    template_id: "welcome_signup",
    to: "",
    name: "",
  });
  const [emailPreview, setEmailPreview] = useState(null);
  const [emailPreviewing, setEmailPreviewing] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    internal_name: "",
    code: "",
    base_plan: "enterprise",
    account_type: "enterprise_managed",
    storage_mode: "hybrid",
    billing_mode: "entitlement_only",
    max_redemptions: 4,
    ends_at: "",
    trial_days: 14,
    limits_json: "{}",
    restrict_email: "",
  });
  // One code configures BOTH phases of an enterprise signup: onboarding (a
  // fixed grace window, default 2 weeks) and runway (the recurring phase
  // after it, monthly by default) — see ReferralCampaign in schema.prisma /
  // buildReferralOffer in billing/entitlements.js. Distinct from the
  // Promotions tab above: this is what the signup page's "Partner referral
  // code" field actually redeems against.
  const [referralForm, setReferralForm] = useState({
    name: "",
    code: "",
    onboarding_days: 14,
    onboarding_plan: "enterprise",
    runway_plan: "enterprise",
    runway_interval_months: 1,
    discount_kind: "percentage",
    discount_percent: 20,
    discount_amount_cents: "",
    discount_currency: "EUR",
    max_redemptions: "",
    ends_at: "",
  });
  const load = async () => {
    try {
      const [
        nextPlans,
        nextPromotions,
        nextPilots,
        nextRedemptions,
        nextOrganizations,
        nextReferralCampaigns,
        nextEnterpriseInvitations,
      ] = await Promise.all([
        apiClient.listPlatformPlans(),
        apiClient.listPlatformPromotions(),
        apiClient.listPlatformPilots(),
        apiClient.listPlatformRedemptions(),
        apiClient.listPlatformOrganizations(),
        apiClient.listPlatformReferralCampaigns(),
        apiClient.listPlatformEnterpriseInvitations(),
      ]);
      setPlans(nextPlans.plans || []);
      setPromotions(nextPromotions.promotions || []);
      setPilots(nextPilots.pilots || []);
      setRedemptions(nextRedemptions.redemptions || []);
      setOrganizations(nextOrganizations.organizations || []);
      setReferralCampaigns(nextReferralCampaigns.referral_campaigns || []);
      setEnterpriseInvitations(nextEnterpriseInvitations.invitations || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const loadPlan = async (planId) => {
    setError("");
    try {
      const data = await apiClient.listPlatformPlans({ planId });
      const selected = (data.plans || []).find((plan) => plan.id === planId);
      if (!selected) throw new Error("Plan is unavailable");
      setPlans(data.plans || []);
      setSelectedPlanId(planId);
      setPlanDraft({ ...selected.limits });
      setPlanHistory(data.history || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  useEffect(() => {
    loadPlan(selectedPlanId);
  }, []);
  const savePlan = async (action) => {
    setSavingPlan(true);
    setError("");
    setNotice("");
    try {
      if (
        action === "apply" &&
        Object.entries(planDraft).some(
          ([, value]) => !Number.isSafeInteger(value) || value < -1,
        )
      ) {
        throw new Error(
          "Every cap must be a whole number greater than or equal to -1. Use -1 for unlimited.",
        );
      }
      const result = await apiClient.updatePlatformPlanCaps({
        plan_id: selectedPlanId,
        limits: planDraft,
        action,
      });
      setNotice(
        action === "restore_default"
          ? `${result.plan.name} is back on its code defaults. Version ${result.plan.catalogVersion?.version} is now active.`
          : `${result.plan.name} caps are live for every organization on that plan. Version ${result.plan.catalogVersion?.version} is now active.`,
      );
      await Promise.all([load(), loadPlan(selectedPlanId)]);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSavingPlan(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      // Trim before parsing (a stray trailing/leading space or a partially
      // edited '{' shouldn't need a byte-perfect re-type) and fall back to an
      // empty override set on a blank field, rather than surface JSON.parse's
      // raw V8 message ("Expected property name or '}'...") with no pointer
      // to which field is wrong.
      const limitsRaw = form.limits_json.trim();
      let limits;
      try {
        limits = limitsRaw ? JSON.parse(limitsRaw) : {};
      } catch {
        throw new Error(
          `Usage limits JSON is invalid: ${limitsRaw || "(empty)"}. Leave it as {} for no overrides.`,
        );
      }
      const commercialTerms =
        form.billing_mode === "stripe_discount"
          ? {
              kind: "percentage_discount",
              percent_off: Number(form.percent_off || 20),
            }
          : form.billing_mode === "contract"
            ? { kind: "custom_contract" }
            : { kind: "trial", trial_days: Number(form.trial_days || 0) };
      const restrictEmail = form.restrict_email.trim().toLowerCase();
      const result = await apiClient.createPlatformPromotion({
        internal_name: form.internal_name,
        code: form.code || undefined,
        base_plan: form.base_plan,
        account_type: form.account_type,
        hosting_mode:
          form.account_type === "enterprise_self_hosted"
            ? "self_host"
            : "managed",
        storage_mode: form.storage_mode,
        billing_mode: form.billing_mode,
        commercial_terms: commercialTerms,
        limits,
        max_redemptions: Number(form.max_redemptions),
        ends_at: form.ends_at
          ? new Date(form.ends_at).toISOString()
          : undefined,
        // Without this the code defaults to eligibility 'anyone' — fine for a
        // public offer, wrong for "give THIS person a promotion". The backend
        // (normalizeEligibility, billing/promotion-service.js) already
        // supports a single email-scoped entry; the form just never exposed it.
        ...(restrictEmail
          ? { eligibilities: [{ type: "email", value: restrictEmail }] }
          : {}),
      });
      setNotice(
        result.code
          ? `Copy this code now: ${result.code}`
          : "Invite-only offer created.",
      );
      setForm({ ...form, internal_name: "", code: "", restrict_email: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const submitReferralCampaign = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        name: referralForm.name,
        code: referralForm.code || undefined,
        onboarding_days: Number(referralForm.onboarding_days),
        onboarding_plan: referralForm.onboarding_plan,
        runway_plan: referralForm.runway_plan,
        runway_interval_months: Number(referralForm.runway_interval_months),
        discount_kind: referralForm.discount_kind,
        ...(referralForm.discount_kind === "percentage"
          ? { discount_percent: Number(referralForm.discount_percent) }
          : {}),
        ...(referralForm.discount_kind === "fixed"
          ? {
              discount_amount_cents: Number(referralForm.discount_amount_cents),
              discount_currency: referralForm.discount_currency,
            }
          : {}),
        max_redemptions: referralForm.max_redemptions
          ? Number(referralForm.max_redemptions)
          : undefined,
        ends_at: referralForm.ends_at
          ? new Date(referralForm.ends_at).toISOString()
          : undefined,
      };
      const result = await apiClient.createPlatformReferralCampaign(payload);
      setNotice(`Referral code live: ${result.referral_campaign.code}`);
      setReferralForm({ ...referralForm, name: "", code: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const submitEnterpriseInvitation = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await apiClient.createPlatformEnterpriseInvitation({
        ...enterpriseInvitationForm,
        send_email: false,
        hosting_mode:
          enterpriseInvitationForm.account_type === "enterprise_self_hosted"
            ? "self_host"
            : "managed",
        invitation_expires_at: enterpriseInvitationForm.invitation_expires_at
          ? new Date(
              enterpriseInvitationForm.invitation_expires_at,
            ).toISOString()
          : undefined,
      });
      setOneTimeInvitationCode(result.code || "");
      setOneTimeInvitationId(result.invitation?.id || "");
      setOneTimeInvitationUrl(result.activation_url || "");
      setNotice(
        "Enterprise invitation configured. Review the rendered email before sending it.",
      );
      setEnterpriseInvitationForm({
        ...enterpriseInvitationForm,
        company_name: "",
        workspace_name: "",
        recipient_email: "",
        welcome_message: "",
        private_notes: "",
      });
      if (result.invitation?.id) {
        const rendered = await apiClient.enterpriseInvitationAction(
          result.invitation.id,
          "preview",
        );
        setEnterpriseEmailPreview({
          ...rendered,
          invitationId: result.invitation.id,
          sendAction: "send",
        });
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const createPersonalInvitationLink = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await apiClient.createPlatformPersonalInvitationLink({
        invitation_code: personalInvitationForm.invitation_code,
        validity_days: Number(personalInvitationForm.validity_days),
      });
      setPersonalInvitationUrl(result.invitation_url || "");
      setPersonalInvitationForm({
        ...personalInvitationForm,
        invitation_code: "",
      });
      setNotice(
        "Personal beta invitation link created. The shared code is not included in the URL.",
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const copyInvitationUrl = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Secure invitation link copied.");
    } catch {
      setError("Could not copy the invitation link.");
    }
  };
  const copyInvitationCode = async (id, code = oneTimeInvitationCode) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      if (id) await apiClient.enterpriseInvitationAction(id, "code-copied");
      setNotice("One-time recovery code copied.");
    } catch {
      setError("Could not copy the recovery code.");
    }
  };
  const openInvitation = async (id) => {
    try {
      setInvitationDetail(await apiClient.getPlatformEnterpriseInvitation(id));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const invitationAction = async (id, action) => {
    try {
      const payload =
        action === "extend"
          ? {
              invitation_expires_at:
                window.prompt("New invitation expiry (ISO 8601)", "") ||
                undefined,
            }
          : {};
      if (action === "extend" && !payload.invitation_expires_at) return;
      const result = await apiClient.enterpriseInvitationAction(
        id,
        action,
        payload,
      );
      if (action === "preview") {
        const invitation = enterpriseInvitations.find(
          (entry) => entry.id === id,
        );
        setEnterpriseEmailPreview({
          ...result,
          invitationId: id,
          sendAction: invitation?.status === "sent" ? "resend" : "send",
        });
        return;
      }
      if (result.code) {
        setOneTimeInvitationCode(result.code);
        setOneTimeInvitationId(id);
      }
      if (result.activation_url) setOneTimeInvitationUrl(result.activation_url);
      setNotice(
        action === "revoke"
          ? "Invitation revoked."
          : action === "extend"
            ? "Invitation expiry updated."
            : action === "resend"
              ? "A fresh secure link was sent."
              : "Invitation updated.",
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  const sendEnterprisePreview = async () => {
    if (!enterpriseEmailPreview) return;
    const { invitationId, sendAction } = enterpriseEmailPreview;
    setEnterpriseEmailPreview(null);
    await invitationAction(invitationId, sendAction);
  };
  const previewEmail = async () => {
    setError("");
    setNotice("");
    setEmailPreviewing(true);
    try {
      setEmailPreview(await apiClient.previewPlatformEmail(emailForm));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setEmailPreviewing(false);
    }
  };
  const sendEmail = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setEmailSending(true);
    try {
      const result = await apiClient.sendPlatformEmail(emailForm);
      setNotice(
        `Email accepted by ${result.provider || "the configured provider"}${result.delivery_status ? ` (${result.delivery_status})` : ""}.`,
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setEmailSending(false);
    }
  };
  const tabs = [
    ["plans", "Plans"],
    ["promotions", "Promotions"],
    ["invitations", "Invitations"],
    ["email", "Email"],
    ["referrals", "Referral codes"],
    ["pilots", "Pilot organizations"],
    ["redemptions", "Redemptions"],
  ];
  return (
    <section className="mb-6 border-y border-[#dfddd5] py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#737373]">
            Commercial
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#161616]">
            Promotions and entitlements
          </h2>
          <p className="mt-1 text-sm text-[#737373]">
            Offer templates never change historical grants. Every pilot
            adjustment creates an entitlement version.
          </p>
        </div>
        <button
          onClick={load}
          className="border border-[#d8d6cf] px-3 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
      <nav className="mt-5 flex flex-wrap gap-2 border-b border-[#dfddd5] pb-3">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm ${tab === id ? "border-b-2 border-[#117dff] font-semibold text-[#161616]" : "text-[#737373]"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {tab === "invitations" && (
        <div
          className="mt-5 grid grid-cols-2 gap-px border border-[#d8d6cf] bg-[#d8d6cf] p-px"
          role="tablist"
          aria-label="Invitation audience"
        >
          <button
            type="button"
            onClick={() => setInvitationAudience("b2c")}
            className={`px-4 py-4 text-left ${invitationAudience === "b2c" ? "bg-[#0a0a0a] text-white" : "bg-white text-[#525252]"}`}
          >
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#24d2ed]">
              B2C invitations
            </span>
            <span className="mt-1 block text-sm font-semibold">
              Waitlist to personal access
            </span>
          </button>
          <button
            type="button"
            onClick={() => setInvitationAudience("b2b")}
            className={`px-4 py-4 text-left ${invitationAudience === "b2b" ? "bg-[#0a0a0a] text-white" : "bg-white text-[#525252]"}`}
          >
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#24d2ed]">
              B2B invitations
            </span>
            <span className="mt-1 block text-sm font-semibold">
              Configured enterprise onboarding
            </span>
          </button>
        </div>
      )}
      {tab === "invitations" && invitationAudience === "b2c" && (
        <AccessApplicationsPanel kind="personal" onChanged={load} />
      )}
      {tab === "invitations" && invitationAudience === "b2b" && (
        <AccessApplicationsPanel kind="enterprise" onChanged={load} />
      )}
      {tab === "invitations" && invitationAudience === "b2c" && (
        <section className="mt-5 max-w-4xl border-t border-[#dfddd5] pt-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#117dff]">
            Direct personal invitation
          </p>
          <p className="mt-2 text-sm text-[#737373]">
            For an approved person who did not enter through the homepage
            waitlist. Create a safe Singulance Check-in link; the shared code is
            never included in the URL.
          </p>
          <form
            onSubmit={createPersonalInvitationLink}
            className="mt-3 flex flex-wrap gap-3"
          >
            <input
              required
              type="password"
              autoComplete="off"
              placeholder="Current personal invitation code"
              value={personalInvitationForm.invitation_code}
              onChange={(event) =>
                setPersonalInvitationForm({
                  ...personalInvitationForm,
                  invitation_code: event.target.value,
                })
              }
              className="min-w-64 border border-[#d8d6cf] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="1"
              max="90"
              aria-label="Personal invitation validity in days"
              value={personalInvitationForm.validity_days}
              onChange={(event) =>
                setPersonalInvitationForm({
                  ...personalInvitationForm,
                  validity_days: event.target.value,
                })
              }
              className="w-32 border border-[#d8d6cf] px-3 py-2 text-sm"
            />
            <button className="bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white">
              Create personal link
            </button>
          </form>
          {personalInvitationUrl && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-[#bcd5ff] bg-[#f3f8ff] px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-mono text-xs">
                {personalInvitationUrl}
              </span>
              <button
                type="button"
                onClick={() => copyInvitationUrl(personalInvitationUrl)}
                className="shrink-0 border border-[#9fc1f8] px-2 py-1"
              >
                Copy link
              </button>
            </div>
          )}
        </section>
      )}
      {tab === "invitations" &&
        invitationAudience === "b2b" &&
        oneTimeInvitationUrl && (
          <div className="mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 border border-[#bcd5ff] bg-[#f3f8ff] px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-mono text-xs">
              {oneTimeInvitationUrl}
            </span>
            <button
              type="button"
              onClick={() => copyInvitationUrl(oneTimeInvitationUrl)}
              className="shrink-0 border border-[#9fc1f8] px-2 py-1"
            >
              Copy enterprise link
            </button>
          </div>
        )}
      {tab === "plans" && (
        <div className="mt-5">
          <div className="grid gap-3 md:grid-cols-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => loadPlan(plan.id)}
                className={`border p-4 text-left transition ${selectedPlanId === plan.id ? "border-[#117dff] bg-[#f3f8ff] ring-1 ring-[#117dff]" : "border-[#dfddd5] hover:border-[#a8a59e]"}`}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1 text-sm text-[#737373]">
                  {PLAN_DETAILS[plan.id]}
                </p>
                <p className="mt-4 text-xs text-[#737373]">
                  {plan.catalogVersion
                    ? `Live version ${plan.catalogVersion.version}`
                    : "Code defaults active"}
                </p>
              </button>
            ))}
          </div>
          {plans.length === 0 && (
            <p className="py-5 text-sm text-[#737373]">
              Loading plan catalog...
            </p>
          )}
          {plans.length > 0 && (
            <div className="mt-5 border-t border-[#dfddd5] pt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#161616]">
                    {plans.find((plan) => plan.id === selectedPlanId)?.name}{" "}
                    caps
                  </h3>
                  <p className="mt-1 text-sm text-[#737373]">
                    Use <strong>-1</strong> for unlimited. Applying a change
                    updates every organization on this plan immediately;
                    organization-specific pilot grants remain explicit
                    overrides.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingPlan}
                    onClick={() => savePlan("restore_default")}
                    className="border border-[#d8d6cf] px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Set back to default
                  </button>
                  <button
                    type="button"
                    disabled={savingPlan}
                    onClick={() => savePlan("apply")}
                    className="bg-[#117dff] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {savingPlan ? "Applying..." : "Apply live caps"}
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(planDraft).map(([key, value]) => (
                  <label
                    key={key}
                    className="border border-[#e3e0db] bg-[#faf9f4] px-3 py-2"
                  >
                    <span className="block text-xs font-medium text-[#525252]">
                      {CAP_LABELS[key] || key}
                    </span>
                    <input
                      type="number"
                      min="-1"
                      step="1"
                      value={value}
                      onChange={(event) =>
                        setPlanDraft({
                          ...planDraft,
                          [key]:
                            event.target.value === ""
                              ? ""
                              : Number(event.target.value),
                        })
                      }
                      className="mt-1 w-full bg-transparent text-lg font-semibold text-[#161616] outline-none"
                      aria-label={CAP_LABELS[key] || key}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 border-t border-[#e3e0db] pt-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#737373]">
                  Version history
                </p>
                <div className="mt-2 divide-y divide-[#e5e2dc]">
                  {planHistory.length ? (
                    planHistory.map((version) => (
                      <div
                        key={version.id}
                        className="flex flex-wrap justify-between gap-2 py-2 text-xs text-[#525252]"
                      >
                        <span>
                          Version {version.version} ·{" "}
                          {version.action === "restore_default"
                            ? "Restored code defaults"
                            : "Applied caps"}
                        </span>
                        <span>
                          {when(version.createdAt)} · {version.operator}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-sm text-[#737373]">
                      No changes yet. Code defaults are active.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === "promotions" && (
        <>
          <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              required
              placeholder="Internal offer name"
              value={form.internal_name}
              onChange={(e) =>
                setForm({ ...form, internal_name: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              placeholder="Public code (blank generates one)"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              type="email"
              placeholder="Restrict to email (optional — anyone can redeem if blank)"
              value={form.restrict_email}
              onChange={(e) =>
                setForm({ ...form, restrict_email: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Restrict redemption to a single email"
            />
            <select
              value={form.base_plan}
              onChange={(e) => setForm({ ...form, base_plan: e.target.value })}
              className="border border-[#d8d6cf] px-3 py-2"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="scale">Scale</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              value={form.account_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  account_type: e.target.value,
                  storage_mode: STORAGE_MODE_OPTIONS[e.target.value][0][0],
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            >
              <option value="personal">Personal</option>
              <option value="enterprise_managed">Enterprise managed</option>
              <option value="enterprise_self_hosted">
                Enterprise self-hosted
              </option>
            </select>
            <select
              value={form.storage_mode}
              onChange={(e) =>
                setForm({ ...form, storage_mode: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            >
              {STORAGE_MODE_OPTIONS[form.account_type].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={form.billing_mode}
              onChange={(e) =>
                setForm({ ...form, billing_mode: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            >
              <option value="entitlement_only">Pilot / entitlement</option>
              <option value="stripe_discount">Stripe discount</option>
              <option value="contract">Contract</option>
            </select>
            <input
              type="number"
              min="1"
              value={form.max_redemptions}
              onChange={(e) =>
                setForm({ ...form, max_redemptions: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Maximum redemptions"
            />
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              value={form.limits_json}
              onChange={(e) =>
                setForm({ ...form, limits_json: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2 font-mono text-xs"
              aria-label="Usage limits JSON"
            />
            {form.billing_mode === "stripe_discount" && (
              <input
                type="number"
                min="1"
                max="100"
                placeholder="Discount percent"
                value={form.percent_off || ""}
                onChange={(e) =>
                  setForm({ ...form, percent_off: e.target.value })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
            )}
            <button className="bg-[#117dff] px-3 py-2 font-medium text-white">
              Create promotion
            </button>
          </form>
          <div className="mt-5 divide-y divide-[#e5e2dc]">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <strong>{promo.internal_name}</strong>
                  <span className="ml-2 text-[#737373]">
                    {promo.code_hint || "Invite only"} · {promo.status} ·{" "}
                    {promo.redemption_count}/
                    {promo.max_redemptions || "unlimited"}
                  </span>
                  <p className="mt-1 text-xs text-[#737373]">
                    {promo.version?.base_plan} · {promo.version?.account_type} ·
                    expires {when(promo.ends_at)}
                  </p>
                </div>
                <button
                  disabled={promo.status === "revoked"}
                  onClick={() =>
                    apiClient.revokePlatformPromotion(promo.id).then(load)
                  }
                  className="border border-[#d8d6cf] px-3 py-1.5 disabled:opacity-50"
                >
                  {promo.status === "revoked" ? "Revoked" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "invitations" && invitationAudience === "b2b" && (
        <>
          <div className="mt-7 max-w-4xl border-t border-[#dfddd5] pt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#117dff]">
              Direct B2B invitation
            </p>
            <p className="mb-3 mt-2 text-sm text-[#737373]">
              Configure one enterprise owner workspace. Creation saves the
              invitation first, then opens the rendered email for review. No
              message is sent until you confirm it in the preview.
            </p>
            <form
              onSubmit={submitEnterpriseInvitation}
              className="grid gap-3 md:grid-cols-2"
            >
              <input
                required
                placeholder="Company / workspace name"
                value={enterpriseInvitationForm.company_name}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    company_name: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Owner email"
                value={enterpriseInvitationForm.recipient_email}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    recipient_email: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
              <input
                placeholder="Optional HIVEMIND name"
                value={enterpriseInvitationForm.workspace_name}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    workspace_name: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
              <select
                value={enterpriseInvitationForm.account_type}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    account_type: e.target.value,
                    storage_mode: STORAGE_MODE_OPTIONS[e.target.value][0][0],
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              >
                <option value="enterprise_managed">Managed</option>
                <option value="enterprise_self_hosted">Self-hosted</option>
              </select>
              <select
                value={enterpriseInvitationForm.storage_mode}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    storage_mode: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              >
                {STORAGE_MODE_OPTIONS[
                  enterpriseInvitationForm.account_type
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                aria-label="Invitation expires"
                value={enterpriseInvitationForm.invitation_expires_at}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    invitation_expires_at: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
              <input
                type="number"
                min="1"
                max="90"
                value={enterpriseInvitationForm.onboarding_days}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    onboarding_days: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
                aria-label="Onboarding days"
              />
              <p className="flex items-center text-sm text-[#525252]">
                Email is rendered from the server template and sent from
                welcome@admin.singulancelabs.com only after preview approval.
              </p>
              <textarea
                placeholder="Company welcome message (optional)"
                value={enterpriseInvitationForm.welcome_message}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    welcome_message: e.target.value,
                  })
                }
                className="min-h-20 border border-[#d8d6cf] px-3 py-2"
              />
              <textarea
                placeholder="Private operator notes"
                value={enterpriseInvitationForm.private_notes}
                onChange={(e) =>
                  setEnterpriseInvitationForm({
                    ...enterpriseInvitationForm,
                    private_notes: e.target.value,
                  })
                }
                className="min-h-20 border border-[#d8d6cf] px-3 py-2"
              />
              <button className="bg-[#117dff] px-3 py-2 font-medium text-white">
                Create and preview
              </button>
            </form>
            {oneTimeInvitationCode && (
              <div className="mt-3 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <span>
                  Recovery code:{" "}
                  <strong className="font-mono">{oneTimeInvitationCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyInvitationCode(
                      oneTimeInvitationId,
                      oneTimeInvitationCode,
                    )
                  }
                  className="border border-amber-300 px-2 py-1"
                >
                  Copy once
                </button>
              </div>
            )}
          </div>
          <div className="mt-6 divide-y divide-[#e5e2dc]">
            {enterpriseInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <strong>{invitation.company_name}</strong>
                  <span className="ml-2 text-[#737373]">
                    {invitation.recipient_email} ·{" "}
                    {invitation.account_type === "enterprise_self_hosted"
                      ? "Self-hosted"
                      : "Managed"}{" "}
                    · {invitation.status}
                  </span>
                  <p className="mt-1 text-xs text-[#737373]">
                    Code {invitation.code_hint} · sent{" "}
                    {when(invitation.last_sent_at)} · invitation expires{" "}
                    {when(invitation.invitation_expires_at)} ·{" "}
                    {invitation.entitlement
                      ? `${invitation.entitlement.status} until ${when(invitation.entitlement.ends_at)}`
                      : "Not redeemed"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openInvitation(invitation.id)}
                    className="border border-[#d8d6cf] px-2 py-1"
                  >
                    History
                  </button>
                  {["draft", "sent"].includes(invitation.status) && (
                    <>
                      <button
                        onClick={() => invitationAction(invitation.id, "preview")}
                        className="border border-[#d8d6cf] px-2 py-1"
                      >
                        {invitation.status === "draft"
                          ? "Preview and send"
                          : "Preview and resend"}
                      </button>
                      <button
                        onClick={() =>
                          invitationAction(invitation.id, "extend")
                        }
                        className="border border-[#d8d6cf] px-2 py-1"
                      >
                        Extend
                      </button>
                      <button
                        onClick={() =>
                          invitationAction(invitation.id, "revoke")
                        }
                        className="border border-red-200 text-red-700 px-2 py-1"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                  {invitation.entitlement?.grant_id && (
                    <button
                      onClick={() => {
                        setTab("pilots");
                        setNotice(
                          "Use Pilot organizations to create the next immutable entitlement version.",
                        );
                      }}
                      className="border border-[#d8d6cf] px-2 py-1"
                    >
                      Amend future entitlement
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {invitationDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <section className="max-h-[80vh] w-full max-w-2xl overflow-auto bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {invitationDetail.invitation.company_name} invitation
                    history
                  </h3>
                  <button
                    onClick={() => setInvitationDetail(null)}
                    className="border px-2 py-1"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-2 text-sm text-[#525252]">
                  {invitationDetail.invitation.recipient_email} ·{" "}
                  {invitationDetail.invitation.status}
                </p>
                <div className="mt-4 divide-y">
                  {(invitationDetail.audit || []).map((entry) => (
                    <div key={entry.id} className="py-2 text-xs text-[#525252]">
                      <strong>{entry.eventType}</strong>
                      <span className="ml-2">{when(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
      {enterpriseEmailPreview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden bg-[#0d0d0f] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#303138] p-5 text-white">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#24d2ed]">
                  B2B invitation email preview
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {enterpriseEmailPreview.subject}
                </h3>
                <p className="mt-1 text-xs text-[#a9aaae]">
                  From {enterpriseEmailPreview.from} · To {enterpriseEmailPreview.to}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnterpriseEmailPreview(null)}
                className="border border-[#3a3b40] px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc]">
              <iframe
                title="B2B invitation email preview"
                sandbox=""
                srcDoc={enterpriseEmailPreview.html}
                className="h-[620px] w-full border-0 bg-white"
              />
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#303138] p-4">
              <p className="text-xs text-[#a9aaae]">
                Sending rotates a fresh secure Check-in link. The preview contains no live secret.
              </p>
              <button
                type="button"
                onClick={sendEnterprisePreview}
                className="bg-[#24d2ed] px-4 py-2.5 text-sm font-bold text-[#0a0a0a]"
              >
                {enterpriseEmailPreview.sendAction === "resend"
                  ? "Send fresh invitation"
                  : "Send invitation"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {tab === "email" && (
        <section className="mt-5 overflow-hidden border border-[#d8d6cf] bg-white font-['Space_Grotesk']">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={sendEmail} className="p-6 sm:p-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#117dff]">
                Transactional email
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-normal text-[#0a0a0a]">
                Send a polished welcome
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#737373]">
                From{" "}
                <strong className="font-medium text-[#0a0a0a]">
                  welcome@admin.singulancelabs.com
                </strong>
                . Use Invitations for secure enterprise activation links and
                recovery codes.
              </p>
              <div className="mt-7 space-y-4">
                <label className="block">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#737373]">
                    Template
                  </span>
                  <select
                    value={emailForm.template_id}
                    onChange={(event) => {
                      setEmailForm({
                        ...emailForm,
                        template_id: event.target.value,
                      });
                      setEmailPreview(null);
                    }}
                    className="mt-2 w-full rounded-[6px] border border-[#d8d6cf] bg-white px-3 py-3 text-sm text-[#0a0a0a] outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]"
                  >
                    <option value="welcome_signup">Welcome to HIVEMIND</option>
                    <option value="welcome_login">
                      Welcome back to HIVEMIND
                    </option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#737373]">
                    Recipient email
                  </span>
                  <input
                    required
                    type="email"
                    value={emailForm.to}
                    onChange={(event) => {
                      setEmailForm({ ...emailForm, to: event.target.value });
                      setEmailPreview(null);
                    }}
                    placeholder="owner@company.com"
                    className="mt-2 w-full rounded-[6px] border border-[#d8d6cf] px-3 py-3 text-sm text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#737373]">
                    Recipient name
                  </span>
                  <input
                    value={emailForm.name}
                    onChange={(event) => {
                      setEmailForm({ ...emailForm, name: event.target.value });
                      setEmailPreview(null);
                    }}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-[6px] border border-[#d8d6cf] px-3 py-3 text-sm text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]"
                  />
                </label>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={previewEmail}
                  disabled={emailPreviewing}
                  className="border border-[#0a0a0a] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] disabled:opacity-50"
                >
                  {emailPreviewing ? "Rendering..." : "Preview email"}
                </button>
                <button
                  disabled={emailSending}
                  className="bg-[#117dff] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50"
                >
                  {emailSending ? "Sending..." : "Send email"}
                </button>
              </div>
            </form>
            <div className="min-h-[480px] bg-[#0d0d0f] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#24d2ed]">
                    Message preview
                  </p>
                  <p className="mt-2 text-sm text-[#b5b5b9]">
                    {emailPreview
                      ? emailPreview.subject
                      : "Render a server-owned template before sending."}
                  </p>
                </div>
                <span className="border border-[#2f3035] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a9aaae]">
                  Email v1
                </span>
              </div>
              <div className="mt-6 h-[380px] overflow-hidden border border-[#303138] bg-[#f8fafc] shadow-[0_14px_45px_rgba(0,0,0,0.25)]">
                {emailPreview ? (
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={emailPreview.html}
                    className="h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex h-full flex-col justify-between p-6">
                    <div>
                      <div className="h-1 w-12 bg-[#24d2ed]" />
                      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[#117dff]">
                        HIVEMIND / System message
                      </p>
                      <h4 className="mt-4 text-2xl font-semibold text-[#0a0a0a]">
                        Your welcome message will appear here.
                      </h4>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
                      Preview uses the exact server template
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {tab === "referrals" && (
        <>
          <p className="mt-5 text-sm text-[#737373]">
            One code drives both phases of an enterprise signup:{" "}
            <strong>onboarding</strong> (a fixed grace window, default 2 weeks)
            then <strong>runway</strong> (the ongoing phase, billed monthly by
            default). Optionally attach a percentage-off or fixed-amount
            discount.
          </p>
          <form
            onSubmit={submitReferralCampaign}
            className="mt-3 grid gap-3 md:grid-cols-3"
          >
            <input
              required
              placeholder="Partner / campaign name"
              value={referralForm.name}
              onChange={(e) =>
                setReferralForm({ ...referralForm, name: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              placeholder="Code (blank generates one)"
              value={referralForm.code}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  code: e.target.value.toUpperCase(),
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              type="number"
              min="0"
              max="90"
              value={referralForm.onboarding_days}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  onboarding_days: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Onboarding duration in days (default 14)"
            />
            <select
              value={referralForm.onboarding_plan}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  onboarding_plan: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Onboarding plan"
            >
              <option value="pro">Pro (onboarding)</option>
              <option value="scale">Scale (onboarding)</option>
              <option value="enterprise">Enterprise (onboarding)</option>
            </select>
            <select
              value={referralForm.runway_plan}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  runway_plan: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Runway plan"
            >
              <option value="pro">Pro (runway)</option>
              <option value="scale">Scale (runway)</option>
              <option value="enterprise">Enterprise (runway)</option>
            </select>
            <input
              type="number"
              min="1"
              max="12"
              value={referralForm.runway_interval_months}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  runway_interval_months: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Runway billing interval in months (default 1 = monthly)"
            />
            <select
              value={referralForm.discount_kind}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  discount_kind: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Discount type"
            >
              <option value="none">No discount</option>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
            {referralForm.discount_kind === "percentage" && (
              <input
                type="number"
                min="1"
                max="100"
                placeholder="Percent off (default 20)"
                value={referralForm.discount_percent}
                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,
                    discount_percent: e.target.value,
                  })
                }
                className="border border-[#d8d6cf] px-3 py-2"
              />
            )}
            {referralForm.discount_kind === "fixed" && (
              <>
                <input
                  type="number"
                  min="1"
                  placeholder="Amount off (minor units, e.g. cents)"
                  value={referralForm.discount_amount_cents}
                  onChange={(e) =>
                    setReferralForm({
                      ...referralForm,
                      discount_amount_cents: e.target.value,
                    })
                  }
                  className="border border-[#d8d6cf] px-3 py-2"
                />
                <input
                  placeholder="Currency (e.g. EUR)"
                  value={referralForm.discount_currency}
                  onChange={(e) =>
                    setReferralForm({
                      ...referralForm,
                      discount_currency: e.target.value.toUpperCase(),
                    })
                  }
                  className="border border-[#d8d6cf] px-3 py-2"
                  maxLength={3}
                />
              </>
            )}
            <input
              type="number"
              min="1"
              placeholder="Max redemptions (blank = unlimited)"
              value={referralForm.max_redemptions}
              onChange={(e) =>
                setReferralForm({
                  ...referralForm,
                  max_redemptions: e.target.value,
                })
              }
              className="border border-[#d8d6cf] px-3 py-2"
            />
            <input
              type="datetime-local"
              value={referralForm.ends_at}
              onChange={(e) =>
                setReferralForm({ ...referralForm, ends_at: e.target.value })
              }
              className="border border-[#d8d6cf] px-3 py-2"
              aria-label="Expires at"
            />
            <button className="bg-[#117dff] px-3 py-2 font-medium text-white">
              Create referral code
            </button>
          </form>
          <div className="mt-5 divide-y divide-[#e5e2dc]">
            {referralCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <strong>{campaign.name}</strong>
                  <span className="ml-2 text-[#737373]">
                    {campaign.code} · {campaign.active ? "active" : "revoked"} ·{" "}
                    {campaign.redemption_count}/
                    {campaign.max_redemptions ?? "unlimited"}
                  </span>
                  <p className="mt-1 text-xs text-[#737373]">
                    Onboarding {campaign.onboarding_days}d →{" "}
                    {campaign.onboarding_plan}, then runway{" "}
                    {campaign.runway_plan} every{" "}
                    {campaign.runway_interval_months}mo
                    {campaign.discount?.kind === "percentage"
                      ? ` · ${campaign.discount.percent_off}% off`
                      : campaign.discount?.kind === "fixed"
                        ? ` · ${(campaign.discount.amount_off_cents / 100).toFixed(2)} ${campaign.discount.currency} off`
                        : ""}{" "}
                    · expires {when(campaign.ends_at)}
                  </p>
                </div>
                <button
                  disabled={!campaign.active}
                  onClick={() =>
                    apiClient
                      .revokePlatformReferralCampaign(campaign.id)
                      .then(load)
                      .catch((err) =>
                        setError(err.response?.data?.error || err.message),
                      )
                  }
                  className="border border-[#d8d6cf] px-3 py-1.5 disabled:opacity-50"
                >
                  {campaign.active ? "Revoke" : "Revoked"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "pilots" && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              apiClient
                .grantPlatformPilot({
                  promotion_id: data.get("promotion_id"),
                  organization_id: data.get("organization_id"),
                })
                .then(() => {
                  setNotice("Pilot entitlement granted.");
                  event.currentTarget.reset();
                  load();
                })
                .catch((err) =>
                  setError(err.response?.data?.error || err.message),
                );
            }}
            className="mt-5 flex flex-wrap gap-3"
          >
            <select
              name="organization_id"
              required
              className="min-w-64 border border-[#d8d6cf] px-3 py-2 text-sm"
            >
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} · {organization.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              name="promotion_id"
              required
              className="border border-[#d8d6cf] px-3 py-2 text-sm"
            >
              <option value="">Select promotion</option>
              {promotions
                .filter((promo) => promo.status === "active")
                .map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.internal_name}
                  </option>
                ))}
            </select>
            <button className="bg-[#117dff] px-3 py-2 text-sm font-medium text-white">
              Grant pilot
            </button>
          </form>
          <div className="mt-5 divide-y divide-[#e5e2dc]">
            {pilots.map((pilot) => (
              <div
                key={pilot.grant_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <strong>
                    {pilot.organization?.name || "Removed organization"}
                  </strong>
                  <p className="mt-1 text-xs text-[#737373]">
                    {pilot.status} · {pilot.version?.plan} ·{" "}
                    {pilot.version?.account_type} · ends {when(pilot.ends_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const ends_at = window.prompt(
                      "New expiry (ISO 8601)",
                      pilot.ends_at || "",
                    );
                    if (ends_at)
                      apiClient
                        .amendPlatformPilot(pilot.grant_id, {
                          ends_at,
                          reason: "admin_extension",
                        })
                        .then(load)
                        .catch((err) =>
                          setError(err.response?.data?.error || err.message),
                        );
                  }}
                  className="border border-[#d8d6cf] px-3 py-1.5"
                >
                  Extend
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "redemptions" && (
        <div className="mt-5 divide-y divide-[#e5e2dc]">
          {redemptions.map((row) => (
            <div key={row.id} className="py-3 text-sm">
              <strong>{row.promotion?.internalName || "Promotion"}</strong>
              <span className="ml-2 text-[#737373]">
                {row.organization?.name || "Removed organization"} ·{" "}
                {when(row.redeemed_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function PlatformAdmin() {
  const [passkey, setPasskey] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState(emptyLogs);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logView, setLogView] = useState("mixed");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [users, logData, nextMetrics] = await Promise.all([
        apiClient.listPlatformUsers(),
        apiClient.listPlatformLogs(),
        apiClient.getPlatformMetrics(),
      ]);
      setData(users);
      setLogs(logData.logs || emptyLogs);
      setMetrics(nextMetrics);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const unlock = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient.unlockPlatformAdmin(passkey, operatorName);
      setPasskey("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data || !logsOpen) return undefined;
    const timer = setInterval(
      () =>
        apiClient
          .listPlatformLogs()
          .then((next) => setLogs(next.logs || emptyLogs))
          .catch(() => {}),
      2000,
    );
    return () => clearInterval(timer);
  }, [data, logsOpen]);

  if (!data)
    return (
      <main className="max-w-md mx-auto py-20 px-5">
        <h1 className="text-2xl font-bold mb-2">Platform Admin</h1>
        <p className="text-sm text-[#737373] mb-6">
          Commercial operations and diagnostics. Access expires after 15
          minutes.
        </p>
        <form onSubmit={unlock} className="space-y-3">
          <input
            autoFocus
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Operator name"
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            required
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            placeholder="Admin passkey"
            className="w-full border rounded-lg px-3 py-2"
          />
          <button
            disabled={loading || !operatorName.trim()}
            className="w-full rounded-lg bg-[#117dff] text-white py-2"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </main>
    );

  const s = data.summary || {};
  const activeLogs = logs[logView] || [];
  return (
    <main className="max-w-7xl mx-auto py-10 px-5">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
          <p className="text-sm text-[#737373]">
            {data.total} users · active within 30 days
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLogsOpen(true)}
            className="rounded-lg bg-[#111827] text-white px-3 py-2 text-sm"
          >
            Live logs
          </button>
          <button
            onClick={load}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
      <CommercialManager />
      <SecurityChecklist />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ["Enterprise", s.b2b],
          ["Personal", s.b2c],
          ["Active", s.active],
          ["Sleeping", s.sleeping],
        ].map(([label, value]) => (
          <div key={label} className="border rounded-xl p-4 bg-white">
            <p className="text-xs text-[#737373]">{label}</p>
            <p className="text-2xl font-bold">{value || 0}</p>
          </div>
        ))}
      </div>
      <CapacityPanel metrics={metrics} />
      <div className="border rounded-xl overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-[#faf9f4]">
              <th className="p-3">User</th>
              <th>Type</th>
              <th>Memory plane</th>
              <th>Memories</th>
              <th>Organizations</th>
              <th>Last seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id} className="border-t align-top">
                <td className="p-3">
                  <div>{user.displayName || "Unnamed"}</div>
                  <div className="text-xs text-[#737373]">{user.email}</div>
                </td>
                <td className="capitalize">{user.user_type || user.tier}</td>
                <td>
                  <div>{user.filesystem || "hybrid"}</div>
                  <div className="text-xs text-[#737373]">
                    {(user.memory_storage_modes || []).join(", ")}
                  </div>
                </td>
                <td>
                  {user.memory_count == null
                    ? "Unavailable"
                    : user.memory_count}
                </td>
                <td>{user.organization_count}</td>
                <td>{when(user.lastActiveAt)}</td>
                <td>{user.active ? "Active" : "Sleeping"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <section className="w-full max-w-6xl h-[80vh] rounded-xl overflow-hidden bg-[#111827] shadow-2xl flex flex-col">
            <header className="p-4 flex items-center justify-between text-white border-b border-white/15">
              <div>
                <h2 className="font-semibold">Live system logs</h2>
                <p className="text-xs text-[#a7f3d0]">
                  Updates every 2 seconds
                </p>
              </div>
              <button
                onClick={() => setLogsOpen(false)}
                className="text-sm px-3 py-1 border border-white/30 rounded"
              >
                Close
              </button>
            </header>
            <nav className="p-3 flex gap-2 border-b border-white/15">
              {[
                ["mixed", "Mixed"],
                ["core", "Core"],
                ["control", "Control plane"],
                ["employees", "Employees"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLogView(id)}
                  className={`px-3 py-1 rounded text-sm ${logView === id ? "bg-[#117dff] text-white" : "bg-white/10 text-white"}`}
                >
                  {label} ({(logs[id] || []).length})
                </button>
              ))}
            </nav>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-5 text-[#d1fae5] whitespace-pre-wrap">
              {activeLogs.length
                ? activeLogs.join("\n")
                : "Waiting for logs..."}
            </pre>
          </section>
        </div>
      )}
    </main>
  );
}
