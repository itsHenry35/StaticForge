import React, { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Tabs, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined, IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { handleRespWithNotifySuccess } from '../utils/handleResp';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleUpdateProfile = async (values: { display_name?: string; email: string }) => {
    setLoading(true);
    const response = await apiService.updateCurrentUser(values);
    handleRespWithNotifySuccess(
      response,
      async () => {
        await refreshUser();
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  };

  const handleChangePassword = async (values: { old_password: string; new_password: string }) => {
    setLoading(true);
    const response = await apiService.changePassword(values);
    handleRespWithNotifySuccess(
      response,
      () => {
        passwordForm.resetFields();
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  };

  const items = [
    {
      key: '1',
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          <IdcardOutlined style={{ marginRight: 8 }} />
          {t('profile.profileInfo')}
        </span>
      ),
      children: (
        <div style={{ padding: '32px 24px' }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              {t('profile.personalDetails')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
              {t('profile.personalDetailsDescription')}
            </p>
          </div>

          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
            initialValues={{
              display_name: user?.display_name,
              email: user?.email,
            }}
          >
            <Form.Item label={t('profile.username')}>
              <Input
                value={user?.username}
                disabled
                prefix={<UserOutlined />}
                size="large"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-tertiary)',
                  cursor: 'not-allowed'
                }}
              />
            </Form.Item>

            <Form.Item
              name="display_name"
              label={t('profile.displayName')}
            >
              <Input
                prefix={<IdcardOutlined />}
                size="large"
                placeholder={t('profile.displayNamePlaceholder')}
                style={{ borderRadius: 'var(--radius-lg)' }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={t('profile.emailAddress')}
              rules={[
                { required: true, message: t('validation.pleaseEnterEmail') },
                { type: 'email', message: t('validation.pleaseEnterValidEmail') },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                size="large"
                placeholder={t('profile.emailPlaceholder')}
                style={{ borderRadius: 'var(--radius-lg)' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{
                  height: 44,
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 500,
                  minWidth: 140
                }}
              >
                {t('profile.saveChanges')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          <SafetyOutlined style={{ marginRight: 8 }} />
          {t('profile.security')}
        </span>
      ),
      children: (
        <div style={{ padding: '32px 24px' }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              {t('profile.changePassword')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
              {t('profile.changePasswordDescription')}
            </p>
          </div>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="old_password"
              label={t('profile.currentPassword')}
              rules={[{ required: true, message: t('validation.pleaseEnterCurrentPassword') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('profile.currentPasswordPlaceholder')}
                size="large"
                style={{ borderRadius: 'var(--radius-lg)' }}
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              label={t('profile.newPassword')}
              rules={[
                { required: true, message: t('validation.pleaseEnterNewPassword') },
                { min: 6, message: t('validation.passwordMinLength') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('profile.newPasswordPlaceholder')}
                size="large"
                style={{ borderRadius: 'var(--radius-lg)' }}
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label={t('profile.confirmNewPassword')}
              dependencies={['new_password']}
              rules={[
                { required: true, message: t('validation.pleaseConfirmPassword') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('validation.passwordsNotMatch')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('profile.confirmPasswordPlaceholder')}
                size="large"
                style={{ borderRadius: 'var(--radius-lg)' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{
                  height: 44,
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 500,
                  minWidth: 140
                }}
              >
                {t('profile.updatePassword')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 className="page-header__title">{t('profile.title')}</h1>
        <p className="page-header__subtitle">{t('profile.subtitle')}</p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Profile Header Card */}
        <Card
          style={{
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-color)',
            marginBottom: 24,
          }}
        >
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: 4,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #4096ff 100%)',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.25)',
              }}
            >
              <Avatar
                size={96}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, #4096ff 100%)',
                  fontSize: 42,
                }}
              />
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
                letterSpacing: '-0.01em',
              }}
            >
              {user?.username}
            </div>

            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                background: user?.is_admin
                  ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                  : 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 24,
                boxShadow: user?.is_admin
                  ? '0 2px 8px rgba(255, 77, 79, 0.3)'
                  : '0 2px 8px rgba(82, 196, 26, 0.3)',
              }}
            >
              {user?.is_admin ? t('profile.administrator') : t('profile.user')}
            </div>

            <Divider style={{ margin: '24px 0' }} />

            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
                maxWidth: 500,
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                }}
              >
                <MailOutlined style={{ marginRight: 6 }} />
                {t('profile.emailAddress')}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: 'var(--text-secondary)',
                  wordBreak: 'break-all',
                  fontWeight: 500,
                }}
              >
                {user?.email}
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Card with Tabs */}
        <Card
          bodyStyle={{ padding: 0 }}
          style={{
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            items={items}
            style={{ padding: '0 24px' }}
            size="large"
            tabBarStyle={{
              marginBottom: 0,
              fontWeight: 500,
            }}
          />
        </Card>
      </div>
    </>
  );
};
