"use client";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ExternalLink, Hammer, LayoutGrid, Plus, Search, ShieldCheck, X, Zap } from "lucide-react";
import { appsResponse } from "./apps-response";
import apiClient from "../../shared/api-client";
const INSTANT = ["serpapi", "firecrawl", "tavily", "exa", "elevenlabs", "peopledatalabs"];
const PAGE = 60;
const fmt = (n) => n.toLocaleString("en-US");
function AppsDirectory({ apps, managedConnections = false }) {
  const cloud = true;
  const savedApps = [];
  const [hiveApps, setHiveApps] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionRetry, setConnectionRetry] = useState(0);
  const storeApps = cloud ? hiveApps : savedApps;
  useEffect(() => {
    if (!cloud) return;
    let disposed = false;
    let inFlight = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (inFlight || disposed) return;
      inFlight = true;
      try {
        const response = await fetch("/api/hivemind/apps", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15e3)]) });
        const data = await appsResponse(response);
        if (!Array.isArray(data.apps)) throw new Error("App connections could not be verified. Please try again.");
        if (!disposed) {
          setHiveApps(data.apps);
          setConnectionError(null);
        }
      } catch (error) {
        if (!disposed) {
          setConnectionError(error instanceof Error ? error.message : "Connections unavailable");
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("hivemind:apps-refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("hivemind:apps-refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cloud, connectionRetry]);
  const signedIn = true;
  const connected = useMemo(() => new Set(storeApps.filter((a) => a.connected).map((a) => a.slug)), [storeApps]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("popular");
  const [instantOnly, setInstantOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const bySlug = useMemo(() => new Map(apps.map((a) => [a.slug, a])), [apps]);
  const instant = useMemo(() => INSTANT.flatMap((s) => bySlug.get(s) ?? []), [bySlug]);
  useEffect(() => {
    if (!cloud) return;
    const query2 = new URLSearchParams(window.location.search);
    const slug = query2.get("app") || query2.get("connect");
    if (slug && bySlug.has(slug)) setOpen(bySlug.get(slug));
  }, [cloud, bySlug]);
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      if (tab === "connected" && !connected.has(a.slug)) return false;
      if ((tab === "instant" || instantOnly) && !INSTANT.includes(a.slug)) return false;
      return !q || a.name.toLowerCase().includes(q) || a.slug.includes(q) || a.description.toLowerCase().includes(q);
    });
  }, [apps, tab, query, instantOnly, connected]);
  const categories = useMemo(() => {
    const counts = /* @__PURE__ */ new Map();
    for (const a of pool) for (const c of a.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0] === "Other" ? 1 : b[0] === "Other" ? -1 : b[1] - a[1]);
  }, [pool]);
  const list = useMemo(() => {
    const filtered = category ? pool.filter((a) => a.categories.includes(category)) : pool;
    const sorted = [...filtered];
    if (sort === "tools") sorted.sort((a, b) => b.tools - a.tools);
    else if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.rank - b.rank || b.tools - a.tools);
    return sorted;
  }, [pool, category, sort]);
  const browsing = tab === "all" && !query.trim() && !category && !instantOnly && sort === "popular";
  const popular = apps.slice(0, 6);
  const reset = () => setLimit(PAGE);
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
    /* @__PURE__ */ jsxs("header", { className: "flex shrink-0 flex-wrap items-center gap-2 border-b border-black/[0.06] bg-card px-3 py-2.5 sm:gap-3 sm:px-6", children: [
      /* @__PURE__ */ jsx("div", { className: "flex h-9 items-stretch rounded-md bg-black/[0.04] p-0.5", children: [
        ["all", "All", apps.length],
        ["connected", "Connected", connected.size],
        ["instant", "Instant", instant.length]
      ].map(([id, label, count]) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => (setTab(id), reset()),
          className: `flex items-center gap-2 rounded-[5px] px-3 text-[13px] transition-colors ${tab === id ? "bg-card shadow-xs" : "text-foreground/55 hover:text-foreground"}`,
          children: [
            label,
            /* @__PURE__ */ jsx("span", { className: `rounded-xs px-1.5 font-mono text-[10px] leading-4 ${tab === id ? "bg-black/[0.06] text-foreground/70" : "bg-black/[0.04] text-foreground/45"}`, children: fmt(count) })
          ]
        },
        id
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "relative order-last w-full sm:order-none sm:ml-auto sm:max-w-[340px]", children: [
        /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35", strokeWidth: 1.75 }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "field pl-9",
            placeholder: `Search ${fmt(apps.length)} apps`,
            value: query,
            onChange: (e) => (setQuery(e.target.value), reset())
          }
        )
      ] })
    ] }),
    cloud && connectionError && /* @__PURE__ */ jsxs("p", { role: "alert", className: "px-6 py-2 text-caption text-destructive", children: [
      connectionError,
      " ",
      /* @__PURE__ */ jsx("button", { className: "underline", onClick: () => setConnectionRetry((value) => value + 1), children: "Try again" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto grid max-w-page gap-8 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_280px]", children: [
      /* @__PURE__ */ jsxs("main", { className: "min-w-0 space-y-10", children: [
        browsing && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Grid, { title: "Popular", children: popular.map((a) => /* @__PURE__ */ jsx(AppCard, { app: a, connected: connected.has(a.slug), onOpen: setOpen }, a.slug)) }),
          /* @__PURE__ */ jsx(
            Grid,
            {
              title: /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Zap, { className: "size-4 fill-brand text-brand", strokeWidth: 1.5 }),
                " Instant Apps",
                /* @__PURE__ */ jsx("span", { className: "rounded-xs border border-brand-readable/40 px-1.5 font-mono text-[10px] tracking-wider text-brand-readable uppercase", children: "New" })
              ] }),
              action: /* @__PURE__ */ jsx("button", { className: "btn-quiet", onClick: () => (setTab("instant"), reset()), children: "View all \u2192" }),
              children: instant.map((a) => /* @__PURE__ */ jsx(AppCard, { app: a, instant: true, connected: connected.has(a.slug), onOpen: setOpen }, a.slug))
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          Grid,
          {
            title: browsing ? "All apps" : category ?? (tab === "connected" ? "Connected" : tab === "instant" ? "Instant Apps" : query ? `Results for \u201C${query}\u201D` : "Apps"),
            count: list.length,
            children: list.slice(0, limit).map((a) => /* @__PURE__ */ jsx(AppCard, { app: a, instant: INSTANT.includes(a.slug), connected: connected.has(a.slug), onOpen: setOpen }, a.slug))
          }
        ),
        !list.length && /* @__PURE__ */ jsx("div", { className: "surface py-12 text-center text-body-sm text-foreground/50", children: tab === "connected" && !cloud && !signedIn ? "Sign in with Composio to see your connected apps." : "No apps match." }),
        list.length > limit && /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs("button", { className: "btn-secondary", onClick: () => setLimit((l) => l + PAGE * 2), children: [
          "Show more \xB7 ",
          fmt(list.length - limit),
          " left"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "space-y-4 lg:sticky lg:top-8 lg:self-start", children: [
        /* @__PURE__ */ jsxs("section", { className: "surface overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "border-b border-black/[0.06] px-4 py-3 text-[14px] font-medium", children: "Filter & Sort" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex h-10 items-center justify-between rounded-md bg-popover px-3 text-body-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground/55", children: "Sort" }),
              /* @__PURE__ */ jsxs("span", { className: "relative flex items-center", children: [
                /* @__PURE__ */ jsxs(
                  "select",
                  {
                    value: sort,
                    onChange: (e) => (setSort(e.target.value), reset()),
                    className: "appearance-none bg-transparent pr-5 text-right outline-none",
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "popular", children: "Popular" }),
                      /* @__PURE__ */ jsx("option", { value: "tools", children: "Most tools" }),
                      /* @__PURE__ */ jsx("option", { value: "az", children: "A\u2013Z" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(ChevronDown, { className: "pointer-events-none absolute right-0 size-3.5 text-foreground/40" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex h-10 cursor-pointer items-center justify-between rounded-md bg-popover px-3 text-body-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground/55", children: "Instant apps only" }),
              /* @__PURE__ */ jsx("input", { type: "checkbox", className: "size-4 accent-[var(--brand)]", checked: instantOnly, onChange: (e) => (setInstantOnly(e.target.checked), reset()) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "surface overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "border-b border-black/[0.06] px-4 py-3 text-[14px] font-medium", children: "Categories" }),
          /* @__PURE__ */ jsxs("div", { className: "max-h-[420px] space-y-px overflow-y-auto p-2", children: [
            /* @__PURE__ */ jsx(CategoryRow, { label: "All apps", count: pool.length, active: !category, onClick: () => (setCategory(null), reset()), icon: true }),
            categories.map(([c, n]) => /* @__PURE__ */ jsx(CategoryRow, { label: c, count: n, active: category === c, onClick: () => (setCategory(c), reset()) }, c))
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "https://composio.dev/toolkits",
            target: "_blank",
            rel: "noreferrer",
            className: "surface flex items-center justify-between px-4 py-3 text-[14px] transition-colors hover:border-black/15",
            children: [
              "Browse on composio.dev",
              /* @__PURE__ */ jsx(ExternalLink, { className: "size-4 text-foreground/40", strokeWidth: 1.5 })
            ]
          }
        )
      ] })
    ] }) }),
    open && /* @__PURE__ */ jsx(AppDrawer, { cloud, app: open, connected: connected.has(open.slug), signedIn, instant: INSTANT.includes(open.slug), onClose: () => setOpen(null) })
  ] });
}
function Grid({ title, action, count, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("h2", { className: "flex items-center gap-2 text-h2", children: [
        title,
        count !== void 0 && /* @__PURE__ */ jsx("span", { className: "font-mono text-[11px] font-normal tracking-wider text-foreground/40", children: fmt(count) })
      ] }),
      action
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children })
  ] });
}
function AppLogo({ app, size = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    /* @__PURE__ */ jsx("img", { src: app.logo, alt: "", width: size, height: size, loading: "lazy", className: "shrink-0 rounded-md object-contain", style: { width: size, height: size } })
  );
}
function AppCard({ app, connected, instant, onOpen }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: () => onOpen(app),
      className: "surface group flex items-center gap-3.5 px-4 py-3.5 text-left transition-[border-color,box-shadow] hover:border-black/15 hover:shadow-elevated",
      children: [
        /* @__PURE__ */ jsx(AppLogo, { app }),
        /* @__PURE__ */ jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            instant && /* @__PURE__ */ jsx(Zap, { className: "size-3.5 shrink-0 text-foreground/50", strokeWidth: 1.75 }),
            /* @__PURE__ */ jsx("span", { className: "truncate text-[15px]", children: app.name }),
            app.managed && /* @__PURE__ */ jsx(ShieldCheck, { className: "size-4 shrink-0 text-foreground/45", strokeWidth: 1.75, "aria-label": "Managed by Composio" })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "mt-0.5 flex items-center gap-1 font-mono text-[11px] text-foreground/45", children: [
            /* @__PURE__ */ jsx(Hammer, { className: "size-3", strokeWidth: 1.75 }),
            " ",
            fmt(app.tools)
          ] })
        ] }),
        connected ? /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[13px] text-success", children: "1 Active" }) : /* @__PURE__ */ jsxs("span", { className: "shrink-0 text-[12px] text-foreground/40 opacity-0 transition-opacity group-hover:opacity-100", children: [
          /* @__PURE__ */ jsx(Plus, { className: "inline size-3.5", strokeWidth: 2 }),
          " Connect"
        ] })
      ]
    }
  );
}
function CategoryRow({ label, count, active, icon, onClick }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick,
      className: `flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm transition-colors ${active ? "bg-black/[0.05] text-foreground" : "text-foreground/65 hover:bg-black/[0.03] hover:text-foreground"}`,
      children: [
        icon && /* @__PURE__ */ jsx(LayoutGrid, { className: "size-3.5", strokeWidth: 1.75 }),
        /* @__PURE__ */ jsx("span", { className: "flex-1 truncate", children: label }),
        /* @__PURE__ */ jsx("span", { className: "font-mono text-[11px] text-foreground/40", children: fmt(count) })
      ]
    }
  );
}
const details = /* @__PURE__ */ new Map();
function loadDetail(slug) {
  let p = details.get(slug);
  if (!p) {
    p = fetch(`/api/apps/${encodeURIComponent(slug)}`).then(appsResponse).then((value) => {
      if (!Array.isArray(value.tools) || !Array.isArray(value.prompts)) throw new Error("App details are unavailable. Reopen this app to retry.");
      return value;
    }).catch(() => {
      details.delete(slug);
      return { error: "App details are unavailable. Close and reopen this app to retry.", tools: [], prompts: [], description: "", auth: [] };
    });
    details.set(slug, p);
  }
  return p;
}
function AppDrawer({ app, cloud, connected, signedIn, instant, onClose }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const connect = async () => {
    setPending(true);
    try {
      setError(null);
      // Use the same authenticated Composio link service as Connectors.
      // Keep OAuth top-level and return to this native Runtime Apps route.
      const catalog = await apiClient.listComposioToolkits({ search: app.slug, limit: 40 });
      const toolkitMeta = catalog.toolkits?.find((toolkit) => toolkit.slug === app.slug);
      const callback = new URL(window.location.href);
      callback.searchParams.delete("status");
      callback.searchParams.delete("connected_account_id");
      callback.searchParams.set("app", app.slug);
      callback.searchParams.set("composio_toolkit", app.slug);
      const result = await apiClient.createComposioConnectLink(app.slug, {
        toolkitMeta,
        callbackUrl: callback.toString(),
      });
      if (!result.redirect_url) throw new Error("Authorization link unavailable");
      window.location.assign(result.redirect_url);
    } catch (error) {
      setError(error?.response?.data?.error || error?.message || "Unable to start connection. Please retry.");
    } finally {
      setPending(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 flex justify-end bg-black/15", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { className: "flex h-full w-full max-w-[480px] flex-col border-l border-black/[0.06] bg-card shadow-2xl", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4 border-b border-black/[0.06] p-6", children: [
      /* @__PURE__ */ jsx(AppLogo, { app, size: 48 }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("h2", { className: "truncate text-h2", children: app.name }),
          app.managed && /* @__PURE__ */ jsx(ShieldCheck, { className: "size-4 text-foreground/45", strokeWidth: 1.75 })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap gap-1.5", children: [
          app.categories.map((c) => /* @__PURE__ */ jsx("span", { className: "rounded-xs bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-foreground/55 uppercase", children: c }, c)),
          instant && /* @__PURE__ */ jsx("span", { className: "rounded-xs bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-brand-readable uppercase", children: "Instant" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn-quiet size-8 p-0", onClick: onClose, "aria-label": "Close", children: /* @__PURE__ */ jsx(X, { className: "size-4", strokeWidth: 1.75 }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-6 overflow-y-auto p-6", children: [
      /* @__PURE__ */ jsx("p", { className: "text-body-sm text-foreground/65", children: app.description }),
      /* @__PURE__ */ jsx("dl", { className: "grid grid-cols-3 divide-x divide-black/[0.06] rounded-lg border border-black/[0.06]", children: [
        ["Tools", fmt(app.tools)],
        ["Triggers", fmt(app.triggers)],
        ["Auth", app.managed ? "Managed" : instant ? "Instant" : "Your key"]
      ].map(([k, v]) => /* @__PURE__ */ jsxs("div", { className: "px-3 py-2.5", children: [
        /* @__PURE__ */ jsx("dt", { className: "eyebrow", children: k }),
        /* @__PURE__ */ jsx("dd", { className: "mt-0.5 text-[15px]", children: v })
      ] }, k)) }),
      connected ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-success/10 px-3.5 py-2.5 text-body-sm text-success", children: [
        /* @__PURE__ */ jsx(Check, { className: "size-4", strokeWidth: 2 }),
        " ",
        cloud ? "Connected through HIVEMIND." : "Connected. Your dots can use",
        " ",
        !cloud && app.name
      ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx("button", { className: "btn-primary h-10 w-full", disabled: pending, onClick: connect, children: cloud ? `Sign in to ${app.name}` : signedIn ? `Connect ${app.name}` : "Sign in with Composio to connect" }),
        error && /* @__PURE__ */ jsx("p", { className: "text-caption text-destructive", children: error }),
        /* @__PURE__ */ jsxs("p", { className: "text-caption text-foreground/45", children: [
          "You'll sign in with ",
          app.name,
          " directly. Your dots never see your password."
        ] })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx("div", { className: "text-body-sm text-foreground/45", children: "Loading tools\u2026" }), children: /* @__PURE__ */ jsx(DetailBody, { slug: app.slug }) })
    ] })
  ] }) });
}
function DetailBody({ slug }) {
  const [d, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    setDetail(null);
    void loadDetail(slug).then((value) => {
      if (active) setDetail(value);
    });
    return () => {
      active = false;
    };
  }, [slug]);
  const [q, setQ] = useState("");
  if (!d) return /* @__PURE__ */ jsx("p", { role: "status", children: "Loading tools\u2026" });
  if (d.error) return /* @__PURE__ */ jsx("p", { className: "text-body-sm text-foreground/50", children: d.error });
  const tools = d.tools.filter((t) => !q || `${t.slug} ${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()));
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    d.prompts.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsx("h3", { className: "eyebrow mb-2", children: "Try asking a dot" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: d.prompts.map((p) => /* @__PURE__ */ jsxs("div", { className: "rounded-md bg-popover px-3 py-2 text-body-sm text-foreground/75", children: [
        "\u201C",
        p,
        "\u201D"
      ] }, p)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsx("div", { className: "mb-2 flex items-center justify-between", children: /* @__PURE__ */ jsxs("h3", { className: "eyebrow", children: [
        "Tools \xB7 ",
        fmt(d.tools.length)
      ] }) }),
      d.tools.length > 8 && /* @__PURE__ */ jsx("input", { className: "field mb-2 h-8", placeholder: "Filter tools", value: q, onChange: (e) => setQ(e.target.value) }),
      /* @__PURE__ */ jsx("div", { className: "divide-y divide-black/[0.06] rounded-lg border border-black/[0.06]", children: tools.slice(0, 200).map((t) => /* @__PURE__ */ jsxs("div", { className: "px-3 py-2", children: [
        /* @__PURE__ */ jsx("div", { className: "text-[13px]", children: t.name || t.slug }),
        /* @__PURE__ */ jsx("div", { className: "font-mono text-[10px] text-foreground/40", children: t.slug }),
        t.description && /* @__PURE__ */ jsx("div", { className: "mt-0.5 line-clamp-2 text-caption text-foreground/55", children: t.description })
      ] }, t.slug)) })
    ] })
  ] });
}
export {
  AppsDirectory as default
};
