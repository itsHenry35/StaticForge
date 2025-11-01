package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// OriginCheckMiddleware prevents access to API from static sites
func OriginCheckMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check Referer header
		referer := c.Request.Referer()
		if referer != "" && strings.Contains(referer, "/s/") {
			c.AbortWithStatusJSON(403, gin.H{
				"code":    403,
				"message": "Access denied from static site",
			})
			return
		}

		// Check Origin header
		origin := c.Request.Header.Get("Origin")
		if origin != "" && strings.Contains(origin, "/s/") {
			c.AbortWithStatusJSON(403, gin.H{
				"code":    403,
				"message": "Cross access forbidden",
			})
			return
		}

		c.Next()
	}
}
