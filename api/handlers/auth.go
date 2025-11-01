package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/database"
	"github.com/itsHenry35/StaticForge/models"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
	"golang.org/x/oauth2"
)

// Login handles user login
func Login(c *gin.Context) {
	var req types.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		utils.Unauthorized(c, "Invalid username or password")
		return
	}

	if !user.IsActive {
		utils.Forbidden(c, "Account is disabled")
		return
	}

	if !user.HasPassword() {
		utils.BadRequest(c, "This account uses OAuth login")
		return
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		utils.Unauthorized(c, "Invalid username or password")
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		utils.InternalServerError(c, "Failed to generate token")
		return
	}

	utils.Success(c, types.LoginResponse{
		Token: token,
		User: types.UserResponse{
			ID:            user.ID,
			Username:      user.Username,
			DisplayName:   user.DisplayName,
			Email:         user.Email,
			IsAdmin:       user.IsAdmin,
			IsActive:      user.IsActive,
			CreatedAt:     user.CreatedAt.Format(time.RFC3339),
		},
	})
}

// Register handles user registration
func Register(c *gin.Context) {
	cfg := config.GetConfig()
	if !cfg.AllowRegister {
		utils.Forbidden(c, "Registration is disabled")
		return
	}

	var req types.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if !utils.ValidateUsername(req.Username) {
		utils.BadRequest(c, "Invalid username format (3-50 alphanumeric characters, underscore, hyphen)")
		return
	}

	if !utils.ValidateEmail(req.Email) {
		utils.BadRequest(c, "Invalid email format")
		return
	}

	if !utils.ValidatePassword(req.Password) {
		utils.BadRequest(c, "Password must be at least 6 characters")
		return
	}

	// Check if username already exists
	var existingUser models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "Username already exists")
		return
	}

	// Check if email already exists
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "Email already exists")
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.InternalServerError(c, "Failed to hash password")
		return
	}

	user := models.User{
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Password:    hashedPassword,
		IsAdmin:     false,
		IsActive:    true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalServerError(c, "Failed to create user")
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		utils.InternalServerError(c, "Failed to generate token")
		return
	}

	utils.Success(c, types.LoginResponse{
		Token: token,
		User: types.UserResponse{
			ID:            user.ID,
			Username:      user.Username,
			DisplayName:   user.DisplayName,
			Email:         user.Email,
			IsAdmin:       user.IsAdmin,
			IsActive:      user.IsActive,
			CreatedAt:     user.CreatedAt.Format(time.RFC3339),
		},
	})
}

// GetOAuthProviders returns list of configured OAuth providers
func GetOAuthProviders(c *gin.Context) {
	cfg := config.GetConfig()

	var providers []types.OAuthProviderResponse
	for _, p := range cfg.OAuth {
		providers = append(providers, types.OAuthProviderResponse{
			Name: p.Name,
			Icon: p.Icon,
		})
	}

	utils.Success(c, providers)
}

// InitiateOAuthLogin initiates OAuth login flow
func InitiateOAuthLogin(c *gin.Context) {
	providerName := c.Param("provider")

	cfg := config.GetConfig()
	provider, err := cfg.GetOAuthProvider(providerName)
	if err != nil {
		utils.BadRequest(c, "Invalid OAuth provider")
		return
	}

	// Build redirect URL from request
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	redirectURL := fmt.Sprintf("%s://%s/api/auth/oauth/callback", scheme, c.Request.Host)

	// Build authorization URL with state parameter containing provider name
	authURL := provider.AuthURL + "?client_id=" + provider.ClientID +
		"&redirect_uri=" + redirectURL +
		"&response_type=code" +
		"&scope=" + strings.Join(provider.Scopes, " ") +
		"&state=" + providerName

	// Redirect to OAuth provider
	c.Redirect(http.StatusFound, authURL)
}

// OAuthCallback handles OAuth callback
func OAuthCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state") // state contains provider name

	if code == "" {
		c.Redirect(http.StatusFound, "/login?error=oauth_failed")
		return
	}

	cfg := config.GetConfig()
	provider, err := cfg.GetOAuthProvider(state)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=invalid_provider")
		return
	}

	// Build redirect URL from request
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	redirectURL := fmt.Sprintf("%s://%s/api/auth/oauth/callback", scheme, c.Request.Host)

	// Exchange code for token
	oauth2Config := &oauth2.Config{
		ClientID:     provider.ClientID,
		ClientSecret: provider.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  provider.AuthURL,
			TokenURL: provider.TokenURL,
		},
		RedirectURL: redirectURL,
		Scopes:      provider.Scopes,
	}

	ctx := context.Background()
	token, err := oauth2Config.Exchange(ctx, code)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_exchange_failed")
		return
	}

	// Get user info
	client := oauth2Config.Client(ctx, token)
	resp, err := client.Get(provider.UserInfoURL)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=userinfo_failed")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=userinfo_read_failed")
		return
	}

	var userInfo map[string]interface{}
	if err := json.Unmarshal(body, &userInfo); err != nil {
		c.Redirect(http.StatusFound, "/login?error=userinfo_parse_failed")
		return
	}

	// Extract name, email, and display_name using field mapping
	name := extractField(userInfo, provider.FieldMapping["name"])
	email := extractField(userInfo, provider.FieldMapping["email"])
	displayName := extractField(userInfo, provider.FieldMapping["display_name"])

	if name == "" {
		c.Redirect(http.StatusFound, "/login?error=missing_name")
		return
	}

	// Check if user exists by email (email is the unique identifier)
	var user models.User
	err = database.DB.Where("email = ?", email).First(&user).Error

	if err != nil {
		// User not found, create new user
		username := generateUsername(name)

		user = models.User{
			Username:    username,
			DisplayName: displayName,
			Email:       email,
			IsAdmin:     false,
			IsActive:    true,
		}

		if err := database.DB.Create(&user).Error; err != nil {
			c.Redirect(http.StatusFound, "/login?error=user_creation_failed")
			return
		}
	}
	// User already exists - just login, regardless of which OAuth provider they use

	if !user.IsActive {
		c.Redirect(http.StatusFound, "/login?error=account_disabled")
		return
	}

	jwtToken, err := utils.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_generation_failed")
		return
	}

	// Redirect to frontend login page with token
	c.Redirect(http.StatusFound, "/login?token="+jwtToken)
}

// extractField extracts a field from nested map
func extractField(data map[string]interface{}, field string) string {
	if field == "" {
		return ""
	}

	if val, ok := data[field]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}

	return ""
}

// generateUsername generates a unique username from name
func generateUsername(name string) string {
	// Remove spaces and special characters
	username := ""
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			username += string(c)
		}
	}

	if username == "" {
		username = "user"
	}

	// Check if username exists
	var count int64
	database.DB.Model(&models.User{}).Where("username LIKE ?", username+"%").Count(&count)

	if count > 0 {
		username = fmt.Sprintf("%s%d", username, count+1)
	}

	return username
}
