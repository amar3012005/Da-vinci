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
  'started', 'message', 'plan', 'activity', 'team', 'approval', 'artifact', 'completed', 'failed', 'cancelled',
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
    approvals: [],
    status: 'idle',
  };
}

export function eventType(ev) {
  return String(ev?.type || ev?.t || '').toUpperCase();
}

export function transcriptText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(transcriptText).filter(Boolean).join('');
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.delta === 'string') return value.delta;
    if (typeof value.content === 'string' || Array.isArray(value.content)) return transcriptText(value.content);
    if (/^tool[-_]result$/i.test(String(value.type || ''))) return transcriptText(value.result ?? value.output ?? value.content ?? '');
  }
  return '';
}

function usageNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function firstUsageNumber(source, keys) {
  for (const key of keys) {
    const value = usageNumber(source?.[key]);
    if (value != null) return value;
  }
  return null;
}

export function normalizeTurnUsage(value) {
  const source = value?.usage && typeof value.usage === 'object' ? value.usage : value;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const inputTokens = firstUsageNumber(source, ['input_tokens', 'prompt_tokens', 'inputTokens', 'promptTokens']);
  const outputTokens = firstUsageNumber(source, ['output_tokens', 'completion_tokens', 'outputTokens', 'completionTokens']);
  const cachedInputTokens = firstUsageNumber(source, ['cached_input_tokens', 'cache_input_tokens', 'cached_prompt_tokens', 'cachedInputTokens', 'cacheInputTokens'])
    ?? firstUsageNumber(source.input_tokens_details, ['cached_tokens'])
    ?? firstUsageNumber(source.prompt_tokens_details, ['cached_tokens']);
  const totalTokens = firstUsageNumber(source, ['total_tokens', 'totalTokens'])
    ?? (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
  const durationMs = firstUsageNumber(source, ['duration_ms', 'durationMs', 'elapsed_ms', 'elapsedMs', 'run_ms', 'runMs']);
  const ttftMs = firstUsageNumber(source, ['ttft_ms', 'ttftMs', 'time_to_first_token_ms']);
  const tokenPerSecond = firstUsageNumber(source, ['tokens_per_second', 'tokensPerSecond']);
  const cacheHitPercent = firstUsageNumber(source, ['cache_hit_percent', 'cacheHitPercent'])
    ?? (inputTokens && cachedInputTokens != null ? (cachedInputTokens / inputTokens) * 100 : null);
  const provider = String(source.provider || source.provider_name || '').trim() || null;
  const model = String(source.model || source.model_name || source.served_model || '').trim() || null;
  if ([inputTokens, outputTokens, cachedInputTokens, totalTokens, durationMs, ttftMs, tokenPerSecond, cacheHitPercent, provider, model].every((item) => item == null)) return null;
  return {
    inputTokens, outputTokens, cachedInputTokens,
    uncachedInputTokens: inputTokens != null && cachedInputTokens != null ? Math.max(0, inputTokens - cachedInputTokens) : null,
    totalTokens, durationMs, ttftMs, tokenPerSecond, cacheHitPercent, provider, model,
  };
}

export function mergeTurnUsage(current, incoming) {
  const next = normalizeTurnUsage(incoming);
  if (!next) return current || null;
  return Object.fromEntries(Object.entries({ ...(current || {}), ...next }).filter(([, value]) => value != null));
}

export function usageFromEvent(ev) {
  return mergeTurnUsage(null, ev?.usage || ev?.metrics || ev?.telemetry || ev?.value?.usage || null);
}

export function isCompanyOperatingPlan(ev) {
  return (ev?.execution_mode || ev?.scope?.execution_mode || ev?.value?.execution_mode) === 'operating_plan';
}

export function textOf(ev) {
  const v = ev?.delta || ev?.text || ev?.content || ev?.output || ev?.value || ev?.thinking || '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x?.text || x?.delta || '')).join('');
  if (v && typeof v === 'object') return String(v.text || v.delta || v.thinking || v.path || '');
  return '';
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
    .filter((b) => b.kind === 'activity' || b.kind === 'tool' || b.kind === 'search' || b.kind === 'team')
    .map((b) => ({
      id: b.block_id,
      block_id: b.block_id,
      kind: b.kind,
      name: b.payload.name || null,
      label: b.payload.label || toolLabel(b.payload.name) || b.kind,
      status: b.status,
      input: b.payload.input ?? null,
      result: b.payload.result ?? b.payload.output ?? null,
      text: b.payload.text ?? null,
      execution_mode: b.payload.execution_mode || null,
      tasks: b.payload.tasks || null,
    }));
  const latestPlan = [...list].reverse().find((b) => (
    b.kind === 'plan' && b.payload.execution_mode === 'operating_plan' && Array.isArray(b.payload.tasks)
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
      status,
      blocked_by: Array.isArray(task?.blocked_by) ? task.blocked_by : [],
      owner: task?.owner || null,
    };
  });
  const team = list.filter((b) => b.kind === 'team').map((b) => b.payload);
  const approvals = list.filter((b) => b.kind === 'approval');
  const computerBlock = list.find((b) => /computer_(query|run_task)/i.test(String(b.payload?.name || '')));
  let computer = null;
  if (computerBlock) {
    let result = computerBlock.payload.result || computerBlock.payload.output || {};
    if (typeof result === 'string') { try { result = JSON.parse(result); } catch { result = { result }; } }
    computer = {
      label: 'Computer use', ...result,
      status: result.status || computerBlock.payload.status || computerBlock.status,
      computer_run_id: result.computer_run_id || result.run_id || computerBlock.payload.computer_run_id,
      evidence: result.evidence || computerBlock.payload.evidence || [],
      objective: result.objective || computerBlock.payload.input?.objective,
    };
  }
  return { ...view, artifacts, sources, activity, tasks, team, approvals, computer };
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

function plainValue(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try { return JSON.stringify(value); } catch { return String(value); }
}

function callInput(ev) {
  return ev.input ?? ev.arguments ?? ev.args ?? ev.tool_input ?? ev.parameters ?? {};
}

export function artifactDisplayName(artifact) {
  const payload = artifact?.payload || artifact || {};
  const candidate = payload.label || payload.title || payload.name || payload.filename || payload.path || 'Artifact';
  const name = String(candidate).split(/[\\/]/).filter(Boolean).pop() || 'Artifact';
  return name.length > 72 ? `${name.slice(0, 69)}…` : name;
}

export function hydrateRegisteredArtifacts(view, registered) {
  const source = registered?.artifacts || registered?.items || registered;
  const list = Array.isArray(source) ? source : source ? [source] : [];
  return list.reduce((current, raw, index) => {
    const item = typeof raw === 'string' ? { artifact_id: raw } : raw;
    if (!item || typeof item !== 'object') return current;
    const id = item.artifact_id || item.id || item.path || `registered-${index}`;
    const block = {
      block_id: `artifact:${id}`,
      workrun_id: current.workrun_id,
      kind: 'artifact',
      status: 'complete',
      payload: {
        ...item,
        artifact_id: id,
        path: item.path || item.download_path || item.url || null,
        content_type: item.content_type || item.mime_type || null,
        label: artifactDisplayName(item),
      },
    };
    return upsertBlock(current, block);
  }, view);
}

/**
 * Apply one AgentScope session event or hm-core normalized event to the view.
 */
export function applyWorkRunEvent(view, ev) {
  if (!ev) return view;
  const type = eventType(ev);
  const workrunId = view.workrun_id;
  const t = String(ev.t || '');

  if ((t === 'plan.updated' || t === 'task_plan') && isCompanyOperatingPlan(ev)) {
    const tasks = Array.isArray(ev.tasks) ? ev.tasks : (Array.isArray(ev.subtasks) ? ev.subtasks : []);
    return upsertBlock(view, {
      block_id: `plan:${workrunId}`,
      workrun_id: workrunId,
      kind: 'plan',
      status: 'complete',
      payload: { name: ev.name || 'TaskUpdate', label: ev.label || 'Operating plan', family: 'task', execution_mode: 'operating_plan', description: ev.description || '', tasks },
    });
  }

  if (t === 'tool.started' || type === 'TOOL_CALL_START' || type === 'TOOL.STARTED') {
    const name = ev.tool_call_name || ev.tool_name || ev.tool || ev.name || 'tool';
    const isTask = /^Task(Create|Update|List|Get)$/i.test(name) && isCompanyOperatingPlan(ev);
    const input = callInput(ev);
    const planId = input.task_id || input.id || ev.task_id || ev.tool_call_id || ev.call_id || ev.id || `${Date.now()}`;
    return upsertBlock(view, {
      block_id: isTask ? `plan:${workrunId}:${planId}` : toolId(ev, workrunId),
      workrun_id: workrunId,
      kind: isTask ? 'plan' : (/web_search/i.test(name) ? 'search' : 'tool'),
      status: 'streaming',
      payload: { name, input, label: isTask ? (input.title || input.subject || input.description || toolLabel(name)) : toolLabel(name), family: isTask ? 'task' : null, ...(isTask ? { execution_mode: 'operating_plan' } : {}) },
    });
  }

  if (t === 'tool.output.delta') {
    const id = toolId(ev, workrunId);
    const old = view.blocks[id];
    return upsertBlock(view, {
      block_id: id, workrun_id: workrunId, kind: old?.kind || 'tool', status: 'streaming',
      payload: { name: old?.payload?.name || ev.tool_name || ev.name || 'tool', output: `${old?.payload?.output || ''}${plainValue(textOf(ev))}` },
    });
  }

  if (t.startsWith('computer.')) {
    const id = ev.computer_run_id || ev.run_id || ev.tool_call_id || ev.id || 'active';
    const state = t.endsWith('.completed') ? 'complete' : t.endsWith('.failed') ? 'failed' : 'streaming';
    return upsertBlock(view, {
      block_id: `tool:${workrunId}:computer:${id}`,
      workrun_id: workrunId,
      kind: 'tool',
      status: state,
      payload: {
        name: 'computer_run_task',
        label: 'Computer use',
        input: ev.input || ev.objective,
        result: ev.result || ev.output || ev.evidence,
        output: ev.result || ev.output || ev.evidence,
        computer_run_id: id,
        evidence: ev.evidence || [],
        status: ev.status || state,
      },
    });
  }

  if (t === 'tool.completed' || type === 'TOOL_RESULT_END' || type === 'TOOL.COMPLETED') {
    const name = ev.tool_call_name || ev.tool_name || ev.tool || ev.name;
    const result = (plainValue(ev.output ?? ev.result ?? textOf(ev) ?? ev.result_summary)).slice(0, 12000);
    const existing = view.blocks[toolId(ev, workrunId)];
    return upsertBlock(view, {
      block_id: toolId(ev, workrunId),
      workrun_id: workrunId,
      kind: existing?.kind || 'tool',
      status: 'complete',
      payload: {
        name: name || existing?.payload?.name || 'tool',
        label: toolLabel(name || existing?.payload?.name),
        input: Object.keys(callInput(ev) || {}).length ? callInput(ev) : existing?.payload?.input,
        result,
        output: result,
      },
    });
  }

  // AgentScope's TOOL_CALL_END only closes the call-input event. Execution is
  // still in flight until a result/end event arrives, so keep the stable row
  // open instead of falsely painting it as a completed action.
  if (type === 'TOOL_CALL_END') {
    const id = toolId(ev, workrunId);
    const existing = view.blocks[id];
    if (!existing) return view;
    return upsertBlock(view, {
      ...existing,
      status: 'streaming',
      payload: { ...existing.payload, input: Object.keys(callInput(ev) || {}).length ? callInput(ev) : existing.payload.input },
    });
  }

  if (t === 'artifact.created' || type === 'ARTIFACT.CREATED' || (type === 'CUSTOM' && ev.name === 'artifact.created')) {
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
        label: artifactDisplayName({
          title: ev.title || ev.value?.title,
          filename: ev.filename || ev.value?.filename,
          path: ev.path || ev.value?.path,
          name: ev.value?.name,
        }),
      },
    });
  }

  if (t === 'approval.requested' || type === 'APPROVAL.REQUESTED' || type === 'REQUIRE_USER_CONFIRM') {
    const callId = ev.call_id || ev.tool_call_id || 'approval';
    return upsertBlock(view, {
      block_id: `approval:${callId}`,
      workrun_id: workrunId,
      kind: 'approval',
      status: 'streaming',
      payload: { tool: ev.tool, prompt: ev.prompt, tools: ev.tools },
    });
  }

  if (t === 'team.member.started' || type === 'TEAM.MEMBER.STARTED' || (type === 'CUSTOM' && ev.name === 'team_updated')) {
    const member = ev.member || ev.source || 'member';
    return upsertBlock(view, {
      block_id: `team:${member}`,
      workrun_id: workrunId,
      kind: 'team',
      status: 'streaming',
      payload: { member, label: `${member} joined` },
    });
  }

  if (type === 'CUSTOM' && ev.name === 'state_updated' && isCompanyOperatingPlan(ev)) {
    return upsertBlock(view, {
      block_id: `plan:${workrunId}`,
      workrun_id: workrunId,
      kind: 'plan',
      status: 'complete',
      payload: { label: 'Operating plan', execution_mode: 'operating_plan', tasks: ev.value?.tasks_context?.tasks || [] },
    });
  }

  if (type === 'TEXT_BLOCK_DELTA' || type === 'TEXT_BLOCK_END' || type === 'TEXT.DELTA') {
    const replyId = ev.reply_id || ev.turn_id || ev.message_id || 'current';
    const id = `text:${workrunId}:${replyId}`;
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

  if (type === 'THINKING.DELTA') {
    const id = `thinking:${workrunId}:${ev.turn_id || ev.reply_id || 'current'}`;
    const old = view.blocks[id];
    return upsertBlock(view, { block_id: id, workrun_id: workrunId, kind: 'activity', status: 'streaming', payload: { label: 'Thinking', text: `${old?.payload?.text || ''}${plainValue(textOf(ev))}` } });
  }

  if (t === 'agent.status') {
    return { ...view, status: ev.status || view.status };
  }
  if (t === 'workrun.failed' || t === 'workrun.cancelled' || t === 'turn.failed' || t === 'turn.cancelled' || type === 'WORKRUN.FAILED' || type === 'TURN.FAILED' || type === 'TURN.CANCELLED' || (type === 'REPLY_END' && (ev.finished_reason || ev.reason) && ev.finished_reason !== 'completed' && ev.reason !== 'completed')) {
    const fail = productFailure(ev);
    const blocks = Object.fromEntries(Object.entries(view.blocks).map(([id, block]) => (
      (block.kind === 'tool' || block.kind === 'search') && block.status === 'streaming'
        ? [id, { ...block, status: 'failed' }]
        : [id, block]
    )));
    return project({ ...view, blocks, status: 'failed', failure: fail });
  }
  if (t === 'workrun.completed' || t === 'turn.completed' || type === 'WORKRUN.COMPLETED' || type === 'TURN.COMPLETED') return { ...view, status: 'completed' };

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

function cloneMsgs(msgs) {
  return msgs.map((m) => ({ ...m, tools: [...(m.tools || [])], timeline: (m.timeline || []).map((item) => ({ ...item })) }));
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
    if (last && last.role === 'assistant' && last.streaming) {
      last.streaming = true;
      return last;
    }
    const created = { role: 'assistant', text: '', thinking: '', tools: [], timeline: [], streaming: true };
    next.push(created);
    return created;
  };

  const usage = usageFromEvent(ev);
  if (usage) {
    const current = ensureAssistant();
    current.usage = mergeTurnUsage(current.usage, usage);
  }

  if (type === 'REPLY_START' || type === 'TURN.STARTED') {
    const replyId = ev.reply_id || ev.turn_id || ev.id;
    const existing = replyId ? next.find((m) => m.reply_id === replyId) : null;
    if (existing) {
      existing.streaming = true;
      return next;
    }
    const last = next[next.length - 1];
    const cur = last?.role === 'assistant' && last.streaming && !last.text && !last.thinking && !(last.tools || []).length
      ? last
      : ensureAssistant();
    cur.reply_id = replyId || cur.reply_id;
    return next;
  }

  if (
    type === 'TEXT_BLOCK_DELTA' || type === 'TEXT.DELTA' || type === 'THINKING_BLOCK_DELTA' || type === 'THINKING.DELTA' || type === 'THINKING_BLOCK_END'
    || type === 'TOOL_CALL_START' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END' || type === 'TOOL_CALL_DELTA' || type === 'TOOL_RESULT_TEXT_DELTA'
    || type === 'TEXT_BLOCK_END' || type === 'TOOL.STARTED' || type === 'TOOL.COMPLETED' || type === 'TOOL.OUTPUT.DELTA' || type === 'TOOL.INPUT.DELTA'
  ) {
    const cur = ensureAssistant();
    if (type === 'TEXT_BLOCK_DELTA' || type === 'TEXT.DELTA') cur.text = mergeDelta(cur.text, textOf(ev));
    if (type === 'TEXT_BLOCK_END' && textOf(ev)) cur.text = mergeDelta(cur.text, textOf(ev));
    if (type === 'THINKING_BLOCK_DELTA' || type === 'THINKING.DELTA') {
      cur.thinking = mergeDelta(cur.thinking, textOf(ev));
      const id = `thinking:${ev.turn_id || ev.reply_id || cur.reply_id || 'current'}`;
      const existing = cur.timeline.find((item) => item.id === id);
      const thinkingItem = { id, kind: 'thinking', text: mergeDelta(existing?.text, textOf(ev)), status: 'running' };
      if (existing) Object.assign(existing, thinkingItem);
      else cur.timeline.push(thinkingItem);
    }
    if (type === 'THINKING_BLOCK_END' && textOf(ev)) cur.thinking = mergeDelta(cur.thinking, textOf(ev));
    if (type === 'TOOL_CALL_START' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END' || type === 'TOOL.STARTED' || type === 'TOOL.COMPLETED' || type === 'TOOL.OUTPUT.DELTA' || type === 'TOOL.INPUT.DELTA') {
      const name = ev.tool_call_name || ev.name || ev.tool_name || 'tool';
      const id = ev.tool_call_id || ev.id;
      const existing = cur.tools.find((t) => (id && t.id === id) || (!id && t.name === name && t.state === 'running'));
      const resultEvents = ['TOOL_RESULT_END', 'TOOL.COMPLETED'];
      const resultDeltaEvents = ['TOOL.OUTPUT.DELTA', 'TOOL_RESULT_TEXT_DELTA'];
      const isToolEvent = ['TOOL_CALL_START', 'TOOL_CALL_END', 'TOOL_RESULT_END', 'TOOL.STARTED', 'TOOL.COMPLETED', 'TOOL.OUTPUT.DELTA', 'TOOL_RESULT_TEXT_DELTA', 'TOOL_CALL_DELTA', 'TOOL.INPUT.DELTA'].includes(type);
      const result = [...resultEvents, ...resultDeltaEvents].includes(type) ? plainValue(ev.output ?? ev.result ?? textOf(ev) ?? ev.result_summary).slice(0, 12000) : undefined;
      const input = callInput(ev);
      if (existing) {
        existing.state = resultEvents.includes(type) ? 'done' : 'running';
        if (result) existing.result = resultDeltaEvents.includes(type) ? `${existing.result || ''}${result}` : result;
        if (input && Object.keys(input).length) existing.input = input;
        if (type === 'TOOL.INPUT.DELTA') existing.input = `${existing.input || ''}${plainValue(textOf(ev))}`;
      } else {
        cur.tools.push({ name, id, input, state: resultEvents.includes(type) ? 'done' : 'running', result });
      }
      cur.streaming = true;
      if (isToolEvent) {
        const timelineId = `tool:${id || `${name}-${cur.timeline.filter((item) => item.kind === 'tool' && item.name === name).length}`}`;
        const timelineItem = cur.timeline.find((item) => item.id === timelineId);
        const nextItem = {
          id: timelineId,
          kind: 'tool',
          name,
          label: name,
          input: type === 'TOOL.INPUT.DELTA'
            ? `${timelineItem?.input || ''}${plainValue(textOf(ev))}`
            : input && Object.keys(input || {}).length ? input : timelineItem?.input,
          result: result
            ? resultDeltaEvents.includes(type) ? `${timelineItem?.result || ''}${result}` : result
            : timelineItem?.result,
          status: resultEvents.includes(type) ? 'done' : 'running',
        };
        if (timelineItem) Object.assign(timelineItem, nextItem);
        else cur.timeline.push(nextItem);
      }
    }
  }

  const terminalStatus = String(ev?.status || '').toLowerCase();
  const eventName = String(ev?.t || '').toLowerCase();
  if (type === 'REPLY_END' || type === 'TURN.COMPLETED' || type === 'TURN.FAILED' || type === 'TURN.CANCELLED' || type === 'WORKRUN.FAILED' || type === 'WORKRUN_FAILED'
    || ['workrun.completed', 'workrun.failed', 'workrun.cancelled'].includes(eventName)
    || (eventName === 'workrun.state' && ['completed', 'failed', 'cancelled'].includes(terminalStatus))
    || (eventName === 'agent.status' && ['idle', 'completed', 'failed', 'cancelled'].includes(terminalStatus))) {
    const cur = next[next.length - 1];
    const failed = ['TURN.FAILED', 'TURN.CANCELLED', 'WORKRUN.FAILED', 'WORKRUN_FAILED'].includes(type)
      || (ev.finished_reason && ev.finished_reason !== 'completed')
      || (ev.reason && ev.reason !== 'completed');
    if (cur && cur.role === 'assistant') {
      cur.streaming = failed ? false : type === 'REPLY_END' ? toolsRunning(cur) : false;
      if (!cur.streaming) cur.stage = 'complete';
      cur.timeline = (cur.timeline || []).map((item) => (
        item.kind === 'thinking' || (failed && item.kind === 'tool')
          ? { ...item, status: failed ? 'failed' : 'complete' }
          : item
      ));
    }
  }
  return next;
}

export function startUserTurn(msgs, text) {
  return [
    ...msgs,
    { role: 'user', text, tools: [], thinking: '' },
    { role: 'assistant', text: '', thinking: '', tools: [], timeline: [], streaming: true, stage: 'acknowledging' },
  ];
}
