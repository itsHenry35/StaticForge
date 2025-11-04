package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
)

// GetProjectAnalytics returns analytics for a project
func GetProjectAnalytics(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")

	// Get project
	var project models.Project
	query := database.DB

	if !isAdmin.(bool) {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.First(&project, projectID).Error; err != nil {
		utils.NotFound(c, utils.MsgProjectNotFound)
		return
	}

	// Get date range (last 30 days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	// Get analytics data
	var analytics []models.Analytics
	database.DB.Where("project_id = ? AND date >= ? AND date <= ?", projectID, startDate, endDate).
		Order("date ASC").
		Find(&analytics)

	// Calculate totals
	var totalPV, totalUV, todayPV, todayUV int64
	today := time.Now().Format("2006-01-02")

	for _, a := range analytics {
		totalPV += a.PV
		totalUV += a.UV

		if a.Date.Format("2006-01-02") == today {
			todayPV = a.PV
			todayUV = a.UV
		}
	}

	// Format trend data
	var trendData []types.AnalyticsResponse
	for _, a := range analytics {
		trendData = append(trendData, types.AnalyticsResponse{
			Date: a.Date.Format("2006-01-02"),
			PV:   a.PV,
			UV:   a.UV,
		})
	}

	utils.Success(c, types.AnalyticsSummaryResponse{
		TotalPV:   totalPV,
		TotalUV:   totalUV,
		TodayPV:   todayPV,
		TodayUV:   todayUV,
		TrendData: trendData,
	})
}
