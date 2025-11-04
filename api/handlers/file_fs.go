package handlers

import (
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/utils"
)

// FileInfo represents a file or folder in the filesystem
type FileInfo struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Size      int64  `json:"size"`
	MimeType  string `json:"mime_type"`
	IsFolder  bool   `json:"is_folder"`
	UpdatedAt string `json:"updated_at"`
}

// ScanProjectFiles scans the project directory and returns all files and folders
func ScanProjectFiles(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)

	// Scan directory
	files := []FileInfo{}
	err := filepath.WalkDir(projectPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if path == projectPath {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(projectPath, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)

		// Get file info
		info, err := d.Info()
		if err != nil {
			return err
		}

		fileInfo := FileInfo{
			Path:      relPath,
			Name:      d.Name(),
			IsFolder:  d.IsDir(),
			Size:      info.Size(),
			UpdatedAt: info.ModTime().Format(time.RFC3339),
		}

		if !d.IsDir() {
			fileInfo.MimeType = utils.GetMimeType(d.Name())
		}

		files = append(files, fileInfo)
		return nil
	})

	if err != nil {
		utils.InternalServerError(c, utils.MsgInternalError)
		return
	}

	utils.Success(c, files)
}

// GetFileContentByPath returns file content by path
func GetFileContentByPath(c *gin.Context) {
	projectID := c.Param("id")
	filePath := c.Query("path")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	if filePath == "" {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, filePath)

	// Security check: ensure the path is within project directory
	if !isPathSafe(fullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	// Check if it's a folder
	info, err := os.Stat(fullPath)
	if err != nil {
		utils.NotFound(c, utils.MsgFileNotFound)
		return
	}

	if info.IsDir() {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Read file content
	content, err := utils.ReadFile(fullPath)
	if err != nil {
		utils.InternalServerError(c, utils.MsgFileReadFailed)
		return
	}

	utils.Success(c, map[string]interface{}{
		"path":       filePath,
		"name":       filepath.Base(filePath),
		"size":       info.Size(),
		"mime_type":  utils.GetMimeType(filePath),
		"is_folder":  false,
		"content":    string(content),
		"updated_at": info.ModTime().Format(time.RFC3339),
	})
}

// UpdateFileContentByPath updates file content by path
func UpdateFileContentByPath(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req struct {
		Path    string `json:"path" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, req.Path)

	// Security check
	if !isPathSafe(fullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	// Check if file exists
	info, err := os.Stat(fullPath)
	if err != nil {
		utils.NotFound(c, utils.MsgFileNotFound)
		return
	}

	if info.IsDir() {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Write file content
	if err := utils.WriteFile(fullPath, []byte(req.Content)); err != nil {
		utils.InternalServerError(c, utils.MsgFileWriteFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgFileSaved, nil)
}

// RenameFileByPath renames a file by path
func RenameFileByPath(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req struct {
		Path    string `json:"path" binding:"required"`
		NewName string `json:"new_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Sanitize new name
	newName := utils.SanitizeFilename(req.NewName)

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Prevent renaming index.html
	if req.Path == "index.html" {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	oldFullPath := filepath.Join(projectPath, req.Path)

	// Security check
	if !isPathSafe(oldFullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	// Calculate new path
	dir := filepath.Dir(req.Path)
	newPath := filepath.Join(dir, newName)
	newPath = filepath.ToSlash(newPath)
	newFullPath := filepath.Join(projectPath, newPath)

	// Check if new path already exists
	if _, err := os.Stat(newFullPath); err == nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Rename file
	if err := utils.RenameFile(oldFullPath, newFullPath); err != nil {
		utils.InternalServerError(c, utils.MsgFileRenameFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgFileRenamed, nil)
}

// DeleteFileByPath deletes a file by path
func DeleteFileByPath(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req struct {
		Path string `json:"path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Prevent deleting index.html
	if req.Path == "index.html" {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, req.Path)

	// Security check
	if !isPathSafe(fullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	// Check if file exists
	info, err := os.Stat(fullPath)
	if err != nil {
		utils.NotFound(c, utils.MsgFileNotFound)
		return
	}

	// Delete file or folder
	if info.IsDir() {
		if err := utils.DeleteDir(fullPath); err != nil {
			utils.InternalServerError(c, utils.MsgDirectoryDeleteFailed)
			return
		}
		utils.SuccessWithCode(c, utils.MsgDirectoryDeleted, nil)
	} else {
		if err := utils.DeleteFile(fullPath); err != nil {
			utils.InternalServerError(c, utils.MsgFileDeleteFailed)
			return
		}
		utils.SuccessWithCode(c, utils.MsgFileDeleted, nil)
	}
}

// MoveFileByPath moves a file or folder to a new location
func MoveFileByPath(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req struct {
		SourcePath string `json:"source_path" binding:"required"`
		TargetPath string `json:"target_path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project
	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Prevent moving index.html
	if req.SourcePath == "index.html" || req.SourcePath == "/index.html" {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get project path
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)

	sourceFullPath := filepath.Join(projectPath, req.SourcePath)
	targetFullPath := filepath.Join(projectPath, req.TargetPath)

	// Security checks
	if !isPathSafe(sourceFullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	if !isPathSafe(targetFullPath, projectPath) {
		utils.BadRequest(c, utils.MsgInvalidFilePath)
		return
	}

	// Check if source exists
	sourceInfo, err := os.Stat(sourceFullPath)
	if err != nil {
		utils.NotFound(c, utils.MsgFileNotFound)
		return
	}

	// Get source filename
	sourceFilename := filepath.Base(req.SourcePath)

	// Determine final target path
	var finalTargetPath string
	targetInfo, err := os.Stat(targetFullPath)
	if err == nil && targetInfo.IsDir() {
		// Target is a folder, move into it
		finalTargetPath = filepath.Join(targetFullPath, sourceFilename)
	} else {
		// Target path doesn't exist or is a file, use parent directory
		targetDir := filepath.Dir(targetFullPath)
		finalTargetPath = filepath.Join(targetDir, sourceFilename)
	}

	// Check if final target already exists
	if _, err := os.Stat(finalTargetPath); err == nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Ensure parent directory of target exists
	finalTargetDir := filepath.Dir(finalTargetPath)
	if err := utils.EnsureDir(finalTargetDir); err != nil {
		utils.InternalServerError(c, utils.MsgFileMoveFailed)
		return
	}

	// Move file or folder
	if err := os.Rename(sourceFullPath, finalTargetPath); err != nil {
		utils.InternalServerError(c, utils.MsgFileMoveFailed)
		return
	}

	// Get relative path for response
	relPath, _ := filepath.Rel(projectPath, finalTargetPath)
	relPath = filepath.ToSlash(relPath)

	utils.SuccessWithCode(c, utils.MsgFileMoved, map[string]interface{}{
		"path":       relPath,
		"name":       sourceFilename,
		"size":       sourceInfo.Size(),
		"mime_type":  utils.GetMimeType(sourceFilename),
		"is_folder":  sourceInfo.IsDir(),
		"updated_at": time.Now().Format(time.RFC3339),
	})
}

// isPathSafe checks if a path is within the project directory
func isPathSafe(targetPath, projectPath string) bool {
	// Clean and get absolute paths
	targetPath = filepath.Clean(targetPath)
	projectPath = filepath.Clean(projectPath)

	// Check if target path starts with project path
	rel, err := filepath.Rel(projectPath, targetPath)
	if err != nil {
		return false
	}

	// If rel starts with "..", it's outside the project directory
	return !filepath.IsAbs(rel) && !filepath.HasPrefix(rel, "..")
}
