'use client';

import React from 'react';

/** 编辑页标题区 */
export function EditFaceHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      <h1 className="text-2xl font-bold text-zinc-900">编辑联系人</h1>
      <p className="text-sm text-zinc-400">修改 {title} 的信息</p>
    </div>
  );
}
