import Image from "next/image";
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          LIFE<span className="text-indigo-600">OS</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-Powered Activity Tracker
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Transform your daily activities into meaningful insights with our intelligent tracking system. 
          Let AI help you understand your patterns and optimize your life.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Get Started
          </Link>
          <Link href="/features" className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-8 py-3 rounded-lg font-semibold transition-colors">
            Learn More
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">Smart analysis of your daily patterns and habits</p>
          </div>
          
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              📊
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Tracking</h3>
            <p className="text-gray-600">Monitor your activities as they happen</p>
          </div>
          
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              🎯
            </div>
            <h3 className="text-lg font-semibold mb-2">Goal Achievement</h3>
            <p className="text-gray-600">Set and reach your personal objectives</p>
          </div>
        </div>
      </div>
    </div>
  )
    
}
