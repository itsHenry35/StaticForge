import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';

export const SiteAuth: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const requirePassword = searchParams.get('requirePassword') !== null;
  const error = searchParams.get('error');

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
            Access Required
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            {requirePassword
              ? 'This site is password protected'
              : 'You need to consent to access this site'}
          </p>
        </div>

        {error === 'invalid_password' && (
          <Alert
            message="Invalid Password"
            description="The password you entered is incorrect. Please try again."
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {requirePassword ? (
          <Form onFinish={handlePasswordSubmit} layout="vertical">
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter the password' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter site password"
                autoFocus
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Access Site
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <div style={{
              padding: '16px 20px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 20,
              border: '1px solid var(--border-light)'
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                This website is user-uploaded content and not affiliated with this platform.
              </p>
            </div>
            <Button type="primary" onClick={handleConsent} block>
              Continue
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
