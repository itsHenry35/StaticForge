import React, { useState, useEffect } from 'react';
import { Card, List, Button, Modal, Form, Input, Popconfirm, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FolderOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import type { Project, CreateProjectRequest } from '../types';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    const response = await apiService.getProjects();
    handleRespWithoutNotify(response, (data) => {
      setProjects(data || []);
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (values: CreateProjectRequest) => {
    const response = await apiService.createProject(values);
    handleRespWithNotifySuccess(response, () => {
      setModalVisible(false);
      form.resetFields();
      fetchProjects();
    });
  };

  const handleDelete = async (id: number) => {
    const response = await apiService.deleteProject(id);
    handleRespWithNotifySuccess(response, () => {
      fetchProjects();
    });
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-header__title">Projects</h1>
          <p className="page-header__subtitle">Manage your static sites</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          New Project
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={projects}
        locale={{
          emptyText: (
            <div className="muted-section">
              <FolderOutlined className="muted-section__icon" />
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                No projects yet
              </div>
              <div className="muted-section__note">Create your first project to get started.</div>
            </div>
          )
        }}
        grid={{ gutter: 20, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        renderItem={(project) => (
          <List.Item>
            <Card
              hoverable
              className="project-card"
              bodyStyle={{ padding: 20 }}
            >
              <div className="project-card__header">
                <div className="project-card__icon">
                  <FolderOutlined />
                </div>
                <div className="project-card__badge-group">
                  {project.is_published ? <Tag color="success">Published</Tag> : <Tag>Draft</Tag>}
                  {project.has_password && <Tag color="warning">Protected</Tag>}
                </div>
              </div>

              <div className="project-card__meta">
                <div className="project-card__title">
                  {project.display_name || project.name}
                </div>
                <div className="project-card__desc">
                  {project.description || 'No description'}
                </div>
              </div>

              <div className="project-card__footer">
                <div className="project-card__actions">
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    Edit
                  </Button>
                  {project.is_published && (
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      href={`/s/${project.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </Button>
                  )}
                </div>
                <Popconfirm
                  title="Delete project?"
                  description="This action cannot be undone."
                  onConfirm={() => handleDelete(project.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="Create New Project"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={520}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="name"
            label="Project Name (URL)"
            rules={[
              { required: true, message: 'Please enter project name' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 100, message: 'Name must be at most 100 characters' },
              { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens allowed' },
            ]}
            extra="This will be used in the URL: /s/project-name"
          >
            <Input placeholder="my-website" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Display Name"
          >
            <Input placeholder="My Website" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="A brief description of your project" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
