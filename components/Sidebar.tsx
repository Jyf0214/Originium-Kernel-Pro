'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LayoutDashboard, FileText, Users, Settings, ShieldAlert } from 'lucide-react';
import { Flexbox, Text } from '@lobehub/ui';

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
    <aside className="w-72 border-r border-zinc-200/60 bg-gradient-to-b from-zinc-50/80 to-transparent hidden md:block min-h-[calc(100vh-4rem)] backdrop-blur-sm">
      <div className="p-6">
        <Flexbox gap={2} paddingBlock={8}>
          <Text fontSize={11} weight={700} className="text-zinc-400 uppercase tracking-widest">
            Dashboard
          </Text>
        </Flexbox>
        <nav className="space-y-1 mt-4">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-md shadow-zinc-900/10'
                    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                }`}
              >
                <Icon 
                  size={18} 
                  className={`transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`} 
                />
                <Text weight={isActive ? 600 : 500} style={{ fontSize: 14 }}>
                  {link.label}
                </Text>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
