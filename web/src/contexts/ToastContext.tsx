/**
 * Toast通知Context
 * 提供全局的消息提示功能
 */

import React, { createContext, useContext, useEffect } from 'react';
import { message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { setGlobalHandlers } from '../utils/handleResp';

interface ToastContextType {
  success: (content: string, duration?: number) => void;
  error: (content: string, duration?: number) => void;
  warning: (content: string, duration?: number) => void;
  info: (content: string, duration?: number) => void;
  loading: (content: string, duration?: number) => () => void;
  confirm: (config: {
    title: string;
    content?: string;
    onOk?: () => void | Promise<void>;
    onCancel?: () => void;
  }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // 配置全局message
  useEffect(() => {
    message.config({
      top: 80,
      duration: 3,
      maxCount: 3,
    });
  }, []);

  // 成功提示
  const success = (content: string, duration?: number) => {
    message.success({
      content,
      duration: duration ?? 3,
    });
  };

  // 错误提示
  const error = (content: string, duration?: number) => {
    message.error({
      content,
      duration: duration ?? 4,
    });
  };

  // 警告提示
  const warning = (content: string, duration?: number) => {
    message.warning({
      content,
      duration: duration ?? 3,
    });
  };

  // 信息提示
  const info = (content: string, duration?: number) => {
    message.info({
      content,
      duration: duration ?? 3,
    });
  };

  // 加载提示
  const loading = (content: string, duration?: number) => {
    const hide = message.loading({
      content,
      duration: duration ?? 0, // 0表示不自动关闭
    });
    return hide;
  };

  // 确认对话框
  const confirm = (config: {
    title: string;
    content?: string;
    onOk?: () => void | Promise<void>;
    onCancel?: () => void;
  }) => {
    Modal.confirm({
      title: config.title,
      content: config.content,
      onOk: config.onOk,
      onCancel: config.onCancel,
      okText: 'Confirm',
      cancelText: 'Cancel',
    });
  };

  // 注册全局处理器
  useEffect(() => {
    setGlobalHandlers({ success, error, warning, info }, logout, navigate);
  }, [logout, navigate]);

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
    loading,
    confirm,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

/**
 * Hook for using toast notifications
 *
 * @example
 * const toast = useToast();
 * toast.success('Operation successful!');
 * toast.error('Something went wrong');
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
