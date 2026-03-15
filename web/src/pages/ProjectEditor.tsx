import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  message,
  Modal,
  Form,
  Input,
  Upload,
  Popconfirm,
  Space,
  Drawer,
  Card,
  Row,
  Col,
  Statistic,
  Menu,
  Tooltip,
  Switch,
  ConfigProvider,
  theme as antTheme,
  App,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  UploadOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  ArrowLeftOutlined,
  FolderAddOutlined,
  FileOutlined,
  FileAddOutlined,
  CloudUploadOutlined,
  ShareAltOutlined,
  ExportOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as monaco from '../monacoSetup';
import { loader, Editor } from '@monaco-editor/react';
import { apiService } from '../services/api';
import type { Project, File as FileType, Analytics, PublicConfig } from '../types';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import { FileTree } from '../components/FileTree';
import type { InlineEditState, DroppedFile } from '../components/FileTree';
import {
  Layout as FlexLayoutComponent,
  Model as FlexModel,
  TabNode,
  Actions,
  DockLocation,
} from 'flexlayout-react';
import type { IJsonModel, ITabRenderValues, Action } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { QRCodeSVG } from 'qrcode.react';

const { Sider, Content } = Layout;

// ── FlexLayout types & config ───────────────────────────────────────────────

interface OpenFileData {
  file: FileType;
  content: string;
  dirty: boolean;
}

const defaultLayout: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetMinWidth: 100,
    tabSetMinHeight: 50,
    splitterSize: 4,
  },
  borders: [],
  layout: {
    type: 'row',
    children: [{ type: 'tabset', id: 'main', weight: 100, children: [] }],
  },
};

// Dark tab bar that blends with vs-dark Monaco
const FLEX_CSS = `
  .flexlayout__layout { background: #1e1e1e; }
  .flexlayout__tabset { background: #1e1e1e; }
  .flexlayout__tabset_tabbar_outer {
    background: #2d2d2d;
    border-bottom: 1px solid #1a1a1a;
  }
  .flexlayout__tab_button {
    padding: 5px 12px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #969696;
    transition: color 0.15s;
  }
  .flexlayout__tab_button:hover { color: #ccc; background: rgba(255,255,255,0.06); }
  .flexlayout__tab_button--selected {
    background: #1e1e1e;
    color: #ccc;
    border-top: 1px solid #3B82F6;
  }
  .flexlayout__tab_button_trailing {
    opacity: 0.35;
    width: 14px; height: 14px;
    margin-left: 6px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 2px;
    transition: opacity 0.15s, background 0.15s;
  }
  .flexlayout__tab_button:hover .flexlayout__tab_button_trailing,
  .flexlayout__tab_button--selected .flexlayout__tab_button_trailing { opacity: 0.7; }
  .flexlayout__tab_button_trailing:hover { background: rgba(255,255,255,0.15) !important; opacity: 1 !important; }
  .flexlayout__tab { background: #1e1e1e; overflow: hidden; }
  .flexlayout__splitter { background: #3a3a3a; }
  .flexlayout__splitter:hover, .flexlayout__splitter_drag { background: #3B82F6; }
  .flexlayout__outline_rect { border: 2px solid #3B82F6; border-radius: 4px; }
  .flexlayout__drag_rect { background: rgba(59,130,246,0.1); border: 2px dashed #3B82F6; border-radius: 4px; }
  .flexlayout__popup_menu {
    background: #2d2d2d; border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    border: 1px solid #444; padding: 4px; font-size: 13px;
  }
  .flexlayout__popup_menu_item { padding: 6px 12px; border-radius: 4px; color: #ccc; cursor: pointer; }
  .flexlayout__popup_menu_item:hover { background: rgba(59,130,246,0.25); color: #fff; }
`;

// ── Switch with Tooltip that forwards Form.Item props correctly ──────────────

const TooltipSwitch: React.FC<{
  disabled?: boolean;
  tooltipTitle?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}> = ({ disabled, tooltipTitle, checked, onChange }) => (
  <Tooltip title={tooltipTitle}>
    <Switch checked={checked} onChange={onChange} disabled={disabled} />
  </Tooltip>
);

// ── Reusable share content (URL + iframe + QR) ───────────────────────────────

const ShareContent: React.FC<{ siteUrl: string; secureUrl?: string }> = ({ siteUrl, secureUrl }) => {
  const { t } = useTranslation();
  const iframeCode = `<iframe src="${siteUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    message.success(t(key));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: '#969696', marginBottom: 6 }}>{t('editor.siteUrl')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input value={siteUrl} readOnly style={{ flex: 1 }} onClick={(e) => e.currentTarget.select()} />
          <Button icon={<CopyOutlined />} onClick={() => copy(siteUrl, 'editor.urlCopied')} />
        </div>
      </div>
      {secureUrl && (
        <div>
          <div style={{ fontSize: 12, color: '#969696', marginBottom: 6 }}>{t('editor.secureUrl')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input value={secureUrl} readOnly style={{ flex: 1 }} onClick={(e) => e.currentTarget.select()} />
            <Button icon={<CopyOutlined />} onClick={() => copy(secureUrl, 'editor.urlCopied')} />
          </div>
        </div>
      )}
      <div>
        <div style={{ fontSize: 12, color: '#969696', marginBottom: 6 }}>{t('editor.embedCode')}</div>
        <Input.TextArea
          value={iframeCode}
          readOnly
          autoSize={{ minRows: 2, maxRows: 3 }}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
          onClick={(e) => e.currentTarget.select()}
        />
        <Button
          size="small"
          icon={<CopyOutlined />}
          style={{ marginTop: 6 }}
          onClick={() => copy(iframeCode, 'editor.iframeCopied')}
        >
          {t('editor.copyCode')}
        </Button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
          <QRCodeSVG value={siteUrl} size={148} />
        </div>
      </div>
    </div>
  );
};

// ── Authenticated iframe preview tab ─────────────────────────────────────────

const PreviewTabContent: React.FC<{ projectId: number; refreshKey: number }> = ({ projectId, refreshKey }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = `/api/projects/${projectId}/preview/`;

  useEffect(() => {
    if (refreshKey > 0) {
      iframeRef.current?.contentWindow?.location.reload();
    }
  }, [refreshKey]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      title="Preview"
    />
  );
};

const isMediaFile = (mimeType: string) =>
  mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/');

const MediaTabContent: React.FC<{ projectId: number; filePath: string; mimeType: string }> = ({ projectId, filePath, mimeType }) => {
  const src = `/api/projects/${projectId}/preview/${filePath}`;

  const style: React.CSSProperties = { maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' };

  if (mimeType.startsWith('image/')) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
        <img src={src} alt={filePath} style={style} />
      </div>
    );
  }
  if (mimeType.startsWith('video/')) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
        <video src={src} controls style={style} />
      </div>
    );
  }
  if (mimeType.startsWith('audio/')) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <audio src={src} controls />
      </div>
    );
  }
  return null;
};

// ── Per-tab Monaco editor (uncontrolled — defaultValue avoids cursor jumps) ──

const EditorTabContent: React.FC<{
  filePath: string;
  initialContent: string;
  language: string;
  onContentChange: (filePath: string, content: string) => void;
}> = ({ filePath, initialContent, language, onContentChange }) => {
  return (
    <Editor
      height="100%"
      language={language}
      defaultValue={initialContent}
      onChange={(value) => onContentChange(filePath, value ?? '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        lineHeight: 1.6,
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
};

const ProjectEditorInner: React.FC = () => {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [files, setFiles] = useState<FileType[]>([]);
  const [, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileType | null>(null);
  const [inlineEditState, setInlineEditState] = useState<InlineEditState | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [treeSelectedPaths, setTreeSelectedPaths] = useState<Set<string>>(new Set());
  const [contextMenuNode, setContextMenuNode] = useState<FileType | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState(false);
  const [siderWidth, setSiderWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [settingsForm] = Form.useForm();
  const [publishForm] = Form.useForm();
  const folderInputRef = useRef<HTMLInputElement>(null);

  // FlexLayout state
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFileData>>({});
  const openFilesRef = useRef<Record<string, OpenFileData>>({});
  openFilesRef.current = openFiles;
  const [flexModel] = useState<FlexModel>(() => FlexModel.fromJson(defaultLayout));
  const flexLayoutRef = useRef<FlexLayoutComponent>(null);
  const [, forceUpdate] = useState(0);
  const initialOpenDoneRef = useRef(false);
  const skipDirtyCheckRef = useRef(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  loader.config({ monaco });

  const projectId = parseInt(id || '0');

  const fetchProject = async (onFilesLoaded?: (files: FileType[]) => void) => {
    const projectResponse = await apiService.getProject(projectId);
    handleRespWithoutNotify(
      projectResponse,
      (data) => {
        setProject(data);
        const pageTitle = data.display_name || data.name;
        if (pageTitle) {
          apiService.getPublicConfig().then((res) => {
            const siteName = res.data?.site_name || '';
            document.title = siteName ? `${pageTitle} - ${siteName}` : pageTitle;
            if (res.data) setPublicConfig(res.data);
          });
        }
        if (data.display_name) {
          settingsForm.setFieldsValue({
            display_name: data.display_name,
            description: data.description,
            is_published: data.is_published,
            is_secure: (data.owner_type === 'verified' || data.owner_type === 'admin') ? data.is_secure : false,
          });
        }
      },
      () => {
        navigate('/projects');
      }
    );

    // Fetch files from filesystem
    const filesResponse = await apiService.getProjectFiles(projectId);
    handleRespWithoutNotify(
      filesResponse,
      (filesData) => {
        setFiles(filesData);
        setLoading(false);
        onFilesLoaded?.(filesData);
      }
    );
  };

  const fetchAnalytics = async () => {
    const response = await apiService.getProjectAnalytics(projectId);
    handleRespWithoutNotify(response, (data) => {
      setAnalytics(data);
    });
  };

  useEffect(() => {
    const prevTitle = document.title;
    fetchProject();
    return () => { document.title = prevTitle; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Inject FlexLayout dark theme CSS
  useEffect(() => {
    const id = 'editor-flexlayout-style';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = FLEX_CSS;
      document.head.appendChild(el);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Auto-open index.html + preview on first load
  useEffect(() => {
    if (files.length > 0 && !initialOpenDoneRef.current) {
      initialOpenDoneRef.current = true;
      const indexFile = files.find(f => f.name === 'index.html' && (f.path === 'index.html' || f.path === '/index.html'));
      if (indexFile) {
        // Wait for openFile to finish (tab + tabset created) before splitting preview to the right
        openFileRef.current(indexFile).then(() => {
          openPreviewTabRef.current();
        });
      }
    }
  }, [files]);

  // Open a file: focus existing tab or fetch content and create new tab
  const openFile = useCallback(async (file: FileType) => {
    if (file.is_folder) return;

    // Check if already open → focus its tab
    let existingTabId: string | null = null;
    flexModel.visitNodes((node) => {
      if (node.getType() === 'tab') {
        const cfg = (node as TabNode).getConfig() as { filePath?: string };
        if (cfg?.filePath === file.path) existingTabId = node.getId();
      }
    });
    if (existingTabId) {
      flexModel.doAction(Actions.selectTab(existingTabId));
      forceUpdate(n => n + 1);
      return;
    }

    // Media files: skip content fetch, open preview tab directly
    if (isMediaFile(file.mime_type)) {
      const entry: OpenFileData = { file, content: '', dirty: false };
      openFilesRef.current = { ...openFilesRef.current, [file.path]: entry };
      setOpenFiles(openFilesRef.current);

      const isPreviewOnly = (ts: ReturnType<typeof flexModel.getActiveTabset>) =>
        !!ts && ts.getChildren().length > 0 &&
        ts.getChildren().every(child => (child as TabNode).getComponent() === 'preview');
      let tabSetId: string | null = null;
      const activeTs = flexModel.getActiveTabset();
      if (activeTs && !isPreviewOnly(activeTs)) tabSetId = activeTs.getId();
      if (!tabSetId) {
        flexModel.visitNodes((n) => {
          if (n.getType() === 'tabset' && !tabSetId && !isPreviewOnly(n as typeof activeTs)) tabSetId = n.getId();
        });
      }
      if (!tabSetId) tabSetId = activeTs?.getId() ?? 'main';
      flexModel.doAction(Actions.addNode(
        { type: 'tab', name: file.name, component: 'editor', config: { filePath: file.path } },
        tabSetId, DockLocation.CENTER, -1,
      ));
      forceUpdate(n => n + 1);
      return;
    }

    // Fetch content then open new tab
    const response = await apiService.getFileByPath(projectId, file.path);
    handleRespWithoutNotify(response, (fileData) => {
      const entry: OpenFileData = { file: fileData, content: fileData.content ?? '', dirty: false };
      // Update ref immediately so factory sees it before re-render
      openFilesRef.current = { ...openFilesRef.current, [file.path]: entry };
      setOpenFiles(openFilesRef.current);

      // Find best tabset: prefer one that already has editor tabs, avoid preview-only tabsets
      const isPreviewOnly = (ts: ReturnType<typeof flexModel.getActiveTabset>) =>
        !!ts && ts.getChildren().length > 0 &&
        ts.getChildren().every(child => (child as TabNode).getComponent() === 'preview');

      let tabSetId: string | null = null;
      const active = flexModel.getActiveTabset();
      if (active && !isPreviewOnly(active)) tabSetId = active.getId();
      if (!tabSetId) {
        flexModel.visitNodes((n) => {
          if (n.getType() === 'tabset' && !tabSetId && !isPreviewOnly(n as typeof active)) {
            tabSetId = n.getId();
          }
        });
      }
      if (!tabSetId) tabSetId = active?.getId() ?? 'main';

      flexModel.doAction(Actions.addNode(
        { type: 'tab', name: file.name, component: 'editor', config: { filePath: file.path } },
        tabSetId,
        DockLocation.CENTER,
        -1,
      ));
      forceUpdate(n => n + 1);
    });
  }, [flexModel, projectId]);

  // Keep a stable ref so useEffect can call openFile without stale closure
  const openFileRef = useRef(openFile);
  openFileRef.current = openFile;

  // Save one file by path
  const saveFile = useCallback(async (filePath: string) => {
    const data = openFilesRef.current[filePath];
    if (!data?.dirty) return;
    const response = await apiService.updateFileByPath(projectId, filePath, data.content);
    handleRespWithoutNotify(response, () => {
      setOpenFiles(prev => ({ ...prev, [filePath]: { ...prev[filePath], dirty: false } }));
      setPreviewRefreshKey(k => k + 1);
    });
  }, [projectId]);

  // Stable callback for editor onChange (avoids re-mounting Monaco)
  const handleContentChange = useCallback((filePath: string, content: string) => {
    setOpenFiles(prev => ({
      ...prev,
      [filePath]: { ...prev[filePath], content, dirty: true },
    }));
  }, []);

  // Factory: render editor or preview for each FlexLayout tab
  const factory = useCallback((node: TabNode) => {
    const cfg = (node.getConfig() ?? {}) as { filePath?: string; type?: string };
    if (cfg.type === 'preview') {
      return <PreviewTabContent key="preview" projectId={projectId} refreshKey={previewRefreshKey} />;
    }
    const { filePath } = cfg;
    if (!filePath) return <div style={{ padding: 16, color: '#969696' }}>Unknown tab</div>;
    const data = openFilesRef.current[filePath];
    if (!data) return <div style={{ padding: 16, color: '#969696' }}>Loading…</div>;
    if (isMediaFile(data.file.mime_type)) {
      return <MediaTabContent key={filePath} projectId={projectId} filePath={filePath} mimeType={data.file.mime_type} />;
    }
    return (
      <EditorTabContent
        key={filePath}
        filePath={filePath}
        initialContent={data.content}
        language={getLanguageFromFilename(data.file.name)}
        onContentChange={handleContentChange}
      />
    );
  }, [handleContentChange, projectId, previewRefreshKey]);

  // Open (or focus) the single preview tab, always splitting to the right
  const openPreviewTab = useCallback(() => {
    // If preview tab already exists, just focus it
    let existingId: string | null = null;
    flexModel.visitNodes((node) => {
      if (node.getType() === 'tab') {
        const cfg = (node as TabNode).getConfig() as { type?: string };
        if (cfg?.type === 'preview') existingId = node.getId();
      }
    });
    if (existingId) {
      flexModel.doAction(Actions.selectTab(existingId));
      forceUpdate(n => n + 1);
      return;
    }

    // Find a tabset to anchor the split from (prefer active, fallback to any)
    let anchorId: string | null = null;
    const active = flexModel.getActiveTabset();
    if (active) {
      anchorId = active.getId();
    } else {
      flexModel.visitNodes((node) => {
        if (node.getType() === 'tabset' && !anchorId) anchorId = node.getId();
      });
    }

    const tabDef = { type: 'tab', name: t('editor.preview'), component: 'preview', config: { type: 'preview' } };

    if (anchorId) {
      // Split right of the anchor tabset
      flexModel.doAction(Actions.addNode(tabDef, anchorId, DockLocation.RIGHT, -1));
    } else {
      // No tabsets at all — add to the root row
      flexModel.doAction(Actions.addNode(tabDef, flexModel.getRoot().getId(), DockLocation.CENTER, -1));
    }
    forceUpdate(n => n + 1);
  }, [flexModel, t]);
  const openPreviewTabRef = useRef(openPreviewTab);
  openPreviewTabRef.current = openPreviewTab;

  // Show a dot on dirty tabs; show parent folder when filename is ambiguous
  const onRenderTab = useCallback((node: TabNode, renderValues: ITabRenderValues) => {
    const { filePath } = (node.getConfig() ?? {}) as { filePath?: string };
    if (!filePath) return;
    const data = openFilesRef.current[filePath];
    if (!data) return;

    if (data.dirty) {
      renderValues.buttons.push(
        <div key="dirty" style={{ width: 7, height: 7, borderRadius: '50%', background: '#6b9ef4', margin: '0 3px', flexShrink: 0, alignSelf: 'center' }} />
      );
    }

    const fileName = data.file.name;
    const hasDuplicate = Object.entries(openFilesRef.current).some(
      ([fp, d]) => fp !== filePath && d.file.name === fileName
    );
    if (hasDuplicate) {
      const lastSlash = filePath.lastIndexOf('/');
      const parentPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
      const parentLabel = parentPath.includes('/')
        ? parentPath.substring(parentPath.lastIndexOf('/') + 1)
        : parentPath || '/';
      renderValues.content = (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span>{fileName}</span>
          <span style={{ fontSize: 11, color: '#6b6b6b', fontWeight: 400 }}>{parentLabel}</span>
        </span>
      );
    }
  }, []);

  // Sync openFiles when tabs are closed
  const handleModelChange = useCallback(() => {
    const openPaths = new Set<string>();
    flexModel.visitNodes((node) => {
      if (node.getType() === 'tab') {
        const cfg = (node as TabNode).getConfig() as { filePath?: string };
        if (cfg?.filePath) openPaths.add(cfg.filePath);
      }
    });

    const closedPaths = Object.keys(openFilesRef.current).filter(fp => !openPaths.has(fp));
    if (closedPaths.length > 0) {
      setOpenFiles(prev => {
        const next = { ...prev };
        for (const fp of closedPaths) delete next[fp];
        return next;
      });
    }
    forceUpdate(n => n + 1);
  }, [flexModel]);

  // Intercept tab close — prompt if file is dirty
  const handleAction = useCallback((action: Action): Action | undefined => {
    if (action.type === Actions.DELETE_TAB && !skipDirtyCheckRef.current) {
      const nodeId = (action as unknown as { data: { node: string } }).data.node;
      const node = flexModel.getNodeById(nodeId) as TabNode | null;
      if (node) {
        const { filePath } = (node.getConfig() ?? {}) as { filePath?: string };
        if (filePath && openFilesRef.current[filePath]?.dirty) {
          const fileName = openFilesRef.current[filePath].file.name;

          const instance = modal.confirm({
            rootClassName: 'editor-dark-portal',
            title: t('editor.unsavedChanges'),
            icon: null,
            closable: true,
            maskClosable: false,
            footer: null,
            content: (
              <div>
                <p style={{ marginBottom: 16 }}>{t('editor.unsavedChangesDesc', { name: fileName })}</p>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => instance.destroy()}>{t('editor.cancel')}</Button>
                  <Button danger onClick={() => {
                    instance.destroy();
                    skipDirtyCheckRef.current = true;
                    flexModel.doAction(Actions.deleteTab(nodeId));
                    skipDirtyCheckRef.current = false;
                  }}>{t('editor.discardChanges')}</Button>
                  <Button type="primary" onClick={async () => {
                    await saveFile(filePath);
                    instance.destroy();
                    skipDirtyCheckRef.current = true;
                    flexModel.doAction(Actions.deleteTab(nodeId));
                    skipDirtyCheckRef.current = false;
                  }}>{t('editor.saveAndClose')}</Button>
                </Space>
              </div>
            ),
          });
          return undefined; // cancel the action
        }
      }
    }
    return action;
  }, [flexModel, saveFile, t]);

  // Block browser refresh / back-forward when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.values(openFilesRef.current).some(f => f.dirty)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Ctrl+S: save the active tab's file
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        const active = flexModel.getActiveTabset();
        if (!active) return;
        const tab = active.getSelectedNode() as TabNode | null;
        if (!tab) return;
        const { filePath } = (tab.getConfig() ?? {}) as { filePath?: string };
        if (filePath) saveFile(filePath);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flexModel, saveFile]);

  // Get target path for upload/create based on current selection
  const getTargetPath = () => {
    if (selectedFolder) return selectedFolder.path;
    // Use the active tab's file parent
    const active = flexModel.getActiveTabset();
    if (active) {
      const tab = active.getSelectedNode() as TabNode | null;
      if (tab) {
        const { filePath } = (tab.getConfig() ?? {}) as { filePath?: string };
        if (filePath) {
          const parent = filePath.substring(0, filePath.lastIndexOf('/'));
          return parent || '/';
        }
      }
    }
    return '/';
  };

  const handleUpload = async (file: globalThis.File) => {
    const uploadPath = getTargetPath();
    const targetFilePath = (uploadPath === '/' ? '' : uploadPath + '/') + file.name;
    const exists = files.some(f => !f.is_folder && f.path === targetFilePath);
    if (exists) {
      const instance = modal.confirm({
        rootClassName: 'editor-dark-portal',
        title: t('editor.fileExistsOverwriteTitle'),
        icon: null,
        footer: null,
        content: (
          <>
            <p>{t('editor.fileExistsOverwriteContent', { name: file.name })}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => instance.destroy()}>{t('common.cancel')}</Button>
              <Button type="primary" onClick={async () => {
                instance.destroy();
                const response = await apiService.uploadFile(projectId, file, uploadPath, true);
                handleRespWithNotifySuccess(response, () => { fetchProject(); });
              }}>{t('editor.overwrite')}</Button>
            </div>
          </>
        ),
      });
      return false;
    }
    const response = await apiService.uploadFile(projectId, file, uploadPath);
    handleRespWithNotifySuccess(response, () => {
      fetchProject();
    });
    return false; // Prevent default upload
  };

  // Handle file drop from external sources (supports folders via DroppedFile.relativePath)
  const handleFileDrop = async (droppedFiles: DroppedFile[], targetFolder: FileType | null) => {
    const baseUploadPath = targetFolder ? targetFolder.path : '/';

    // Compute actual upload dir for each file based on its relative path
    const getUploadDir = (relativePath: string) => {
      const dir = relativePath.includes('/')
        ? relativePath.substring(0, relativePath.lastIndexOf('/'))
        : '';
      if (!dir) return baseUploadPath;
      return baseUploadPath === '/' ? dir : `${baseUploadPath}/${dir}`;
    };

    const getTargetFilePath = (relativePath: string) => {
      const dir = getUploadDir(relativePath);
      const name = relativePath.split('/').pop()!;
      return dir === '/' ? name : `${dir}/${name}`;
    };

    // Separate into conflicting and non-conflicting
    const conflicting: DroppedFile[] = [];
    const nonConflicting: DroppedFile[] = [];
    for (const dropped of droppedFiles) {
      const targetPath = getTargetFilePath(dropped.relativePath);
      if (files.some(f => !f.is_folder && f.path === targetPath)) {
        conflicting.push(dropped);
      } else {
        nonConflicting.push(dropped);
      }
    }

    // Ask about each conflict one by one, with "Overwrite All" option
    const toOverwrite: DroppedFile[] = [];
    let overwriteAll = false;

    for (const dropped of conflicting) {
      if (overwriteAll) {
        toOverwrite.push(dropped);
        continue;
      }
      const fileName = dropped.relativePath.split('/').pop()!;
      const choice = await new Promise<'overwrite' | 'overwriteAll' | 'skip'>((resolve) => {
        const instance = modal.confirm({
          rootClassName: 'editor-dark-portal',
          title: t('editor.fileExistsOverwriteTitle'),
          icon: null,
          footer: null,
          content: (
            <>
              <p>{t('editor.fileExistsOverwriteContent', { name: fileName })}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Button onClick={() => { resolve('skip'); instance.destroy(); }}>{t('editor.skip')}</Button>
                <Button type="primary" onClick={() => { resolve('overwrite'); instance.destroy(); }}>{t('editor.overwrite')}</Button>
                <Button type="primary" onClick={() => { resolve('overwriteAll'); instance.destroy(); }}>{t('editor.overwriteAll')}</Button>
              </div>
            </>
          ),
          onCancel: () => resolve('skip'),
        });
      });
      if (choice === 'overwriteAll') {
        overwriteAll = true;
        toOverwrite.push(dropped);
      } else if (choice === 'overwrite') {
        toOverwrite.push(dropped);
      }
    }

    const allToUpload = [
      ...nonConflicting.map(d => ({ dropped: d, overwrite: false })),
      ...toOverwrite.map(d => ({ dropped: d, overwrite: true })),
    ];

    if (allToUpload.length === 0) return;

    if (allToUpload.length === 1) {
      const { dropped, overwrite } = allToUpload[0];
      const response = await apiService.uploadFile(projectId, dropped.file, getUploadDir(dropped.relativePath), overwrite);
      handleRespWithNotifySuccess(response, () => { fetchProject(); });
    } else {
      message.loading({ content: t('common.uploading', { count: allToUpload.length }), key: 'filesDrop', duration: 0 });
      let successCount = 0;
      let errorCount = 0;
      for (const { dropped, overwrite } of allToUpload) {
        const response = await apiService.uploadFile(projectId, dropped.file, getUploadDir(dropped.relativePath), overwrite);
        handleRespWithoutNotify(response, () => { successCount++; }, () => { errorCount++; });
      }
      message.destroy('filesDrop');
      if (errorCount === 0) {
        message.success(t('editor.uploadedFilesSuccess', { count: successCount }));
      } else {
        message.warning(t('editor.uploadedFilesMixed', { success: successCount, error: errorCount }));
      }
      fetchProject();
    }
  };

  // Handle folder upload
  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFolder(true);
    const uploadPath = getTargetPath();

    message.loading({ content: t('common.uploading', { count: files.length }), key: 'folderUpload', duration: 0 });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Get relative path from webkitRelativePath
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      pathParts.shift(); // Remove the root folder name
      const filePath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      const finalPath = uploadPath === '/' ? filePath : `${uploadPath}/${filePath}`.replace(/\/+/g, '/');

      const response = await apiService.uploadFile(projectId, file, finalPath);
      handleRespWithoutNotify(
        response,
        () => {
          successCount++;
        },
        () => {
          errorCount++;
        }
      );
    }

    setUploadingFolder(false);
    message.destroy('folderUpload');

    if (errorCount === 0) {
      message.success(t('editor.uploadedFilesSuccess', { count: successCount }));
    } else {
      message.warning(t('editor.uploadedFilesMixed', { success: successCount, error: errorCount }));
    }

    fetchProject();

    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleInlineCreate = async (name: string, parentPath: string, isFolder: boolean) => {
    const expectedPath = parentPath === '/' ? name : `${parentPath}/${name}`;

    const afterCreate = () => {
      fetchProject((newFiles) => {
        const file = newFiles.find(f => f.path === expectedPath || f.path === `/${expectedPath}`);
        if (!file) return;
        if (file.is_folder) {
          setSelectedFolder(file);
        } else {
          openFile(file);
        }
      });
    };

    if (isFolder) {
      const response = await apiService.createFolder(projectId, { path: parentPath, name });
      handleRespWithNotifySuccess(response, afterCreate);
    } else {
      const blob = new Blob([''], { type: 'text/plain' });
      const file = new File([blob], name);
      const response = await apiService.uploadFile(projectId, file, parentPath);
      handleRespWithNotifySuccess(response, afterCreate);
    }
  };

  // Right-click context menu
  const handleContextMenu = (event: React.MouseEvent, node: FileType) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuNode(node);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  };

  const handleContextMenuClick = (e: { key: string; }) => {
    setContextMenuVisible(false);

    if (!contextMenuNode) return;

    const isMultiSelect = treeSelectedPaths.size > 1;

    switch (e.key) {
      case 'rename':
        setInlineEditState({ type: 'rename', file: contextMenuNode });
        break;
      case 'delete':
        if (isMultiSelect) {
          const selectedFiles = files.filter(f => treeSelectedPaths.has(f.path));
          handleDeleteMultiple(selectedFiles);
        } else {
          handleDelete(contextMenuNode);
        }
        break;
      case 'newFolder':
        setInlineEditState({
          type: 'new-folder',
          parentPath: contextMenuNode.is_folder ? contextMenuNode.path : '/',
        });
        break;
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenuVisible(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Resizable sider
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSiderWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Drag and drop
  const handleDrop = async (dragFile: FileType, dropFile: FileType, dropToGap: boolean) => {
    if (!dragFile) return;

    // Prevent dropping onto itself
    if (dragFile.path === dropFile.path) return;

    // Prevent dropping index.html
    if (dragFile.path === 'index.html' || dragFile.path === '/index.html') {
      message.error(t('editor.cannotMoveIndex'));
      return;
    }

    // Determine target directory
    let targetPath = '/';

    if (dropToGap) {
      // Dropped between nodes - use parent directory
      const dropParentPath = dropFile.path.substring(0, dropFile.path.lastIndexOf('/'));
      targetPath = dropParentPath || '/';
    } else {
      // Dropped on a node
      if (dropFile.is_folder) {
        // Dropped on a folder - use it as target
        targetPath = dropFile.path;
      } else {
        // Dropped on a file - use its parent directory
        const dropParentPath = dropFile.path.substring(0, dropFile.path.lastIndexOf('/'));
        targetPath = dropParentPath || '/';
      }
    }

    // Calculate new path for the dragged file
    const fileName = dragFile.name;
    const newPath = targetPath === '/' ? fileName : `${targetPath}/${fileName}`;

    // Check if already in target location
    if (dragFile.path === newPath) return;

    // Check if target path already exists
    const existingFile = files.find(f => f.path === newPath);
    if (existingFile) {
      const instance = modal.confirm({
        rootClassName: 'editor-dark-portal',
        title: t('editor.fileExistsOverwriteTitle'),
        icon: null,
        footer: null,
        content: (
          <>
            <p>{t('editor.fileExistsOverwriteContent', { name: dragFile.name })}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => instance.destroy()}>{t('common.cancel')}</Button>
              <Button type="primary" onClick={async () => {
                instance.destroy();
                const response = await apiService.moveFileByPath(projectId, dragFile.path, targetPath, true);
                handleRespWithNotifySuccess(response, () => { fetchProject(); });
              }}>{t('editor.overwrite')}</Button>
            </div>
          </>
        ),
      });
      return;
    }

    // Use the new move API
    const response = await apiService.moveFileByPath(projectId, dragFile.path, targetPath);
    handleRespWithNotifySuccess(response, () => {
      fetchProject();
    });
  };

  const handleInlineRename = async (file: FileType, newName: string) => {
    const response = await apiService.renameFileByPath(projectId, file.path, newName);
    handleRespWithNotifySuccess(response, () => fetchProject());
  };

  const handleDelete = async (file: FileType) => {
    if (file.path === 'index.html') {
      message.error(t('editor.cannotDeleteIndex'));
      return;
    }

    const response = await apiService.deleteFileByPath(projectId, file.path);
    handleRespWithNotifySuccess(response, () => {
      // Close the tab if open
      flexModel.visitNodes((node) => {
        if (node.getType() === 'tab') {
          const cfg = (node as TabNode).getConfig() as { filePath?: string };
          if (cfg?.filePath === file.path) {
            flexModel.doAction(Actions.deleteTab(node.getId()));
          }
        }
      });
      setOpenFiles(prev => { const n = { ...prev }; delete n[file.path]; return n; });
      fetchProject();
    });
  };

  const handleDeleteMultiple = (filesToDelete: FileType[]) => {
    const deletable = filesToDelete.filter(f => f.path !== 'index.html');
    if (deletable.length === 0) return;
    const instance = modal.confirm({
      rootClassName: 'editor-dark-portal',
      title: t('editor.deleteFileConfirm'),
      icon: null,
      footer: null,
      content: (
        <>
          <p>{t('editor.deleteMultipleConfirmContent', { count: deletable.length })}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => instance.destroy()}>{t('common.cancel')}</Button>
            <Button danger type="primary" onClick={async () => {
              instance.destroy();
              for (const file of deletable) {
                await apiService.deleteFileByPath(projectId, file.path);
                flexModel.visitNodes((node) => {
                  if (node.getType() === 'tab') {
                    const cfg = (node as TabNode).getConfig() as { filePath?: string };
                    if (cfg?.filePath === file.path) flexModel.doAction(Actions.deleteTab(node.getId()));
                  }
                });
              }
              setOpenFiles(prev => {
                const n = { ...prev };
                deletable.forEach(f => delete n[f.path]);
                return n;
              });
              fetchProject();
            }}>{t('editor.delete')}</Button>
          </div>
        </>
      ),
    });
  };

  const handleUpdateSettings = async (values: { display_name?: string; description?: string; is_secure?: boolean }) => {
    // Update project info only (no publish status)
    const updateResponse = await apiService.updateProject(projectId, {
      display_name: values.display_name,
      description: values.description,
      is_secure: values.is_secure,
    });
    handleRespWithNotifySuccess(updateResponse, () => {
      setSettingsVisible(false);
      fetchProject();
    });
  };

  const handleTogglePublish = () => {
    if (project?.is_published) {
      // Unpublish directly
      handleUnpublish();
    } else {
      // Show modal for publishing
      setPublishModalVisible(true);
    }
  };

  const handlePublish = async (values: { password?: string }) => {
    const publishResponse = await apiService.publishProject(projectId, {
      is_published: true,
      password: values.password || undefined,
    });
    handleRespWithNotifySuccess(publishResponse, async () => {
      setPublishModalVisible(false);
      publishForm.resetFields();
      await fetchProject();
      setShareModalVisible(true);
    });
  };

  const handleUnpublish = async () => {
    const publishResponse = await apiService.publishProject(projectId, {
      is_published: false,
    });
    handleRespWithNotifySuccess(publishResponse, async () => {
      await fetchProject();
    });
  };

  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      html: 'html',
      css: 'css',
      js: 'javascript',
      json: 'json',
      md: 'markdown',
      xml: 'xml',
      svg: 'xml',
      txt: 'plaintext',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <Layout className="editor-layout">
      <Sider width={siderWidth} theme="dark" className="editor-sider" style={{ position: 'relative' }}>
        {/* Top nav */}
        <div className="editor-sider__nav">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
            className="editor-sider__back-btn"
          >
            {t('editor.back')}
          </Button>
          <div style={{ flex: 1 }} />
          <Tooltip title={t('editor.save')} placement="bottom">
            <Button
              type="text"
              icon={<SaveOutlined />}
              disabled={Object.keys(openFiles).length === 0}
              onClick={() => {
                const active = flexModel.getActiveTabset();
                if (!active) return;
                const tab = active.getSelectedNode() as TabNode | null;
                if (!tab) return;
                const { filePath } = (tab.getConfig() ?? {}) as { filePath?: string };
                if (filePath) saveFile(filePath);
              }}
            />
          </Tooltip>
          <Tooltip title={t('editor.analytics')} placement="bottom">
            <Button type="text" icon={<BarChartOutlined />} onClick={() => { fetchAnalytics(); setAnalyticsVisible(true); }} />
          </Tooltip>
          <Tooltip title={t('editor.settings')} placement="bottom">
            <Button type="text" icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} />
          </Tooltip>
        </div>

          <div className="editor-sider__header">
            <span className="editor-sider__section-label">
              {project?.display_name || project?.name}
            </span>
            <div className="editor-sider__toolbar">
              <Tooltip title={t('editor.newFile')} placement="bottom">
                <Button
                  type="text"
                  icon={<FileAddOutlined />}
                  onClick={() => setInlineEditState({ type: 'new-file', parentPath: getTargetPath() })}
                />
              </Tooltip>
              <Tooltip title={t('editor.newFolder')} placement="bottom">
                <Button
                  type="text"
                  icon={<FolderAddOutlined />}
                  onClick={() => setInlineEditState({ type: 'new-folder', parentPath: getTargetPath() })}
                />
              </Tooltip>
              <Tooltip title={t('editor.uploadFile')} placement="bottom">
                <Upload beforeUpload={handleUpload} showUploadList={false}>
                  <Button type="text" icon={<UploadOutlined />} />
                </Upload>
              </Tooltip>
              <Tooltip title={t('editor.uploadFolder')} placement="bottom">
                <Button
                  type="text"
                  icon={<CloudUploadOutlined />}
                  onClick={() => folderInputRef.current?.click()}
                  loading={uploadingFolder}
                />
              </Tooltip>
              <Tooltip title={t('editor.preview')} placement="bottom">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={openPreviewTab}
                />
              </Tooltip>
            </div>
            <input
              ref={folderInputRef}
              type="file"
              /* @ts-expect-error webkitdirectory is not in standard HTML input attributes */
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: 'none' }}
              onChange={handleFolderUpload}
              aria-label={t('editor.uploadFolder')}
            />
          </div>

          <div className="editor-sider__tree">
            <FileTree
              files={files}
              selectedFilePath={(() => {
                const active = flexModel.getActiveTabset();
                if (!active) return undefined;
                const tab = active.getSelectedNode() as TabNode | null;
                return (tab?.getConfig() as { filePath?: string } | null)?.filePath;
              })()}
              selectedFolderPath={selectedFolder?.path}
              onSelect={(file) => {
                if (file.is_folder) {
                  setSelectedFolder(file);
                } else {
                  openFile(file);
                  setSelectedFolder(null);
                }
              }}
              onContextMenu={(file, event) => {
                if (file.path !== 'index.html') {
                  handleContextMenu(event, file);
                }
              }}
              onDragEnd={handleDrop}
              onFileDrop={handleFileDrop}
              onDeleteMultiple={handleDeleteMultiple}
              onSelectionChange={setTreeSelectedPaths}
              inlineEditState={inlineEditState}
              onInlineEditStateChange={setInlineEditState}
              onInlineCreate={handleInlineCreate}
              onInlineRename={handleInlineRename}
              renderActions={(file) =>
                !file.is_folder && file.name !== 'index.html' ? (
                  <>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ fontSize: 12 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineEditState({ type: 'rename', file });
                      }}
                      style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                    />
                    <Popconfirm
                      rootClassName="editor-dark-portal"
                      title={t('editor.deleteFileConfirm')}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDelete(file);
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                      />
                    </Popconfirm>
                  </>
                ) : null
              }
            />
          </div>
          {/* Footer */}
          <div className="editor-sider__footer">
            <Button
              type={project?.is_published ? 'default' : 'primary'}
              size="small"
              onClick={handleTogglePublish}
              style={{ flex: 1 }}
            >
              {project?.is_published ? t('editor.unpublish') : t('editor.publish')}
            </Button>
            {project?.is_published && (<>
              <Tooltip title={t('editor.open')} placement="top">
                <Button
                  size="small"
                  icon={<ExportOutlined />}
                  href={`/s/${project.name}`}
                  target="_blank"
                />
              </Tooltip>
              <Tooltip title={t('editor.share')} placement="top">
                <Button
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={() => setShareModalVisible(true)}
                />
              </Tooltip>
            </>)}
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              zIndex: 10,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-color)';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
        </Sider>

        <Content className="editor-content">
          {Object.keys(openFiles).length > 0 ? (
            <FlexLayoutComponent
              ref={flexLayoutRef}
              model={flexModel}
              factory={factory}
              onAction={handleAction}
              onModelChange={handleModelChange}
              onRenderTab={onRenderTab}
              realtimeResize
            />
          ) : (
            <div className="editor-empty">
              <div style={{ textAlign: 'center' }}>
                <FileOutlined className="editor-empty__icon" />
                <p className="editor-empty__text">{t('editor.selectFileToEdit')}</p>
              </div>
            </div>
          )}
        </Content>

      {/* Context Menu */}
      {contextMenuVisible && (
        <div
          className="editor-dark-portal"
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1000,
          }}
        >
          <Menu
            className="file-tree-context-menu"
            onClick={handleContextMenuClick}
            items={(() => {
              const isMultiSelect = treeSelectedPaths.size > 1;
              const notIndex = contextMenuNode?.name !== 'index.html' && contextMenuNode?.path !== 'index.html';
              return [
                !isMultiSelect && contextMenuNode?.is_folder
                  ? { key: 'newFolder', icon: <PlusOutlined />, label: t('editor.newFolderHere') }
                  : null,
                !isMultiSelect && notIndex
                  ? { key: 'rename', icon: <EditOutlined />, label: t('editor.rename') }
                  : null,
                notIndex
                  ? { key: 'delete', icon: <DeleteOutlined />, label: t('editor.delete'), danger: true }
                  : null,
              ].filter(Boolean);
            })()}
          />
        </div>
      )}

      {/* Settings Drawer */}
      <Drawer
        title={t('editor.projectSettings')}
        placement="right"
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
        width={480}
        rootClassName="editor-dark-portal"
      >
        <Form form={settingsForm} layout="vertical" onFinish={handleUpdateSettings}>
          <Form.Item
            name="display_name"
            label={t('editor.displayName')}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('editor.description')}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          {publicConfig?.secure_host && (
            <Form.Item
              name="is_secure"
              label={t('editor.secureSite')}
              valuePropName="checked"
              extra={(project?.owner_type === 'verified' || project?.owner_type === 'admin') ? t('editor.secureSiteHelper') : t('editor.secureSiteDisabled')}
            >
              <TooltipSwitch
                disabled={project?.owner_type !== 'verified' && project?.owner_type !== 'admin'}
                tooltipTitle={(project?.owner_type !== 'verified' && project?.owner_type !== 'admin') ? t('editor.secureSiteDisabled') : undefined}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setSettingsVisible(false)}>{t('editor.cancel')}</Button>
              <Button type="primary" htmlType="submit">{t('editor.saveChanges')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Analytics Drawer */}
      <Drawer
        title={t('editor.analytics')}
        placement="right"
        onClose={() => setAnalyticsVisible(false)}
        open={analyticsVisible}
        width={600}
        rootClassName="editor-dark-portal"
      >
        {analytics && (
          <div className="space-y-6">
            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title={t('editor.totalPageViews')}
                    value={analytics.total_pv}
                    prefix={<EyeOutlined />}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title={t('editor.totalUniqueVisitors')}
                    value={analytics.total_uv}
                    prefix={<EyeOutlined />}
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title={t('editor.todayPageViews')}
                    value={analytics.today_pv}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title={t('editor.todayUniqueVisitors')}
                    value={analytics.today_uv}
                  />
                </Card>
              </Col>
            </Row>

            {analytics.trend_data && analytics.trend_data.length > 0 && (
              <Card title={t('editor.trendData')}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics.trend_data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 6 }}
                      labelStyle={{ color: '#ccc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="pv" name="PV" stroke="#1677ff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="uv" name="UV" stroke="#52c41a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* Share Modal */}
      {project?.is_published && (
        <Modal
          title={t('editor.shareTitle')}
          open={shareModalVisible}
          onCancel={() => setShareModalVisible(false)}
          footer={null}
          width={480}
          rootClassName="editor-dark-portal"
        >
          <ShareContent
            siteUrl={`${window.location.protocol}//${window.location.host}/s/${project.name}`}
            secureUrl={
              project.is_secure &&
              publicConfig?.secure_host &&
              (project.owner_type === 'verified' || project.owner_type === 'admin')
                ? `${window.location.protocol}//${publicConfig.secure_host}/s/${project.name}`
                : undefined
            }
          />
        </Modal>
      )}

      {/* Publish Modal */}
      <Modal
        title={t('editor.publishProject')}
        open={publishModalVisible}
        onCancel={() => {
          setPublishModalVisible(false);
          publishForm.resetFields();
        }}
        footer={null}
        rootClassName="editor-dark-portal"
      >
        <Form form={publishForm} onFinish={handlePublish} layout="vertical">
          <Form.Item
            name="password"
            label={t('editor.accessPassword')}
            extra={t('editor.passwordHelper')}
          >
            <Input.Password placeholder={t('editor.passwordPlaceholder')} />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setPublishModalVisible(false);
                publishForm.resetFields();
              }}>
                {t('editor.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('editor.publish')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export const ProjectEditor: React.FC = () => (
  <ConfigProvider theme={{ algorithm: antTheme.darkAlgorithm }}>
    <App>
      <ProjectEditorInner />
    </App>
  </ConfigProvider>
);
