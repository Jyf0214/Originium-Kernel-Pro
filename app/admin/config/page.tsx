'use client';

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { Save, Github, Settings } from 'lucide-react';

export default function ConfigPage() {
  const { userRole } = useFirebase();
  const [config, setConfig] = useState({
    siteTitle: 'Hexo PRO',
    siteDescription: 'Modern Blog Framework',
    githubRepo: '',
    githubToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') return;

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'config/main');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'main'), config);
      alert('Configuration saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/main');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading config...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl">
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
              className="lobe-input w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Site Description</label>
            <textarea 
              value={config.siteDescription}
              onChange={e => setConfig({...config, siteDescription: e.target.value})}
              className="lobe-input w-full min-h-[100px] resize-y"
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
              className="lobe-input w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Personal Access Token</label>
            <input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxx"
              value={config.githubToken}
              onChange={e => setConfig({...config, githubToken: e.target.value})}
              className="lobe-input w-full"
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
            className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2 px-8"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
