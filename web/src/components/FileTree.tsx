import React, { useState, useCallback, useEffect, useRef } from 'react';
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

const normalizePath = (path: string) => path.replace(/^\/+/, '').replace(/\/+$/, '');

export interface DroppedFile {
  file: File;
  relativePath: string; // e.g. "folder/sub/file.txt" or "file.txt"
}

async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    all.push(...batch);
  } while (batch.length > 0);
  return all;
}

async function collectFiles(entry: FileSystemEntry, prefix: string): Promise<DroppedFile[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    return [{ file, relativePath: prefix + entry.name }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllEntries(reader);
    const nested = await Promise.all(
      children.map(child => collectFiles(child, prefix + entry.name + '/'))
    );
    return nested.flat();
  }
  return [];
}

async function getDroppedFiles(items: DataTransferItemList): Promise<DroppedFile[]> {
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) entries.push(entry);
  }
  const results = await Promise.all(entries.map(e => collectFiles(e, '')));
  return results.flat();
}

export type InlineEditState =
  | { type: 'new-file' | 'new-folder'; parentPath: string }
  | { type: 'rename'; file: FileType };

const InlineInput: React.FC<{
  defaultValue: string;
  icon: React.ReactNode;
  indent: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
}> = ({ defaultValue, icon, indent, onCommit, onCancel }) => {
  const committed = useRef(false);
  return (
    <div className="file-tree-node file-tree-node--editing" style={{ paddingLeft: `${indent + 8}px` }}>
      <div className="file-tree-node-content">
        <span className="file-tree-expand-icon-placeholder" />
        <span className="file-tree-icon">{icon}</span>
        <input
          autoFocus
          className="file-tree-inline-input"
          defaultValue={defaultValue}
          aria-label="file name"
          onFocus={(e) => defaultValue && e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = e.currentTarget.value.trim();
              if (!value) return;
              committed.current = true;
              onCommit(value);
            } else if (e.key === 'Escape') {
              committed.current = true;
              onCancel();
            }
          }}
          onBlur={(e) => {
            if (committed.current) return;
            const value = e.currentTarget.value.trim();
            if (value) {
              committed.current = true;
              onCommit(value);
            } else {
              onCancel();
            }
          }}
        />
      </div>
    </div>
  );
};

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
  onFileDrop?: (files: DroppedFile[], targetFolder: FileType | null) => void;
  renderActions?: (file: FileType) => React.ReactNode;
  inlineEditState?: InlineEditState | null;
  onInlineEditStateChange?: (state: InlineEditState | null) => void;
  onInlineCreate?: (name: string, parentPath: string, isFolder: boolean) => void;
  onInlineRename?: (file: FileType, newName: string) => void;
  onDeleteMultiple?: (files: FileType[]) => void;
  onSelectionChange?: (paths: Set<string>) => void;
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
  inlineEditState = null,
  onInlineEditStateChange,
  onInlineCreate,
  onInlineRename,
  onDeleteMultiple,
  onSelectionChange,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<FileTreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<{ node: FileTreeNode; position: 'before' | 'inside' | 'after' } | null>(null);
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [multiSelectedPaths, setMultiSelectedPaths] = useState<Set<string>>(new Set());
  const lastClickedPathRef = useRef<string | null>(null);

  // Build tree structure from flat file list
  const buildTree = useCallback((fileList: FileType[]): FileTreeNode[] => {
    const tree: FileTreeNode[] = [];
    const pathMap: Record<string, FileTreeNode> = {};

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

  // Sync multi-selection state to parent
  useEffect(() => {
    onSelectionChange?.(multiSelectedPaths);
  }, [multiSelectedPaths]); // eslint-disable-line react-hooks/exhaustive-deps

  const getParentPath = (path: string) => {
    const idx = path.lastIndexOf('/');
    return idx === -1 ? '' : path.substring(0, idx);
  };

  const getVisibleNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    const result: FileTreeNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.isFolder && expandedKeys.has(node.key) && node.children) {
        result.push(...getVisibleNodes(node.children));
      }
    }
    return result;
  };

  const findNodeByPath = (nodes: FileTreeNode[], path: string): FileTreeNode | null => {
    for (const n of nodes) {
      if (normalizePath(n.path) === normalizePath(path)) return n;
      if (n.children) {
        const found = findNodeByPath(n.children, path);
        if (found) return found;
      }
    }
    return null;
  };

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

  // Auto-expand parent folder when creating a new item inline
  useEffect(() => {
    if (!inlineEditState || inlineEditState.type === 'rename') return;
    const parentPath = inlineEditState.parentPath;
    if (parentPath === '/' || !parentPath) return;
    const folder = files.find(f => f.is_folder && normalizePath(f.path) === normalizePath(parentPath));
    if (folder) {
      setExpandedKeys(prev => new Set([...prev, folder.path]));
    }
  }, [inlineEditState, files]);

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

  const handleSelect = (node: FileTreeNode, event: React.MouseEvent) => {
    if (inlineEditState?.type === 'rename' && inlineEditState.file.path === node.fileData.path) return;

    const isMultiKey = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const nodeParent = getParentPath(node.path);

    if (isShift && lastClickedPathRef.current) {
      const anchorParent = getParentPath(lastClickedPathRef.current);
      if (anchorParent !== nodeParent) {
        return; // Different level — ignore
      }
      // Range select within same parent's visible siblings
      const siblings = getVisibleNodes(treeData).filter(n => getParentPath(n.path) === nodeParent);
      const lastIdx = siblings.findIndex(n => n.path === lastClickedPathRef.current);
      const currIdx = siblings.findIndex(n => n.path === node.path);
      if (lastIdx !== -1 && currIdx !== -1) {
        const [start, end] = [Math.min(lastIdx, currIdx), Math.max(lastIdx, currIdx)];
        setMultiSelectedPaths(new Set(siblings.slice(start, end + 1).map(n => n.path)));
      }
      return;
    }

    if (isMultiKey) {
      // Only toggle if same parent as existing selection
      const existingParent = multiSelectedPaths.size > 0
        ? getParentPath([...multiSelectedPaths][0])
        : nodeParent;
      if (existingParent !== nodeParent) {
        return; // Different level — ignore
      }
      setMultiSelectedPaths(prev => {
        const next = new Set(prev);
        if (next.has(node.path)) next.delete(node.path);
        else next.add(node.path);
        return next;
      });
      lastClickedPathRef.current = node.path;
      return;
    }

    // Normal click — clear multi-select, handle folder expand, open file
    setMultiSelectedPaths(new Set([node.path]));
    lastClickedPathRef.current = node.path;
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
    setIsRootDragOver(false);

    // Check if dragging external files
    const isExternalFile = event.dataTransfer.types.includes('Files');

    if (isExternalFile) {
      if (node.isFolder) {
        setDropTarget({ node, position: 'inside' });
      } else {
        // Highlight the parent folder so the entire folder region gets highlighted
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        if (parentPath) {
          const parentNode = findNodeByPath(treeData, parentPath);
          if (parentNode) {
            setDropTarget({ node: parentNode, position: 'inside' });
          } else {
            setDropTarget(null);
            setIsRootDragOver(true);
          }
        } else {
          // Root-level file — show root drop indicator
          setDropTarget(null);
          setIsRootDragOver(true);
        }
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

  const handleDrop = async (node: FileTreeNode, event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if dropping external files/folders
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      const hasExternal = Array.from(event.dataTransfer.items).some(i => i.kind === 'file');
      if (hasExternal) {
        // Collect entries synchronously before any await
        const droppedFiles = await getDroppedFiles(event.dataTransfer.items);

        let targetFolder: FileType | null;
        if (node.isFolder) {
          targetFolder = node.fileData;
        } else {
          const parentPath = normalizePath(node.path.substring(0, node.path.lastIndexOf('/')));
          targetFolder = files.find(f => f.is_folder && normalizePath(f.path) === parentPath) ?? null;
        }

        onFileDrop?.(droppedFiles, targetFolder);
        setDropTarget(null);
        setIsRootDragOver(false);
        return;
      }
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
    setIsRootDragOver(false);
  };

  const renderNewItemGhost = (parentPath: string, level: number) => {
    if (!inlineEditState || inlineEditState.type === 'rename') return null;
    if (normalizePath(inlineEditState.parentPath) !== normalizePath(parentPath)) return null;
    const isFolder = inlineEditState.type === 'new-folder';
    return (
      <InlineInput
        key="__new-item__"
        defaultValue=""
        icon={isFolder ? <FolderOutlined /> : <FileOutlined />}
        indent={level * 16}
        onCommit={(name) => {
          onInlineCreate?.(name, inlineEditState.parentPath, isFolder);
          onInlineEditStateChange?.(null);
        }}
        onCancel={() => onInlineEditStateChange?.(null)}
      />
    );
  };

  const renderTreeNode = (node: FileTreeNode): React.ReactNode => {
    const isExpanded = expandedKeys.has(node.key);
    const isFileSelected = !node.isFolder && selectedFilePath === node.key;
    const isFolderSelected = node.isFolder && selectedFolderPath === node.key;
    const isDragging = draggedNode?.key === node.key;
    const isDropTarget = dropTarget?.node.key === node.key;
    const isRenaming = inlineEditState?.type === 'rename' && inlineEditState.file.path === node.fileData.path;
    const isMultiSelected = multiSelectedPaths.has(node.path);

    const indent = node.level * 16;
    const ghost = node.isFolder && isExpanded ? renderNewItemGhost(node.path, node.level + 1) : null;

    return (
      <div key={node.key}>
        <div
          className={`file-tree-node ${isFileSelected ? 'selected-file' : ''} ${isFolderSelected ? 'selected-folder' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${isDragging ? 'dragging' : ''} ${
            isDropTarget ? `drop-target drop-${dropTarget?.position}` : ''
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={(e) => handleSelect(node, e)}
          onContextMenu={(e) => handleContextMenu(node, e)}
          draggable={!isRenaming}
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
            {isRenaming ? (
              <input
                autoFocus
                className="file-tree-inline-input"
                defaultValue={node.name}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = e.currentTarget.value.trim();
                    if (!value) return;
                    e.currentTarget.dataset.committed = 'true';
                    if (value !== node.name) onInlineRename?.(node.fileData, value);
                    onInlineEditStateChange?.(null);
                  } else if (e.key === 'Escape') {
                    e.currentTarget.dataset.committed = 'true';
                    onInlineEditStateChange?.(null);
                  }
                }}
                onBlur={(e) => {
                  if (e.currentTarget.dataset.committed === 'true') return;
                  const value = e.currentTarget.value.trim();
                  if (value && value !== node.name) onInlineRename?.(node.fileData, value);
                  onInlineEditStateChange?.(null);
                }}
              />
            ) : (
              <span className="file-tree-label">{node.name}</span>
            )}
          </div>
          {renderActions && !isRenaming && (
            <div className="file-tree-actions" onClick={(e) => e.stopPropagation()}>
              {renderActions(node.fileData)}
            </div>
          )}
        </div>
        {node.isFolder && isExpanded && ((node.children?.length ?? 0) > 0 || ghost) && (
          <div
            className="file-tree-children"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsRootDragOver(false);
              setDropTarget({ node, position: 'inside' });
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                const hasExternal = Array.from(e.dataTransfer.items).some(i => i.kind === 'file');
                if (hasExternal) {
                  const droppedFiles = await getDroppedFiles(e.dataTransfer.items);
                  onFileDrop?.(droppedFiles, node.fileData);
                  setDropTarget(null);
                  setIsRootDragOver(false);
                  return;
                }
              }
              if (draggedNode && draggedNode.key !== node.key) {
                onDragEnd?.(draggedNode.fileData, node.fileData, false);
              }
              setDraggedNode(null);
              setDropTarget(null);
            }}
          >
            {ghost}
            {node.children?.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Handle drag and drop on the tree container (root level)
  const handleTreeDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    const isExternalFile = event.dataTransfer.types.includes('Files');
    if (isExternalFile) {
      setIsRootDragOver(true);
      setDropTarget(null);
    }
  };

  const handleTreeDragLeave = (event: React.DragEvent) => {
    // Only clear when actually leaving the tree container
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsRootDragOver(false);
      setDropTarget(null);
    }
  };

  const handleTreeDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsRootDragOver(false);

    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      const hasExternal = Array.from(event.dataTransfer.items).some(i => i.kind === 'file');
      if (hasExternal) {
        const droppedFiles = await getDroppedFiles(event.dataTransfer.items);
        onFileDrop?.(droppedFiles, null);
        return;
      }
    }

  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      const currentParent = lastClickedPathRef.current
        ? getParentPath(lastClickedPathRef.current)
        : '';
      const siblings = getVisibleNodes(treeData).filter(n => getParentPath(n.path) === currentParent);
      setMultiSelectedPaths(new Set(siblings.map(n => n.path)));
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && multiSelectedPaths.size > 0) {
      const selectedFiles = files.filter(f => multiSelectedPaths.has(f.path));
      if (selectedFiles.length > 0) {
        onDeleteMultiple?.(selectedFiles);
      }
    }
    if (event.key === 'Escape') {
      setMultiSelectedPaths(new Set());
    }
  };

  return (
    <div
      className={`file-tree${isRootDragOver ? ' drag-over' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragOver={handleTreeDragOver}
      onDragLeave={handleTreeDragLeave}
      onDrop={handleTreeDrop}
    >
      {renderNewItemGhost('/', 0)}
      {treeData.map((node) => renderTreeNode(node))}
    </div>
  );
};
