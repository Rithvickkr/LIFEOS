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
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/timeline`)  // Reuse timeline endpoint for overview
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
    <div className="min-h-screen bg-[#1A1D29] text-[#FFE36E] p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">LIFEOS Dashboard</h1>
      
      {/* Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#2A2E3F] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl mb-2">Today's Focus Score</h2>
          <p className="text-5xl text-[#55C0FF]">{overview.focus_score}%</p>
        </div>
        <div className="bg-[#2A2E3F] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl mb-2">Next Hour Prediction</h2>
          <p className="text-5xl text-[#55C0FF]">{overview.prediction} Activities</p>
        </div>
        <div className="bg-[#2A2E3F] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl mb-2">Recent Activities</h2>
          <ul className="list-disc pl-4">
            {overview.recent_activities.map((act, i) => (
              <li key={i}>Hour {act.hour}: {act.apps.join(', ')}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Feature Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/timeline" className="bg-[#55C0FF] text-[#1A1D29] p-6 rounded-lg shadow-lg hover:bg-[#4AB0EF] transition">
          <h2 className="text-2xl font-bold">Timeline & Heatmap</h2>
          <p>View your daily activity breakdown.</p>
        </Link>
        <Link href="/insights" className="bg-[#55C0FF] text-[#1A1D29] p-6 rounded-lg shadow-lg hover:bg-[#4AB0EF] transition">
          <h2 className="text-2xl font-bold">Learning Insights</h2>
          <p>Get personalized feedback on what you learned.</p>
        </Link>
        <Link href="/quiz" className="bg-[#55C0FF] text-[#1A1D29] p-6 rounded-lg shadow-lg hover:bg-[#4AB0EF] transition">
          <h2 className="text-2xl font-bold">Quizzes & Summaries</h2>
          <p>Test your knowledge with auto-generated quizzes.</p>
        </Link>
        <Link href="/mindmap" className="bg-[#55C0FF] text-[#1A1D29] p-6 rounded-lg shadow-lg hover:bg-[#4AB0EF] transition">
          <h2 className="text-2xl font-bold">Visual Mind Map</h2>
          <p>See how your knowledge connects.</p>
        </Link>
      </div>
    </div>
  );
}