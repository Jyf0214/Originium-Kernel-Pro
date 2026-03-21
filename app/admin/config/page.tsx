'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Save, Github, Settings } from 'lucide-react';

export default function ConfigPage() {
  const { userRole } = useAuth();
  const [config, setConfig] = useState({
    siteTitle: 'Originium Kernel',
    siteDescription: 'Modern Content Platform',
    githubRepo: '',
    githubToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 只有 sudo 用户可以查看配置
    if (userRole !== 'sudo' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      setLoading(true);
      try {
        // TODO: 从 GitHub config.yaml 获取配置
        console.log('Fetching config from GitHub/Redis');
      } catch (error) {
        console.error('Fetch config failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: 实现同步至 GitHub config.yaml 的逻辑
      console.log('Saving config to GitHub:', config);
      alert('Configuration saved successfully! (Simulated)');
    } catch (error) {
      console.error('Save config failed:', error);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading config...</div>;

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Only Sudo/Admin can access this page.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center">
          <Settings size={20} />
        </div>
        <h1 className="text-3xl font-display font-bold text-zinc-900">Site Configuration</h1>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            General Settings
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Site Title</label>
            <input 
              type="text" 
              value={config.siteTitle}
              onChange={e => setConfig({...config, siteTitle: e.target.value})}
              className="lobe-input w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Site Description</label>
            <textarea 
              value={config.siteDescription}
              onChange={e => setConfig({...config, siteDescription: e.target.value})}
              className="lobe-input w-full min-h-[100px] resize-y border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Github size={20} className="text-zinc-700" />
            GitHub Integration
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Configure GitHub to automatically sync published articles to your repository.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Repository (owner/repo)</label>
            <input 
              type="text" 
              placeholder="e.g., username/my-blog"
              value={config.githubRepo}
              onChange={e => setConfig({...config, githubRepo: e.target.value})}
              className="lobe-input w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Personal Access Token</label>
            <input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxx"
              value={config.githubToken}
              onChange={e => setConfig({...config, githubToken: e.target.value})}
              className="lobe-input w-full border border-zinc-200 rounded-xl h-10 px-4 focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
            <p className="text-xs text-zinc-400 mt-2">
              Needs `repo` scope to create/update files.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2 px-8 py-3 rounded-xl transition-all"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
