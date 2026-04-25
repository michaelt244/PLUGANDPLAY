'use client';

import { useState, FormEvent } from 'react';

type Screen = 1 | 2;
type SignupData = {
  businessName: string;
  businessDescription: string;
  problems: string;
  location: string;
};

export default function SignupForm({ onComplete }: { onComplete?: (data: SignupData) => void }) {
  const [screen, setScreen] = useState<Screen>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Screen 1 — essentials (capture email early)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Screen 2 — business details
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [problems, setProblems] = useState('');
  const [location, setLocation] = useState('');

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function handleNext(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName || !lastName || !email) {
      setError('Please fill in all required fields.');
      return;
    }
    setScreen(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          preferences: {
            business_name: businessName || null,
            business_description: businessDescription || null,
            problems: problems || null,
            location: location || null,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Signup failed');
      }
      onComplete?.({
        businessName,
        businessDescription,
        problems,
        location,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`h-1.5 flex-1 rounded-full ${screen >= 1 ? 'bg-blue-600' : 'bg-gray-100'}`} />
        <div className={`h-1.5 flex-1 rounded-full ${screen >= 2 ? 'bg-blue-600' : 'bg-gray-100'}`} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {screen === 1 ? (
        <form onSubmit={handleNext} className="space-y-4">
          <p className="text-xs text-gray-400 mb-2">Step 1 — Let&apos;s start with your info</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">First Name *</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sarah" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Last Name *</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Johnson" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1.5">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@yourstudio.com" className={inputClass} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors mt-2">
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-gray-400 mb-2">Step 2 — Tell us about your business</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Wild & The Barre" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1.5">Where is your business located?</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Los Angeles, CA" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1.5">What does your business do?</label>
            <textarea rows={2} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Boutique fitness studio offering barre, yoga, and HIIT classes..." className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1.5">What problems are you looking to solve?</label>
            <textarea rows={2} value={problems} onChange={(e) => setProblems(e.target.value)} placeholder="Customer retention, re-engaging lapsed members, birthday promos..." className={inputClass} />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setScreen(1)} className="flex-1 border-2 border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
