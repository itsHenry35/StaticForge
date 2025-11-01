import React, { useState, useCallback, useEffect } from 'react';
import {
  FolderOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  Html5Outlined,
  CodeOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
} from '@ant-design/icons';
import type { File as FileType } from '../types';
import './FileTree.css';

interface FileTreeNode {
  key: string;
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
  fileData: FileType;
  level: number;
}

interface FileTreeProps {
  files: FileType[];
  selectedFilePath?: string;
  selectedFolderPath?: string;
  onSelect?: (file: FileType) => void;
  onContextMenu?: (file: FileType, event: React.MouseEvent) => void;
  onDragEnd?: (draggedFile: FileType, targetFile: FileType, dropToGap: boolean) => void;
  onFileDrop?: (files: File[], targetFolder: FileType | null) => void;
  renderActions?: (file: FileType) => React.ReactNode;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFilePath,
  selectedFolderPath,
  onSelect,
  onContextMenu,
  onDragEnd,
  onFileDrop,
  renderActions,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<FileTreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<{ node: FileTreeNode; position: 'before' | 'inside' | 'after' } | null>(null);

  // Build tree structure from flat file list
  const buildTree = useCallback((fileList: FileType[]): FileTreeNode[] => {
    const tree: FileTreeNode[] = [];
    const pathMap: Record<string, FileTreeNode> = {};

    const normalizePath = (path: string) => path.replace(/^\/+/, '').replace(/\/+$/, '');

    // Sort files: folders first, then alphabetically
    const sortedFiles = [...fileList].sort((a, b) => {
      if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Create all nodes
    sortedFiles.forEach((file) => {
      const fullPath = file.path;
      const normalizedPath = normalizePath(fullPath);

      const node: FileTreeNode = {
        key: fullPath,
        name: file.name,
        path: fullPath,
        isFolder: file.is_folder,
        children: file.is_folder ? [] : undefined,
        fileData: file,
        level: 0,
      };

      pathMap[fullPath] = node;
      if (normalizedPath !== fullPath) {
        pathMap[normalizedPath] = node;
      }
      if (!fullPath.startsWith('/') && normalizedPath) {
        pathMap[`/${normalizedPath}`] = node;
      }
    });

    // Build tree structure
    sortedFiles.forEach((file) => {
      const fullPath = file.path;
      const normalizedPath = normalizePath(fullPath);
      const node = pathMap[fullPath] || pathMap[normalizedPath];

      if (!node) return;

      const hasParent = normalizedPath.includes('/');

      if (!hasParent) {
        node.level = 0;
        tree.push(node);
        return;
      }

      const normalizedParentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      const originalParentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      const parentKeyCandidates = Array.from(new Set([
        originalParentPath,
        normalizedParentPath,
        normalizedParentPath ? `/${normalizedParentPath}` : '',
      ].filter(Boolean)));

      let parent: FileTreeNode | undefined;

      for (const candidate of parentKeyCandidates) {
        if (pathMap[candidate]) {
          parent = pathMap[candidate];
          break;
        }
      }

      if (parent && parent.children) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        node.level = 0;
        tree.push(node);
      }
    });

    return tree;
  }, []);

  const treeData = buildTree(files);

  // Get icon for file based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'html':
      case 'htm':
        return <Html5Outlined style={{ color: '#e34c26' }} />;
      case 'css':
        return <CodeOutlined style={{ color: '#264de4' }} />;
      case 'js':
      case 'jsx':
        return <CodeOutlined style={{ color: '#f7df1e' }} />;
      case 'ts':
      case 'tsx':
        return <CodeOutlined style={{ color: '#3178c6' }} />;
      case 'json':
        return <FileTextOutlined style={{ color: '#5a5a5a' }} />;
      case 'md':
      case 'markdown':
        return <FileMarkdownOutlined style={{ color: '#083fa1' }} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'ico':
        return <FileImageOutlined style={{ color: '#f4b400' }} />;
      case 'xml':
        return <CodeOutlined style={{ color: '#ff6600' }} />;
      default:
        return <FileOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Auto-expand all folders on mount
  useEffect(() => {
    const allFolderKeys = files
      .filter(f => f.is_folder)
      .map(f => f.path);
    setExpandedKeys(new Set(allFolderKeys));
  }, [files]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelect = (node: FileTreeNode) => {
    if (node.isFolder) {
      toggleExpand(node.key);
    }
    onSelect?.(node.fileData);
  };

  const handleContextMenu = (node: FileTreeNode, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu?.(node.fileData, event);
  };

  // Drag and drop handlers
  const handleDragStart = (node: FileTreeNode, event: React.DragEvent) => {
    setDraggedNode(node);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.path);
  };

  const handleDragOver = (node: FileTreeNode, event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if dragging external files
    const isExternalFile = event.dataTransfer.types.includes('Files');

    if (isExternalFile) {
      // For external files, only allow drop on folders or show as 'inside' current location
      if (node.isFolder) {
        setDropTarget({ node, position: 'inside' });
      }
      return;
    }

    if (!draggedNode || draggedNode.key === node.key) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'inside' | 'after';

    if (node.isFolder) {
      if (offsetY < height * 0.25) {
        position = 'before';
      } else if (offsetY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else {
      position = offsetY < height / 2 ? 'before' : 'after';
    }

    setDropTarget({ node, position });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (node: FileTreeNode, event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if dropping external files
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      // Convert FileList to Array
      const filesArray = Array.from(droppedFiles);

      // Determine target folder
      const targetFolder = node.isFolder ? node.fileData : null;

      onFileDrop?.(filesArray, targetFolder);

      setDropTarget(null);
      return;
    }

    // Internal file move
    if (!draggedNode || draggedNode.key === node.key) {
      setDraggedNode(null);
      setDropTarget(null);
      return;
    }

    const dropToGap = dropTarget?.position !== 'inside';
    onDragEnd?.(draggedNode.fileData, node.fileData, dropToGap);

    setDraggedNode(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
    setDropTarget(null);
  };

  const renderTreeNode = (node: FileTreeNode): React.ReactNode => {
    const isExpanded = expandedKeys.has(node.key);
    const isFileSelected = !node.isFolder && selectedFilePath === node.key;
    const isFolderSelected = node.isFolder && selectedFolderPath === node.key;
    const isDragging = draggedNode?.key === node.key;
    const isDropTarget = dropTarget?.node.key === node.key;

    const indent = node.level * 16;

    return (
      <div key={node.key}>
        <div
          className={`file-tree-node ${isFileSelected ? 'selected-file' : ''} ${isFolderSelected ? 'selected-folder' : ''} ${isDragging ? 'dragging' : ''} ${
            isDropTarget ? `drop-target drop-${dropTarget?.position}` : ''
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => handleSelect(node)}
          onContextMenu={(e) => handleContextMenu(node, e)}
          draggable
          onDragStart={(e) => handleDragStart(node, e)}
          onDragOver={(e) => handleDragOver(node, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(node, e)}
          onDragEnd={handleDragEnd}
        >
          <div className="file-tree-node-content">
            {node.isFolder && (
              <span
                className={`file-tree-expand-icon ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.key);
                }}
              >
                ▸
              </span>
            )}
            {!node.isFolder && <span className="file-tree-expand-icon-placeholder" />}
            <span className="file-tree-icon">
              {node.isFolder ? (
                isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />
              ) : (
                getFileIcon(node.name)
              )}
            </span>
            <span className="file-tree-label">{node.name}</span>
          </div>
          {renderActions && (
            <div className="file-tree-actions" onClick={(e) => e.stopPropagation()}>
              {renderActions(node.fileData)}
            </div>
          )}
        </div>
        {node.isFolder && isExpanded && node.children && node.children.length > 0 && (
          <div className="file-tree-children">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Handle drag and drop on the tree container (root level)
  const handleTreeDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleTreeDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const filesArray = Array.from(droppedFiles);
      // Drop to root (no folder selected)
      onFileDrop?.(filesArray, null);
    }
  };

  return (
    <div
      className="file-tree"
      onDragOver={handleTreeDragOver}
      onDrop={handleTreeDrop}
    >
      {treeData.map((node) => renderTreeNode(node))}
    </div>
  );
};
