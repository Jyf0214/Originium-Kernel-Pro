'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/FirebaseProvider';
import { 
  createUserGroup, 
  getAllUserGroups, 
  assignUserToGroup, 
  getAllUsers,
  type UserGroup,
  type UserProfile 
} from '@/lib/user';
import { Button, Input, Card, Table, Modal, Form, Select, message, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

export default function UserGroupsPage() {
  const router = useRouter();
  const { isSudo, userProfile } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [groupsData, usersData] = await Promise.all([
      getAllUserGroups(),
      getAllUsers()
    ]);
    setGroups(groupsData);
    setUsers(usersData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSudo) {
      message.error('仅限管理员访问');
      router.push('/');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [isSudo, router, loadData]);

  const handleCreateGroup = async (values: any) => {
    try {
      await createUserGroup(values.name, values.description || '', userProfile?.uid || '');
      message.success('用户组创建成功');
      setIsModalOpen(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('创建失败，请重试');
    }
  };

  const handleAssignUser = async (values: any) => {
    try {
      await assignUserToGroup(values.uid, selectedGroup!.id);
      message.success('用户分配成功');
      setIsAssignModalOpen(false);
      loadData();
    } catch (error) {
      message.error('分配失败，请重试');
    }
  };

  const columns: ColumnsType<UserGroup> = [
    {
      title: '用户组名称',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-medium">{name}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count) => (
        <Tag color="blue">{count} 人</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<UsergroupAddOutlined />}
            onClick={() => {
              setSelectedGroup(record);
              setIsAssignModalOpen(true);
            }}
          >
            分配用户
          </Button>
        </Space>
      ),
    },
  ];

  if (!isSudo) return null;

  return (
    <div className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900">用户组管理</h1>
          <p className="text-zinc-500 mt-1">创建和管理用户组，分配用户到不同组别</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
        >
          创建用户组
        </Button>
      </div>

      <Card className="lobe-card">
        <Table
          columns={columns}
          dataSource={groups}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Group Modal */}
      <Modal
        title="创建用户组"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateGroup}>
          <Form.Item
            name="name"
            label="用户组名称"
            rules={[{ required: true, message: '请输入用户组名称' }]}
          >
            <Input placeholder="例如：VIP 用户、高级会员" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="用户组描述（可选）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign User Modal */}
      <Modal
        title={`分配用户到 "${selectedGroup?.name}"`}
        open={isAssignModalOpen}
        onCancel={() => setIsAssignModalOpen(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAssignUser}>
          <Form.Item
            name="uid"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select placeholder="选择用户">
              {users
                .filter(u => !u.userGroup || u.userGroup !== selectedGroup?.id)
                .map(user => (
                  <Select.Option key={user.uid} value={user.uid}>
                    {user.name} ({user.wid}) - {user.email}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              分配
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
