'use client';

import React from 'react';
import Link from 'next/link';
import { useFirebase } from './FirebaseProvider';
import { auth } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { LogoutOutlined, LoginOutlined, SettingOutlined, UserOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

export function Navbar() {
  const { user, userRole, userWid, userProfile, isSudo } = useFirebase();

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
                <span className="text-white font-bold text-xl leading-none">O</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight">Originium Kernel</span>
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
                      <UserOutlined size={16} className="text-zinc-500" />
                    </div>
                  )}
                  <div className="hidden md:block text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 leading-none">{user.displayName}</span>
                      {isSudo && (
                        <Tag color="gold" className="shrink-0">Sudo</Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500 font-mono">{userWid}</span>
                      {userProfile?.userGroup && (
                        <Tag color="blue" className="shrink-0 text-xs">{userProfile.userGroup}</Tag>
                      )}
                    </div>
                  </div>
                </div>

                {isSudo && (
                  <>
                    <Link href="/admin/groups" className="text-zinc-500 hover:text-zinc-900 transition-colors" title="用户组管理">
                      <UsergroupAddOutlined className="text-lg" />
                    </Link>
                    <Link href="/admin/users" className="text-zinc-500 hover:text-zinc-900 transition-colors" title="用户管理">
                      <SettingOutlined size={20} />
                    </Link>
                  </>
                )}

                {userRole === 'wid' && (
                  <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-900 transition-colors" title="仪表板">
                    <SettingOutlined size={20} />
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors"
                  title="退出登录"
                >
                  <LogoutOutlined size={20} />
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-zinc-500 hover:text-zinc-900 transition-colors">
                  登录
                </Link>
                <Link href="/register" className="lobe-button bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2">
                  <LoginOutlined size={16} />
                  <span>注册</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
