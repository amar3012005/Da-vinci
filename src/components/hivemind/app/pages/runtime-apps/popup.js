"use client";
function openAfter(fetchUrl, onError) {
  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    onError("Allow pop-ups for this page, then try connecting again.");
    return Promise.resolve();
  }
  tab.opener = null;
  try {
    tab.document.title = "Opening secure sign-in";
    const main = tab.document.createElement("main");
    main.style.cssText = "font:16px/1.5 system-ui,sans-serif;max-width:440px;margin:18vh auto;padding:24px;color:#242424";
    const heading = tab.document.createElement("h1");
    heading.textContent = "Opening secure sign-in\u2026";
    heading.style.cssText = "font-size:24px;font-weight:600";
    const detail = tab.document.createElement("p");
    detail.textContent = "Keep this tab open while we prepare your connection. You\u2019ll sign in directly with the app.";
    main.append(heading, detail);
    tab.document.body.replaceChildren(main);
  } catch {
  }
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Sign-in is taking longer than expected. Please try connecting again.")), 3e4);
  });
  return Promise.race([fetchUrl(), deadline]).then((r) => {
    if (r.error) {
      tab?.close();
      onError(r.error);
    } else if (r.url) {
      if (tab.closed) throw new Error("The sign-in tab was closed. Please try connecting again.");
      const url = new URL(r.url, window.location.href);
      if (url.username || url.password || !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Invalid sign-in link");
      tab.location.href = url.toString();
    } else tab?.close();
  }).catch((error) => {
    tab.close();
    onError(error instanceof Error ? error.message : "Could not open sign-in. Please try again.");
  }).finally(() => clearTimeout(timeout));
}
export {
  openAfter
};
