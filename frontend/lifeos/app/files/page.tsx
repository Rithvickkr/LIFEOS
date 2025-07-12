'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

interface FileItem {
    name: string;
    format: string;
    size: number;
    modified: number;
    full_path: string;
}

interface QueryAnswer {
    answer: string;
    content_preview: string;
}

export default function Files() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [answer, setAnswer] = useState<QueryAnswer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [query, setQuery] = useState('');
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/files`);
            setFiles(res.data.files || []);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching files');
            setLoading(false);
        }
    };

    const handleQuery = async () => {
        if (!selectedFile || !query) return;
        setQueryLoading(true);
        setQueryError(null);
        setAnswer(null);

        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/query-file`, {
                file_path: selectedFile.full_path,
                query,
            });
            setAnswer(res.data);
        } catch (err) {
            setQueryError(err instanceof Error ? err.message : 'Error querying file');
        } finally {
            setQueryLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (format: string) => {
        const icons: { [key: string]: string } = {
            'pdf': '📄',
            'txt': '📝',
            'doc': '📄',
            'docx': '📄',
            'xls': '📊',
            'xlsx': '📊',
            'ppt': '📊',
            'pptx': '📊',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'mp4': '🎬',
            'mp3': '🎵',
            'zip': '📦',
            'rar': '📦',
        };
        return icons[format.toLowerCase()] || '📎';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                    <p className="text-purple-300 text-lg">Loading files...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
                    <p className="text-red-400 text-center">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                        File Intelligence Hub
                    </h1>
                    <p className="text-slate-400">Monitor, explore, and query your files with AI</p>
                </div>

                {/* Files Grid */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-8 shadow-2xl">
                    <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                        <span className="mr-2">📁</span>
                        Monitored Files ({files.length})
                    </h2>
                    
                    {files.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📂</div>
                            <p className="text-slate-400 text-lg">No files found</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50 hover:bg-slate-700/70 transition-all duration-200 hover:border-purple-500/50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="text-2xl">{getFileIcon(file.format)}</div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-medium truncate">{file.name}</h3>
                                                <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
                                                    <span className="bg-slate-600/50 px-2 py-1 rounded">{file.format.toUpperCase()}</span>
                                                    <span>{formatFileSize(file.size)}</span>
                                                    <span>{format(new Date(file.modified * 1000), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFile(file)}
                                            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                                        >
                                            🔍 Query
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Query Section */}
                {selectedFile && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-2xl">
                        <div className="flex items-center mb-6">
                            <div className="text-2xl mr-3">{getFileIcon(selectedFile.format)}</div>
                            <div>
                                <h2 className="text-2xl font-semibold text-white">AI Query</h2>
                                <p className="text-slate-400">Ask questions about: <span className="text-purple-400">{selectedFile.name}</span></p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask a question about the file content..."
                                    className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                                />
                            </div>
                            
                            <button
                                onClick={handleQuery}
                                disabled={queryLoading || !query.trim()}
                                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-slate-600 disabled:to-slate-500 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg flex items-center space-x-2"
                            >
                                {queryLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>Submit Query</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {queryError && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                                <p className="text-red-400">❌ {queryError}</p>
                            </div>
                        )}

                        {answer && (
                            <div className="mt-6 space-y-4">
                                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                                    <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
                                        <span className="mr-2">💡</span>
                                        Answer
                                    </h3>
                                    <p className="text-white leading-relaxed">{answer.answer}</p>
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                                        <span className="mr-2">👀</span>
                                        Content Preview
                                    </h3>
                                    <p className="text-slate-300 text-sm leading-relaxed font-mono bg-slate-800/50 p-3 rounded border border-slate-600/30">
                                        {answer.content_preview}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}