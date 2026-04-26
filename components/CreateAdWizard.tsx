'use client';

import { useState, useRef } from 'react';

type Step = 1 | 2 | 3 | 4 | 5;

type AdVariant = {
  label: 'A' | 'B' | 'C';
  copy: string;
  platform: 'instagram' | 'facebook' | 'google_business';
};

type GroupTarget = {
  group: string;
  platform: 'facebook' | 'reddit' | 'nextdoor';
  reason: string;
};

type Platform = 'facebook' | 'instagram' | 'google_business';

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_business: 'Google Business',
};

const GROUP_PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  reddit: 'Reddit',
  nextdoor: 'Nextdoor',
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8" />
    </div>
  );
}

export default function CreateAdWizard({
  defaultBusinessName = '',
  defaultLocation = '',
}: {
  defaultBusinessName?: string;
  defaultLocation?: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [location, setLocation] = useState(defaultLocation);
  const [adGoal, setAdGoal] = useState('');
  const [tone, setTone] = useState<'energetic' | 'professional' | 'warm'>('energetic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSource, setImageSource] = useState<'upload' | 'generate'>('upload');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [campaignId, setCampaignId] = useState('');
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  const [platforms, setPlatforms] = useState<Platform[]>(['instagram']);
  const [dispatchResults, setDispatchResults] = useState<Record<string, string>>({});

  const [groups, setGroups] = useState<GroupTarget[]>([]);
  const [approvedGroups, setApprovedGroups] = useState<GroupTarget[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, string>>({});

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleGenerateImage() {
    if (!businessName || !adGoal) {
      setError('Fill in business name and ad goal before generating an image.');
      return;
    }
    setError('');
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, adGoal, tone }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed');
      const { imageUrl } = await res.json();
      setGeneratedImageUrl(imageUrl);
      setPhotoPreview(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  }

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function toggleGroup(g: GroupTarget) {
    setApprovedGroups(prev =>
      prev.some(x => x.group === g.group)
        ? prev.filter(x => x.group !== g.group)
        : [...prev, g]
    );
  }

  function reset() {
    setStep(1); setLoading(false); setError('');
    setPhoto(null); setPhotoPreview(null);
    setBusinessName(defaultBusinessName); setLocation(defaultLocation); setAdGoal(''); setTone('energetic');
    setCampaignId(''); setVariants([]); setSelectedVariant(null);
    setPlatforms(['instagram']); setDispatchResults({});
    setGroups([]); setApprovedGroups([]); setGroupResults({});
    setImageSource('upload');
    setGeneratedImageUrl(null);
    setGeneratingImage(false);
  }

  async function handleGenerate() {
    const hasImage = imageSource === 'upload' ? !!photo : !!generatedImageUrl;
    if (!hasImage || !businessName || !adGoal) {
      setError(
        imageSource === 'upload'
          ? 'Please fill in all fields and upload a photo.'
          : 'Please fill in all fields and generate an image.'
      );
      return;
    }
    setError(''); setLoading(true);
    try {
      const formData = new FormData();
      if (imageSource === 'upload' && photo) {
        formData.append('photo', photo);
      } else if (generatedImageUrl) {
        formData.append('generated_image_url', generatedImageUrl);
      }
      formData.append('business_name', businessName);
      formData.append('ad_goal', adGoal);
      formData.append('tone', tone);
      if (location) formData.append('location', location);
      const res = await fetch('/api/generate-ad', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Generation failed');
      const { campaign_id, variants: v } = await res.json();
      setCampaignId(campaign_id); setVariants(v); setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  async function handleDispatch() {
    if (platforms.length === 0) { setError('Select at least one platform.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, selected_variant: selectedVariant, platforms }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Dispatch failed');
      const { results } = await res.json();
      setDispatchResults(results); setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  async function handleDiscoverGroups() {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/discover-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Discovery failed');
      const { groups: g } = await res.json();
      setGroups(g); setApprovedGroups(g); setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  async function handlePostToGroups() {
    if (approvedGroups.length === 0) { setError('Select at least one group.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/post-to-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, approved_groups: approvedGroups }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Posting failed');
      const { results } = await res.json();
      setGroupResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  const stepLabels = ['Upload', 'Variants', 'Platforms', 'Results', 'Groups'];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-6">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div className={`h-1.5 rounded-full mb-1 ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-100'}`} />
            <span className={`text-[10px] font-semibold ${i + 1 === step ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create Your Ad</h2>
            <p className="text-sm text-gray-400">Upload a photo and tell us about your business.</p>
            {/* Image source toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                type="button"
                onClick={() => { setImageSource('upload'); setGeneratedImageUrl(null); setPhotoPreview(null); setPhoto(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${imageSource === 'upload' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => { setImageSource('generate'); setPhoto(null); setPhotoPreview(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${imageSource === 'generate' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Generate with AI
              </button>
            </div>

            {imageSource === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${photo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-400">Click to upload photo</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
            ) : (
              <div className="space-y-3">
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Generated" className="w-full max-h-48 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setGeneratedImageUrl(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 bg-white text-gray-600 rounded-full w-6 h-6 text-xs font-bold shadow hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !businessName || !adGoal}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generatingImage ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-5 h-5" />
                        <span className="text-sm text-gray-400">Generating with Imagen 3…</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        <p className="text-sm text-gray-400">Click to generate an image with AI</p>
                        <p className="text-xs text-gray-300 mt-1">Fill in business name and goal first</p>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Business Name</label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Wild & The Barre" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Location <span className="text-gray-400 font-normal">(city, neighborhood)</span></label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Redwood City, CA" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Ad Goal</label>
              <input type="text" value={adGoal} onChange={e => setAdGoal(e.target.value)} placeholder="Summer class promo — first class free" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value as typeof tone)} className={inputClass}>
                <option value="energetic">Energetic</option>
                <option value="professional">Professional</option>
                <option value="warm">Warm</option>
              </select>
            </div>
            {loading ? <Spinner /> : (
              <button onClick={handleGenerate} className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors">
                Generate Ads with AI
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Pick Your Ad</h2>
            <p className="text-sm text-gray-400">Gemini wrote 3 variants — choose the one you want to post.</p>
            {variants.map((v, i) => (
              <div
                key={v.label}
                onClick={() => setSelectedVariant(i)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${selectedVariant === i ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">Variant {v.label}</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{v.platform.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{v.copy}</p>
              </div>
            ))}
            <button
              onClick={() => setStep(3)}
              disabled={selectedVariant === null}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Choose Platforms</h2>
            <p className="text-sm text-gray-400">Manus will post your ad to the selected platforms.</p>
            <div className="grid grid-cols-3 gap-3">
              {(['facebook', 'instagram', 'google_business'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`border-2 rounded-xl py-3 px-2 text-xs font-bold transition-colors ${platforms.includes(p) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {loading ? <Spinner /> : (
              <button
                onClick={handleDispatch}
                disabled={platforms.length === 0}
                className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                Post with Manus
              </button>
            )}
            <button onClick={() => setStep(2)} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Back
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Ad Dispatched!</h2>
            <p className="text-sm text-gray-400">Manus is autonomously posting your ad.</p>
            <div className="space-y-2">
              {Object.entries(dispatchResults).map(([platform, status]) => (
                <div key={platform} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">{PLATFORM_LABELS[platform as Platform] ?? platform}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${status === 'posted' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {status === 'posted' ? 'Posted' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-400">Campaign ID</p>
              <p className="text-xs font-mono text-gray-600 truncate">{campaignId}</p>
            </div>
            {loading ? <Spinner /> : (
              <button onClick={handleDiscoverGroups} className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors">
                Boost with Community Groups
              </button>
            )}
            <button onClick={reset} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Done — Start Over
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Community Groups</h2>
            <p className="text-sm text-gray-400">
              {Object.keys(groupResults).length > 0
                ? 'Manus is posting to your selected groups.'
                : 'Select the communities where you want to post your ad.'}
            </p>
            {Object.keys(groupResults).length > 0 ? (
              <>
                <div className="space-y-2">
                  {Object.entries(groupResults).map(([group, status]) => (
                    <div key={group} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700 truncate mr-2">{group}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${status === 'posted' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {status === 'posted' ? 'Posted' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={reset} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors">
                  Start Over
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {groups.map(g => (
                    <div
                      key={g.group}
                      onClick={() => toggleGroup(g)}
                      className={`border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${approvedGroups.some(x => x.group === g.group) ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{g.group}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-2 flex-shrink-0">{GROUP_PLATFORM_LABELS[g.platform]}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{g.reason}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">{approvedGroups.length} of {groups.length} selected</p>
                {loading ? <Spinner /> : (
                  <button
                    onClick={handlePostToGroups}
                    disabled={approvedGroups.length === 0}
                    className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                  >
                    Post to {approvedGroups.length} Group{approvedGroups.length !== 1 ? 's' : ''}
                  </button>
                )}
                <button onClick={reset} className="w-full border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Skip — Start Over
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
