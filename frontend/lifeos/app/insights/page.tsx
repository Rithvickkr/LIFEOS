'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Insights() {
  const [insights, setInsights] = useState({});

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/insights`)
      .then(res => setInsights(res.data.insights))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-4 bg-[#1A1D29] text-[#FFE36E]">
      <h1 className="text-2xl mb-4">Learning Insights</h1>
      {Object.entries(insights).map(([question, answer]) => (
        <div key={question} className="mb-4">
          <h2 className="text-xl">{question}</h2>
          <p>{String(answer)}</p>
        </div>
      ))}
    </div>
  );
}