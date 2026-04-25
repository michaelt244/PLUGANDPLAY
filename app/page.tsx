'use client';

import { useState } from 'react';
import Image from 'next/image';
import SignupForm from '@/components/SignupForm';

// ─── Images ──────────────────────────────────────────────────────────────────

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  birthday: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80',
  location: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80',
  shopping: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  retention: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=600&q=80',
  analytics: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
  marketing: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&q=80',
  growth: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
  social: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
  audience: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
  targeting: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&q=80',
  email: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&q=80',
};

// ─── Logo ────────────────────────────────────────────────────────────────────

function KinetiqLogo({ size = 32, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3" fill={color} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="16" y1="16"
          x2={16 + 12 * Math.cos((angle * Math.PI) / 180)}
          y2={16 + 12 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2" strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// ─── Email Template Component ────────────────────────────────────────────────

function EmailTemplate() {
  const [emailInput, setEmailInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);

  function handleVerify() {
    if (!emailInput) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setVerified(true);
    }, 1500);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-900">Email Campaign Preview</span>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-green-50 text-green-600 border-green-100">
          Verified Delivery
        </span>
      </div>

      {/* Email mockup */}
      <div className="p-5">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Email header */}
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">From:</span>
                <span className="text-[10px] text-gray-700 font-medium">Wild & The Barre via Kinetiq &lt;rewards@kinetiq.com&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">To:</span>
                <span className="text-[10px] text-gray-700">sarah.johnson@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">Subject:</span>
                <span className="text-[10px] text-gray-900 font-bold">Sarah, your birthday reward is waiting!</span>
              </div>
            </div>
          </div>

          {/* Email body */}
          <div className="px-6 py-5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <KinetiqLogo size={16} color="white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Wild & The Barre</span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">Happy Birthday, Sarah!</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              We&apos;re celebrating YOU this month. As a valued member, here&apos;s a special birthday gift — enjoy a <strong>free class</strong> on us plus <strong>20% off</strong> any class pack.
            </p>

            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-800 mb-1">YOUR BIRTHDAY REWARDS</p>
              <div className="flex gap-3">
                <div className="bg-white rounded-lg px-3 py-2 flex-1 text-center">
                  <p className="text-lg font-bold text-blue-600">FREE</p>
                  <p className="text-[10px] text-gray-500">Birthday Class</p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 flex-1 text-center">
                  <p className="text-lg font-bold text-blue-600">20%</p>
                  <p className="text-[10px] text-gray-500">Off Any Pack</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="inline-block bg-gray-900 text-white text-sm font-bold px-6 py-2.5 rounded-lg">
                Book Your Birthday Class
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Valid through June 30, 2026 &middot; Powered by Kinetiq
            </p>
          </div>
        </div>
      </div>

      {/* Email verification demo */}
      <div className="px-5 pb-5">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-900 mb-2">Try it — verify email delivery</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleVerify}
              disabled={!emailInput || sending || verified}
              className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending...' : verified ? 'Sent!' : 'Send Preview'}
            </button>
          </div>
          {verified && (
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs text-green-600 font-medium">
                Email verified and delivered to {emailInput}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

const SAMPLE_MESSAGES = [
  {
    label: '30 Days Before Birthday',
    message: "Hey Sarah! Your birthday month is coming up! Here's an early gift — 20% off any class pack.",
    tag: 'Birthday · $45 avg revenue',
    tagColor: 'bg-pink-50 text-pink-600 border-pink-100',
  },
  {
    label: 'Day-Of Birthday',
    message: "Happy Birthday Sarah! Your FREE birthday class is ready to book. Treat yourself today!",
    tag: 'Birthday · $45 avg revenue',
    tagColor: 'bg-pink-50 text-pink-600 border-pink-100',
  },
  {
    label: 'Local Member (< 5 mi)',
    message: "Hey Sarah! Lunchtime Barre at 12pm has 3 spots left — you're only 5 min away.",
    tag: 'ZIP Targeting · 3x relevance',
    tagColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    label: 'Merch Buyer Alert',
    message: "New drop! Limited edition grip socks just landed. As a merch lover, you get first access.",
    tag: 'Product Affinity · 25% cross-sell',
    tagColor: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    label: 'Churn Risk (10+ days inactive)',
    message: "We miss you Sarah! It's been a while. Here's a complimentary class — no strings attached.",
    tag: 'Retention Alert · 15% lift',
    tagColor: 'bg-orange-50 text-orange-600 border-orange-100',
  },
];

export default function Home() {
  const [tab, setTab] = useState<'signup' | 'marketing' | 'platform' | 'messages' | 'analytics'>('signup');
  const [signedUp, setSignedUp] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({ businessName: '', businessDescription: '', problems: '', location: '' });

  const tabs = [
    { key: 'signup' as const, label: 'Get Started' },
    { key: 'marketing' as const, label: 'Marketing' },
    { key: 'platform' as const, label: 'Platform' },
    { key: 'messages' as const, label: 'Messages' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Dark Hero ─── */}
      <div className="relative bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image src={IMAGES.hero} alt="" fill className="object-cover" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/60 to-gray-950" />
        <div className="relative max-w-5xl mx-auto px-6 pt-8 pb-16">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-2.5">
              <KinetiqLogo size={24} color="white" />
              <span className="text-white font-bold text-lg tracking-tight">Kinetiq.</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full font-medium">2026</span>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-blue-400 text-sm font-semibold mb-3 tracking-wider uppercase">Retention Platform</p>
              <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                Smarter<br />Customer<br />Retention
              </h1>
              <p className="text-gray-400 mt-5 text-base leading-relaxed max-w-sm">
                AI-powered rewards, marketing, and analytics — personalized to your business. Set it up once, we handle the rest.
              </p>
              <button
                onClick={() => { setTab('signup'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                className="mt-8 bg-blue-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            <div className="hidden md:block relative">
              <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-gray-800">
                <Image src={IMAGES.analytics} alt="Kinetiq dashboard" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '340%', label: 'Average campaign ROI' },
            { value: '$45', label: 'Revenue per birthday campaign' },
            { value: '3x', label: 'Higher engagement with targeting' },
            { value: '15%', label: 'Retention lift with churn alerts' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Tabs */}
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex mb-10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${
                tab === t.key ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Get Started ─── */}
        {tab === 'signup' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {!signedUp ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Create Your Account</h2>
                  <p className="text-gray-400 text-sm mb-5">Set up in under a minute. We&apos;ll personalize Kinetiq to your business.</p>
                  <SignupForm onComplete={(data) => { setBusinessInfo(data); setSignedUp(true); }} />
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {businessInfo.businessName ? `Kinetiq is now personalized for ${businessInfo.businessName}.` : 'Your account is ready.'}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your personalized setup</p>
                    {businessInfo.businessName && <div><p className="text-xs text-gray-400">Business</p><p className="text-sm font-semibold text-gray-900">{businessInfo.businessName}</p></div>}
                    {businessInfo.location && <div><p className="text-xs text-gray-400">Location</p><p className="text-sm font-semibold text-gray-900">{businessInfo.location}</p></div>}
                    {businessInfo.businessDescription && <div><p className="text-xs text-gray-400">Description</p><p className="text-sm text-gray-700">{businessInfo.businessDescription}</p></div>}
                    {businessInfo.problems && <div><p className="text-xs text-gray-400">Problems we&apos;ll solve</p><p className="text-sm text-gray-700">{businessInfo.problems}</p></div>}
                  </div>
                  <button onClick={() => setTab('marketing')} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors">
                    See How We Market For You
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Marketing (Audience Discovery) ─── */}
        {tab === 'marketing' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Audience Discovery</p>
              <h2 className="text-3xl font-bold text-gray-900">We Find Your Customers<br />Where They Already Are</h2>
              <p className="text-gray-400 text-sm mt-3 max-w-lg mx-auto">
                Using the description of your business, Kinetiq identifies relevant online communities, interest groups, and social signals — then markets directly to people the algorithm already favors.
              </p>
            </div>

            {/* How it works — visual flow */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '01',
                    title: 'You Describe Your Business',
                    desc: 'Tell us what you do, who you serve, and where you\'re located. That\'s all we need.',
                    image: IMAGES.team,
                  },
                  {
                    step: '02',
                    title: 'We Scrape & Analyze',
                    desc: 'Kinetiq scans public online signals — social communities, discussion groups, stories, and interest-based spaces where your ideal customers already engage.',
                    image: IMAGES.social,
                  },
                  {
                    step: '03',
                    title: 'We Target & Convert',
                    desc: 'We market to those audiences because the algorithm already favors them for matching interests. Higher relevance, lower cost, better results.',
                    image: IMAGES.targeting,
                  },
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4">
                      <Image src={s.image} alt={s.title} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                      <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                        {s.step}
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live example */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden md:flex">
              <div className="relative w-full md:w-2/5 h-56 md:h-auto flex-shrink-0">
                <Image src={IMAGES.community} alt="Community targeting" fill className="object-cover" />
              </div>
              <div className="p-6 md:p-8 flex-1">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
                  Live Example
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-3 mb-2">How It Looks in Practice</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  Say your client is a Mexican restaurant. Kinetiq identifies public online spaces where people are already talking about Mexican food — recipe communities, local foodie groups, cultural discussion boards, food review stories.
                </p>
                <div className="space-y-2">
                  {[
                    { signal: 'Reddit: r/MexicanFood, r/FoodPorn, r/LocalEats', match: '94% relevance' },
                    { signal: 'Facebook Groups: "LA Foodies", "Taco Tuesday Club"', match: '91% relevance' },
                    { signal: 'Instagram: #MexicanFoodLA, #TacosOfInstagram', match: '88% relevance' },
                    { signal: 'Yelp Discussions: "Best Mexican in Downtown"', match: '86% relevance' },
                  ].map((s) => (
                    <div key={s.signal} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-600">{s.signal}</p>
                      <span className="text-[10px] font-bold text-green-600 flex-shrink-0 ml-2">{s.match}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  We target these audiences because they already engage with matching content — the algorithm naturally amplifies our ads to them.
                </p>
              </div>
            </div>

            {/* What we scan */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="relative w-full h-40">
                  <Image src={IMAGES.audience} alt="Audience signals" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Public Signals We Analyze</h3>
                  <ul className="space-y-1.5">
                    {[
                      'Social media communities & groups',
                      'Discussion forums & threads',
                      'Stories, reels & viral content',
                      'Review platforms & local listings',
                      'Hashtag clusters & trending topics',
                      'Interest-based audience segments',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="relative w-full h-40">
                  <Image src={IMAGES.marketing} alt="Marketing results" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Why This Works Better</h3>
                  <div className="space-y-3">
                    {[
                      { metric: 'Ad Relevance Score', value: '3x higher', desc: 'vs broad targeting' },
                      { metric: 'Cost Per Acquisition', value: '47% lower', desc: 'vs cold audiences' },
                      { metric: 'Click-Through Rate', value: '2.8x higher', desc: 'vs generic campaigns' },
                      { metric: 'Conversion Rate', value: '62% higher', desc: 'vs non-interest-based' },
                    ].map((m) => (
                      <div key={m.metric} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-900">{m.metric}</p>
                          <p className="text-[10px] text-gray-400">{m.desc}</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="relative bg-gray-950 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <Image src={IMAGES.social} alt="" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-950/70" />
              <div className="relative p-10 md:p-14 text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-2">Your audience already exists.</p>
                <p className="text-gray-400 mb-6">We just help you reach them where they&apos;re already paying attention.</p>
                <button
                  onClick={() => setTab('platform')}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  See the Full Platform
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Platform ─── */}
        {tab === 'platform' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Our Platform</p>
              <h2 className="text-3xl font-bold text-gray-900">Everything You Need to<br />Retain & Grow</h2>
            </div>

            {[
              {
                title: 'Automated Rewards Engine',
                desc: 'Set milestone-based rewards that trigger automatically. No manual tracking — customers earn, you retain.',
                detail: '5 visits → free class, 10 → discount, 25 → merch, 50 → platinum tier',
                stat: '2.3x repeat visit rate',
                image: IMAGES.team,
              },
              {
                title: 'Birthday Revenue Automation',
                desc: 'Automatically sends offers 30 days before and on the day of each customer\'s birthday. Zero effort required.',
                detail: 'Avg $45 incremental revenue per customer per year',
                stat: '$45 avg revenue',
                image: IMAGES.birthday,
              },
              {
                title: 'ZIP-Code Smart Targeting',
                desc: 'Segments your customers by proximity. Local members get same-day offers, commuters get weekend promos.',
                detail: 'Local (<5 mi) vs commute (5-15 mi) — different messages, better results',
                stat: '3x higher engagement',
                image: IMAGES.location,
              },
              {
                title: 'Product Affinity Engine',
                desc: 'Identifies purchase patterns and cross-sells automatically. The right offer to the right customer at the right time.',
                detail: 'Detects buying behavior → triggers personalized offers',
                stat: '25% cross-sell rate',
                image: IMAGES.shopping,
              },
              {
                title: 'Churn Prevention Alerts',
                desc: 'Detects when customers go inactive and triggers win-back campaigns before they\'re gone for good.',
                detail: '10+ days inactive → automatic re-engagement offer',
                stat: '15% retention lift',
                image: IMAGES.retention,
              },
              {
                title: 'Real-Time Analytics',
                desc: 'Track LTV, retention cohorts, and campaign ROI in one dashboard. Know exactly what\'s working.',
                detail: 'Full visibility into every metric that matters',
                stat: 'Complete visibility',
                image: IMAGES.growth,
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                } md:flex`}
              >
                <div className="relative w-full md:w-2/5 h-48 md:h-auto flex-shrink-0">
                  <Image src={feature.image} alt={feature.title} fill className="object-cover" />
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 self-start mb-3">
                    {feature.stat}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{feature.desc}</p>
                  <div className="bg-gray-50 rounded-lg px-4 py-2.5">
                    <p className="text-xs text-gray-500">{feature.detail}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="relative bg-gray-950 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-30">
                <Image src={IMAGES.marketing} alt="" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-950/70" />
              <div className="relative p-10 md:p-14 text-center">
                <p className="text-4xl font-bold text-white mb-2">All of this. Fully automated.</p>
                <p className="text-gray-400 mb-6">Set it up once. Kinetiq handles the rest.</p>
                <button onClick={() => setTab('signup')} className="bg-blue-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors">
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Messages ─── */}
        {tab === 'messages' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center mb-8">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Smart Outreach</p>
              <h2 className="text-3xl font-bold text-gray-900">Emails & Messages<br />That Convert</h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                Kinetiq auto-generates personalized emails and SMS messages — and verifies delivery in real-time.
              </p>
            </div>

            {/* Email Template */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Email Campaigns</p>
              <EmailTemplate />
            </div>

            {/* SMS Messages */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-8 px-1">SMS Messages</p>
              {SAMPLE_MESSAGES.map((msg, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{msg.label}</span>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${msg.tagColor}`}>
                      {msg.tag}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <KinetiqLogo size={18} color="white" />
                      </div>
                      <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-700 leading-relaxed">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm font-bold text-gray-900 mb-1">All outreach is fully automated</p>
              <p className="text-xs text-gray-400">
                Personalized by name, behavior, location, and purchase history. Email delivery is verified in real-time.
              </p>
            </div>
          </div>
        )}

        {/* ─── Analytics ─── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Analytics</p>
              <h2 className="text-3xl font-bold text-gray-900">Real-Time Performance<br />Dashboard</h2>
            </div>

            <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <Image src={IMAGES.analytics} alt="Analytics dashboard" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6">
                <p className="text-xs font-bold text-gray-500 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full">
                  Live Dashboard Preview
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Avg LTV', value: '$1,240', change: '+18%' },
                { label: '90-Day Retention', value: '72%', change: '+15%' },
                { label: 'Campaign ROI', value: '340%', change: '+22%' },
                { label: 'Active Members', value: '1,847', change: '+9%' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <span className="text-xs font-bold text-emerald-500">{s.change}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Retention by Cohort</h3>
              <div className="space-y-3">
                {[
                  { cohort: 'Jan 2026', pct: 72 },
                  { cohort: 'Feb 2026', pct: 68 },
                  { cohort: 'Mar 2026', pct: 80 },
                  { cohort: 'Apr 2026', pct: 76 },
                ].map((row) => (
                  <div key={row.cohort} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 flex-shrink-0">{row.cohort}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-900 to-blue-600 rounded-full h-6 flex items-center" style={{ width: `${row.pct}%` }}>
                        <span className="text-[10px] text-white font-bold px-2">{row.pct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Campaign Performance</h3>
              <div className="space-y-4">
                {[
                  { name: 'Birthday Offers', sent: 312, opened: '68%', revenue: '$14,040', roi: '420%' },
                  { name: 'Community Targeting', sent: 1240, opened: '52%', revenue: '$22,300', roi: '510%' },
                  { name: 'Win-Back Series', sent: 156, opened: '52%', revenue: '$4,680', roi: '280%' },
                  { name: 'Merch Cross-Sell', sent: 423, opened: '38%', revenue: '$6,345', roi: '350%' },
                ].map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.sent} sent &middot; {c.opened} opened</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{c.revenue}</p>
                      <p className="text-xs font-bold text-emerald-500">{c.roi} ROI</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="bg-gray-950 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KinetiqLogo size={20} color="white" />
            <span className="text-white font-bold tracking-tight">Kinetiq.</span>
          </div>
          <p className="text-xs text-gray-500">www.kinetiq.com &middot; 2026</p>
        </div>
      </div>
    </div>
  );
}
