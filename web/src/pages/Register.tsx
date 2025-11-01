import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onFinish = async (values: { username: string; display_name?: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values);
      message.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Get started with StaticForge</p>
        </div>

        <Form name="register" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { min: 3, message: 'Username must be at least 3 characters' },
              { max: 50, message: 'Username must be at most 50 characters' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Display Name"
          >
            <Input prefix={<IdcardOutlined />} placeholder="Enter display name (optional)" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Sign Up
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: 14 }}>
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};
