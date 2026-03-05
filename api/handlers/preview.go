package handlers

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/utils"
)

// PreviewProject serves project files for authenticated preview without checking is_published
func PreviewProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	// Get project, verify ownership
	var project models.Project
	query := database.DB.Preload("User")
	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}
	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Determine file path
	filePath := c.Param("filepath")
	if filePath == "" || filePath == "/" {
		filePath = "index.html"
	}
	filePath = strings.TrimPrefix(filePath, "/")

	// Serve the file
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, filePath)

	if !utils.FileExists(fullPath) {
		c.String(http.StatusNotFound, "File not found")
		return
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	if ext == ".html" || ext == ".css" || ext == ".js" {
		content, err := utils.ReadFile(fullPath)
		if err != nil {
			c.String(http.StatusInternalServerError, "Failed to read file")
			return
		}
		replacedContent := cfg.ApplyReplacements(string(content))
		c.Header("Content-Type", utils.GetMimeType(filePath))
		c.String(http.StatusOK, replacedContent)
	} else {
		c.Header("Content-Type", utils.GetMimeType(filePath))
		c.File(fullPath)
	}
}
