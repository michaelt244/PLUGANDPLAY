'use client';

import { useState } from 'react';

type Step = 'form' | 'success';

export default function CheckInForm({ slug }: { slug: string }) {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
  });

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qr-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Check-in failed');
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">You&apos;re checked in!</h2>
        <p className="text-gray-400 text-sm mt-2">Thanks for visiting. See you next time!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} required />
        <input className={inputClass} name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} required />
      </div>
      <input className={inputClass} name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input className={inputClass} name="phone" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={handleChange} />
      <input className={inputClass} name="birthday" type="date" placeholder="Birthday (optional)" value={form.birthday} onChange={handleChange} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Checking in…' : 'Check In'}
      </button>
    </form>
  );
}
