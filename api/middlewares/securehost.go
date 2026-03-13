package middlewares

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/api/handlers"
	"github.com/itsHenry35/StaticForge/config"
)

// errorPagePaths are whitelisted on the secure host so the browser can load them.
var errorPagePaths = map[string]bool{
	"/notfound.html":                true,
	"/filenotfound.html":            true,
	"/secureerror.html":             true,
	"/securedashboardredirect.html": true,
	"/projectdisabled.html":         true,
	"/accountdisabled.html":         true,
	"/error-base.css":               true,
}

// SecureHostMiddleware blocks all non-/s/ routes when the request arrives on
// the configured secure host, serving securedashboardredirect.html inline.
func SecureHostMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := config.GetConfig()
		if cfg.SecureHost == "" {
			c.Next()
			return
		}

		requestHost := c.Request.Host
		compareHost := cfg.SecureHost
		if !strings.Contains(compareHost, ":") {
			if idx := strings.LastIndex(requestHost, ":"); idx != -1 {
				requestHost = requestHost[:idx]
			}
		}

		if requestHost != compareHost {
			c.Next()
			return
		}

		path := c.Request.URL.Path

		// Always allow error pages, their CSS, and /s/ routes.
		if errorPagePaths[path] || strings.HasPrefix(path, "/s/") {
			c.Next()
			return
		}

		// Everything else on the secure host → dashboard-redirect page (served inline).
		params := map[string]string{}
		if cfg.SiteHost != "" {
			params["workspace"] = cfg.SiteHost
		}
		handlers.ServeErrorPage(c, http.StatusForbidden, "securedashboardredirect.html", params)
		c.Abort()
	}
}
