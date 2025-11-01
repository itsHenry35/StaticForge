import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Button, Space, Divider, Input, Select, Popconfirm, Table, Modal, Alert, Collapse } from 'antd';
import { SettingOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import type { ConfigData, OAuthConfigFull } from '../types';

const { Panel } = Collapse;

export const Settings: React.FC = () => {
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Client ID',
      dataIndex: 'client_id',
      key: 'client_id',
      render: (text: string) => text ? text.substring(0, 20) + '...' : '-',
    },
    {
      title: 'Well-Known URL',
      dataIndex: 'well_known_url',
      key: 'well_known_url',
      render: (text: string) => text ? text.substring(0, 40) + '...' : '-',
    },
    {
      title: 'Actions',
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
            Edit
          </Button>
          <Popconfirm
            title="Delete OAuth Provider?"
            description="This will disable OAuth login for this provider."
            onConfirm={() => handleRemoveOAuthProvider(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
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
          System Settings
        </h1>
        <p className="page-header__subtitle">
          Manage system configuration and OAuth providers
        </p>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* General Settings */}
        <Card title="General Settings" loading={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Allow User Registration</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  When disabled, only administrators can create new users
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
          title="OAuth Providers"
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
              Add Provider
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
            <Panel header={<><InfoCircleOutlined style={{ marginRight: 8 }} />OAuth Configuration Guide</>} key="1">
              <Alert
                message="OAuth Setup Instructions"
                description={
                  <div>
                    <h4>Field Mapping Configuration</h4>
                    <p>Field mapping tells StaticForge where to find user information in the OAuth provider's response.</p>

                    <h4>Common OIDC Provider Examples:</h4>

                    <div style={{ marginTop: 16 }}>
                      <h5>Google:</h5>
                      <ul>
                        <li><strong>Well-Known URL:</strong> <code>https://accounts.google.com/.well-known/openid-configuration</code></li>
                        <li><strong>Scopes:</strong> <code>openid, profile, email</code></li>
                        <li><strong>Field Mapping:</strong>
                          <ul>
                            <li><code>name</code>: <code>email</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <h5>Auth0:</h5>
                      <ul>
                        <li><strong>Well-Known URL:</strong> <code>https://YOUR_DOMAIN/.well-known/openid-configuration</code></li>
                        <li><strong>Scopes:</strong> <code>openid, profile, email</code></li>
                        <li><strong>Field Mapping:</strong>
                          <ul>
                            <li><code>name</code>: <code>email</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <h5>Keycloak:</h5>
                      <ul>
                        <li><strong>Well-Known URL:</strong> <code>https://YOUR_DOMAIN/realms/YOUR_REALM/.well-known/openid-configuration</code></li>
                        <li><strong>Scopes:</strong> <code>openid, profile, email</code></li>
                        <li><strong>Field Mapping:</strong>
                          <ul>
                            <li><code>name</code>: <code>preferred_username</code></li>
                            <li><code>email</code>: <code>email</code></li>
                            <li><code>display_name</code>: <code>name</code></li>
                          </ul>
                        </li>
                      </ul>
                    </div>

                    <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                      <strong>Note:</strong> The <code>name</code> field is required and will be used to generate the username if needed.
                      The <code>display_name</code> field is optional and will be shown to users instead of the username if provided.
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
          title="String Replacements"
          loading={loading}
          extra={
            <Space>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={handleAddReplacement}
              >
                Add Rule
              </Button>
              <Button
                type="primary"
                onClick={handleSaveReplacements}
              >
                Save Changes
              </Button>
            </Space>
          }
        >
          <Alert
            message="String Replacement Configuration"
            description={
              <div>
                <p>Define string replacement rules to automatically replace text in HTML, CSS, and JS files when they are served to visitors.</p>
                <p>For example, replace placeholder text like <code>foo</code> with <code>bar</code> across all published sites.</p>
                <p style={{ marginTop: 8 }}><strong>Note:</strong> Replacements are applied dynamically when serving files. Original files are not modified, and changes take effect immediately.</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {(config?.replacements || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
                No replacement rules configured. Click "Add Rule" to create one.
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
                      Delete
                    </Button>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Find:</div>
                      <Input
                        placeholder="Text to find (e.g., foo)"
                        value={rule.from}
                        onChange={(e) => handleUpdateReplacement(index, 'from', e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Replace with:</div>
                      <Input
                        placeholder="Replacement text (e.g., bar)"
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
        title={editingProvider ? "Edit OAuth Provider" : "Add OAuth Provider"}
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
            label="Provider Name"
            rules={[{ required: true, message: 'Please enter provider name' }]}
          >
            <Input
              placeholder="e.g., GitHub, Google, Discord"
              disabled={!!editingProvider}
            />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Icon URL"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            name="client_id"
            label="Client ID"
            rules={[{ required: true, message: 'Please enter client ID' }]}
          >
            <Input placeholder="Your OAuth app client ID" />
          </Form.Item>

          <Form.Item
            name="client_secret"
            label="Client Secret"
            rules={[{ required: true, message: 'Please enter client secret' }]}
          >
            <Input.Password placeholder="Your OAuth app client secret" />
          </Form.Item>

          <Form.Item
            name="well_known_url"
            label="OIDC Well-Known URL"
            rules={[{ required: true, message: 'Please enter OIDC well-known URL' }]}
            extra="The OIDC discovery endpoint (e.g., https://accounts.google.com/.well-known/openid-configuration)"
          >
            <Input placeholder="https://.../.well-known/openid-configuration" />
          </Form.Item>

          <Alert
            message="Redirect URL"
            description={
              <div>
                The OAuth callback URL will be automatically set to: <code>{window.location.origin}/api/auth/oauth/callback</code>
                <br />
                Please configure this URL in your OAuth provider settings.
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="scopes"
            label="Scopes"
          >
            <Select
              mode="tags"
              placeholder="Enter scopes (press Enter to add)"
            />
          </Form.Item>

          <Divider>Field Mapping</Divider>

          <Form.Item
            name={['field_mapping', 'name']}
            label="Name Field"
            rules={[{ required: true, message: 'Please enter name field mapping' }]}
            extra="The field in OAuth response containing the user's name/username (required)"
          >
            <Input placeholder="e.g., login, username, email" />
          </Form.Item>

          <Form.Item
            name={['field_mapping', 'email']}
            label="Email Field"
            extra="The field in OAuth response containing the user's email"
          >
            <Input placeholder="e.g., email" />
          </Form.Item>

          <Form.Item
            name={['field_mapping', 'display_name']}
            label="Display Name Field"
            extra="The field in OAuth response containing the user's display name (optional)"
          >
            <Input placeholder="e.g., name, global_name, display_name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Add Provider
              </Button>
              <Button onClick={() => {
                setOauthModalVisible(false);
                oauthForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
