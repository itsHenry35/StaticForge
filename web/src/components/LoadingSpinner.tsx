/**
 * 加载动画组件
 * 提供美观的全屏加载效果
 */

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  tip?: string;
  fullScreen?: boolean;
  size?: 'small' | 'default' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip,
  fullScreen = true,
  size = 'large',
}) => {
  const { t } = useTranslation();
  const displayTip = tip || t('common.loading');
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : 24 }} spin />;

  if (fullScreen) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--bg-secondary)',
        }}
      >
        <Spin indicator={antIcon} size={size} />
        <p
          style={{
            marginTop: 20,
            color: 'var(--text-secondary)',
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {displayTip}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 0',
      }}
    >
      <Spin indicator={antIcon} size={size} tip={displayTip} />
    </div>
  );
};
