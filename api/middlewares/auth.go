package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/utils"
)

// AuthMiddleware validates JWT token and sets user info in context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Unauthorized(c, utils.MsgUnauthorized)
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.Unauthorized(c, utils.MsgUnauthorized)
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ParseToken(token)
		if err != nil {
			utils.Unauthorized(c, utils.MsgInvalidToken)
			c.Abort()
			return
		}

		// Check if user exists and is active
		var user models.User
		if err := database.DB.First(&user, claims.UserID).Error; err != nil {
			utils.Unauthorized(c, utils.MsgUserNotFound)
			c.Abort()
			return
		}

		if !user.IsActive {
			utils.Forbidden(c, utils.MsgAccountDisabled)
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", user.ID)
		c.Set("username", user.Username)
		c.Set("is_admin", user.IsAdmin)
		c.Set("user", user)

		c.Next()
	}
}

// AdminMiddleware checks if user is admin
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			utils.Forbidden(c, utils.MsgAdminRequired)
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT token if present, but doesn't require it
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		token := parts[1]
		claims, err := utils.ParseToken(token)
		if err != nil {
			c.Next()
			return
		}

		var user models.User
		if err := database.DB.First(&user, claims.UserID).Error; err != nil {
			c.Next()
			return
		}

		if user.IsActive {
			c.Set("user_id", user.ID)
			c.Set("username", user.Username)
			c.Set("is_admin", user.IsAdmin)
			c.Set("user", user)
		}

		c.Next()
	}
}
