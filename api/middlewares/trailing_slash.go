package middlewares

import (
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
)

// TrailingSlashMiddleware redirects /s/:name to /s/:name/ automatically
func TrailingSlashMiddleware() gin.HandlerFunc {
	// Pattern to match /s/projectname without trailing slash
	// Should match: /s/test
	// Should NOT match: /s/test/, /s/test/index.html, /s/test/assets/style.css
	projectPattern := regexp.MustCompile(`^/s/[^/]+$`)

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Check if path matches /s/:name pattern (without trailing slash)
		if projectPattern.MatchString(path) {
			// Get query parameters if any
			query := c.Request.URL.RawQuery

			// Build new URL with trailing slash
			newURL := path + "/"
			if query != "" {
				newURL += "?" + query
			}

			// Perform 301 permanent redirect
			c.Redirect(http.StatusMovedPermanently, newURL)
			c.Abort()
			return
		}

		c.Next()
	}
}
