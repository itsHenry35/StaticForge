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

// isOnSecureHost reports whether this request arrived on the configured secure host.
func isOnSecureHost(c *gin.Context, cfg *config.Config) bool {
	if cfg.SecureHost == "" {
		return false
	}
	requestHost := c.Request.Host
	compareHost := cfg.SecureHost
	if !strings.Contains(compareHost, ":") {
		if idx := strings.LastIndex(requestHost, ":"); idx != -1 {
			requestHost = requestHost[:idx]
		}
	}
	return requestHost == compareHost
}

// ServeStaticSite serves static website files
func ServeStaticSite(c *gin.Context) {
	projectName := c.Param("name")
	filePath := c.Param("filepath")

	if filePath == "" || filePath == "/" {
		filePath = "index.html"
	}
	filePath = strings.TrimPrefix(filePath, "/")

	cfg := config.GetConfig()

	// Get project
	var project models.Project
	if err := database.DB.Preload("User").Where("name = ? AND is_published = ?", projectName, true).First(&project).Error; err != nil {
		ServeErrorPage(c, http.StatusNotFound, "notfound.html", nil)
		return
	}

	// Secure host: only serve projects from trusted users (admin or verified)
	if isOnSecureHost(c, cfg) && !project.User.IsAdmin() && !project.User.IsVerified() {
		params := map[string]string{"project": projectName}
		if cfg.SiteHost != "" {
			params["workspace"] = cfg.SiteHost
		}
		ServeErrorPage(c, http.StatusForbidden, "secureerror.html", params)
		return
	}

	// Project disabled
	if !project.IsActive {
		ServeErrorPage(c, http.StatusForbidden, "projectdisabled.html", nil)
		return
	}

	// User account disabled
	if !project.User.IsActive {
		ServeErrorPage(c, http.StatusForbidden, "accountdisabled.html", nil)
		return
	}

	// Handle consent query parameter
	if consentParam := c.Query("consent"); consentParam != "" {
		c.SetCookie(fmt.Sprintf("consent_%s", projectName), "true", 3600*24*365, "/", "", false, false)
		c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
		return
	}

	// Handle password query parameter
	if passwordParam := c.Query("password"); passwordParam != "" {
		if !project.HasPassword {
			c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
			return
		}
		if utils.CheckPassword(passwordParam, project.Password) {
			cookieValue := fmt.Sprintf("%x", md5.Sum([]byte(projectName+project.Password)))
			c.SetCookie(fmt.Sprintf("project_auth_%s", projectName), cookieValue, 3600*24*7, "/", "", false, true)
			c.Redirect(http.StatusFound, fmt.Sprintf("/s/%s/", projectName))
			return
		}
		scheme := "http"
		if c.Request.TLS != nil {
			scheme = "https"
		}
		c.Redirect(http.StatusFound, fmt.Sprintf("%s://%s/auth/%s?requirePassword&error=invalid_password", scheme, c.Request.Host, projectName))
		return
	}

	// Check password cookie
	if project.HasPassword {
		cookieName := fmt.Sprintf("project_auth_%s", projectName)
		cookie, err := c.Cookie(cookieName)
		expectedCookie := fmt.Sprintf("%x", md5.Sum([]byte(projectName+project.Password)))
		if err != nil || cookie != expectedCookie {
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			c.Redirect(http.StatusFound, fmt.Sprintf("%s://%s/auth/%s?requirePassword", scheme, c.Request.Host, projectName))
			return
		}
	}

	// Check consent cookie (unless creator is admin or verified)
	if !project.User.IsAdmin() && !project.User.IsVerified() {
		consentCookie, err := c.Cookie(fmt.Sprintf("consent_%s", projectName))
		if err != nil || consentCookie != "true" {
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			c.Redirect(http.StatusFound, fmt.Sprintf("%s://%s/auth/%s", scheme, c.Request.Host, projectName))
			return
		}
	}

	// Record visit (only for index.html)
	if filePath == "index.html" {
		userAgent := c.GetHeader("User-Agent")
		clientIP := c.ClientIP()
		visitorID := fmt.Sprintf("%x", md5.Sum([]byte(clientIP+userAgent)))
		services.RecordVisit(project.ID, visitorID)
	}

	// Serve file
	projectPath := project.GetPath(cfg.Upload.DataDir, project.User.Username)
	fullPath := filepath.Join(projectPath, filePath)

	if !utils.FileExists(fullPath) {
		ServeErrorPage(c, http.StatusNotFound, "filenotfound.html", map[string]string{
			"project": projectName,
			"file":    filePath,
		})
		return
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	if ext == ".html" || ext == ".css" || ext == ".js" {
		content, err := utils.ReadFile(fullPath)
		if err != nil {
			c.String(http.StatusInternalServerError, "Failed to read file")
			return
		}
		c.Header("Content-Type", utils.GetMimeType(filePath))
		c.String(http.StatusOK, cfg.ApplyReplacements(string(content)))
	} else {
		c.Header("Content-Type", utils.GetMimeType(filePath))
		c.File(fullPath)
	}
}
