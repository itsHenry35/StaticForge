package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
)

// SecurityHeadersMiddleware adds security headers to responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := config.GetConfig()

		// For static sites (/s/) and authenticated preview (/api/*/preview), allow iframe embedding
		isStaticOrPreview := strings.HasPrefix(c.Request.URL.Path, "/s/") ||
			strings.Contains(c.Request.URL.Path, "/preview")
		if isStaticOrPreview {
			// Allow scripts, images, fonts, frames, etc. from anywhere
			// But block ALL network connections (fetch/XHR/WebSocket) and form submissions
			// This prevents data exfiltration via JavaScript
			c.Writer.Header().Set("Content-Security-Policy",
				"default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "+
					"script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "+
					"connect-src 'none'; "+ // Block ALL fetch/XHR/WebSocket connections
					"img-src * data: blob:; "+
					"style-src * 'unsafe-inline' data:; "+
					"font-src * data: blob:; "+
					"media-src * data: blob:; "+
					"frame-src * data:; "+
					"object-src * data:; "+
					"base-uri 'self'; "+
					"form-action 'none'")

			// Allow embedding static sites in iframes from any origin
			c.Writer.Header().Set("X-Frame-Options", "ALLOWALL")

			// Prevent credentials from being sent with cross-origin requests
			c.Writer.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
			c.Writer.Header().Set("Cross-Origin-Embedder-Policy", "unsafe-none")
		} else {
			// For admin/management pages, use configured iframe origin policy
			allowedOrigin := cfg.AllowedIframeOrigin

			if allowedOrigin == "*" {
				// Allow all origins to embed
				c.Writer.Header().Set("X-Frame-Options", "ALLOWALL")
			} else if allowedOrigin != "" {
				// Allow specific origin(s) - use CSP frame-ancestors
				// X-Frame-Options doesn't support specific origins
				c.Writer.Header().Set("Content-Security-Policy", "frame-ancestors "+allowedOrigin)
			} else {
				// Default: prevent clickjacking (no iframe embedding)
				c.Writer.Header().Set("X-Frame-Options", "DENY")
			}
		}

		// Prevent MIME type sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		c.Next()
	}
}
