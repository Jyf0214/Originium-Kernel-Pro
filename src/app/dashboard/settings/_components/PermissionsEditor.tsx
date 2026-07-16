'use client';

import { Check } from 'lucide-react';
import {
  PERMISSION_GROUPS,
  type ApiKeyPermissions,
  type PermissionAction,
} from '@/lib/api-key-permissions';

interface PermissionsEditorProps {
  permissions: ApiKeyPermissions;
  onChange: (p: ApiKeyPermissions) => void;
  className?: string;
}

export function PermissionsEditor({ permissions, onChange, className = '' }: PermissionsEditorProps) {
  const toggleAction = (action: PermissionAction) => {
    onChange({
      ...permissions,
      actions: { ...permissions.actions, [action]: !permissions.actions[action] },
    });
  };

  const allActionsEnabled = Object.values(permissions.actions).every(Boolean);
  const toggleAll = () => {
    const next = !allActionsEnabled;
    const newActions = Object.fromEntries(
      Object.keys(permissions.actions).map(k => [k, next])
    ) as Record<PermissionAction, boolean>;
    onChange({ ...permissions, actions: newActions });
  };

  return (
    <div className={className}>
      {/* 操作权限 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">操作权限</p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          {allActionsEnabled ? '全部禁用' : '全部启用'}
        </button>
      </div>
      <div className="space-y-3">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.actions.map(action => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => toggleAction(action.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    permissions.actions[action.key]
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                  }`}
                >
                  {permissions.actions[action.key]
                    ? <Check size={10} />
                    : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300" />
                  }
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
