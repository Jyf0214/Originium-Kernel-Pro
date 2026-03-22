'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, FileText, X, Save } from 'lucide-react';
import { Button, Flexbox, Text, Icon } from '@lobehub/ui';

interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  fields: any[];
  createdAt: string;
}

export default function TicketsPage() {
  const { isSudo } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: [{ name: '', type: 'text', required: true }],
  });

  useEffect(() => {
    if (!isSudo) {
      router.push('/dashboard');
      return;
    }

    fetchTemplates();
  }, [isSudo, router]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/ticket-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      fields: [{ name: '', type: 'text', required: true }],
    });
    setShowModal(true);
  };

  const handleEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      fields: template.fields.length > 0 ? template.fields : [{ name: '', type: 'text', required: true }],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('请输入模板名称');
      return;
    }

    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.id,
          name: formData.name,
          description: formData.description,
          fields: formData.fields.filter(f => f.name),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchTemplates();
        alert(editingTemplate ? '模板已更新' : '模板已创建');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个工单模板吗？')) return;
    
    try {
      const res = await fetch('/api/ticket-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: '', type: 'text', required: true }],
    });
  };

  const removeField = (index: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index),
    });
  };

  const updateField = (index: number, field: any) => {
    const newFields = [...formData.fields];
    newFields[index] = field;
    setFormData({ ...formData, fields: newFields });
  };

  if (!isSudo) return null;

  if (loading) {
    return (
      <Flexbox align="center" justify="center" style={{ height: 400 }}>
        <Text type="secondary">加载中...</Text>
      </Flexbox>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* 标题 */}
      <Flexbox horizontal justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Text fontSize={24} weight={'bold'}>工单管理</Text>
          <Text fontSize={14} type="secondary" style={{ display: 'block', marginTop: 4 }}>
            管理工单模板和规则
          </Text>
        </div>
        <Button type="primary" icon={<Icon icon={Plus} />} onClick={handleCreate}>
          创建模板
        </Button>
      </Flexbox>

      {/* 模板列表 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        overflow: 'hidden',
      }}>
        {templates.length > 0 ? (
          templates.map((template, index) => (
            <div
              key={template.id}
              style={{
                padding: '16px 20px',
                borderBottom: index < templates.length - 1 ? '1px solid #e5e5e5' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--ant-color-primary-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon icon={FileText} style={{ color: 'var(--ant-color-primary)' }} />
                </div>
                <div>
                  <Text weight={500}>{template.name}</Text>
                  <Text fontSize={13} type="secondary" style={{ display: 'block', marginTop: 2 }}>
                    {template.description || '暂无描述'} | {template.fields?.length || 0} 个字段
                  </Text>
                </div>
              </div>
              
              <Flexbox horizontal gap={8}>
                <Button 
                  size="small" 
                  icon={<Icon icon={Edit2} />}
                  onClick={() => handleEdit(template)}
                >
                  编辑
                </Button>
                <Button 
                  size="small" 
                  danger
                  icon={<Icon icon={Trash2} />}
                  onClick={() => handleDelete(template.id)}
                >
                  删除
                </Button>
              </Flexbox>
            </div>
          ))
        ) : (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Icon icon={FileText} style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Text type="secondary">暂无工单模板</Text>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" icon={<Icon icon={Plus} />} onClick={handleCreate}>
                创建第一个模板
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#ffffff',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 1000,
          }}>
            <Flexbox horizontal justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Text fontSize={18} weight={'bold'}>
                {editingTemplate ? '编辑模板' : '创建模板'}
              </Text>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <Icon icon={X} />
              </button>
            </Flexbox>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                模板名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：删除文章申请"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                模板描述
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述这个模板的用途"
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 12,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Flexbox horizontal justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 500 }}>表单字段</label>
                <Button size="small" icon={<Icon icon={Plus} />} onClick={addField}>
                  添加字段
                </Button>
              </Flexbox>
              
              {formData.fields.map((field, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'center',
                }}>
                  <input
                    type="text"
                    value={field.name}
                    onChange={e => updateField(index, { ...field, name: e.target.value })}
                    placeholder="字段名称"
                    style={{
                      flex: 1,
                      height: 36,
                      padding: '0 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <select
                    value={field.type}
                    onChange={e => updateField(index, { ...field, type: e.target.value })}
                    style={{
                      height: 36,
                      padding: '0 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <option value="text">文本</option>
                    <option value="textarea">长文本</option>
                    <option value="number">数字</option>
                    <option value="select">下拉选择</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(index, { ...field, required: e.target.checked })}
                    />
                    必填
                  </label>
                  {formData.fields.length > 1 && (
                    <button
                      onClick={() => removeField(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ff4d4f',
                        padding: 4,
                      }}
                    >
                      <Icon icon={X} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Flexbox horizontal justify="flex-end" gap={12}>
              <Button onClick={() => setShowModal(false)}>取消</Button>
              <Button type="primary" icon={<Icon icon={Save} />} onClick={handleSave}>
                保存
              </Button>
            </Flexbox>
          </div>
        </>
      )}
    </div>
  );
}
