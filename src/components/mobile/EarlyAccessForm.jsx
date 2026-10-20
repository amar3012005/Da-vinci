import React from 'react';

export default function EarlyAccessForm() {
  const [state, setState] = React.useState('idle');
  const [error, setError] = React.useState('');
  async function submit(event) {
    event.preventDefault();
    if (state === 'sending') return;
    const data = new FormData(event.currentTarget);
    setState('sending'); setError('');
    try {
      const response = await fetch('https://api.singulancelabs.com/auth/access-applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(data.get('email')).trim().toLowerCase(),
          // The existing application API requires a name. Keep it optional for visitors.
          name: String(data.get('name')).trim() || 'Name not provided',
          account_type: 'enterprise', use_case: data.get('interest') || null,
          source: 'singulancelabs.com/early-access' }),
      });
      if (!response.ok) throw new Error('Request failed');
      setState('done');
    } catch (_) { setState('idle'); setError('Your request could not be sent. Please try again.'); }
  }
  if (state === 'done') return <div className="sl-success" role="status"><span>✓ Request received</span><h3>Thank you for helping shape what comes next.</h3><p>Requests are reviewed. Selected applicants hear back by email.</p></div>;
  return <form className="sl-form" onSubmit={submit} aria-busy={state === 'sending'}>
    <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} /></label>
    <label>Name <span>(optional)</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={160} /></label>
    <label>What would you like help with? <span>(optional)</span><select name="interest" defaultValue=""><option value="">Choose an area</option><option>Company knowledge</option><option>Meeting follow-through</option><option>Specialist execution</option><option>Research/development</option></select></label>
    <p className="sl-fine">Requests are reviewed. Selected applicants hear back by email. This requests product access and does not subscribe you to marketing updates. See our <a href="/privacy">privacy policy</a>.</p>
    {error && <p role="alert">{error}</p>}
    <button className="sl-button sl-blue" disabled={state === 'sending'} type="submit">{state === 'sending' ? 'Sending request…' : 'Request early access'} <span aria-hidden="true">↗</span></button>
  </form>;
}
