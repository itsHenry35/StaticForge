/**
 * 统一的API响应处理工具
 * 提供多种场景的响应处理方案
 */

import type { ApiResponse } from '../types/index';
import i18n from '../i18n';

// 全局处理器类型
interface ToastHandler {
  success: (content: string) => void;
  error: (content: string) => void;
  warning?: (content: string) => void;
  info?: (content: string) => void;
}

// 全局处理器
let globalToast: ToastHandler | null = null;
let globalLogout: (() => void) | null = null;
let globalNavigate: ((path: string) => void) | null = null;

/**
 * 设置全局处理器
 * 在ToastContext中调用此函数注册全局处理器
 */
export const setGlobalHandlers = (
  toast: ToastHandler,
  logout: () => void,
  navigate: (path: string) => void,
) => {
  globalToast = toast;
  globalLogout = logout;
  globalNavigate = navigate;
};

/**
 * 核心响应处理函数
 */
const handleRespCore = <T>(
  resp: ApiResponse<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
  options: {
    auth?: boolean;
    notifyError?: boolean;
    notifySuccess?: boolean;
  } = {},
) => {
  const { auth = true, notifyError = true, notifySuccess = false } = options;

  if (resp.code === 200) {
    // 成功响应
    if (notifySuccess && resp.message) {
      const translatedMessage = i18n.t(resp.message);
      globalToast?.success(translatedMessage);
    }

    // Always call success callback on 200, regardless of data presence
    success?.(resp.data as T);
  } else {
    // 错误响应
    if (notifyError && resp.message) {
      const translatedMessage = i18n.t(resp.message);
      globalToast?.error(translatedMessage);
    }

    // 401 未授权 - 自动退出登录
    if (auth && resp.code === 401) {
      globalLogout?.();
      globalNavigate?.('/login');
      return;
    }

    fail?.(resp.message, resp.code);
  }
};

/**
 * 标准响应处理
 * - 自动显示错误提示
 * - 自动处理401未授权
 *
 * @example
 * handleResp(
 *   await apiService.getProjects(),
 *   (data) => setProjects(data),
 *   (msg) => console.error(msg)
 * );
 */
export const handleResp = <T>(
  resp: ApiResponse<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
) => {
  handleRespCore(resp, success, fail, {
    auth: true,
    notifyError: true,
    notifySuccess: false,
  });
};

/**
 * 静默响应处理
 * - 不显示任何提示
 * - 自动处理401未授权
 *
 * 用于后台数据获取、轮询等场景
 *
 * @example
 * handleRespWithoutNotify(
 *   await apiService.getStats(),
 *   (data) => setStats(data)
 * );
 */
export const handleRespWithoutNotify = <T>(
  resp: ApiResponse<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
) => {
  handleRespCore(resp, success, fail, {
    auth: true,
    notifyError: false,
    notifySuccess: false,
  });
};

/**
 * 公共数据响应处理
 * - 不显示提示
 * - 不处理401（公共数据无需认证）
 *
 * 用于公开访问的数据
 *
 * @example
 * handleRespWithoutAuth(
 *   await apiService.getPublicData(),
 *   (data) => setData(data)
 * );
 */
export const handleRespWithoutAuth = <T>(
  resp: ApiResponse<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
) => {
  handleRespCore(resp, success, fail, {
    auth: false,
    notifyError: false,
    notifySuccess: false,
  });
};

/**
 * 成功提示响应处理
 * - 自动显示成功和错误提示
 * - 自动处理401未授权
 *
 * 用于创建、更新、删除等需要成功反馈的操作
 *
 * @example
 * handleRespWithNotifySuccess(
 *   await apiService.createProject(data),
 *   () => {
 *     fetchProjects();
 *     closeModal();
 *   }
 * );
 */
export const handleRespWithNotifySuccess = <T>(
  resp: ApiResponse<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
) => {
  handleRespCore(resp, success, fail, {
    auth: true,
    notifyError: true,
    notifySuccess: true,
  });
};

/**
 * Promise包装的响应处理
 * 将响应转换为Promise，便于async/await使用
 *
 * @example
 * try {
 *   const data = await handleRespAsync(await apiService.getProjects());
 *   setProjects(data);
 * } catch (error) {
 *   console.error(error);
 * }
 */
export const handleRespAsync = <T>(
  resp: ApiResponse<T>,
  options: {
    auth?: boolean;
    notifyError?: boolean;
    notifySuccess?: boolean;
  } = {},
): Promise<T> => {
  return new Promise((resolve, reject) => {
    handleRespCore(
      resp,
      (data) => resolve(data),
      (message, code) => reject({ message, code }),
      options,
    );
  });
};
