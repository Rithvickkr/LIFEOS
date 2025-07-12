'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Activity {
  hour: string;
  apps: string[];
}

interface Overview {
  focus_score: number;
  recent_activities: Activity[];
  prediction: number;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview>({ focus_score: 0, recent_activities: [], prediction: 0 });

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/timeline`)
      .then(res => {
        const data = res.data;
        setOverview({
          focus_score: data.focus_score,
          recent_activities: Object.entries(data.timeline).slice(-3).map(([hour, info]) => ({ hour, apps: (info as any).apps })),
          prediction: data.prediction
        });
      })
      .catch(err => console.error('Dashboard fetch error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1A1D29] to-[#252B3A] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1D29] to-[#2A2E3F] border-b border-[#3A4056] sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-5xl font-black bg-gradient-to-r from-[#FFE36E] via-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
            LIFEOS
          </h1>
          <p className="text-[#B8BCC8] mt-2 text-lg">Your intelligent productivity companion</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Quick Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="group relative bg-gradient-to-br from-[#2A2E3F] to-[#1F2335] p-8 rounded-2xl shadow-2xl border border-[#3A4056] hover:border-[#55C0FF] transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-[#55C0FF]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#E2E8F0]">Focus Score</h2>
                <div className="w-3 h-3 bg-[#55C0FF] rounded-full animate-pulse"></div>
              </div>
              <p className="text-6xl font-black bg-gradient-to-r from-[#55C0FF] to-[#4AB0EF] bg-clip-text text-transparent">
                {overview.focus_score}%
              </p>
              <div className="mt-4 w-full bg-[#1A1D29] rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#55C0FF] to-[#4AB0EF] h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${overview.focus_score}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-[#2A2E3F] to-[#1F2335] p-8 rounded-2xl shadow-2xl border border-[#3A4056] hover:border-[#FFE36E] transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFE36E]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#E2E8F0]">Prediction</h2>
                <div className="w-3 h-3 bg-[#FFE36E] rounded-full animate-pulse"></div>
              </div>
              <p className="text-6xl font-black bg-gradient-to-r from-[#FFE36E] to-[#FFA500] bg-clip-text text-transparent">
                {overview.prediction}
              </p>
              <p className="text-[#B8BCC8] mt-2">Activities next hour</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-[#2A2E3F] to-[#1F2335] p-8 rounded-2xl shadow-2xl border border-[#3A4056] hover:border-[#10B981] transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#E2E8F0]">Recent Activity</h2>
                <div className="w-3 h-3 bg-[#10B981] rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-3">
                {overview.recent_activities.slice(0, 3).map((act, i) => (
                  <div key={i} className="bg-[#1A1D29] p-3 rounded-lg border border-[#3A4056]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#10B981] font-medium">Hour {act.hour}</span>
                      <span className="text-xs text-[#B8BCC8]">{act.apps.length} apps</span>
                    </div>
                    <p className="text-sm text-[#E2E8F0] mt-1 truncate">{act.apps.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/timeline" className="group relative bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] p-8 rounded-2xl shadow-2xl hover:shadow-[#3B82F6]/25 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Timeline & Heatmap</h2>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
              </div>
              <p className="text-blue-100">Visualize your daily activity patterns and productivity trends.</p>
            </div>
          </Link>

          <Link href="/insights" className="group relative bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-8 rounded-2xl shadow-2xl hover:shadow-[#7C3AED]/25 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Learning Insights</h2>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🧠</span>
                </div>
              </div>
              <p className="text-purple-100">Discover personalized insights about your learning journey.</p>
            </div>
          </Link>

          <Link href="/quiz" className="group relative bg-gradient-to-br from-[#F59E0B] to-[#D97706] p-8 rounded-2xl shadow-2xl hover:shadow-[#F59E0B]/25 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Quizzes & Summaries</h2>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
              </div>
              <p className="text-amber-100">Test your knowledge with AI-generated quizzes and summaries.</p>
            </div>
          </Link>

          <Link href="/mindmap" className="group relative bg-gradient-to-br from-[#10B981] to-[#059669] p-8 rounded-2xl shadow-2xl hover:shadow-[#10B981]/25 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Visual Mind Map</h2>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🗺️</span>
                </div>
              </div>
              <p className="text-emerald-100">Explore interconnected knowledge through visual mind maps.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}