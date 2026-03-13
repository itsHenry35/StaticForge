import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

export const SiteAuth: React.FC = () => {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const requirePassword = searchParams.get('requirePassword') !== null;
  const error = searchParams.get('error');

  useEffect(() => {
    if (!requirePassword && name) {
      apiService.getPublicProjectInfo(name).then((resp) => {
        if (resp.code === 200 && resp.data?.display_name) {
          setCreatorName(resp.data.display_name);
        }
      });
    }
  }, [name, requirePassword]);

  const handleConsent = () => {
    window.location.href = `/s/${name}/?consent=true`;
  };

  const handlePasswordSubmit = async (values: { password: string }) => {
    setLoading(true);
    window.location.href = `/s/${name}/?password=${encodeURIComponent(values.password)}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
      padding: 16
    }}>
      <Card style={{ width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28
          }}>
            <LockOutlined />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            {t('auth.accessRequired')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            {requirePassword
              ? t('auth.sitePasswordProtected')
              : t('auth.needConsent')}
          </p>
        </div>

        {error === 'invalid_password' && (
          <Alert
            message={t('auth.invalidPassword')}
            description={t('auth.incorrectPassword')}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {requirePassword ? (
          <Form onFinish={handlePasswordSubmit} layout="vertical">
            <Form.Item
              name="password"
              label={t('auth.password')}
              rules={[{ required: true, message: t('validation.pleaseEnterPassword') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.enterSitePassword')}
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                {t('auth.accessSite')}
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <div style={{
              padding: '16px 20px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: creatorName ? 12 : 20,
              border: '1px solid var(--border-light)'
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {t('auth.userUploadedDisclaimer')}
              </p>
            </div>

            {creatorName && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
                border: '1px solid var(--border-light)',
                fontSize: 13,
                color: 'var(--text-secondary)'
              }}>
                <UserOutlined style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span>
                  {t('auth.createdBy')}{' '}
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{creatorName}</strong>
                </span>
              </div>
            )}

            <Button type="primary" onClick={handleConsent} block>
              {t('auth.continue')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
