/**
 * WorkRun view model + identity-keyed UI block registry.
 * AgentScope SSE (and hm-core normalized events) update projections.
 * Same block_id is upserted (revision++); never append a duplicate row.
 */

export const BLOCK_KINDS = Object.freeze([
  'text', 'activity', 'plan', 'tool', 'search', 'sources',
  'artifact', 'approval', 'team', 'appAction', 'table', 'chart', 'result',
]);

/** Product UI kinds — AgentScope class names never reach the workbench. */
export const PRODUCT_KINDS = Object.freeze([
  'started', 'message', 'plan', 'activity', 'team', 'approval', 'artifact', 'completed', 'failed',
]);

export function isProductKind(kind) {
  return PRODUCT_KINDS.includes(kind);
}

export function emptyWorkRunView(workrunId) {
  return {
    workrun_id: workrunId || null,
    messages: [],
    blocks: {},
    blockOrder: [],
    activity: [],
    artifacts: [],
    sources: [],
    team: [],
    // This is only a display projection of AgentScope's session task state.
    // AgentScope remains the task authority; Rooms does not write this back.
    tasks: [],
    approvals: [],
    status: 'idle',
  };
}

// A completed run can be reopened after its live SSE connection has ended.
// hm-core persists the registered artifact identifiers on the WorkRun, so seed
// those durable records during hydration instead of showing an empty preview.
// The browser receives only the citable pointer here; workspace bytes remain
// behind the runtime boundary until a dedicated download endpoint is selected.
export function hydrateRegisteredArtifacts(view, artifactIds) {
  if (!Array.isArray(artifactIds)) return view;
  return artifactIds.reduce((next, artifactId) => {
    const id = String(artifactId || '').trim();
    if (!id) return next;
    return upsertBlock(next, {
      block_id: `artifact:${id}`,
      workrun_id: next.workrun_id,
      kind: 'artifact',
      status: 'complete',
      payload: {
        artifact_id: id,
        label: 'Registered artifact',
        detail: `Artifact ${id} is registered for this WorkRun.`,
      },
    });
  }, view);
}

export function eventType(ev) {
  return String(ev?.type || ev?.t || '').toUpperCase();
}

// Persisted AgentScope history is protocol data, not a React-child contract.
// Older records can carry an envelope such as { type, text, id, created_at,
// finished_at }; recursively extract printable content before it reaches a
// transcript component.
export function transcriptText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(transcriptText).join('');
  if (!value || typeof value !== 'object') return '';
  for (const key of ['text', 'delta', 'content', 'output', 'value', 'thinking']) {
    if (value[key] != null && value[key] !== value) return transcriptText(value[key]);
  }
  return '';
}

export function textOf(ev) {
  const v = ev?.delta || ev?.text || ev?.content || ev?.output || ev?.value || ev?.thinking || '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x?.text || x?.delta || '')).join('');
  if (v && typeof v === 'object') return String(v.text || v.delta || v.thinking || v.path || '');
  return '';
}

export function toolInputOf(ev) {
  const value = ev?.input ?? ev?.arguments ?? ev?.args ?? ev?.parameters ?? ev?.tool_input ?? ev?.tool_args;
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export function toolLabel(name) {
  const n = String(name || 'tool');
  if (/company_context/i.test(n)) return 'Read company context';
  if (/recall/i.test(n)) return 'Checked company memory';
  if (/web_search/i.test(n)) return 'Searched the web';
  if (/web_read|browser|crawl/i.test(n)) return 'Read a page';
  if (/save_prospect/i.test(n)) return 'Saved a prospect';
  if (/list_prospects/i.test(n)) return 'Listed prospects';
  if (/memories/i.test(n)) return 'Wrote to company memory';
  if (/^TaskCreate$/i.test(n)) return 'Created a plan step';
  if (/^TaskUpdate$/i.test(n)) return 'Updated a plan step';
  if (/^TaskList$/i.test(n)) return 'Listed plan steps';
  if (/^TaskGet$/i.test(n)) return 'Read a plan step';
  if (/gmail/i.test(n)) return 'Checked Gmail';
  if (/composio/i.test(n)) return 'Used a connected app';
  return n.replace(/^hivemind_/, '').replace(/_/g, ' ');
}

export function productFailure(ev) {
  const blob = JSON.stringify(ev?.error || ev?.message || ev?.reason || '');
  if (/invalid_request|gateway|openai|deepseek/i.test(blob)) {
    return {
      code: 'MODEL_INVALID_REQUEST',
      message: "The model couldn't continue this run.",
    };
  }
  const reason = ev?.reason && ev.reason !== 'error' ? String(ev.reason) : "The model couldn't continue this run.";
  return { code: String(ev?.reason || 'FAILED').slice(0, 64), message: reason };
}

function isBlockKind(kind) {
  return BLOCK_KINDS.includes(kind);
}

export function validateBlock(block) {
  if (!block || typeof block !== 'object') return null;
  if (!block.block_id || !isBlockKind(block.kind)) return null;
  return {
    block_id: String(block.block_id),
    workrun_id: block.workrun_id || null,
    kind: block.kind,
    revision: Number(block.revision) || 1,
    status: block.status || 'streaming',
    payload: block.payload && typeof block.payload === 'object' ? block.payload : {},
  };
}

export function upsertBlock(view, incoming) {
  const block = validateBlock(incoming);
  if (!block) return view;
  const prev = view.blocks[block.block_id];
  const next = prev
    ? {
      ...prev,
      ...block,
      revision: (prev.revision || 0) + 1,
      payload: { ...prev.payload, ...block.payload },
    }
    : { ...block, revision: 1 };
  const blocks = { ...view.blocks, [block.block_id]: next };
  const blockOrder = prev ? view.blockOrder : [...view.blockOrder, block.block_id];
  return project({ ...view, blocks, blockOrder });
}

function project(view) {
  const list = view.blockOrder.map((id) => view.blocks[id]).filter(Boolean);
  const tools = list.filter((b) => b.kind === 'tool' || b.kind === 'search');
  const artifacts = list.filter((b) => b.kind === 'artifact' || b.kind === 'result');
  const sources = tools.map((b) => ({
    id: b.block_id,
    title: toolLabel(b.payload.name),
    detail: b.payload.result || b.status,
    kind: /web|search|browser/i.test(String(b.payload.name)) ? 'web' : 'memory',
  }));
  const activity = list
    .filter((b) => b.kind === 'activity' || b.kind === 'plan' || b.kind === 'tool' || b.kind === 'team')
    .map((b) => ({
      id: b.block_id,
      kind: b.kind,
      name: b.payload.name || null,
      label: b.payload.label || toolLabel(b.payload.name) || b.kind,
      status: b.status,
      result: b.payload.result || null,
    }));
  const team = list.filter((b) => b.kind === 'team').map((b) => b.payload);
  const latestPlan = [...list].reverse().find((b) => (
    b.kind === 'plan' && Array.isArray(b.payload?.tasks)
  ));
  const tasks = (latestPlan?.payload?.tasks || []).map((task, index) => {
    const state = String(task?.state || task?.status || '').toLowerCase();
    const status = /complete|done|success/.test(state)
      ? 'complete'
      : /running|progress|active|working/.test(state)
        ? 'streaming'
        : 'pending';
    return {
      id: task?.id || `agentscope-task-${index}`,
      label: task?.subject || task?.title || task?.description || `Task ${index + 1}`,
      description: task?.description || '',
      state,
      status,
      blocked_by: Array.isArray(task?.blocked_by) ? task.blocked_by : [],
      owner: task?.owner || null,
    };
  });
  const approvalByTool = new Map();
  list.filter((b) => b.kind === 'approval' && b.status === 'streaming').forEach((block) => {
    const key = String(block.payload.tool || block.payload.tools?.[0] || block.block_id).toLowerCase();
    const current = approvalByTool.get(key);
    if (!current || (!current.payload.reply_id && block.payload.reply_id)) {
      approvalByTool.set(key, block);
    }
  });
  const approvals = [...approvalByTool.values()];
  return { ...view, artifacts, sources, activity, team, tasks, approvals };
}

function mergeDelta(prev, incoming) {
  const next = String(incoming || '');
  const cur = String(prev || '');
  if (!next) return cur;
  if (!cur) return next;
  if (next.startsWith(cur)) return next;
  if (cur.endsWith(next)) return cur;
  if (cur.includes(next) && next.length < cur.length) return cur;
  return cur + next;
}

function toolId(ev, workrunId) {
  const call = ev.tool_call_id || ev.call_id || ev.id;
  const name = ev.tool_call_name || ev.tool_name || ev.tool || ev.name || 'tool';
  return call ? `tool:${workrunId || 'run'}:${call}` : `tool:${workrunId || 'run'}:${name}`;
}

/**
 * Apply one AgentScope session event or hm-core normalized event to the view.
 */
export function applyWorkRunEvent(view, ev) {
  if (!ev) return view;
  const type = eventType(ev);
  const workrunId = view.workrun_id;
  const t = String(ev.t || '');

  // hm-core turns AgentScope's state_updated event into this compact,
  // reconnect-safe snapshot. It intentionally contains only the fields that
  // belong in a WorkRun display, never AgentScope's private session state.
  if (t === 'plan.updated') {
    const tasks = Array.isArray(ev.tasks) ? ev.tasks : [];
    return upsertBlock(view, {
      block_id: `plan:${workrunId}`,
      workrun_id: workrunId,
      kind: 'plan',
      status: 'complete',
      payload: { name: 'TaskUpdate', label: 'Plan updated', family: 'task', tasks },
    });
  }

  if (t === 'tool.started' || type === 'TOOL_CALL_START') {
    const name = ev.tool_call_name || ev.tool_name || ev.tool || ev.name || 'tool';
    const isTask = /^Task(Create|Update|List|Get)$/i.test(name) || t === 'plan.updated';
    return upsertBlock(view, {
      block_id: isTask ? `plan:${workrunId}` : toolId(ev, workrunId),
      workrun_id: workrunId,
      kind: isTask ? 'plan' : (/web_search/i.test(name) ? 'search' : 'tool'),
      status: 'streaming',
      payload: { name, label: toolLabel(name), family: isTask ? 'task' : null },
    });
  }

  if (t === 'tool.completed' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END') {
    const name = ev.tool_call_name || ev.tool_name || ev.tool || ev.name;
    const result = (textOf(ev) || ev.result_summary || ev.result || '').slice(0, 12000);
    const existing = view.blocks[toolId(ev, workrunId)];
    return upsertBlock(view, {
      block_id: toolId(ev, workrunId),
      workrun_id: workrunId,
      kind: existing?.kind || 'tool',
      status: 'complete',
      payload: {
        name: name || existing?.payload?.name || 'tool',
        label: toolLabel(name || existing?.payload?.name),
        result,
      },
    });
  }

  if (t === 'artifact.created' || (type === 'CUSTOM' && ev.name === 'artifact.created')) {
    const artifactId = ev.artifact_id || ev.value?.artifact_id || ev.path || ev.value?.path || `art-${Date.now()}`;
    return upsertBlock(view, {
      block_id: `artifact:${artifactId}`,
      workrun_id: workrunId,
      kind: 'artifact',
      status: 'complete',
      payload: {
        artifact_id: artifactId,
        path: ev.path || ev.value?.path,
        content_type: ev.content_type || ev.value?.content_type,
        label: ev.path || ev.value?.path || 'Artifact',
      },
    });
  }

  if (t === 'approval.requested' || type === 'REQUIRE_USER_CONFIRM') {
    const calls = Array.isArray(ev.tool_calls) ? ev.tool_calls : [];
    const first = calls[0] || {};
    const replyId = ev.reply_id || ev.replyId || null;
    const callId = ev.call_id || ev.tool_call_id || first.id || first.tool_call_id || null;
    const tool = ev.tool || first.name || first.tool_name || null;
    // The normalized progress stream and the raw AgentScope session stream
    // both carry the same HITL request. Key it by the parked reply so those
    // two transports update one card instead of rendering duplicates.
    const approvalId = replyId || callId || tool || 'approval';
    return upsertBlock(view, {
      block_id: `approval:${approvalId}`,
      workrun_id: workrunId,
      kind: 'approval',
      status: 'streaming',
      payload: {
        tool,
        prompt: ev.prompt || ev.message,
        tools: ev.tools || calls.map((call) => call?.name || call?.tool_name).filter(Boolean),
        reply_id: replyId,
        tool_calls: calls.length ? calls : (ev.tool_calls || []),
      },
    });
  }

  if (t === 'team.member.started' || (type === 'CUSTOM' && ev.name === 'team_updated')) {
    const member = ev.member || ev.source || 'member';
    return upsertBlock(view, {
      block_id: `team:${member}`,
      workrun_id: workrunId,
      kind: 'team',
      status: 'streaming',
      payload: { member, label: `${member} joined` },
    });
  }

  if (type === 'CUSTOM' && ev.name === 'state_updated') {
    const tasks = ev.value?.tasks_context?.tasks;
    if (!Array.isArray(tasks)) return view;
    return upsertBlock(view, {
      block_id: `plan:${workrunId}`,
      workrun_id: workrunId,
      kind: 'plan',
      status: 'complete',
      payload: { name: 'TaskUpdate', label: 'Plan updated', family: 'task', tasks },
    });
  }

  if (type === 'TEXT_BLOCK_DELTA' || type === 'TEXT_BLOCK_END') {
    const id = `text:${workrunId}:current`;
    const prev = view.blocks[id];
    const text = type === 'TEXT_BLOCK_END' && textOf(ev)
      ? textOf(ev)
      : mergeDelta(prev?.payload?.text, textOf(ev));
    return upsertBlock(view, {
      block_id: id,
      workrun_id: workrunId,
      kind: 'text',
      status: type === 'TEXT_BLOCK_END' ? 'complete' : 'streaming',
      payload: { text },
    });
  }

  if (t === 'agent.status') {
    return { ...view, status: ev.status || view.status };
  }
  if (t === 'workrun.failed' || (type === 'REPLY_END' && (ev.finished_reason || ev.reason) && ev.finished_reason !== 'completed' && ev.reason !== 'completed')) {
    const fail = productFailure(ev);
    return { ...view, status: 'failed', failure: fail };
  }
  if (t === 'workrun.completed') return { ...view, status: 'completed' };

  return view;
}

export function hasRunningTools(view) {
  return Object.values(view.blocks || {}).some(
    (b) => (b.kind === 'tool' || b.kind === 'search') && b.status === 'streaming',
  );
}

export function blocksInOrder(view) {
  return (view.blockOrder || []).map((id) => view.blocks[id]).filter(Boolean);
}

export function resolveApproval(view, blockId) {
  const block = view.blocks?.[blockId];
  if (!block || block.kind !== 'approval') return view;
  return upsertBlock(view, { ...block, status: 'complete' });
}

function cloneMsgs(msgs) {
  return msgs.map((m) => ({
    ...m,
    tools: [...(m.tools || [])],
    timeline: (m.timeline || []).map((item) => ({ ...item })),
  }));
}

function toolsRunning(msg) {
  return (msg?.tools || []).some((t) => t.state === 'running');
}

/**
 * Transcript reducer. A tool call never ends the stream; REPLY_END only
 * seals the bubble when no tool is still running. Later deltas reopen it.
 */
export function applyAgentEvent(msgs, ev) {
  const type = eventType(ev);
  const next = cloneMsgs(msgs);
  const ensureAssistant = () => {
    const last = next[next.length - 1];
    if (last && last.role === 'assistant') {
      last.streaming = true;
      return last;
    }
    const created = {
      role: 'assistant', text: '', thinking: '', tools: [], timeline: [], streaming: true,
    };
    next.push(created);
    return created;
  };

  if (type === 'REPLY_START') {
    const replyId = ev.reply_id || ev.id;
    const existing = replyId ? next.find((m) => m.reply_id === replyId) : null;
    if (existing) {
      existing.streaming = true;
      return next;
    }
    const cur = ensureAssistant();
    cur.reply_id = replyId || cur.reply_id;
    cur.stage = 'reasoning';
    return next;
  }

  if (
    type === 'TEXT_BLOCK_DELTA' || type === 'THINKING_BLOCK_DELTA' || type === 'THINKING_BLOCK_END'
    || type === 'TOOL_CALL_START' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END'
    || type === 'TEXT_BLOCK_END'
  ) {
    const cur = ensureAssistant();
    if (type === 'TEXT_BLOCK_DELTA') {
      cur.stage = 'answering';
      cur.text = mergeDelta(cur.text, textOf(ev));
    }
    if (type === 'TEXT_BLOCK_END' && textOf(ev)) {
      cur.stage = 'answering';
      cur.text = mergeDelta(cur.text, textOf(ev));
    }
    if (type === 'THINKING_BLOCK_DELTA' || type === 'THINKING_BLOCK_END') {
      cur.stage = 'reasoning';
      const value = textOf(ev);
      cur.thinking = mergeDelta(cur.thinking, value);
      const blockId = ev.block_id || ev.id || null;
      const last = cur.timeline[cur.timeline.length - 1];
      const item = last?.kind === 'thinking' && (!blockId || !last.block_id || last.block_id === blockId)
        ? last
        : null;
      if (item) {
        item.text = mergeDelta(item.text, value);
        if (blockId) item.block_id = blockId;
      } else if (value) {
        cur.timeline.push({
          id: blockId || `thinking-${cur.timeline.length}`,
          block_id: blockId,
          kind: 'thinking',
          text: value,
        });
      }
    }
    if (type === 'TOOL_CALL_START' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END') {
      const name = ev.tool_call_name || ev.name || ev.tool_name || 'tool';
      const id = ev.tool_call_id || ev.id;
      const existing = cur.tools.find((t) => (id && t.id === id) || t.name === name);
      const result = type === 'TOOL_RESULT_END' ? (textOf(ev) || ev.result_summary || '').slice(0, 800) : undefined;
      const input = toolInputOf(ev);
      if (type === 'TOOL_CALL_START') cur.stage = 'working';
      if (existing) {
        existing.state = type === 'TOOL_CALL_START' ? 'running' : 'done';
        if (result) existing.result = result;
        if (input) existing.input = input;
      } else {
        cur.tools.push({ name, id, state: type === 'TOOL_CALL_START' ? 'running' : 'done', input, result });
      }
      const timelineTool = cur.timeline.find((item) => item.kind === 'tool' && ((id && item.id === id) || (!id && item.name === name)));
      if (timelineTool) {
        timelineTool.state = type === 'TOOL_CALL_START' ? 'running' : 'done';
        timelineTool.label = toolLabel(name);
        if (result) timelineTool.result = result;
        if (input) timelineTool.input = input;
      } else {
        cur.timeline.push({
          kind: 'tool',
          name,
          label: toolLabel(name),
          id: id || `tool-${cur.timeline.length}`,
          state: type === 'TOOL_CALL_START' ? 'running' : 'done',
          input,
          result,
        });
      }
      cur.streaming = true;
    }
  }

  if (type === 'REPLY_END') {
    const cur = next[next.length - 1];
    if (cur && cur.role === 'assistant') {
      cur.streaming = toolsRunning(cur);
      if (!cur.streaming) cur.stage = 'complete';
    }
  }
  return next;
}

export function startUserTurn(msgs, text) {
  return [
    ...msgs,
    { role: 'user', text, tools: [], thinking: '', timeline: [] },
    { role: 'assistant', text: '', thinking: '', tools: [], timeline: [], stage: 'acknowledging', streaming: true },
  ];
}
