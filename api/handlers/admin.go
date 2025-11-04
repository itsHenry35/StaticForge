package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/utils"
)

// GetSystemStats returns system statistics (admin only)
func GetSystemStats(c *gin.Context) {
	var totalUsers int64
	var totalProjects int64

	// Count total users
	if err := database.DB.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		utils.InternalServerError(c, utils.MsgDatabaseError)
		return
	}

	// Count total projects
	if err := database.DB.Model(&models.Project{}).Count(&totalProjects).Error; err != nil {
		utils.InternalServerError(c, utils.MsgDatabaseError)
		return
	}

	utils.Success(c, gin.H{
		"total_users":    totalUsers,
		"total_projects": totalProjects,
	})
}
