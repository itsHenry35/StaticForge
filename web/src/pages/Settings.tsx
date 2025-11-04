import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Button, Space, Divider, Input, Select, Popconfirm, Table, Modal, Alert, Collapse } from 'antd';
import { SettingOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import type { ConfigData, OAuthConfigFull } from '../types';

const { Panel } = Collapse;

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [oauthModalVisible, setOauthModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<OAuthConfigFull | null>(null);
  const [oauthForm] = Form.useForm();

  const fetchConfig = async () => {
    setLoading(true);
    const response = await apiService.getConfig();
    handleRespWithoutNotify(response, (data) => {
      setConfig(data);
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleUpdateAllowRegister = async (checked: boolean) => {
    if (!config) return;
    const response = await apiService.updateConfig({
      allow_register: checked,
      oauth: config.oauth || [],
      replacements: config.replacements || []
    });
    handleRespWithNotifySuccess(response, async () => {
      await fetchConfig();
    });
  };

  const handleAddOAuthProvider = async (values: OAuthConfigFull) => {
    if (!config) return;

    // Check if we're editing an existing provider
    const existingIndex = (config.oauth || []).findIndex(p => p.name === values.name);
    let updatedOAuth;

    if (existingIndex >= 0) {
      // Edit existing provider
      updatedOAuth = [...(config.oauth || [])];
      updatedOAuth[existingIndex] = values;
    } else {
      // Add new provider
      updatedOAuth = [...(config.oauth || []), values];
    }

    const response = await apiService.updateConfig({
      allow_register: config.allow_register,
      oauth: updatedOAuth,
      replacements: config.replacements || []
    });
    handleRespWithNotifySuccess(response, async () => {
      setOauthModalVisible(false);
      setEditingProvider(null);
      oauthForm.resetFields();
      await fetchConfig();
    });
  };

  const handleRemoveOAuthProvider = async (name: string) => {
    if (!config) return;
    const response = await apiService.updateConfig({
      allow_register: config.allow_register,
      oauth: (config.oauth || []).filter(p => p.name !== name),
      replacements: config.replacements || []
    });
    handleRespWithNotifySuccess(response, async () => {
      await fetchConfig();
    });
  };

  const handleAddReplacement = async () => {
    if (!config) return;
    const newReplacements = [...(config.replacements || []), { from: '', to: '' }];
    setConfig({ ...config, replacements: newReplacements });
  };

  const handleRemoveReplacement = async (index: number) => {
    if (!config) return;
    const newReplacements = config.replacements.filter((_, i) => i !== index);
    const response = await apiService.updateConfig({
      allow_register: config.allow_register,
      oauth: config.oauth || [],
      replacements: newReplacements
    });
    handleRespWithNotifySuccess(response, async () => {
      await fetchConfig();
    });
  };

  const handleUpdateReplacement = async (index: number, field: 'from' | 'to', value: string) => {
    if (!config) return;
    const newReplacements = [...config.replacements];
    newReplacements[index] = { ...newReplacements[index], [field]: value };
    setConfig({ ...config, replacements: newReplacements });
  };

  const handleSaveReplacements = async () => {
    if (!config) return;
    const response = await apiService.updateConfig({
      allow_register: config.allow_register,
      oauth: config.oauth || [],
      replacements: config.replacements || []
    });
    handleRespWithNotifySuccess(response, async () => {
      await fetchConfig();
    });
  };

  const oauthColumns = [
    {
      title: t('settings.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('settings.clientId'),
      dataIndex: 'client_id',
      key: 'client_id',
      render: (text: string) => text ? text.substring(0, 20) + '...' : '-',
    },
    {
      title: t('settings.wellKnownUrl'),
      dataIndex: 'well_known_url',
      key: 'well_known_url',
      render: (text: string) => text ? text.substring(0, 40) + '...' : '-',
    },
    {
      title: t('settings.actions'),
      key: 'actions',
      render: (_: unknown, record: OAuthConfigFull) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingProvider(record);
              oauthForm.setFieldsValue(record);
              setOauthModalVisible(true);
            }}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('settings.deleteOAuthProvider')}
            description={t('settings.deleteOAuthProviderDesc')}
            onConfirm={() => handleRemoveOAuthProvider(record.name)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <SettingOutlined style={{ marginRight: 12 }} />
          {t('settings.title')}
        </h1>
        <p className="page-header__subtitle">
          {t('settings.subtitle')}
        </p>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* General Settings */}
        <Card title={t('settings.generalSettings')} loading={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{t('settings.allowUserRegistration')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  {t('settings.allowUserRegistrationDesc')}
                </div>
              </div>
              <Switch
                checked={config?.allow_register}
                onChange={handleUpdateAllowRegister}
              />
            </div>
          </Space>
        </Card>

        {/* OAuth Providers */}
        <Card
          title={t('settings.oauthProviders')}
          loading={loading}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingProvider(null);
                oauthForm.resetFields();
                setOauthModalVisible(true);
              }}
            >
              {t('settings.addProvider')}
            </Button>
          }
        >
          <Table
            dataSource={config?.oauth || []}
            columns={oauthColumns}
            rowKey="name"
            pagination={false}
          />

          <Divider />

          <Collapse ghost>
            <Panel header={<><InfoCircleOutlined style={{ marginRight: 8 }} />{t('settings.oauthConfigGuide')}</>} key="1">
              <Alert
                message={t('settings.oauthSetupInstructions')}
                description={
                  <div>
                    <h4>{t('settings.fieldMappingConfig')}</h4>
                    <p>{t('settings.fieldMappingDesc')}</p>

                    <h4>{t('settings.commonOidcProviders')}</h4>

                    <div style={{ marginTop: 16 }}>
                      <h5>{t('settings.google')}</h5>
                      <ul>
                        <li><strong>{t('settings.wellKnownUrlLabel')}</strong> <code>https://accounts.google.com/.well-known/openid-configuration</code></li>
                        <li><strong>{t('settings.scopesLabel')}</strong> <code>openid, profile, email</code></li>
                        <li><strong>{t('settings.fieldMappingLabel')}</strong>
                          <ul>
                            <li><code>name</code>: <code>email</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <h5>{t('settings.auth0')}</h5>
                      <ul>
                        <li><strong>{t('settings.wellKnownUrlLabel')}</strong> <code>https://YOUR_DOMAIN/.well-known/openid-configuration</code></li>
                        <li><strong>{t('settings.scopesLabel')}</strong> <code>openid, profile, email</code></li>
                        <li><strong>{t('settings.fieldMappingLabel')}</strong>
                          <ul>
                            <li><code>name</code>: <code>email</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <h5>{t('settings.keycloak')}</h5>
                      <ul>
                        <li><strong>{t('settings.wellKnownUrlLabel')}</strong> <code>https://YOUR_DOMAIN/realms/YOUR_REALM/.well-known/openid-configuration</code></li>
                        <li><strong>{t('settings.scopesLabel')}</strong> <code>openid, profile, email</code></li>
                        <li><strong>{t('settings.fieldMappingLabel')}</strong>
                          <ul>
                            <li><code>name</code>: <code>preferred_username</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                      {t('settings.fieldMappingNote', { nameField: 'name', displayNameField: 'display_name' })}
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />
            </Panel>
          </Collapse>
        </Card>

        {/* String Replacements */}
        <Card
          title={t('settings.stringReplacements')}
          loading={loading}
          extra={
            <Space>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={handleAddReplacement}
              >
                {t('settings.addRule')}
              </Button>
              <Button
                type="primary"
                onClick={handleSaveReplacements}
              >
                {t('settings.saveChanges')}
              </Button>
            </Space>
          }
        >
          <Alert
            message={t('settings.stringReplacementConfig')}
            description={
              <div>
                <p>{t('settings.replacementDesc1')}</p>
                <p>{t('settings.replacementDesc2', { from: 'foo', to: 'bar' })}</p>
                <p style={{ marginTop: 8 }}>{t('settings.replacementDesc3')}</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {(config?.replacements || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
                {t('settings.noReplacementRules')}
              </div>
            ) : (
              (config?.replacements || []).map((rule, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{ background: 'var(--bg-secondary)' }}
                  extra={
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveReplacement(index)}
                    >
                      {t('common.delete')}
                    </Button>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t('settings.findText')}</div>
                      <Input
                        placeholder={t('settings.findTextPlaceholder')}
                        value={rule.from}
                        onChange={(e) => handleUpdateReplacement(index, 'from', e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t('settings.replaceWith')}</div>
                      <Input
                        placeholder={t('settings.replaceTextPlaceholder')}
                        value={rule.to}
                        onChange={(e) => handleUpdateReplacement(index, 'to', e.target.value)}
                      />
                    </div>
                  </Space>
                </Card>
              ))
            )}
          </Space>
        </Card>
      </Space>

      {/* Add/Edit OAuth Provider Modal */}
      <Modal
        title={editingProvider ? t('settings.editProvider') : t('settings.addProvider')}
        open={oauthModalVisible}
        onCancel={() => {
          setOauthModalVisible(false);
          setEditingProvider(null);
          oauthForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={oauthForm}
          layout="vertical"
          onFinish={handleAddOAuthProvider}
        >
          <Form.Item
            name="name"
            label={t('settings.providerName')}
            rules={[{ required: true, message: t('settings.pleaseEnterProviderName') }]}
          >
            <Input
              placeholder={t('settings.providerNamePlaceholder')}
              disabled={!!editingProvider}
            />
          </Form.Item>

          <Form.Item
            name="icon"
            label={t('settings.iconUrl')}
          >
            <Input placeholder={t('settings.iconUrlPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="client_id"
            label={t('settings.clientId')}
            rules={[{ required: true, message: t('settings.pleaseEnterClientId') }]}
          >
            <Input placeholder={t('settings.clientIdPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="client_secret"
            label={t('settings.clientSecret')}
            rules={[{ required: true, message: t('settings.pleaseEnterClientSecret') }]}
          >
            <Input.Password placeholder={t('settings.clientSecretPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="well_known_url"
            label={t('settings.wellKnownUrl')}
            rules={[{ required: true, message: t('settings.pleaseEnterWellKnownUrl') }]}
            extra={t('settings.wellKnownUrlExtra')}
          >
            <Input placeholder={t('settings.wellKnownUrlPlaceholder')} />
          </Form.Item>

          <Alert
            message={t('settings.redirectUrl')}
            description={
              <div>
                {t('settings.redirectUrlDesc', { url: `${window.location.origin}/api/auth/oauth/callback` })}
                <br />
                {t('settings.redirectUrlNote')}
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="scopes"
            label={t('settings.scopes')}
          >
            <Select
              mode="tags"
              placeholder={t('settings.scopesPlaceholder')}
            />
          </Form.Item>

          <Divider>{t('settings.fieldMapping')}</Divider>

          <Form.Item
            name={['field_mapping', 'name']}
            label={t('settings.nameField')}
            rules={[{ required: true, message: t('settings.pleaseEnterNameField') }]}
            extra={t('settings.nameFieldExtra')}
          >
            <Input placeholder={t('settings.nameFieldPlaceholder')} />
          </Form.Item>

          <Form.Item
            name={['field_mapping', 'email']}
            label={t('settings.emailField')}
            extra={t('settings.emailFieldExtra')}
          >
            <Input placeholder={t('settings.emailFieldPlaceholder')} />
          </Form.Item>

          <Form.Item
            name={['field_mapping', 'display_name']}
            label={t('settings.displayNameField')}
            extra={t('settings.displayNameFieldExtra')}
          >
            <Input placeholder={t('settings.displayNameFieldPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {t('settings.addProvider')}
              </Button>
              <Button onClick={() => {
                setOauthModalVisible(false);
                oauthForm.resetFields();
              }}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
