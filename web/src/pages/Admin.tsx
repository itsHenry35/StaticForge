import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Popconfirm, Tag, Space, Avatar, Input } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import {
  UserOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  SettingOutlined,
  CrownOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import type { User, Project } from '../types';
import { Settings } from './Settings';

export const Admin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const fetchUsers = async () => {
    setUsersLoading(true);
    const response = await apiService.getAllUsers();
    handleRespWithoutNotify(response, (data) => {
      setUsers(data || []);
    });
    setUsersLoading(false);
  };

  const fetchProjects = async () => {
    setProjectsLoading(true);
    const response = await apiService.getAllProjects();
    handleRespWithoutNotify(response, (data) => {
      setProjects(data || []);
    });
    setProjectsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const handleToggleUserStatus = async (userId: number) => {
    const response = await apiService.toggleUserStatus(userId);
    handleRespWithNotifySuccess(response, () => {
      fetchUsers();
    });
  };

  const handleToggleUserAdmin = async (userId: number) => {
    const response = await apiService.toggleUserAdmin(userId);
    handleRespWithNotifySuccess(response, () => {
      fetchUsers();
    });
  };

  const handleDeleteUser = async (userId: number) => {
    const response = await apiService.deleteUser(userId);
    handleRespWithNotifySuccess(response, () => {
      fetchUsers();
    });
  };

  const handleToggleProjectStatus = async (projectId: number) => {
    const response = await apiService.toggleProjectStatus(projectId);
    handleRespWithNotifySuccess(response, () => {
      fetchProjects();
    });
  };

  const handleDeleteProject = async (projectId: number) => {
    const response = await apiService.deleteProject(projectId);
    handleRespWithNotifySuccess(response, () => {
      fetchProjects();
    });
  };

  const userColumns = [
    {
      title: t('admin.user'),
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ background: 'var(--primary-color)' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.display_name || username}</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: t('admin.role'),
      dataIndex: 'is_admin',
      key: 'is_admin',
      render: (isAdmin: boolean) => (
        <Tag color={isAdmin ? 'red' : 'blue'}>{isAdmin ? t('admin.admin') : t('admin.userRole')}</Tag>
      ),
    },
    {
      title: t('admin.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? t('admin.active') : t('admin.disabled')}
        </Tag>
      ),
    },
    {
      title: t('admin.oauthProvider'),
      dataIndex: 'oauth_provider',
      key: 'oauth_provider',
      render: (provider?: string) => provider || '-',
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: User) => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isCurrentUser = currentUser.id === record.id;

        return (
          <Space>
            {!isCurrentUser && (
              <>
                <Button
                  size="small"
                  icon={record.is_admin ? <UserOutlined /> : <CrownOutlined />}
                  onClick={() => handleToggleUserAdmin(record.id)}
                >
                  {record.is_admin ? t('admin.revokeAdmin') : t('admin.makeAdmin')}
                </Button>
                <Button
                  size="small"
                  icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => handleToggleUserStatus(record.id)}
                >
                  {record.is_active ? t('admin.disable') : t('admin.enable')}
                </Button>
                <Popconfirm
                  title={t('admin.deleteUser')}
                  description={t('admin.deleteUserWarning')}
                  onConfirm={() => handleDeleteUser(record.id)}
                  okText={t('admin.yes')}
                  cancelText={t('admin.no')}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    {t('admin.delete')}
                  </Button>
                </Popconfirm>
              </>
            )}
            {isCurrentUser && (
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                {t('admin.youCurrentUser')}
              </span>
            )}
          </Space>
        );
      },
    },
  ];

  const projectColumns = [
    {
      title: t('admin.project'),
      dataIndex: 'name',
      key: 'name',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder={t('admin.searchProjectName')}
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              {t('admin.search')}
            </Button>
            <Button onClick={() => { clearFilters?.(); confirm(); }} size="small" style={{ width: 90 }}>
              {t('admin.reset')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      onFilter: (value: unknown, record: Project) =>
        record.name.toLowerCase().includes((value as string).toLowerCase()) ||
        record.display_name.toLowerCase().includes((value as string).toLowerCase()),
      render: (name: string, record: Project) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.display_name || name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{name}</div>
        </div>
      ),
    },
    {
      title: t('admin.owner'),
      dataIndex: 'username',
      key: 'username',
      filters: Array.from(new Set(projects.map(p => p.username))).sort().map(owner => ({
        text: owner,
        value: owner,
      })),
      onFilter: (value: unknown, record: Project) => record.username === value,
    },
    {
      title: t('admin.description'),
      dataIndex: 'description',
      key: 'description',
      render: (desc?: string) => desc || '-',
    },
    {
      title: t('admin.status'),
      key: 'status',
      render: (_: unknown, record: Project) => (
        <Space>
          <Tag color={record.is_active ? 'green' : 'red'}>
            {record.is_active ? t('admin.active') : t('admin.disabled')}
          </Tag>
          <Tag color={record.is_published ? 'blue' : 'default'}>
            {record.is_published ? t('admin.published') : t('admin.draft')}
          </Tag>
          {record.has_password && <Tag color="orange">{t('admin.protected')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: Project) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          >
            {t('admin.edit')}
          </Button>
          <Button
            size="small"
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => handleToggleProjectStatus(record.id)}
          >
            {record.is_active ? t('admin.disable') : t('admin.enable')}
          </Button>
          {record.is_published && record.is_active && (
            <Button
              size="small"
              type="link"
              href={`/s/${record.name}`}
              target="_blank"
            >
              {t('admin.view')}
            </Button>
          )}
          <Popconfirm
            title={t('admin.deleteProject')}
            description={t('admin.cannotUndo')}
            onConfirm={() => handleDeleteProject(record.id)}
            okText={t('admin.yes')}
            cancelText={t('admin.no')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('admin.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items = [
    {
      key: '1',
      label: (
        <span>
          <UserOutlined /> {t('admin.users', { count: users.length })}
        </span>
      ),
      children: (
        <Table
          dataSource={users}
          columns={userColumns}
          rowKey="id"
          loading={usersLoading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <ProjectOutlined /> {t('admin.projects', { count: projects.length })}
        </span>
      ),
      children: (
        <Table
          dataSource={projects}
          columns={projectColumns}
          rowKey="id"
          loading={projectsLoading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: '3',
      label: (
        <span>
          <SettingOutlined /> {t('admin.settings')}
        </span>
      ),
      children: <Settings />,
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">{t('admin.title')}</h1>
        <p className="page-header__subtitle">{t('admin.subtitle')}</p>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          items={items}
          style={{ padding: '0 24px' }}
        />
      </Card>
    </>
  );
};
