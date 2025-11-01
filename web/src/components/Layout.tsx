import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Dropdown, Avatar, Drawer, Button } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  ProjectOutlined,
  LogoutOutlined,
  DashboardOutlined,
  TeamOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { PageTransition } from './PageTransition';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Dashboard</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
  ];

  if (user?.is_admin) {
    menuItems.push({
      key: '/admin',
      icon: <TeamOutlined />,
      label: <Link to="/admin">Admin</Link>,
    });
  }

  return (
    <AntLayout className="app-shell">
      <Header className="app-topbar">
        <Link to="/dashboard" className="app-topbar__brand">
          <span className="app-topbar__mark">SF</span>
          <span className="app-topbar__title">
            <span>StaticForge</span>
            <span>Site workspace</span>
          </span>
        </Link>
        {!isMobile && (
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="app-topbar__menu"
          />
        )}
        <div className="app-topbar__actions">
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
            />
          ) : (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="app-topbar__user cursor-pointer">
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    background: 'var(--primary-color)',
                  }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {user?.display_name || user?.username}
                </span>
              </div>
            </Dropdown>
          )}
        </div>
      </Header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        className="app-drawer"
        title={
          <div className="app-topbar__brand app-drawer__title">
            <span className="app-topbar__mark">SF</span>
            <span className="app-topbar__title">
              <span>StaticForge</span>
              <span>Site workspace</span>
            </span>
          </div>
        }
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => setDrawerVisible(false)}
          className="app-drawer__menu"
        />
        <div className="app-drawer__footer">
          <button
            type="button"
            className="app-drawer__profile"
            onClick={() => {
              setDrawerVisible(false);
              navigate('/profile');
            }}
          >
            <Avatar
              icon={<UserOutlined />}
              style={{
                background: 'var(--primary-color)',
              }}
            />
            <div className="text-left">
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.display_name || user?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {user?.is_admin ? 'Administrator' : 'User'}
              </div>
            </div>
          </button>
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={() => {
              setDrawerVisible(false);
              handleLogout();
            }}
            className="w-full mt-2"
          >
            Logout
          </Button>
        </div>
      </Drawer>

      <Content className="app-content">
        <PageTransition>
          <div className="app-content__inner">{children}</div>
        </PageTransition>
      </Content>
    </AntLayout>
  );
};
