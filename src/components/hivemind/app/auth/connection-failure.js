export function classifyConnectionFailure(error) {
  if (error?.message === 'bootstrap_timeout' || ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) return { kind: 'timeout' };
  if (error?.response?.status) return { kind: 'service', status: error.response.status };
  // Browsers do not expose DNS vs connection/CORS failures to page JavaScript.
  return { kind: 'network' };
}

export function connectionFailureCopy(failure, online = true) {
  if (online === false) return { title: 'No internet connection', description: 'Reconnect to the internet, then try again. Your saved conversations are unchanged.' };
  if (failure?.kind === 'timeout') return { title: 'Connection timed out', description: 'SINGULANCE took too long to respond. Please try again. Your saved conversations are unchanged.' };
  if (failure?.kind === 'service') return { title: 'SINGULANCE is temporarily unavailable', description: 'Please try again in a moment. Your saved conversations are unchanged.' };
  return { title: 'Can’t reach SINGULANCE', description: 'Check your connection and try again. Other websites may still work. Your saved conversations are unchanged.' };
}
