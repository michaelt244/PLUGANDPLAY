'use client';

import { useEffect, useState } from 'react';

type CampaignRow = {
  business_name: string;
  ad_goal: string | null;
  tone: string | null;
  location: string | null;
  dispatch_status: Record<string, string> | null;
  created_at: string;
};

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
};

type Stats = {
  totalCampaigns: number;
  totalCustomers: number;
  dispatched: number;
  posted: number;
  recent: CampaignRow[];
  businesses: BusinessOption[];
};

function statusBadge(dispatch_status: Record<string, string> | null) {
  if (!dispatch_status) return <span className="text-[10px] font-bold text-gray-400">Draft</span>;
  const statuses = Object.values(dispatch_status);
  const anyPosted = statuses.some((s) => s === 'posted');
  const allFailed = statuses.every((s) => s === 'failed');
  if (anyPosted) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">Posted</span>;
  if (allFailed) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Failed</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100">Partial</span>;
}

function platformIcons(dispatch_status: Record<string, string> | null) {
  if (!dispatch_status) return null;
  const labels: Record<string, string> = { facebook: 'FB', instagram: 'IG', google_business: 'GBP' };
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(dispatch_status).map(([p, s]) => (
        <span
          key={p}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s === 'posted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
        >
          {labels[p] ?? p}
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');

  function fetchStats(businessId: string) {
    setLoading(true);
    const url = businessId ? `/api/stats?business_id=${businessId}` : '/api/stats';
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchStats('');
  }, []);

  function handleBusinessChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedBusinessId(id);
    fetchStats(id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin border-2 border-gray-200 border-t-blue-600 rounded-full w-8 h-8" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-gray-400 py-12">Could not load analytics.</p>;
  }

  const metricCards = [
    { label: 'Customers', value: stats.totalCustomers },
    { label: 'Campaigns Created', value: stats.totalCampaigns },
    { label: 'Campaigns Dispatched', value: stats.dispatched },
    { label: 'Successfully Posted', value: stats.posted },
  ];

  const selectedBusiness = stats.businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">/ Live Dashboard</p>
        <h2 className="text-3xl font-bold text-gray-900">Real-Time Activity</h2>
        <p className="text-gray-400 text-sm mt-1">Live data from your Kinetiq account</p>
      </div>

      {stats.businesses.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Viewing:</label>
          <select
            value={selectedBusinessId}
            onChange={handleBusinessChange}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Businesses</option>
            {stats.businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {selectedBusiness && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg whitespace-nowrap">
              /checkin/{selectedBusiness.slug}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-medium">{m.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Recent Campaigns</h3>
        </div>
        {stats.recent.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No campaigns yet — create your first ad.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recent.map((c, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.business_name}</p>
                    {c.location && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex-shrink-0">
                        {c.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1.5">{c.ad_goal ?? '—'}</p>
                  {platformIcons(c.dispatch_status)}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {statusBadge(c.dispatch_status)}
                  <span className="text-[10px] text-gray-300">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.totalCampaigns > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Campaign Funnel</h3>
          <div className="space-y-3">
            {[
              { label: 'Created', value: stats.totalCampaigns, max: stats.totalCampaigns },
              { label: 'Dispatched', value: stats.dispatched, max: stats.totalCampaigns },
              { label: 'Posted', value: stats.posted, max: stats.totalCampaigns },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{row.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-gray-900 to-blue-600 rounded-full h-6 flex items-center transition-all"
                    style={{ width: row.max > 0 ? `${Math.round((row.value / row.max) * 100)}%` : '0%' }}
                  >
                    {row.value > 0 && (
                      <span className="text-[10px] text-white font-bold px-2">{row.value}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 w-6 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
