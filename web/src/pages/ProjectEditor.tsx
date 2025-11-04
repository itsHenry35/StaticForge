import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Menu,
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
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { apiService } from '../services/api';
import type { Project, File as FileType, Analytics } from '../types';
import { handleRespWithoutNotify, handleRespWithNotifySuccess } from '../utils/handleResp';
import { FileTree } from '../components/FileTree';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

export const ProjectEditor: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileType[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileType | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuNode, setContextMenuNode] = useState<FileType | null>(null);
  const [uploadingFolder, setUploadingFolder] = useState(false);
  const [siderWidth, setSiderWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [settingsForm] = Form.useForm();
  const [folderForm] = Form.useForm();
  const [fileForm] = Form.useForm();
  const [renameForm] = Form.useForm();
  const [publishForm] = Form.useForm();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const projectId = parseInt(id || '0');

  const fetchProject = async () => {
    const projectResponse = await apiService.getProject(projectId);
    handleRespWithoutNotify(
      projectResponse,
      (data) => {
        setProject(data);
        if (data.display_name) {
          settingsForm.setFieldsValue({
            display_name: data.display_name,
            description: data.description,
            is_published: data.is_published,
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
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      // Auto-select index.html if no file is selected
      const indexFile = files.find(f => f.name === 'index.html' && (f.path === 'index.html' || f.path === '/index.html'));
      if (indexFile) {
        handleFileSelect(indexFile);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleFileSelect = async (file: FileType) => {
    if (file.is_folder) return;

    // Save current file before switching
    if (selectedFile && editorContent !== selectedFile.content) {
      await handleSave();
    }

    const response = await apiService.getFileByPath(projectId, file.path);
    handleRespWithoutNotify(response, (fileData) => {
      setSelectedFile(fileData);
      setEditorContent(fileData.content || '');
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    setEditorContent(value || '');

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
  };

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;

    setSaving(true);
    const response = await apiService.updateFileByPath(projectId, selectedFile.path, editorContent);
    handleRespWithNotifySuccess(
      response,
      () => {
        setFiles((prevFiles) => prevFiles.map((f) =>
          f.path === selectedFile.path ? { ...f, content: editorContent } : f
        ));
        setSaving(false);
      },
      () => {
        setSaving(false);
      }
    );
  }, [editorContent, projectId, selectedFile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Get target path for upload/create based on current selection
  const getTargetPath = () => {
    if (selectedFolder) {
      // If a folder is selected, use it
      return selectedFolder.path;
    } else if (selectedFile) {
      // If a file is selected, use its parent folder
      const parentPath = selectedFile.path.substring(0, selectedFile.path.lastIndexOf('/'));
      return parentPath || '/';
    }
    // Default to root
    return '/';
  };

  const handleUpload = async (file: globalThis.File) => {
    const uploadPath = getTargetPath();
    const response = await apiService.uploadFile(projectId, file, uploadPath);
    handleRespWithNotifySuccess(response, () => {
      fetchProject();
    });
    return false; // Prevent default upload
  };

  // Handle file drop from external sources
  const handleFileDrop = async (files: globalThis.File[], targetFolder: FileType | null) => {
    const uploadPath = targetFolder ? targetFolder.path : '/';

    if (files.length === 1) {
      // Single file upload
      const response = await apiService.uploadFile(projectId, files[0], uploadPath);
      handleRespWithNotifySuccess(response, () => {
        fetchProject();
      });
    } else {
      // Multiple files upload
      message.loading({ content: t('common.uploading', { count: files.length }), key: 'filesDrop', duration: 0 });

      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        const response = await apiService.uploadFile(projectId, file, uploadPath);
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

  const handleCreateFolder = async (values: { name: string }) => {
    const folderPath = getTargetPath();
    const response = await apiService.createFolder(projectId, {
      path: folderPath,
      name: values.name,
    });
    handleRespWithNotifySuccess(response, () => {
      setFolderModalVisible(false);
      folderForm.resetFields();
      fetchProject();
    });
  };

  const handleCreateFile = async (values: { name: string }) => {
    const filePath = getTargetPath();

    // Create an empty file
    const blob = new Blob([''], { type: 'text/plain' });
    const file = new File([blob], values.name, { type: 'text/plain' });

    const response = await apiService.uploadFile(projectId, file, filePath);
    handleRespWithNotifySuccess(response, () => {
      setFileModalVisible(false);
      fileForm.resetFields();
      fetchProject();
    });
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

    switch (e.key) {
      case 'rename':
        setSelectedFile(contextMenuNode);
        renameForm.setFieldsValue({ new_name: contextMenuNode.name });
        setRenameModalVisible(true);
        break;
      case 'delete':
        handleDelete(contextMenuNode);
        break;
      case 'newFolder':
        setSelectedFolder(contextMenuNode.is_folder ? contextMenuNode : null);
        setFolderModalVisible(true);
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
      message.error(t('editor.fileExistsInTarget'));
      return;
    }

    // Use the new move API
    const response = await apiService.moveFileByPath(projectId, dragFile.path, targetPath);
    handleRespWithNotifySuccess(response, () => {
      fetchProject();
    });
  };

  const handleRename = async (values: { new_name: string }) => {
    if (!selectedFile) return;

    const response = await apiService.renameFileByPath(projectId, selectedFile.path, values.new_name);
    handleRespWithNotifySuccess(response, () => {
      setRenameModalVisible(false);
      renameForm.resetFields();
      fetchProject();
    });
  };

  const handleDelete = async (file: FileType) => {
    if (file.path === 'index.html') {
      message.error(t('editor.cannotDeleteIndex'));
      return;
    }

    const response = await apiService.deleteFileByPath(projectId, file.path);
    handleRespWithNotifySuccess(response, () => {
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
      fetchProject();
    });
  };

  const handleUpdateSettings = async (values: { display_name?: string; description?: string }) => {
    // Update project info only (no publish status)
    const updateResponse = await apiService.updateProject(projectId, values);
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

      // Show iframe code after publishing
      if (project) {
        const host = window.location.host;
        const protocol = window.location.protocol;
        const iframeCode = `<iframe src="${protocol}//${host}/s/${project.name}" width="100%" height="600" frameborder="0"></iframe>`;

        Modal.success({
          title: t('editor.projectPublishedSuccess'),
          width: 600,
          content: (
            <div>
              <p style={{ marginBottom: 16 }}>{t('editor.siteNowLive')}</p>
              <Input.TextArea
                value={iframeCode}
                readOnly
                autoSize={{ minRows: 3, maxRows: 5 }}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(iframeCode);
                  message.success(t('editor.iframeCopied'));
                }}
              />
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('editor.clickToCopy')}
              </p>
            </div>
          ),
        });
      }
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
      <Header className="editor-header">
        <Space size={16}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} type="text">
            {t('editor.back')}
          </Button>
          <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
          <h1 className="editor-header__title">
            {project?.display_name || project?.name}
          </h1>
        </Space>
        <Space size={12}>
          {saving && <span className="saving-indicator">{t('editor.saving')}</span>}
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!selectedFile}
            type="text"
          >
            {t('editor.save')}
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => {
              fetchAnalytics();
              setAnalyticsVisible(true);
            }}
            type="text"
          >
            {t('editor.analytics')}
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setSettingsVisible(true)}
            type="text"
          >
            {t('editor.settings')}
          </Button>
          <Button
            type={project?.is_published ? 'default' : 'primary'}
            onClick={handleTogglePublish}
          >
            {project?.is_published ? t('editor.unpublish') : t('editor.publish')}
          </Button>
          {project?.is_published && (
            <Button
              type="primary"
              icon={<EyeOutlined />}
              href={`/s/${project.name}`}
              target="_blank"
            >
              {t('editor.preview')}
            </Button>
          )}
        </Space>
      </Header>

      <Layout>
        <Sider width={siderWidth} theme="light" className="editor-sider" style={{ position: 'relative' }}>
          <div className="editor-sider__header">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <Upload beforeUpload={handleUpload} showUploadList={false} style={{ flex: 1 }}>
                  <Button icon={<UploadOutlined />} style={{ width: '100%' }}>
                    {t('editor.file')}
                  </Button>
                </Upload>
                <Button
                  icon={<FolderAddOutlined />}
                  onClick={() => folderInputRef.current?.click()}
                  loading={uploadingFolder}
                  style={{ flex: 1 }}
                >
                  {t('editor.folder')}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <Button
                  icon={<FileAddOutlined />}
                  onClick={() => {
                    setFileModalVisible(true);
                  }}
                  style={{ flex: 1 }}
                >
                  {t('editor.newFile')}
                </Button>
                <Button
                  icon={<FolderAddOutlined />}
                  onClick={() => {
                    setFolderModalVisible(true);
                  }}
                  style={{ flex: 1 }}
                >
                  {t('editor.newFolder')}
                </Button>
              </div>
            </Space>
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
              selectedFilePath={selectedFile?.path}
              selectedFolderPath={selectedFolder?.path}
              onSelect={(file) => {
                if (file.is_folder) {
                  // Select folder (don't affect editor or currently editing file)
                  setSelectedFolder(file);
                } else {
                  // Select file for editing and clear folder selection
                  handleFileSelect(file);
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
              renderActions={(file) =>
                !file.is_folder && file.name !== 'index.html' ? (
                  <>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ fontSize: 12 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                        renameForm.setFieldsValue({ new_name: file.name });
                        setRenameModalVisible(true);
                      }}
                      style={{ width: 20, height: 20, padding: 0, minWidth: 20 }}
                    />
                    <Popconfirm
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
          {selectedFile ? (
            <Editor
              height="100%"
              language={getLanguageFromFilename(selectedFile.name)}
              value={editorContent}
              onChange={handleEditorChange}
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
          ) : (
            <div className="editor-empty">
              <div style={{ textAlign: 'center' }}>
                <FileOutlined className="editor-empty__icon" />
                <p className="editor-empty__text">{t('editor.selectFileToEdit')}</p>
              </div>
            </div>
          )}
        </Content>
      </Layout>

      {/* Context Menu */}
      {contextMenuVisible && (
        <div
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
            items={[
              contextMenuNode?.is_folder
                ? {
                    key: 'newFolder',
                    icon: <PlusOutlined />,
                    label: t('editor.newFolderHere'),
                  }
                : null,
              contextMenuNode?.name !== 'index.html' && contextMenuNode?.path !== 'index.html'
                ? {
                    key: 'rename',
                    icon: <EditOutlined />,
                    label: t('editor.rename'),
                  }
                : null,
              contextMenuNode?.name !== 'index.html' && contextMenuNode?.path !== 'index.html'
                ? {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: t('editor.delete'),
                    danger: true,
                  }
                : null,
            ].filter(Boolean)}
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
                <div className="space-y-2">
                  {analytics.trend_data.map((trend) => (
                    <div key={trend.date} className="flex justify-between border-b pb-2">
                      <Text>{trend.date}</Text>
                      <Space>
                        <Text type="secondary">{t('editor.pvLabel', { value: trend.pv })}</Text>
                        <Text type="secondary">{t('editor.uvLabel', { value: trend.uv })}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* Create File Modal */}
      <Modal
        title={t('editor.createNewFile')}
        open={fileModalVisible}
        onCancel={() => {
          setFileModalVisible(false);
          fileForm.resetFields();
        }}
        footer={null}
      >
        <Form form={fileForm} onFinish={handleCreateFile} layout="vertical">
          <Form.Item
            name="name"
            label={t('editor.fileName')}
            rules={[{ required: true, message: t('validation.pleaseEnterFileName') }]}
          >
            <Input placeholder={t('editor.fileNamePlaceholder')} />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setFileModalVisible(false);
                fileForm.resetFields();
              }}>
                {t('editor.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('editor.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        title={t('editor.createFolder')}
        open={folderModalVisible}
        onCancel={() => {
          setFolderModalVisible(false);
          folderForm.resetFields();
        }}
        footer={null}
      >
        <Form form={folderForm} onFinish={handleCreateFolder} layout="vertical">
          <Form.Item
            name="name"
            label={t('editor.folderName')}
            rules={[{ required: true, message: t('validation.pleaseEnterFolderName') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setFolderModalVisible(false);
                folderForm.resetFields();
              }}>
                {t('editor.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('editor.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        title={t('editor.renameFile')}
        open={renameModalVisible}
        onCancel={() => {
          setRenameModalVisible(false);
          renameForm.resetFields();
        }}
        footer={null}
      >
        <Form form={renameForm} onFinish={handleRename} layout="vertical">
          <Form.Item
            name="new_name"
            label={t('editor.newName')}
            rules={[{ required: true, message: t('validation.pleaseEnterNewName') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setRenameModalVisible(false);
                renameForm.resetFields();
              }}>
                {t('editor.cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('editor.rename')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Publish Modal */}
      <Modal
        title={t('editor.publishProject')}
        open={publishModalVisible}
        onCancel={() => {
          setPublishModalVisible(false);
          publishForm.resetFields();
        }}
        footer={null}
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
