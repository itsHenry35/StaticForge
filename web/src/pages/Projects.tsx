import React, { useState, useEffect } from 'react';
import { Card, List, Button, Modal, Form, Input, Popconfirm, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FolderOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import type { Project, CreateProjectRequest } from '../types';

export const Projects: React.FC = () => {
  const { t } = useTranslation();
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
          <h1 className="page-header__title">{t('projects.title')}</h1>
          <p className="page-header__subtitle">{t('projects.subtitle')}</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          {t('projects.newProject')}
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
                {t('projects.noProjects')}
              </div>
              <div className="muted-section__note">{t('projects.noProjectsDescription')}</div>
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
                  {project.is_published ? <Tag color="success">{t('projects.published')}</Tag> : <Tag>{t('projects.draft')}</Tag>}
                  {project.has_password && <Tag color="warning">{t('projects.protected')}</Tag>}
                </div>
              </div>

              <div className="project-card__meta">
                <div className="project-card__title">
                  {project.display_name || project.name}
                </div>
                <div className="project-card__desc">
                  {project.description || t('dashboard.noDescription')}
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
                    {t('projects.edit')}
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
                      {t('projects.view')}
                    </Button>
                  )}
                </div>
                <Popconfirm
                  title={t('projects.deleteProject')}
                  description={t('projects.cannotUndo')}
                  onConfirm={() => handleDelete(project.id)}
                  okText={t('common.yes')}
                  cancelText={t('common.no')}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title={t('projects.createNewProject')}
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
            label={t('projects.projectName')}
            rules={[
              { required: true, message: t('validation.pleaseEnterProjectName') },
              { min: 3, message: t('validation.nameMinLength') },
              { max: 100, message: t('validation.nameMaxLength') },
              { pattern: /^[a-z0-9-]+$/, message: t('validation.onlyLowercaseAllowed') },
            ]}
            extra={t('projects.urlHelper')}
          >
            <Input placeholder={t('projects.projectNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="display_name"
            label={t('projects.displayName')}
          >
            <Input placeholder={t('projects.displayNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('projects.description')}
          >
            <Input.TextArea rows={3} placeholder={t('projects.descriptionPlaceholder')} />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('projects.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
