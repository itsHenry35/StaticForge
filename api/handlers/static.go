package handlers

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/services"
	"github.com/itsHenry35/StaticForge/utils"
)

// ServeStaticSite serves static website files
func ServeStaticSite(c *gin.Context) {
	projectName := c.Param("name")
	filePath := c.Param("filepath")

	// If no filepath specified, serve index.html
	if filePath == "" || filePath == "/" {
		filePath = "index.html"
	}

	// Remove leading slash
	filePath = strings.TrimPrefix(filePath, "/")

	// Get project
	var project models.Project
	if err := database.DB.Preload("User").Where("name = ? AND is_published = ?", projectName, true).First(&project).Error; err != nil {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusNotFound, `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Error</title>
</head>
<body>
	<script>
		alert('Project not found');
		window.history.back();
	</script>
</body>
</html>`)
		return
	}

	// Check if project is disabled
	if !project.IsActive {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusForbidden, `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Project Disabled</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			max-width: 500px;
			width: 100%;
			padding: 48px 40px;
			text-align: center;
		}
		.icon {
			width: 80px;
			height: 80px;
			margin: 0 auto 24px;
			background: #fee;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 40px;
		}
		h1 {
			font-size: 28px;
			color: #1a202c;
			margin-bottom: 16px;
			font-weight: 700;
		}
		p {
			color: #718096;
			font-size: 16px;
			line-height: 1.6;
			margin-bottom: 32px;
		}
		.btn {
			display: inline-block;
			padding: 12px 32px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-weight: 600;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="icon">🚫</div>
		<h1>Project Disabled</h1>
		<p>This project has been disabled by an administrator and is currently unavailable.</p>
		<a href="/" class="btn">Return to Home</a>
	</div>
</body>
</html>`)
		return
	}

	// Check if user account is disabled
	if !project.User.IsActive {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusForbidden, `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Account Disabled</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			max-width: 500px;
			width: 100%;
			padding: 48px 40px;
			text-align: center;
		}
		.icon {
			width: 80px;
			height: 80px;
			margin: 0 auto 24px;
			background: #fee;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 40px;
		}
		h1 {
			font-size: 28px;
			color: #1a202c;
			margin-bottom: 16px;
			font-weight: 700;
		}
		p {
			color: #718096;
			font-size: 16px;
			line-height: 1.6;
			margin-bottom: 32px;
		}
		.btn {
			display: inline-block;
			padding: 12px 32px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-weight: 600;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="icon">🚫</div>
		<h1>Account Disabled</h1>
		<p>This project is currently unavailable because the owner's account has been disabled by an administrator.</p>
		<a href="/" class="btn">Return to Home</a>
	</div>
</body>
</html>`)
		return
	}

	// Check for query parameters (consent or password)
	consentParam := c.Query("consent")
	passwordParam := c.Query("password")

	// Handle consent query parameter
	if consentParam != "" {
		consentCookieName := fmt.Sprintf("consent_%s", projectName)
		c.SetCookie(
			consentCookieName,
			"true",
			3600*24*365, // 1 year
			"/",
			"",
			false,
			false,
		)
		// Redirect to clean URL
		c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
		return
	}

	// Handle password query parameter
	if passwordParam != "" {
		if !project.HasPassword {
			// Redirect to clean URL
			c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
			return
		}

		// Verify password
		if utils.CheckPassword(passwordParam, project.Password) {
			// Set password cookie
			cookieName := fmt.Sprintf("project_auth_%s", projectName)
			cookieValue := fmt.Sprintf("%x", md5.Sum([]byte(projectName+project.Password)))
			c.SetCookie(
				cookieName,
				cookieValue,
				3600*24*7, // 7 days
				"/",
				"",
				false,
				true,
			)
			// Redirect to clean URL
			c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
			return
		} else {
			// Invalid password, redirect back to auth page
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			redirectURL := fmt.Sprintf("%s://%s/auth/%s?requirePassword&error=invalid_password", scheme, c.Request.Host, projectName)
			c.Redirect(http.StatusFound, redirectURL)
			return
		}
	}

	// Check if project has password protection
	if project.HasPassword {
		// Check cookie for password verification
		cookieName := fmt.Sprintf("project_auth_%s", projectName)
		cookie, err := c.Cookie(cookieName)

		if err != nil || cookie == "" {
			// No password cookie, redirect to auth page
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			redirectURL := fmt.Sprintf("%s://%s/auth/%s?requirePassword", scheme, c.Request.Host, projectName)
			c.Redirect(http.StatusFound, redirectURL)
			return
		}

		// Verify cookie value
		expectedCookie := fmt.Sprintf("%x", md5.Sum([]byte(projectName+project.Password)))
		if cookie != expectedCookie {
			// Invalid password cookie, redirect to auth page
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			redirectURL := fmt.Sprintf("%s://%s/auth/%s?requirePassword", scheme, c.Request.Host, projectName)
			c.Redirect(http.StatusFound, redirectURL)
			return
		}
	}

	// Check consent cookie - required for first-time access (unless creator is admin)
	if !project.User.IsAdmin {
		consentCookie, err := c.Cookie(fmt.Sprintf("consent_%s", projectName))
		if err != nil || consentCookie != "true" {
			// No consent, redirect to auth page
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			redirectURL := fmt.Sprintf("%s://%s/auth/%s", scheme, c.Request.Host, projectName)
			c.Redirect(http.StatusFound, redirectURL)
			return
		}
	}

	// Record visit (only for index.html to avoid counting each resource)
	if filePath == "index.html" {
		userAgent := c.GetHeader("User-Agent")
		clientIP := c.ClientIP()
		visitorID := fmt.Sprintf("%x", md5.Sum([]byte(clientIP+userAgent)))
		services.RecordVisit(project.ID, visitorID)
	}

	// Serve file
	cfg := config.GetConfig()
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, filePath)

	// Check if file exists
	if !utils.FileExists(fullPath) {
		c.String(http.StatusNotFound, "File not found")
		return
	}

	// Check if we need to apply string replacements
	ext := strings.ToLower(filepath.Ext(filePath))
	shouldReplace := ext == ".html" || ext == ".css" || ext == ".js"

	if shouldReplace {
		// Read file content
		content, err := utils.ReadFile(fullPath)
		if err != nil {
			c.String(http.StatusInternalServerError, "Failed to read file")
			return
		}

		// Apply replacements
		cfg := config.GetConfig()
		replacedContent := cfg.ApplyReplacements(string(content))

		// Serve with appropriate content type
		mimeType := utils.GetMimeType(filePath)
		c.Header("Content-Type", mimeType)
		c.String(http.StatusOK, replacedContent)
	} else {
		// Serve file directly for other file types
		mimeType := utils.GetMimeType(filePath)
		c.Header("Content-Type", mimeType)
		c.File(fullPath)
	}
}
