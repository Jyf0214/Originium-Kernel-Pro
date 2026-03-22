'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Save, Github, Settings } from 'lucide-react';
import { Icon, Text } from '@lobehub/ui';

export default function ConfigPage() {
  const { userRole } = useAuth();
  const [config, setConfig] = useState({
    siteTitle: 'Originium Kernel',
    siteDescription: '现代内容发布平台',
    githubRepo: '',
    githubToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole !== 'sudo' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (res.ok) {
        alert('配置保存成功！');
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  if (userRole !== 'sudo' && userRole !== 'admin') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text style={{ color: 'var(--ant-color-error)' }}>无权限访问，仅管理员可访问此页面</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#1a1a1a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon icon={Settings} />
        </div>
        <div>
          <Text fontSize={24} weight={'bold'}>系统配置</Text>
          <Text fontSize={14} type="secondary">管理站点设置和 GitHub 集成</Text>
        </div>
      </div>

      {/* 基础设置 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        padding: 20,
        marginBottom: 16,
      }}>
        <Text fontSize={16} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          <span style={{ 
            display: 'inline-block',
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: '#52c41a',
            marginRight: 8 
          }}></span>
          基础设置
        </Text>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            站点标题
          </label>
          <input 
            type="text" 
            value={config.siteTitle}
            onChange={e => setConfig({...config, siteTitle: e.target.value})}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            站点描述
          </label>
          <textarea 
            value={config.siteDescription}
            onChange={e => setConfig({...config, siteDescription: e.target.value})}
            style={{
              width: '100%',
              minHeight: 100,
              padding: 12,
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* GitHub 集成 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        padding: 20,
        marginBottom: 24,
      }}>
        <Text fontSize={16} weight={'bold'} style={{ marginBottom: 16, display: 'block' }}>
          <Icon icon={Github} style={{ marginRight: 8 }} />
          GitHub 集成
        </Text>
        
        <Text fontSize={13} type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          配置 GitHub 以自动同步已发布文章到您的仓库
        </Text>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            仓库地址（用户名/仓库名）
          </label>
          <input 
            type="text" 
            placeholder="例如：username/my-blog"
            value={config.githubRepo}
            onChange={e => setConfig({...config, githubRepo: e.target.value})}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            个人访问令牌（Personal Access Token）
          </label>
          <input 
            type="password" 
            placeholder="ghp_xxxxxxxxxxxx"
            value={config.githubToken}
            onChange={e => setConfig({...config, githubToken: e.target.value})}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Text fontSize={12} type="secondary" style={{ marginTop: 8, display: 'block' }}>
            需要 `repo` 权限以创建/更新文件
          </Text>
        </div>
      </div>

      {/* 保存按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            background: '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Icon icon={Save} />
          <span>{saving ? '保存中...' : '保存配置'}</span>
        </button>
      </div>
    </div>
  );
}
