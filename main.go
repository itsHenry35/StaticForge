package main

import (
	"embed"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/api/routes"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/services"
	"github.com/itsHenry35/StaticForge/utils"
)

//go:embed web/dist/*
var StaticFiles embed.FS

func main() {
	// Load configuration
	cfg, err := config.LoadConfig("config.json")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Println("Configuration loaded successfully")

	// Initialize OAuth providers (discover OIDC endpoints)
	if err := cfg.InitializeOAuth(); err != nil {
		log.Printf("Warning: Failed to initialize OAuth providers: %v", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Initialize database
	if err := database.InitDatabase(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Redis
	if err := database.InitRedis(cfg); err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}

	// Initialize admin account on first startup
	if err := initializeAdminAccount(); err != nil {
		log.Fatalf("Failed to initialize admin account: %v", err)
	}

	// Start analytics flush worker
	go startAnalyticsFlushWorker()

	// Create Gin router
	r := gin.Default()

	// Setup routes with embedded static files
	routes.SetupRoutes(r, StaticFiles)

	// Ensure data directory exists
	if err := utils.EnsureDir(cfg.Upload.DataDir); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		log.Println("\nShutting down gracefully...")

		// Flush analytics before shutdown
		if err := services.FlushAnalyticsToDatabase(); err != nil {
			log.Printf("Error flushing analytics: %v", err)
		}

		// Close database connections
		if err := database.CloseDatabase(); err != nil {
			log.Printf("Error closing database: %v", err)
		}

		os.Exit(0)
	}()

	// Start server
	addr := cfg.GetServerAddr()
	log.Printf("Starting StaticForge server on %s", addr)
	log.Printf("Mode: %s", cfg.Server.Mode)

	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// initializeAdminAccount creates an admin account if no users exist
func initializeAdminAccount() error {
	var count int64
	database.DB.Model(&models.User{}).Count(&count)

	if count == 0 {
		// Generate random password
		password, err := utils.GenerateRandomPassword(12)
		if err != nil {
			return fmt.Errorf("failed to generate password: %w", err)
		}

		// Hash password
		hashedPassword, err := utils.HashPassword(password)
		if err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}

		// Create admin user
		admin := models.User{
			Username: "admin",
			Email:    "admin@staticforge.local",
			Password: hashedPassword,
			IsAdmin:  true,
			IsActive: true,
		}

		if err := database.DB.Create(&admin).Error; err != nil {
			return fmt.Errorf("failed to create admin user: %w", err)
		}

		// Print admin credentials
		log.Println("=====================================")
		log.Println("ADMIN ACCOUNT CREATED")
		log.Println("=====================================")
		log.Printf("Username: admin")
		log.Printf("Password: %s", password)
		log.Println("=====================================")
		log.Println("PLEASE SAVE THESE CREDENTIALS!")
		log.Println("You can change the password after logging in.")
		log.Println("=====================================")
	}

	return nil
}

// startAnalyticsFlushWorker starts a background worker to flush analytics to database
func startAnalyticsFlushWorker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("Flushing analytics to database...")
		if err := services.FlushAnalyticsToDatabase(); err != nil {
			log.Printf("Error flushing analytics: %v", err)
		} else {
			log.Println("Analytics flushed successfully")
		}
	}
}
