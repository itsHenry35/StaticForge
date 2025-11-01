/**
 * 移动端检测Hook
 * 响应式地检测当前设备是否为移动设备
 */

import { useState, useEffect } from 'react';

/**
 * Hook方式响应式检测移动端
 *
 * @param breakpoint 断点宽度，默认768px
 * @returns 是否为移动端
 *
 * @example
 * const isMobile = useIsMobile();
 * const isTablet = useIsMobile(1024);
 *
 * return (
 *   <div>
 *     {isMobile ? <MobileMenu /> : <DesktopMenu />}
 *   </div>
 * );
 */
export const useIsMobile = (breakpoint: number = 768): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // 初始检测
    checkMobile();

    // 添加resize监听
    window.addEventListener('resize', checkMobile);

    // 清理
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
};

/**
 * 函数方式检测移动端（非响应式）
 * 仅在调用时检测一次
 *
 * @param breakpoint 断点宽度，默认768px
 * @returns 是否为移动端
 *
 * @example
 * if (IsMobile()) {
 *   // 执行移动端特定逻辑
 * }
 */
export const IsMobile = (breakpoint: number = 768): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth <= breakpoint;
};
