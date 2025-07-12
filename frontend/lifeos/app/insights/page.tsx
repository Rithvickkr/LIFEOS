'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface InsightsData {
  [key: string]: string;
}

export default function Insights() {
  const [insights, setInsights] = useState<InsightsData>({});
  const [rawData, setRawData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/insightss`)
      .then(res => {
        setRawData(JSON.stringify(res.data, null, 2));
        
        try {
          if (res.data && typeof res.data === 'object' && res.data['1']) {
            setInsights(res.data);
          } else if (res.data.raw_response && typeof res.data.raw_response === 'string') {
            try {
              const parsedInsights = JSON.parse(res.data.raw_response);
              console.log('Parsed insights:', parsedInsights);
              setInsights(parsedInsights);
            } catch (parseError) {
              console.error('Failed to parse raw_response as JSON:', parseError);
              console.log('Raw response content:', res.data.raw_response);
              setInsights({});
            }
          } else {
            console.error('Invalid response format');
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
      <div className="p-6 bg-[#1A1D29] text-[#FFE36E] min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1A1D29] text-[#FFE36E] min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center">Learning Insights</h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Formatted Insights Display */}
        <div className="bg-[#252A3A] rounded-lg p-6 border border-[#3A4553]">
          <h2 className="text-2xl font-semibold text-[#FFE36E] mb-6">Your Learning Journey</h2>
          {Object.keys(insights).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(insights).map(([key, value]) => (
                <div key={key} className="bg-[#1A1D29] rounded-lg p-4 border border-[#3A4553]">
                  <h3 className="text-lg font-medium text-[#FFE36E] mb-2">
                    {formatInsightKey(key)}
                  </h3>
                  <p className="text-[#E5E7EB] leading-relaxed">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#E5E7EB] py-8">
              No insights available at the moment.
            </div>
          )}
        </div>
        
        {/* Debug Sections - Collapsible */}
        <details className="bg-[#252A3A] rounded-lg border border-[#3A4553]">
          <summary className="p-4 cursor-pointer text-lg font-medium text-[#FFE36E] hover:bg-[#1A1D29]">
            Debug: Parsed Data
          </summary>
          <div className="p-4 border-t border-[#3A4553]">
            <pre className="text-[#E5E7EB] whitespace-pre-wrap text-sm bg-[#1A1D29] p-4 rounded overflow-x-auto">
              {JSON.stringify(insights, null, 2)}
            </pre>
          </div>
        </details>
        
        <details className="bg-[#252A3A] rounded-lg border border-[#3A4553]">
          <summary className="p-4 cursor-pointer text-lg font-medium text-[#FFE36E] hover:bg-[#1A1D29]">
            Debug: Raw Response
          </summary>
          <div className="p-4 border-t border-[#3A4553]">
            <pre className="text-[#E5E7EB] whitespace-pre-wrap text-sm bg-[#1A1D29] p-4 rounded overflow-x-auto">
              {rawData}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
