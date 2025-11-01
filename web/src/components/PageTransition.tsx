/**
 * 页面过渡动画组件
 * 为页面切换添加淡入淡出效果
 */

import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  duration = 300,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
};
