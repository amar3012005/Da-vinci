# Runtime getting-started rail

The authenticated AppShell retains one checklist between its sidebar and native employee conversation. Runtime, DSH and OpenDot routes share this component; Brain and embedded native panes do not render a duplicate. At 1000px and below it becomes a collapsible header, leaving the composer in the remaining chat viewport.

Six presentation milestones use existing sources: native `tourState.awakening` completion; visiting a specialist; authenticated connector connection status; assigned native task; an accepted artifact-bearing task review; and an active or delivered native Schedule entry. Clicking a checklist row only navigates to the corresponding surface. It does not complete work, change permissions, send a prompt or mark the step complete.

The Runtime native client emits compact receipt booleans through the existing authenticated pane bridge. Hidden Runtime panes can update the rail while another employee is selected. The cache is scoped to authenticated user and organization, stores only booleans, and grants no authority. A fresh authoritative snapshot replaces native flags, including clearing them after a reset. Connection failures retain the last snapshot; they do not manufacture completion. Fresh browser sessions recover native evidence when the Runtime room loads.
