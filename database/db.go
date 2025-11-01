package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB          *gorm.DB
	RedisClient *redis.Client
)

// InitDatabase initializes MySQL database connection
func InitDatabase(cfg *config.Config) error {
	dsn := cfg.GetDSN()

	// Set log level based on server mode
	logLevel := logger.Error // Default to Error level
	if cfg.Server.Mode == "debug" {
		logLevel = logger.Info // Show all SQL in debug mode
	}

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Auto migrate tables
	if err := AutoMigrate(); err != nil {
		return fmt.Errorf("failed to auto migrate: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

// InitRedis initializes Redis connection
func InitRedis(cfg *config.Config) error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     cfg.GetRedisAddr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Redis connected successfully")
	return nil
}

// AutoMigrate runs auto migration for all models
func AutoMigrate() error {
	return DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Analytics{},
	)
}

// CloseDatabase closes database connections
func CloseDatabase() error {
	if RedisClient != nil {
		if err := RedisClient.Close(); err != nil {
			return err
		}
	}

	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}

	return nil
}

// GetDB returns database instance
func GetDB() *gorm.DB {
	return DB
}

// GetRedis returns Redis client instance
func GetRedis() *redis.Client {
	return RedisClient
}
