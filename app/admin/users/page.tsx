'use client';

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { ShieldAlert, Trash2, Edit2, Check, X } from 'lucide-react';

export default function UsersPage() {
  const { userRole } = useFirebase();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    if (userRole !== 'admin') return;

    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsub();
  }, [userRole]);

  const handleUpdateRole = async (id: string) => {
    if (!editRole) return;
    try {
      await updateDoc(doc(db, 'users', id), { role: editRole });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading users...</div>;

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-display font-bold text-zinc-900 mb-8">Manage Users</h1>
      
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 font-bold">
                          {u.name?.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-zinc-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-600">{u.email}</td>
                  <td className="p-4">
                    {editingId === u.id ? (
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="lobe-input py-1 text-sm w-32"
                      >
                        <option value="user">User</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                        'bg-zinc-100 text-zinc-800'
                      }`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === u.id ? (
                        <>
                          <button onClick={() => handleUpdateRole(u.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-md">
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setEditingId(u.id); setEditRole(u.role); }}
                            className="p-2 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
