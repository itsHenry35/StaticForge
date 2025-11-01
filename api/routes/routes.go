package routes

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/api/handlers"
	"github.com/itsHenry35/StaticForge/api/middlewares"
)

// SetupRoutes sets up all application routes
func SetupRoutes(r *gin.Engine, staticFS embed.FS) {
	// Apply global middleware
	r.Use(middlewares.CORSMiddleware())
	r.Use(middlewares.LoggerMiddleware())
	r.Use(middlewares.SecurityHeadersMiddleware())

	// API routes - add origin check to prevent access from /s/
	api := r.Group("/api")
	api.Use(middlewares.OriginCheckMiddleware())
	{
		// Public routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
			auth.GET("/oauth/providers", handlers.GetOAuthProviders)
			auth.GET("/oauth/login/:provider", handlers.InitiateOAuthLogin)
			auth.GET("/oauth/callback", handlers.OAuthCallback)
		}

		// Public config
		api.GET("/config/public", handlers.GetPublicConfig)

		// Protected routes (require authentication)
		protected := api.Group("")
		protected.Use(middlewares.AuthMiddleware())
		{
			// Current user
			user := protected.Group("/user")
			{
				user.GET("/me", handlers.GetCurrentUser)
				user.PUT("/me", handlers.UpdateCurrentUser)
				user.POST("/change-password", handlers.ChangePassword)
			}

			// Projects
			projects := protected.Group("/projects")
			{
				projects.GET("", handlers.GetProjects)
				projects.POST("", handlers.CreateProject)
				projects.GET("/:id", handlers.GetProjectByID)
				projects.PUT("/:id", handlers.UpdateProject)
				projects.POST("/:id/publish", handlers.PublishProject)
				projects.DELETE("/:id", handlers.DeleteProject)

				// Files (filesystem-based)
				projects.GET("/:id/files", handlers.ScanProjectFiles)
				projects.POST("/:id/files/upload", handlers.UploadFile)
				projects.GET("/:id/files/content", handlers.GetFileContentByPath)
				projects.PUT("/:id/files/content", handlers.UpdateFileContentByPath)
				projects.POST("/:id/files/rename", handlers.RenameFileByPath)
				projects.POST("/:id/files/move", handlers.MoveFileByPath)
				projects.DELETE("/:id/files/delete", handlers.DeleteFileByPath)
				projects.POST("/:id/folders", handlers.CreateFolder)

				// Analytics
				projects.GET("/:id/analytics", handlers.GetProjectAnalytics)
			}
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middlewares.AuthMiddleware())
		admin.Use(middlewares.AdminMiddleware())
		{
			// User management
			admin.GET("/users", handlers.GetUsers)
			admin.GET("/users/:id", handlers.GetUserByID)
			admin.PUT("/users/:id", handlers.UpdateUser)
			admin.POST("/users/:id/toggle-status", handlers.ToggleUserStatus)
			admin.POST("/users/:id/toggle-admin", handlers.ToggleUserAdmin)
			admin.DELETE("/users/:id", handlers.DeleteUser)

			// Project management
			admin.GET("/projects", handlers.GetAllProjects)
			admin.PUT("/projects/:id", handlers.UpdateProject)
			admin.POST("/projects/:id/toggle-status", handlers.ToggleProjectStatus)

			// Config management
			admin.GET("/config", handlers.GetConfig)
			admin.PUT("/config", handlers.UpdateConfig)

			// System stats
			admin.GET("/stats", handlers.GetSystemStats)
		}
	}

	// Static website serving (automatically records visits)
	r.GET("/s/:name", handlers.ServeStaticSite)
	r.GET("/s/:name/*filepath", handlers.ServeStaticSite)

	// Serve frontend static files
	buildFS, err := fs.Sub(staticFS, "web/dist")
	if err != nil {
		panic(err)
	}

	// Serve assets directory
	assetsFS, err := fs.Sub(buildFS, "assets")
	if err != nil {
		panic(err)
	}
	r.StaticFS("/assets", http.FS(assetsFS))

	// Root static files
	rootStaticFiles := []string{
		"robots.txt",
		"favicon.svg",
		"favicon.ico",
		"logo192.png",
		"logo512.png",
		"asset-manifest.json",
		"apple-touch-icon.png",
		"manifest.json",
	}

	for _, file := range rootStaticFiles {
		localFile := file
		r.GET("/"+localFile, func(c *gin.Context) {
			data, err := fs.ReadFile(buildFS, localFile)
			if err != nil {
				c.Status(http.StatusNotFound)
				return
			}

			// Determine content type
			contentType := "application/octet-stream"
			if strings.HasSuffix(localFile, ".json") {
				contentType = "application/json"
			} else if strings.HasSuffix(localFile, ".txt") {
				contentType = "text/plain"
			} else if strings.HasSuffix(localFile, ".svg") {
				contentType = "image/svg+xml"
			} else if strings.HasSuffix(localFile, ".png") {
				contentType = "image/png"
			} else if strings.HasSuffix(localFile, ".ico") {
				contentType = "image/x-icon"
			}

			c.Data(http.StatusOK, contentType, data)
		})
	}

	// All other routes serve index.html (SPA)
	r.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API or static site routes
		if strings.HasPrefix(c.Request.URL.Path, "/api/") ||
			strings.HasPrefix(c.Request.URL.Path, "/s/") {
			c.Status(http.StatusNotFound)
			return
		}

		data, err := fs.ReadFile(buildFS, "index.html")
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})
}
