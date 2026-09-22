import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export const ApiExplorer: React.FC = () => {
  const endpoints = [
    { method: 'GET', path: '/api/v1/health', description: 'Liveness probe and system health' },
    { method: 'GET', path: '/api/v1/products', description: 'List catalog products with calculated scores' },
    { method: 'GET', path: '/api/v1/ingredients?page_size=5', description: 'List ingredients dictionary (paginated)' },
    { method: 'GET', path: '/api/v1/ingredients/search?q=acid', description: 'Fuzzy search ingredients by keyword' },
    { method: 'POST', path: '/api/v1/scan/label', body: JSON.stringify({ text: 'Water, Glycerin, Sodium Laureth Sulfate, Fragrance' }, null, 2), description: 'Tokenize and score label text' },
    { method: 'GET', path: '/api/v1/me/sensitivities', description: 'User sensitivities (with simulated auth header)' },
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0]);
  const [requestBody, setRequestBody] = useState(endpoints[0].body || '');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (ep: typeof endpoints[0]) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.body || '');
    setResponseStatus(null);
    setResponseData(null);
  };

  const handleRun = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseData(null);
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user-123',
        },
      };

      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(selectedEndpoint.path, options);
      setResponseStatus(res.status);
      const json = await res.json();
      setResponseData(json);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-600" />
          Interactive REST API Console
        </h2>
        <p className="text-xs text-slate-500">
          Directly execute the migrated ChemCheck endpoints in real time. All routes follow the standard JSON envelope specification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Endpoint List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2 px-2">
            Available Endpoints
          </h3>
          <div className="space-y-1">
            {endpoints.map((ep, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(ep)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1 ${
                  selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
                    ? 'bg-emerald-50 border border-emerald-200 text-slate-900 shadow-xs'
                    : 'hover:bg-slate-50 border border-transparent text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono font-semibold truncate text-slate-800">{ep.path}</span>
                </div>
                <span className="text-[11px] text-slate-400 line-clamp-1">{ep.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Request & Response Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-bold text-xs px-2 py-1 rounded ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {selectedEndpoint.path}
                </span>
              </div>

              <button
                onClick={handleRun}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                Send Request
              </button>
            </div>

            {selectedEndpoint.method === 'POST' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Request Body (JSON)</label>
                <textarea
                  rows={4}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            )}
          </div>

          {/* Response Box */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Response</span>
                {responseStatus !== null && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Content-Type: application/json</span>
            </div>

            <pre className="font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-96 scrollbar-thin p-1">
              {responseData ? (
                JSON.stringify(responseData, null, 2)
              ) : (
                <span className="text-slate-500 italic">
                  Click "Send Request" to invoke this endpoint and view output.
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
