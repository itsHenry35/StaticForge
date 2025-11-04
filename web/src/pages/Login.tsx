import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { OAuthProvider } from '../types';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [allowRegister, setAllowRegister] = useState(true);
  const { user, setUser, refreshUser } = useAuth();
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
          message.success(t('success_login'));
          // Refresh user in AuthContext
          refreshUser().then(() => {
            navigate('/dashboard', { replace: true });
          });
        });
      }).catch(() => {
        message.error(t('error_userinfo_failed'));
        localStorage.removeItem('token');
      });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: t('error_oauth_failed'),
        invalid_provider: t('error_invalid_oauth_provider'),
        token_exchange_failed: t('error_token_exchange_failed'),
        userinfo_failed: t('error_userinfo_failed'),
        userinfo_read_failed: t('error_userinfo_read_failed'),
        userinfo_parse_failed: t('error_userinfo_parse_failed'),
        missing_name: t('error_missing_name'),
        user_creation_failed: t('error_user_creation_failed'),
        account_disabled: t('error_account_disabled'),
        token_generation_failed: t('error_token_generation_failed'),
      };
      message.error(errorMessages[error] || t('error_oauth_failed'));
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
    const resp = await apiService.login(values);
    handleRespWithNotifySuccess(resp, (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    }, () => {
      setLoading(false);
    });
    setLoading(false);
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
      padding: 16,
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>
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
            {t('auth.welcomeBack')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.signInDescription')}</p>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            label={t('auth.username')}
            rules={[{ required: true, message: t('validation.pleaseEnterUsername') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('auth.enterUsername')} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[{ required: true, message: t('validation.pleaseEnterPassword') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.enterPassword')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('auth.signIn')}
            </Button>
          </Form.Item>
        </Form>

        {oauthProviders && oauthProviders.length > 0 && (
          <>
            <Divider>{t('auth.orContinueWith')}</Divider>
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
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('auth.dontHaveAccount')}</span>
            <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: 14 }}>
              {t('auth.signUp')}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};
