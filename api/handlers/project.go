package handlers

import (
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
)

// CreateProject creates a new project
func CreateProject(c *gin.Context) {
	var req types.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	if !utils.ValidateProjectName(req.Name) {
		utils.BadRequest(c, utils.MsgInvalidProjectName)
		return
	}

	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	// Check if project name already exists globally
	var existingProject models.Project
	if err := database.DB.Where("name = ?", req.Name).First(&existingProject).Error; err == nil {
		utils.BadRequest(c, utils.MsgProjectExists)
		return
	}

	// Set DisplayName to Name if not provided
	if req.DisplayName == "" {
		req.DisplayName = req.Name
	}

	// Create project record
	project := models.Project{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		UserID:      userID.(uint),
		IsPublished: false,
	}

	if err := database.DB.Create(&project).Error; err != nil {
		utils.InternalServerError(c, utils.MsgProjectCreationFailed)
		return
	}

	// Create project directory
	projectPath := project.GetPath("data/projects", username.(string))
	if err := utils.EnsureDir(projectPath); err != nil {
		utils.InternalServerError(c, utils.MsgProjectCreationFailed)
		return
	}

	// Create default index.html
	indexPath := filepath.Join(projectPath, "index.html")
	defaultHTML := utils.CreateDefaultIndexHTML(req.DisplayName)
	if err := utils.WriteFile(indexPath, []byte(defaultHTML)); err != nil {
		utils.InternalServerError(c, utils.MsgProjectCreationFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgProjectCreated, types.ProjectResponse{
		ID:          project.ID,
		Name:        project.Name,
		DisplayName: project.DisplayName,
		Description: project.Description,
		UserID:      project.UserID,
		Username:    username.(string),
		IsPublished: project.IsPublished,
		IsActive:    project.IsActive,
		HasPassword: project.HasPassword,
		CreatedAt:   project.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   project.UpdatedAt.Format(time.RFC3339),
	})
}

// GetProjects returns user's projects
func GetProjects(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	var projects []models.Project
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&projects).Error; err != nil {
		utils.InternalServerError(c, utils.MsgDatabaseError)
		return
	}

	var projectResponses []types.ProjectResponse
	for _, project := range projects {
		projectResponses = append(projectResponses, types.ProjectResponse{
			ID:          project.ID,
			Name:        project.Name,
			DisplayName: project.DisplayName,
			Description: project.Description,
			UserID:      project.UserID,
			Username:    username.(string),
			IsPublished: project.IsPublished,
			IsActive:    project.IsActive,
			HasPassword: project.HasPassword,
			CreatedAt:   project.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   project.UpdatedAt.Format(time.RFC3339),
		})
	}

	utils.Success(c, projectResponses)
}

// GetProjectByID returns project by ID
func GetProjectByID(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var project models.Project
	query := database.DB.Preload("User")

	// Admin can view any project, users can only view their own
	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	utils.Success(c, types.ProjectDetailResponse{
		ProjectResponse: types.ProjectResponse{
			ID:          project.ID,
			Name:        project.Name,
			DisplayName: project.DisplayName,
			Description: project.Description,
			UserID:      project.UserID,
			Username:    project.User.Username,
			IsPublished: project.IsPublished,
			IsActive:    project.IsActive,
			HasPassword: project.HasPassword,
			CreatedAt:   project.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   project.UpdatedAt.Format(time.RFC3339),
		},
	})
}

// UpdateProject updates project
func UpdateProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req types.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	var project models.Project
	query := database.DB

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	updates := make(map[string]interface{})

	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}

	if req.Description != "" {
		updates["description"] = req.Description
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&project).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, utils.MsgProjectUpdateFailed)
			return
		}
	}

	database.DB.Preload("User").First(&project, projectID)

	utils.SuccessWithCode(c, utils.MsgProjectUpdated, types.ProjectResponse{
		ID:          project.ID,
		Name:        project.Name,
		DisplayName: project.DisplayName,
		Description: project.Description,
		UserID:      project.UserID,
		Username:    project.User.Username,
		IsPublished: project.IsPublished,
		IsActive:    project.IsActive,
		HasPassword: project.HasPassword,
		CreatedAt:   project.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   project.UpdatedAt.Format(time.RFC3339),
	})
}

// PublishProject publishes or unpublishes a project
func PublishProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var req types.PublishProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	var project models.Project
	query := database.DB

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	updates := map[string]interface{}{
		"is_published": req.IsPublished,
	}

	// Handle password
	if req.Password != "" {
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.InternalServerError(c, utils.MsgPasswordHashFailed)
			return
		}
		updates["password"] = hashedPassword
		updates["has_password"] = true
	} else {
		updates["password"] = ""
		updates["has_password"] = false
	}

	if err := database.DB.Model(&project).Updates(updates).Error; err != nil {
		if req.IsPublished {
			utils.InternalServerError(c, utils.MsgProjectPublishFailed)
		} else {
			utils.InternalServerError(c, utils.MsgProjectUnpublishFailed)
		}
		return
	}

	if req.IsPublished {
		utils.SuccessWithCode(c, utils.MsgProjectPublished, nil)
	} else {
		utils.SuccessWithCode(c, utils.MsgProjectUnpublished, nil)
	}
}

// DeleteProject deletes a project
func DeleteProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	var project models.Project
	query := database.DB.Preload("User")

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Delete project directory
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	if err := utils.DeleteDir(projectPath); err != nil {
		utils.InternalServerError(c, utils.MsgProjectDeleteFailed)
		return
	}

	// Delete analytics
	database.DB.Where("project_id = ?", projectID).Delete(&models.Analytics{})

	// Delete project
	if err := database.DB.Delete(&project).Error; err != nil {
		utils.InternalServerError(c, utils.MsgProjectDeleteFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgProjectDeleted, nil)
}

// GetAllProjects returns all projects (admin only)
func GetAllProjects(c *gin.Context) {
	var projects []models.Project
	if err := database.DB.Preload("User").Order("created_at DESC").Find(&projects).Error; err != nil {
		utils.InternalServerError(c, utils.MsgDatabaseError)
		return
	}

	var projectResponses []types.ProjectResponse
	for _, project := range projects {
		projectResponses = append(projectResponses, types.ProjectResponse{
			ID:          project.ID,
			Name:        project.Name,
			DisplayName: project.DisplayName,
			Description: project.Description,
			UserID:      project.UserID,
			Username:    project.User.Username,
			IsPublished: project.IsPublished,
			IsActive:    project.IsActive,
			HasPassword: project.HasPassword,
			CreatedAt:   project.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   project.UpdatedAt.Format(time.RFC3339),
		})
	}

	utils.Success(c, projectResponses)
}

// ToggleProjectStatus toggles project active status (admin only)
func ToggleProjectStatus(c *gin.Context) {
	projectID := c.Param("id")

	var project models.Project
	if err := database.DB.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	if err := database.DB.Model(&project).Update("is_active", !project.IsActive).Error; err != nil {
		utils.InternalServerError(c, utils.MsgProjectUpdateFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgProjectUpdated, nil)
}
