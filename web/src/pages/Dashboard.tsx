import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Button, Tag } from 'antd';
import { ProjectOutlined, FileOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { handleRespWithoutNotify } from '../utils/handleResp';
import type { ApiResponse, Project, SystemStats } from '../types';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const promises: Array<Promise<ApiResponse<Project[]>> | Promise<ApiResponse<SystemStats>>> = [apiService.getProjects()];

      if (user?.is_admin) {
        promises.push(apiService.getSystemStats());
      }

      const [projectsResult, statsResult] = await Promise.allSettled(promises);

      if (projectsResult.status === 'fulfilled') {
        handleRespWithoutNotify(projectsResult.value as ApiResponse<Project[]>, (data) => {
          setProjects(data || []);
        });
      }

      if (user?.is_admin && statsResult && statsResult.status === 'fulfilled') {
        handleRespWithoutNotify(statsResult.value as ApiResponse<SystemStats>, (data) => {
          setStats(data || null);
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">{t('dashboard.title')}</h1>
        <p className="page-header__subtitle">
          {t('dashboard.welcome', { username: user?.display_name || user?.username })}
        </p>
      </div>

      {user?.is_admin && stats && (
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12}>
            <div className="surface-card stat-card-container">
              <div className="stat-card">
                <div className="stat-card__icon">
                  <FileOutlined />
                </div>
                <div className="stat-card__content">
                  <span className="stat-card__label">{t('dashboard.totalUsers')}</span>
                  <span className="stat-card__value">{stats.total_users}</span>
                </div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="surface-card stat-card-container">
              <div className="stat-card">
                <div className="stat-card__icon stat-card__icon--success">
                  <ProjectOutlined />
                </div>
                <div className="stat-card__content">
                  <span className="stat-card__label">{t('dashboard.totalProjects')}</span>
                  <span className="stat-card__value">{stats.total_projects}</span>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      <Card
        className="list-card"
        title={t('dashboard.recentProjects')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects')}>
            {t('dashboard.newProject')}
          </Button>
        }
        loading={loading}
        bodyStyle={{ padding: projects.length === 0 ? 32 : 0 }}
      >
        {projects.length === 0 ? (
          <div className="muted-section">
            <ProjectOutlined className="muted-section__icon" />
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {t('dashboard.noProjects')}
            </div>
            <div className="muted-section__note">{t('dashboard.noProjectsDescription')}</div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/projects')}
              style={{ marginTop: 20 }}
            >
              {t('dashboard.createProject')}
            </Button>
          </div>
        ) : (
          <>
            <List
              dataSource={projects.slice(0, 5)}
              renderItem={(project) => (
                <List.Item
                  className="list-card__item"
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      size="small"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      {t('dashboard.edit')}
                    </Button>,
                    project.is_published && (
                      <Button
                        key="view"
                        type="link"
                        size="small"
                        href={`/s/${project.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('dashboard.viewSite')}
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="list-card__avatar">
                        <ProjectOutlined />
                      </div>
                    }
                    title={
                      <div className="project-card__title">
                        {project.display_name || project.name}
                      </div>
                    }
                    description={
                      <div className="project-card__desc-wrapper">
                        <div className="project-card__desc">
                          {project.description || t('dashboard.noDescription')}
                        </div>
                        <div className="project-card__badge-group">
                          {project.is_published ? (
                            <Tag color="success">{t('dashboard.published')}</Tag>
                          ) : (
                            <Tag>{t('dashboard.draft')}</Tag>
                          )}
                          {project.has_password && <Tag color="warning">{t('dashboard.protected')}</Tag>}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            {projects.length > 5 && (
              <div className="list-card__item list-card__item--footer">
                <Button type="link" onClick={() => navigate('/projects')}>
                  {t('dashboard.viewAllProjects')}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
};
