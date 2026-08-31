document.querySelector('#group').addEventListener('click', async () => {
  const status = document.querySelector('#status');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    const groups = await chrome.tabGroups.query({ title: 'HIVEMIND' });
    const existing = groups.find((group) => group.windowId === tab.windowId);
    const groupId = await chrome.tabs.group(existing ? { groupId: existing.id, tabIds: [tab.id] } : { tabIds: [tab.id] });
    await chrome.tabGroups.update(groupId, { title: 'HIVEMIND', color: 'blue', collapsed: false });
    status.textContent = 'Added to the HIVEMIND group.';
  } catch (error) { status.textContent = String(error?.message || error); }
});
