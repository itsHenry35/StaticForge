import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { apiService } from '../services/api';
import { handleRespWithNotifySuccess } from '../utils/handleResp';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onFinish = async (values: { username: string; display_name?: string; email: string; password: string }) => {
    setLoading(true);
    const resp = await apiService.register(values);
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
            {t('auth.createAccount')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.getStarted')}</p>
        </div>

        <Form name="register" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            label={t('auth.username')}
            rules={[
              { required: true, message: t('validation.pleaseEnterUsername') },
              { min: 3, message: t('validation.usernameMinLength') },
              { max: 50, message: t('validation.usernameMaxLength') },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('auth.enterUsername')} />
          </Form.Item>

          <Form.Item
            name="display_name"
            label={t('auth.displayName')}
          >
            <Input prefix={<IdcardOutlined />} placeholder={t('auth.enterDisplayName')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('validation.pleaseEnterEmail') },
              { type: 'email', message: t('validation.pleaseEnterValidEmail') },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder={t('auth.enterEmail')} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, message: t('validation.pleaseEnterPassword') },
              { min: 6, message: t('validation.passwordMinLength') },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.enterPassword')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('validation.pleaseConfirmPassword') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('validation.passwordsNotMatch')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPasswordPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('auth.signUp')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('auth.alreadyHaveAccount')}</span>
          <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: 14 }}>
            {t('auth.signIn2')}
          </Link>
        </div>
      </Card>
    </div>
  );
};
