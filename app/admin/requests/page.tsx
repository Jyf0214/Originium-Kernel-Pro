'use client';

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { Check, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function RequestsPage() {
  const { userRole } = useFirebase();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== 'sudo') return;

    const q = query(collection(db, 'requests'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    return () => unsub();
  }, [userRole]);

  const handleApprove = async (request: any) => {
    try {
      // Update user role
      await updateDoc(doc(db, 'users', request.userId), { role: 'editor' });
      // Update request status
      await updateDoc(doc(db, 'requests', request.id), { status: 'approved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'requests', id), { status: 'rejected' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading requests...</div>;

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-display font-bold text-zinc-900 mb-8">Role Upgrade Requests</h1>
      
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="p-4">User</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium text-zinc-900">{req.userName}</td>
                  <td className="p-4 text-sm text-zinc-600">
                    <span className="bg-zinc-100 px-2 py-1 rounded text-xs">{req.type}</span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status === 'pending' && <Clock size={12} />}
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(req)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No pending requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
