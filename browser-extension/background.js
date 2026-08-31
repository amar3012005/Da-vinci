const GROUP_TITLE = 'HIVEMIND';

async function ensureGroup(tabIds = []) {
  const ids = [...new Set(tabIds.filter(Number.isInteger))];
  if (!ids.length) return null;
  const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
  const firstTab = await chrome.tabs.get(ids[0]);
  const existing = groups.find((group) => group.windowId === firstTab.windowId);
  const groupId = await chrome.tabs.group(existing ? { groupId: existing.id, tabIds: ids } : { tabIds: ids });
  await chrome.tabGroups.update(groupId, { title: GROUP_TITLE, color: 'blue', collapsed: false });
  return groupId;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) await ensureGroup([tab.id]);
  if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.source !== 'singulance-web' || message?.version !== 1) return false;
  (async () => {
    if (message.type === 'HM_COMPANION_STATUS') {
      sendResponse({ ok: true, installed: true, version: chrome.runtime.getManifest().version });
      return;
    }
    if (message.type === 'HM_GROUP_CURRENT_TAB' && sender.tab?.id) {
      const groupId = await ensureGroup([sender.tab.id]);
      sendResponse({ ok: true, groupId });
      return;
    }
    sendResponse({ ok: false, error: 'unsupported_command' });
  })().catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
