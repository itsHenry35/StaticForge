package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// OriginCheckMiddleware prevents access to API from static sites
func OriginCheckMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		referer := c.Request.Referer()
		origin := c.Request.Header.Get("Origin")
		secFetchSite := c.Request.Header.Get("Sec-Fetch-Site")

		// Block requests with Referer or Origin pointing to a static site path
		if referer != "" && strings.Contains(referer, "/s/") {
			c.AbortWithStatusJSON(403, gin.H{"code": 403, "message": "Access denied from static site"})
			return
		}
		if origin != "" && strings.Contains(origin, "/s/") {
			c.AbortWithStatusJSON(403, gin.H{"code": 403, "message": "Access denied from static site"})
			return
		}

		// Block browser same-origin requests with no Referer:
		// a static site script can suppress Referer via referrerPolicy:'no-referrer',
		// but the browser still sets Sec-Fetch-Site (a forbidden header JS cannot forge).
		// Legitimate SPA requests always carry a Referer from a non-/s/ page.
		if secFetchSite == "same-origin" && referer == "" {
			c.AbortWithStatusJSON(403, gin.H{"code": 403, "message": "Access denied from static site"})
			return
		}

		c.Next()
	}
}
