import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const items: MenuProps['items'] = [
    {
      key: 'en',
      label: 'English',
      onClick: () => i18n.changeLanguage('en'),
    },
    {
      key: 'zh-CN',
      label: '简体中文',
      onClick: () => i18n.changeLanguage('zh-CN'),
    },
  ];

  const currentLanguageLabel = i18n.language === 'zh-CN' ? '简体中文' : 'English';

  return (
    <Dropdown menu={{ items, selectedKeys: [i18n.language] }} placement="bottomRight">
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <GlobalOutlined />
        <span>{currentLanguageLabel}</span>
      </div>
    </Dropdown>
  );
};
