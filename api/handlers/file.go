package handlers

import (
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
)

// UploadFile uploads a file to project
func UploadFile(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Get path from form
	path := c.PostForm("path")
	if path == "" {
		path = "/"
	}

	// Validate file size
	cfg := config.GetConfig()
	if file.Size > cfg.Upload.MaxSize {
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

	// Sanitize filename
	filename := utils.SanitizeFilename(file.Filename)
	relativePath := filepath.Join(path, filename)
	relativePath = filepath.ToSlash(relativePath)

	// Save file to disk
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, relativePath)

	// Check if file already exists
	if _, err := os.Stat(fullPath); err == nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Ensure parent directory exists
	parentDir := filepath.Dir(fullPath)
	if err := utils.EnsureDir(parentDir); err != nil {
		utils.InternalServerError(c, utils.MsgFileUploadFailed)
		return
	}

	if err := utils.SaveUploadedFile(file, fullPath); err != nil {
		utils.InternalServerError(c, utils.MsgFileUploadFailed)
		return
	}

	// Get file info
	fileInfo, _ := os.Stat(fullPath)

	utils.SuccessWithCode(c, utils.MsgFileUploaded, map[string]interface{}{
		"path":       relativePath,
		"name":       filename,
		"size":       file.Size,
		"mime_type":  utils.GetMimeType(filename),
		"is_folder":  false,
		"updated_at": fileInfo.ModTime().Format(time.RFC3339),
	})
}

// CreateFolder creates a new folder
func CreateFolder(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req types.CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	// Sanitize folder name
	folderName := utils.SanitizeFilename(req.Name)

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

	// Calculate folder path
	folderPath := filepath.Join(req.Path, folderName)
	folderPath = filepath.ToSlash(folderPath)

	// Create folder on disk
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, folderPath)

	// Check if folder already exists
	if _, err := os.Stat(fullPath); err == nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	if err := utils.EnsureDir(fullPath); err != nil {
		utils.InternalServerError(c, utils.MsgDirectoryCreationFailed)
		return
	}

	// Get folder info
	folderInfo, _ := os.Stat(fullPath)

	utils.SuccessWithCode(c, utils.MsgDirectoryCreated, map[string]interface{}{
		"path":       folderPath,
		"name":       folderName,
		"size":       int64(0),
		"mime_type":  "",
		"is_folder":  true,
		"updated_at": folderInfo.ModTime().Format(time.RFC3339),
	})
}
