/** An incoming signal is eligible only after native inbox persistence. */
export function isRuntimeAttention(notice) {
  return notice?.type === 'runtime.attention' && notice?.data?.inboxPersisted === true;
}

export function runtimeAttentionCopy(notice) {
  const wake = notice?.data?.action === 'wake' || notice?.data?.wakeRequested === true;
  return {
    title: notice?.title || 'Runtime update',
    description: wake ? 'Waiting for Runtime to assess this update.' : 'Queued for Runtime’s next turn.',
    detail: 'This update is saved in Runtime’s inbox. Its chat shows when Runtime receives it. A wake request alone does not confirm processing.',
  };
}

/** Admission receipts may arrive while another popup is open; keep them eligible. */
export function nextAttentionPopup(notices, hasSeen) {
  return notices.find(notice => isRuntimeAttention(notice)
    && !notice.readAt && !notice.read_at && !hasSeen(notice));
}
