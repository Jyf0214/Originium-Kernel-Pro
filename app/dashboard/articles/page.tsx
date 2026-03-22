'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Edit, Trash2, Plus, Eye } from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } catch (error) {
        console.error('获取文章列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(articles.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('删除文章失败:', error);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text style={{ color: 'var(--ant-color-error)' }}>请登录后查看文章</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text fontSize={24} weight={'bold'}>文章管理</Text>
        <Link href="/editor" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}>
            <Icon icon={Plus} />
            <span>新建文章</span>
          </button>
        </Link>
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              background: '#fafafa',
              borderBottom: '1px solid #e5e5e5',
            }}>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>标题</th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>状态</th>
              <th style={{ padding: 16, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>作者</th>
              <th style={{ padding: 16, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 16 }}>
                  <Text weight={500}>{article.title}</Text>
                </td>
                <td style={{ padding: 16 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    background: article.status === 'published' ? '#f6ffed' : '#fffbe6',
                    color: article.status === 'published' ? '#52c41a' : '#faad14',
                  }}>
                    {article.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </td>
                <td style={{ padding: 16 }}>
                  <Text type="secondary">{article.authorName}</Text>
                </td>
                <td style={{ padding: 16, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Link href={`/article/${article.id}`}>
                      <button style={{ 
                        padding: 8, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        borderRadius: 6,
                        color: '#1890ff',
                      }} title="查看">
                        <Icon icon={Eye} />
                      </button>
                    </Link>
                    <Link href={`/editor?id=${article.id}`}>
                      <button style={{ 
                        padding: 8, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        borderRadius: 6,
                        color: '#52c41a',
                      }} title="编辑">
                        <Icon icon={Edit} />
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDelete(article.id)}
                      style={{ 
                        padding: 8, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        borderRadius: 6,
                        color: '#ff4d4f',
                      }} title="删除"
                    >
                      <Icon icon={Trash2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center' }}>
                  <Text type="secondary">暂无文章，创建您的第一篇文章吧！</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
