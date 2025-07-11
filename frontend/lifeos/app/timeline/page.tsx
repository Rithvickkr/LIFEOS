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
  }, []);

  // Bar chart for activities per hour
  const barData = {
    labels: Object.keys(data.timeline),
    datasets: [{
      label: 'Activities',
      data: Object.values(data.timeline).map((hour: any) => hour.apps.length),
      backgroundColor: '#55C0FF'  
    }]
  };

  // Heatmap (scatter) for focus
  const heatData = {
    datasets: [{
      label: 'Focus Scores',
      data: Object.entries(data.timeline).map(([hour, info]) => ({ x: hour, y: (info as any).focus })),
      backgroundColor: '#FFE36E'
    }]
  };

  return (
    <div className="p-4 bg-[#1A1D29] text-[#FFE36E]">
      <h1 className="text-2xl mb-4">Daily Timeline</h1>
      <Bar data={barData} options={{ responsive: true }} />
      <Scatter data={heatData} options={{ responsive: true, scales: { y: { max: 100 } } }} />
      <p>Overall Focus: {data.focus_score}%</p>
      <p>Predicted Next Hour Activity: {data.prediction}</p>
    </div>
  );
}