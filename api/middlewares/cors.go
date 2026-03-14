package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware rejects all cross-origin requests.
// The frontend and API are always same-origin, so no cross-origin access is needed.
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			c.Next()
			return
		}

		// Extract host from Origin header
		originHost := origin
		if _, after, ok := strings.Cut(origin, "://"); ok {
			originHost = after
		}
		// Strip path if any
		if idx := strings.IndexByte(originHost, '/'); idx != -1 {
			originHost = originHost[:idx]
		}

		// Allow if Origin host matches the request host (same-origin POST etc.)
		if originHost == c.Request.Host {
			c.Next()
			return
		}

		// Cross-origin: reject
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
		} else {
			c.AbortWithStatus(403)
		}
	}
}
