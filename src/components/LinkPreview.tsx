import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LinkPreview({ url, key }: { url: string, key?: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch link preview:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-24 mt-2 bg-slate-800/50 rounded-xl relative overflow-hidden animate-pulse">
      </div>
    );
  }

  if (!data || (!data.title && !data.image)) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block mt-2 max-w-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors bg-slate-800/20 group"
    >
      {data.image && (
        <div className="w-full h-32 overflow-hidden bg-slate-900 flex items-center justify-center relative">
          <img src={data.image.url} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
        </div>
      )}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-slate-200 line-clamp-1 mb-1">{data.title || data.publisher}</h4>
        {data.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-2">{data.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
          {data.logo?.url && <img src={data.logo.url} alt="Logo" className="w-4 h-4 rounded-sm" />}
          <span className="truncate">{data.publisher || url}</span>
          <ExternalLink size={12} className="ml-auto" />
        </div>
      </div>
    </a>
  );
}
