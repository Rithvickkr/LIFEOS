'use client';
import { useEffect, useState } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Title, Tooltip, Legend);

export default function Timeline() {
  const [data, setData] = useState({ timeline: {}, focus_score: 0, prediction: 0 });

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/timeline`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
      console.log('Timeline data fetched:', data.timeline);
  }, []);

  const barData = {
    labels: Object.keys(data.timeline),
    datasets: [{
      label: 'Activities',
      data: Object.values(data.timeline).map((hour: any) => hour.apps.length),
      backgroundColor: 'rgba(85, 192, 255, 0.8)',
      borderColor: '#55C0FF',
      borderWidth: 2,
      borderRadius: 6,
    }]
  };

  const heatData = {
    datasets: [{
      label: 'Focus Scores',
      data: Object.entries(data.timeline).map(([hour, info]) => ({ x: hour, y: (info as any).focus })),
      backgroundColor: 'rgba(255, 227, 110, 0.8)',
      borderColor: '#FFE36E',
      borderWidth: 2,
      pointRadius: 8,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#FFE36E',
          font: { size: 14 }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hour',
          color: '#FFE36E',
          font: { size: 14, weight: 'bold' as const }
        },
        ticks: { color: '#FFE36E' },
        grid: { color: 'rgba(255, 227, 110, 0.1)' }
      },
      y: {
        title: {
          display: true,
          text: 'Number of Activities',
          color: '#FFE36E',
          font: { size: 14, weight: 'bold' as const }
        },
        ticks: { color: '#FFE36E' },
        grid: { color: 'rgba(255, 227, 110, 0.1)' }
      }
    }
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#FFE36E',
          font: { size: 14 }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Hour',
          color: '#FFE36E',
          font: { size: 14, weight: 'bold' as const }
        },
        ticks: { color: '#FFE36E' },
        grid: { color: 'rgba(255, 227, 110, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        max: 100,
        title: {
          display: true,
          text: 'Focus Score (%)',
          color: '#FFE36E',
          font: { size: 14, weight: 'bold' as const }
        },
        ticks: { color: '#FFE36E' },
        grid: { color: 'rgba(255, 227, 110, 0.1)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1D29] to-[#2A2D3A] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#FFE36E] mb-8 text-center">Daily Timeline</h1>
        
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Activities Chart */}
          <div className="bg-[#242833] rounded-xl p-6 shadow-xl border border-[#3A3D4A]">
            <h2 className="text-xl font-semibold text-[#FFE36E] mb-4">Activities per Hour</h2>
            <div className="h-80">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          {/* Focus Chart */}
          <div className="bg-[#242833] rounded-xl p-6 shadow-xl border border-[#3A3D4A]">
            <h2 className="text-xl font-semibold text-[#FFE36E] mb-4">Focus Score Distribution</h2>
            <div className="h-80">
              <Scatter data={heatData} options={scatterOptions} />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-[#55C0FF] to-[#7B68EE] rounded-xl p-6 text-center shadow-xl">
            <h3 className="text-lg font-medium text-white mb-2">Overall Focus Score</h3>
            <p className="text-3xl font-bold text-white">{data.focus_score}%</p>
          </div>
          
          <div className="bg-gradient-to-r from-[#FFE36E] to-[#FFA726] rounded-xl p-6 text-center shadow-xl">
            <h3 className="text-lg font-medium text-[#1A1D29] mb-2">Predicted Next Activity</h3>
            <p className="text-2xl font-bold text-[#1A1D29]">{data.prediction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}