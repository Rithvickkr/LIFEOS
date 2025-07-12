'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface InsightsData {
  [key: string]: string;
}

export default function Insights() {
  const [insights, setInsights] = useState<InsightsData>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/insightss`)
      .then(res => {
        try {
          if (res.data && typeof res.data === 'object' && res.data['1']) {
            setInsights(res.data);
          } else if (res.data.raw_response && typeof res.data.raw_response === 'string') {
            try {
              const parsedInsights = JSON.parse(res.data.raw_response);
              setInsights(parsedInsights);
            } catch (parseError) {
              console.error('Failed to parse raw_response as JSON:', parseError);
              setInsights({});
            }
          } else {
            setInsights({});
          }
        } catch (error) {
          console.error('Error processing response:', error);
          setInsights({});
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatInsightKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <span className="text-xl text-amber-100">Loading insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 text-center">
            Learning Insights
          </h1>
          <p className="text-slate-300 text-center mt-2">Discover your learning patterns and progress</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {Object.keys(insights).length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(insights).map(([key, value], index) => (
              <div
                key={key}
                className="group bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-amber-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-400/10 transform hover:-translate-y-1"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-amber-100 mb-3 group-hover:text-amber-50 transition-colors">
                      {formatInsightKey(key)}
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-sm group-hover:text-slate-200 transition-colors">
                      {value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-300 mb-2">No insights available</h3>
            <p className="text-slate-400">Your learning insights will appear here once data is available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
