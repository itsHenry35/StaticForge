package services

import (
	"context"
	"fmt"
	"time"

	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
)

// RecordVisit records a visit to a project
func RecordVisit(projectID uint, visitorID string) error {
	ctx := context.Background()
	redis := database.GetRedis()

	today := time.Now().Format("2006-01-02")

	// Increment PV (Page Views)
	pvKey := fmt.Sprintf("analytics:pv:%d:%s", projectID, today)
	redis.Incr(ctx, pvKey)
	redis.Expire(ctx, pvKey, 48*time.Hour)

	// Increment UV (Unique Visitors) using set
	uvKey := fmt.Sprintf("analytics:uv:%d:%s", projectID, today)
	redis.SAdd(ctx, uvKey, visitorID)
	redis.Expire(ctx, uvKey, 48*time.Hour)

	return nil
}

// FlushAnalyticsToDatabase flushes Redis analytics data to MySQL
func FlushAnalyticsToDatabase() error {
	ctx := context.Background()
	redis := database.GetRedis()
	db := database.GetDB()

	// Get all PV keys
	pvKeys, err := redis.Keys(ctx, "analytics:pv:*").Result()
	if err != nil {
		return err
	}

	for _, key := range pvKeys {
		// Parse key: analytics:pv:{projectID}:{date}
		var projectID uint
		var dateStr string
		fmt.Sscanf(key, "analytics:pv:%d:%s", &projectID, &dateStr)

		pv, _ := redis.Get(ctx, key).Int64()

		// Get UV count
		uvKey := fmt.Sprintf("analytics:uv:%d:%s", projectID, dateStr)
		uv := redis.SCard(ctx, uvKey).Val()

		// Parse date
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			continue
		}

		// Update or create analytics record
		var analytics models.Analytics
		result := db.Where("project_id = ? AND date = ?", projectID, date).First(&analytics)

		if result.Error != nil {
			// Create new record
			analytics = models.Analytics{
				ProjectID: projectID,
				Date:      date,
				PV:        pv,
				UV:        uv,
			}
			db.Create(&analytics)
		} else {
			// Update existing record
			db.Model(&analytics).Updates(map[string]interface{}{
				"pv": pv,
				"uv": uv,
			})
		}

		// Delete Redis key after flushing
		redis.Del(ctx, key)
		redis.Del(ctx, uvKey)
	}

	return nil
}
