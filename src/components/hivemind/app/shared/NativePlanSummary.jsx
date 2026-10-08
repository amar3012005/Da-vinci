import React from 'react';
import CreditBalance from './CreditBalance';

export default function NativePlanSummary({ billing, org }) {
  return <section data-native-plan-summary className="mx-auto w-full max-w-xl space-y-4 p-4">
    <h1 className="text-2xl font-semibold">Your workspace access</h1>
    <p className="text-sm leading-6 text-[#525252]">Use the features already included with your account. Purchases and plan changes are not available in this app.</p>
    <div className="rounded-2xl border border-[#e3e0db] bg-white p-4">
      <h2 className="text-base font-semibold">{org?.name || 'Your workspace'}</h2>
      <p className="mt-1 text-sm text-[#525252]">{billing?.plan?.name || org?.plan || 'Current account access'}</p>
    </div>
    <CreditBalance credits={billing?.usage_summary?.credits} />
  </section>;
}
