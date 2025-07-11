'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface MCQ {
  question: string;
  options: string[];
  answer: string;
}

interface QuizData {
  mcqs: MCQ[];
  summaries: string[];
}

export default function Quiz() {
  const [quizData, setQuizData] = useState<QuizData>({ mcqs: [], summaries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/quiz?num_mcqs=3`)  // Adjust num_mcqs or add topic param as needed
      .then(res => {
        setQuizData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center text-[#FFE36E]">Generating quiz...</p>;

  // Ensure summaries is an array
  const summaries = Array.isArray(quizData.summaries) ? quizData.summaries : (quizData.summaries ? [quizData.summaries] : []);
  // Ensure mcqs is an array
  const mcqs = Array.isArray(quizData.mcqs) ? quizData.mcqs : [];

  return (
    <div className="p-4 bg-[#1A1D29] text-[#FFE36E]">
      <h1 className="text-2xl mb-4">Quiz & Summaries</h1>
      <h2 className="text-xl mb-2">Summaries</h2>
      {summaries.length > 0 ? (
        <ul className="list-disc pl-4 mb-8">
          {summaries.map((sum, i) => <li key={i}>{sum}</li>)}
        </ul>
      ) : (
        <p className="mb-8">No summaries yet—keep logging activities!</p>
      )}
      <h2 className="text-xl mb-2">MCQs</h2>
      {mcqs.length > 0 ? (
        mcqs.map((mcq, i) => (
          <div key={i} className="mb-4 p-4 bg-[#2A2E3F] rounded-lg">
            <p className="text-lg">{mcq.question}</p>
            <ul className="list-none">
              {mcq.options.map((opt, j) => <li key={j}>{String.fromCharCode(65 + j)}: {opt}</li>)}
            </ul>
            <p className="mt-2 text-[#55C0FF]">Answer: {mcq.answer}</p>
          </div>
        ))
      ) : (
        <p>No MCQs generated—try again after more embeddings!</p>
      )}
    </div>
  );
}