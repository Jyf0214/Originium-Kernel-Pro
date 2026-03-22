'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react';
import { Flexbox, Text, Icon } from '@lobehub/ui';

interface EnvVar {
  name: string;
  isSet: boolean;
  required: boolean;
  description: string;
}

interface EnvGroup {
  name: string;
  variables: EnvVar[];
}

interface EnvStatus {
  groups: Record<string, EnvGroup>;
  summary: {
    total: number;
    set: number;
    required: number;
    requiredSet: number;
    optional: number;
    optionalSet: number;
    missingRequired: string[];
    isReady: boolean;
  };
}

export default function EnvStatusPage() {
  const { isSudo } = useAuth();
  const router = useRouter();
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSudo) {
      router.push('/');
      return;
    }

    const fetchEnvStatus = async () => {
      try {
        const res = await fetch('/api/env-status');
        if (res.ok) {
          const data = await res.json();
          setEnvStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch env status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvStatus();
  }, [isSudo, router]);

  if (!isSudo) return null;

  if (loading) {
    return (
      <Flexbox align="center" justify="center" style={{ height: 400 }}>
        <Text type="secondary">加载中...</Text>
      </Flexbox>
    );
  }

  if (!envStatus) {
    return (
      <Flexbox align="center" justify="center" style={{ height: 400 }}>
        <Text type="secondary">获取环境变量状态失败</Text>
      </Flexbox>
    );
  }

  const { groups, summary } = envStatus;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* 标题 */}
      <Flexbox horizontal gap={12} align="center" style={{ marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--ant-color-primary-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon icon={Settings} style={{ color: 'var(--ant-color-primary)' }} />
        </div>
        <div>
          <Text fontSize={24} weight={'bold'}>环境变量状态</Text>
          <Text fontSize={14} type="secondary">检查系统所需环境变量配置</Text>
        </div>
      </Flexbox>

      {/* 概览卡片 */}
      <div style={{
        background: summary.isReady ? 'var(--ant-color-success-bg)' : 'var(--ant-color-warning-bg)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <Icon 
          icon={summary.isReady ? CheckCircle : AlertCircle} 
          style={{ 
            color: summary.isReady ? 'var(--ant-color-success)' : 'var(--ant-color-warning)',
            fontSize: 32,
          }} 
        />
        <div>
          <Text fontSize={18} weight={'bold'}>
            {summary.isReady ? '环境配置完成' : '缺少必要环境变量'}
          </Text>
          <Text fontSize={14} type="secondary">
            已设置 {summary.set}/{summary.total} 个变量，
            必需 {summary.requiredSet}/{summary.required} 个
          </Text>
          {!summary.isReady && (
            <Text fontSize={13} style={{ color: 'var(--ant-color-error)', marginTop: 8, display: 'block' }}>
              缺少: {summary.missingRequired.join(', ')}
            </Text>
          )}
        </div>
      </div>

      {/* 环境变量分组 */}
      {Object.entries(groups).map(([key, group]) => (
        <div key={key} style={{
          background: 'var(--ant-color-bg-container)',
          borderRadius: 12,
          border: '1px solid var(--ant-color-border-secondary)',
          marginBottom: 16,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--ant-color-border-secondary)',
            background: 'var(--ant-color-bg-layout)',
          }}>
            <Text fontSize={16} weight={'bold'}>{group.name}</Text>
          </div>
          
          <div>
            {group.variables.map((variable, index) => (
              <div
                key={variable.name}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < group.variables.length - 1 ? '1px solid var(--ant-color-border-secondary)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Flexbox horizontal gap={8} align="center">
                    <Text weight={500} style={{ fontFamily: 'monospace' }}>{variable.name}</Text>
                    {variable.required && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: 'var(--ant-color-error-bg)',
                        color: 'var(--ant-color-error)',
                      }}>
                        必需
                      </span>
                    )}
                  </Flexbox>
                  <Text fontSize={13} type="secondary" style={{ marginTop: 4, display: 'block' }}>
                    {variable.description}
                  </Text>
                </div>
                
                <Flexbox horizontal gap={8} align="center">
                  {variable.isSet ? (
                    <>
                      <Icon icon={CheckCircle} style={{ color: 'var(--ant-color-success)' }} />
                      <Text style={{ color: 'var(--ant-color-success)', fontSize: 14 }}>已设置</Text>
                    </>
                  ) : (
                    <>
                      <Icon icon={XCircle} style={{ color: variable.required ? 'var(--ant-color-error)' : 'var(--ant-color-warning)' }} />
                      <Text style={{ color: variable.required ? 'var(--ant-color-error)' : 'var(--ant-color-warning)', fontSize: 14 }}>
                        未设置
                      </Text>
                    </>
                  )}
                </Flexbox>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 提示信息 */}
      <div style={{
        background: 'var(--ant-color-info-bg)',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}>
        <Text fontSize={14} style={{ color: 'var(--ant-color-info)' }}>
          💡 提示：在 Vercel 项目的 Settings → Environment Variables 中配置环境变量。
          修改后需要重新部署才能生效。
        </Text>
      </div>
    </div>
  );
}
