import {
  Home,
  BookOpen,
  Users,
  PenLine,
  Archive,
  Trash2,
  Settings,
  Activity,
  FileText,
  Eye,
  Shield,
  BarChart3,
  ScrollText,
  Gauge,
} from 'lucide-react';
import type { MenuItem } from './types';

export const userMenuItems: MenuItem[] = [
  { key: 'sidebar.dashboard', icon: Home, href: '/dashboard', group: 'overview' },
  { key: 'sidebar.posts', icon: BookOpen, href: '/posts', group: 'content' },
  { key: 'sidebar.faces', icon: Users, href: '/faces', group: 'content' },
  { key: 'sidebar.write', icon: PenLine, href: '/editor', group: 'content' },
  { key: 'sidebar.articleManagement', icon: Archive, href: '/dashboard/articles', group: 'manage' },
  { key: 'sidebar.trash', icon: Trash2, href: '/dashboard/articles?status=pending_deletion', group: 'manage' },
  { key: 'sidebar.diary', icon: FileText, href: '/diary', group: 'personal' },
  { key: 'sidebar.settings', icon: Settings, href: '/dashboard/settings', group: 'account' },
  { key: 'dashboard.adminConsole', icon: Shield, href: '/dashboard/config', group: 'admin', roles: ['sudo'] },
];

export const adminMenuItems: MenuItem[] = [
  { key: 'sidebar.dashboard', icon: Home, href: '/dashboard', group: 'overview' },
  { key: 'sidebar.systemConfig', icon: Settings, href: '/dashboard/config', group: 'admin' },
  { key: 'sidebar.configPreview', icon: Eye, href: '/dashboard/config/preview', group: 'admin' },
  { key: 'sidebar.envVariables', icon: Activity, href: '/dashboard/env', group: 'admin' },
  { key: 'sidebar.userManagement', icon: Users, href: '/dashboard/users', group: 'admin' },
  { key: 'sidebar.tickets', icon: FileText, href: '/dashboard/tickets', group: 'admin' },
  { key: 'sidebar.writeArticle', icon: FileText, href: '/dashboard/tickets/new', group: 'admin' },
  { key: 'sidebar.contentStats', icon: BarChart3, href: '/dashboard/stats', group: 'admin' },
  { key: 'sidebar.webVitals', icon: Gauge, href: '/dashboard/web-vitals', group: 'admin' },
  { key: 'sidebar.auditLogs', icon: ScrollText, href: '/dashboard/audit', group: 'admin' },
];

export const groupKeys: Record<string, string> = {
  back: 'sidebar.returnDashboard',
  overview: 'dashboard.overview',
  content: 'dashboard.contentManagement',
  manage: 'dashboard.articles',
  personal: 'dashboard.personal',
  account: 'user.settings',
  admin: 'dashboard.adminConsole',
  storage: 'storage.title',
};
