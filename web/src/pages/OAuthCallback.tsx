import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { handleRespWithNotifySuccess } from '../utils/handleResp';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const provider = searchParams.get('provider');

      if (!code || !provider) {
        message.error('Invalid OAuth callback');
        navigate('/login');
        return;
      }

      const response = await apiService.oauthLogin({ provider, code });
      handleRespWithNotifySuccess(
        response,
        async (data) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          await refreshUser();
          navigate('/dashboard');
        },
        () => {
          navigate('/login');
        }
      );
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
      gap: 24
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
        marginBottom: 8
      }}>
        SF
      </div>
      <Spin size="large" />
      <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500 }}>
        Completing authentication...
      </div>
    </div>
  );
};
