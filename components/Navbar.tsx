'use client';

import React from 'react';
import Link from 'next/link';
import { useFirebase } from './FirebaseProvider';
import { auth } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { LogIn, LogOut, Settings, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { user, userRole } = useFirebase();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl leading-none">H</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight">Hexo PRO</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <UserIcon size={16} className="text-zinc-500" />
                    </div>
                  )}
                  <div className="hidden md:block text-sm">
                    <p className="font-medium text-zinc-900 leading-none">{user.displayName}</p>
                    <p className="text-xs text-zinc-500 capitalize">{userRole || 'User'}</p>
                  </div>
                </div>
                
                {(userRole === 'admin' || userRole === 'editor') && (
                  <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                    <Settings size={20} />
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
