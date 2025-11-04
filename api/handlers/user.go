package handlers

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
)

// GetCurrentUser returns current logged-in user info
func GetCurrentUser(c *gin.Context) {
	userInterface, _ := c.Get("user")
	user := userInterface.(models.User)

	utils.Success(c, types.UserResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		IsAdmin:     user.IsAdmin,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
	})
}

// UpdateCurrentUser updates current user information
func UpdateCurrentUser(c *gin.Context) {
	var req types.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	userID, _ := c.Get("user_id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	updates := make(map[string]interface{})

	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}

	if req.Email != "" {
		if !utils.ValidateEmail(req.Email) {
			utils.BadRequest(c, utils.MsgInvalidEmail)
			return
		}

		// Check if email already exists
		var existingUser models.User
		if err := database.DB.Where("email = ? AND id != ?", req.Email, user.ID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, utils.MsgEmailExists)
			return
		}

		updates["email"] = req.Email
	}

	if req.Password != "" {
		if !utils.ValidatePassword(req.Password) {
			utils.BadRequest(c, utils.MsgInvalidPassword)
			return
		}

		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.InternalServerError(c, utils.MsgPasswordHashFailed)
			return
		}

		updates["password"] = hashedPassword
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, utils.MsgUserUpdateFailed)
			return
		}
	}

	// Reload user
	database.DB.First(&user, userID)

	utils.SuccessWithCode(c, utils.MsgUserUpdated, types.UserResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		IsAdmin:     user.IsAdmin,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
	})
}

// ChangePassword changes user password
func ChangePassword(c *gin.Context) {
	var req types.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	userID, _ := c.Get("user_id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	if !user.HasPassword() {
		utils.BadRequest(c, utils.MsgAccountUsesOAuth)
		return
	}

	if !utils.CheckPassword(req.OldPassword, user.Password) {
		utils.BadRequest(c, utils.MsgOldPasswordIncorrect)
		return
	}

	if !utils.ValidatePassword(req.NewPassword) {
		utils.BadRequest(c, utils.MsgInvalidPassword)
		return
	}

	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.InternalServerError(c, utils.MsgPasswordHashFailed)
		return
	}

	if err := database.DB.Model(&user).Update("password", hashedPassword).Error; err != nil {
		utils.InternalServerError(c, utils.MsgPasswordUpdateFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgPasswordUpdated, nil)
}

// GetUsers returns list of all users (admin only)
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at DESC").Find(&users).Error; err != nil {
		utils.InternalServerError(c, utils.MsgDatabaseError)
		return
	}

	var userResponses []types.UserResponse
	for _, user := range users {
		userResponses = append(userResponses, types.UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			IsAdmin:     user.IsAdmin,
			IsActive:    user.IsActive,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		})
	}

	utils.Success(c, userResponses)
}

// GetUserByID returns user by ID (admin only)
func GetUserByID(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.Preload("Projects").First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	utils.Success(c, types.UserResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		IsAdmin:     user.IsAdmin,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
	})
}

// UpdateUser updates user (admin only)
func UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var req types.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	updates := make(map[string]interface{})

	if req.Email != "" {
		if !utils.ValidateEmail(req.Email) {
			utils.BadRequest(c, utils.MsgInvalidEmail)
			return
		}

		var existingUser models.User
		if err := database.DB.Where("email = ? AND id != ?", req.Email, user.ID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, utils.MsgEmailExists)
			return
		}

		updates["email"] = req.Email
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, utils.MsgUserUpdateFailed)
			return
		}
	}

	database.DB.First(&user, userID)

	utils.SuccessWithCode(c, utils.MsgUserUpdated, types.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		IsAdmin:   user.IsAdmin,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
	})
}

// ToggleUserStatus toggles user active status (admin only)
func ToggleUserStatus(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	if err := database.DB.Model(&user).Update("is_active", !user.IsActive).Error; err != nil {
		utils.InternalServerError(c, utils.MsgUserUpdateFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgUserUpdated, nil)
}

// ToggleUserAdmin toggles user admin status (admin only)
func ToggleUserAdmin(c *gin.Context) {
	userID := c.Param("id")
	currentUserID, _ := c.Get("user_id")

	// Prevent admin from removing their own admin status
	if fmt.Sprint(userID) == fmt.Sprint(currentUserID) {
		utils.BadRequest(c, utils.MsgCannotModifySelf)
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	if err := database.DB.Model(&user).Update("is_admin", !user.IsAdmin).Error; err != nil {
		utils.InternalServerError(c, utils.MsgUserUpdateFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgUserUpdated, nil)
}

// DeleteUser deletes user (admin only)
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, utils.MsgUserNotFound)
		return
	}

	// Delete user's projects and files
	var projects []models.Project
	database.DB.Where("user_id = ?", userID).Find(&projects)

	for _, project := range projects {
		// Delete project files from disk
		projectPath := project.GetPath(
			"data/projects",
			user.Username,
		)
		utils.DeleteDir(projectPath)

		// Delete analytics
		database.DB.Where("project_id = ?", project.ID).Delete(&models.Analytics{})

		// Delete project from database
		database.DB.Delete(&project)
	}

	// Delete user
	if err := database.DB.Delete(&user).Error; err != nil {
		utils.InternalServerError(c, utils.MsgUserDeleteFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgUserDeleted, nil)
}
