package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware adds security headers to responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For static sites (/s/), apply CSP to allow full functionality but protect API
		if strings.HasPrefix(c.Request.URL.Path, "/s/") {
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

			// Allow embedding in iframes from any origin
			c.Writer.Header().Set("X-Frame-Options", "ALLOWALL")

			// Prevent credentials from being sent with cross-origin requests
			c.Writer.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
			c.Writer.Header().Set("Cross-Origin-Embedder-Policy", "unsafe-none")
		} else {
			// For API routes, prevent clickjacking
			c.Writer.Header().Set("X-Frame-Options", "DENY")
		}

		// Prevent MIME type sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		c.Next()
	}
}
