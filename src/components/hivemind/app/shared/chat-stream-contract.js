// HIVE V2 marks validated answer chunks with `validated`; the unified
// LangGraph harness marks the same user-visible contract with `grounded`.
// Accept either explicit trust signal, but never render an unvalidated chunk.
export function isRenderableAnswerDelta(event) {
  return event?.type === 'answer_delta'
    && typeof event.delta === 'string'
    && event.delta.length > 0
    && (event.validated === true || event.grounded === true);
}
