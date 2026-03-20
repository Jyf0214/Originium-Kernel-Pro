'use client';

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { FileText, Users, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const { userRole } = useFirebase();
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const articlesSnapshot = await getDocs(collection(db, 'articles'));
        const articles = articlesSnapshot.docs.map(doc => doc.data());
        
        const published = articles.filter(a => a.status === 'published').length;
        const drafts = articles.filter(a => a.status === 'draft').length;
        
        let usersCount = 0;
        if (userRole === 'admin') {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          usersCount = usersSnapshot.size;
        }

        setStats({
          totalArticles: articles.length,
          publishedArticles: published,
          draftArticles: drafts,
          totalUsers: usersCount,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'stats');
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchStats();
    }
  }, [userRole]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading dashboard...</div>;

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-display font-bold text-zinc-900 mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Articles</p>
              <h3 className="text-2xl font-bold text-zinc-900">{stats.totalArticles}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Published</p>
              <h3 className="text-2xl font-bold text-zinc-900">{stats.publishedArticles}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Drafts</p>
              <h3 className="text-2xl font-bold text-zinc-900">{stats.draftArticles}</h3>
            </div>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">Total Users</p>
                <h3 className="text-2xl font-bold text-zinc-900">{stats.totalUsers}</h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
