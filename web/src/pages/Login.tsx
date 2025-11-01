import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { OAuthProvider } from '../types';
import { handleRespWithoutNotify } from '../utils/handleResp';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [allowRegister, setAllowRegister] = useState(true);
  const { login, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Handle OAuth callback with token
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      // Store token
      localStorage.setItem('token', token);

      // Fetch user info
      apiService.getCurrentUser().then((response) => {
        handleRespWithoutNotify(response, (userData) => {
          localStorage.setItem('user', JSON.stringify(userData));
          message.success('Login successful!');
          // Refresh user in AuthContext
          refreshUser().then(() => {
            navigate('/dashboard', { replace: true });
          });
        });
      }).catch(() => {
        message.error('Failed to fetch user information');
        localStorage.removeItem('token');
      });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'OAuth authentication failed',
        invalid_provider: 'Invalid OAuth provider',
        token_exchange_failed: 'Failed to exchange authorization code',
        userinfo_failed: 'Failed to fetch user information',
        userinfo_read_failed: 'Failed to read user information',
        userinfo_parse_failed: 'Failed to parse user information',
        missing_name: 'Failed to get user name from OAuth provider',
        user_creation_failed: 'Failed to create user account',
        account_disabled: 'Your account has been disabled',
        token_generation_failed: 'Failed to generate authentication token',
      };
      message.error(errorMessages[error] || 'OAuth login failed');
      // Clear URL parameters
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, refreshUser]);

  useEffect(() => {
    const fetchData = async () => {
      const [providersResponse, configResponse] = await Promise.all([
        apiService.getOAuthProviders(),
        apiService.getPublicConfig()
      ]);

      handleRespWithoutNotify(providersResponse, (providers) => {
        setOauthProviders(providers);
      });

      handleRespWithoutNotify(configResponse, (config) => {
        setAllowRegister(config.allow_register);
      });
    };
    fetchData();
  }, []);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      // Note: Error notifications already handled by handleResp in AuthContext
      message.success('Login successful!');
      navigate('/dashboard');
    } catch {
      // Error already handled by handleResp in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (providerName: string) => {
    window.location.href = `/api/auth/oauth/login/${providerName}`;
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
            width: 48,
            height: 48,
            margin: '0 auto 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
          }}>
            SF
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sign in to manage your static websites</p>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter your password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        {oauthProviders && oauthProviders.length > 0 && (
          <>
            <Divider>Or continue with</Divider>
            <Space direction="vertical" className="w-full">
              {oauthProviders.map((provider) => (
                <Button
                  key={provider.name}
                  block
                  icon={provider.icon ? <img src={provider.icon} alt={provider.name} style={{ width: 24, height: 24 }} /> : undefined}
                  onClick={() => handleOAuthLogin(provider.name)}
                >
                  {provider.name}
                </Button>
              ))}
            </Space>
          </>
        )}

        {allowRegister && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: 14 }}>
              Sign up
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};
