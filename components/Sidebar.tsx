'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LayoutDashboard, FileText, Users, Settings, ShieldAlert } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'sudo', 'user'] },
    { href: '/dashboard/articles', label: 'Articles', icon: FileText, roles: ['admin', 'sudo'] },
    { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin', 'sudo'] },
    { href: '/admin/requests', label: 'Requests', icon: ShieldAlert, roles: ['admin', 'sudo'] },
    { href: '/admin/config', label: 'Config', icon: Settings, roles: ['admin', 'sudo'] },
  ];

  // 如果未登录，不显示侧边栏
  if (!userRole) return null;

  const filteredLinks = links.filter(link => userRole && link.roles.includes(userRole));

  if (filteredLinks.length === 0) return null;

  return (
    <aside className="w-64 border-r border-zinc-200 bg-zinc-50/50 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-6">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Dashboard</h2>
        <nav className="space-y-1">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-zinc-900 text-white' 
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
