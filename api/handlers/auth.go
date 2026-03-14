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
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		utils.Unauthorized(c, utils.MsgInvalidCredentials)
		return
	}

	if !user.IsActive {
		utils.Forbidden(c, utils.MsgAccountDisabled)
		return
	}

	if !user.HasPassword() {
		utils.BadRequest(c, utils.MsgAccountUsesOAuth)
		return
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		utils.Unauthorized(c, utils.MsgInvalidCredentials)
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Type)
	if err != nil {
		utils.InternalServerError(c, utils.MsgTokenGenerationFailed)
		return
	}

	setSessionCookie(c, token)

	utils.SuccessWithCode(c, utils.MsgLoginSuccess, types.LoginResponse{
		Token: token,
		User: types.UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Type:        user.Type,
			IsActive:    user.IsActive,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		},
	})
}

// Logout clears the session cookie
func Logout(c *gin.Context) {
	clearSessionCookie(c)
	utils.Success(c, nil)
}

// Register handles user registration
func Register(c *gin.Context) {
	cfg := config.GetConfig()
	if !cfg.AllowRegister {
		utils.Forbidden(c, utils.MsgRegistrationDisabled)
		return
	}

	var req types.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	if !utils.ValidateUsername(req.Username) {
		utils.BadRequest(c, utils.MsgInvalidUsername)
		return
	}

	if !utils.ValidateEmail(req.Email) {
		utils.BadRequest(c, utils.MsgInvalidEmail)
		return
	}

	if !utils.ValidatePassword(req.Password) {
		utils.BadRequest(c, utils.MsgInvalidPassword)
		return
	}

	// Check if username already exists
	var existingUser models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, utils.MsgUsernameExists)
		return
	}

	// Check if email already exists
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, utils.MsgEmailExists)
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.InternalServerError(c, utils.MsgPasswordHashFailed)
		return
	}

	user := models.User{
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Password:    hashedPassword,
		Type:        "normal",
		IsActive:    true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalServerError(c, utils.MsgUserCreationFailed)
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Type)
	if err != nil {
		utils.InternalServerError(c, utils.MsgTokenGenerationFailed)
		return
	}

	setSessionCookie(c, token)

	utils.SuccessWithCode(c, utils.MsgRegisterSuccess, types.LoginResponse{
		Token: token,
		User: types.UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Type:        user.Type,
			IsActive:    user.IsActive,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
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
		utils.BadRequest(c, utils.MsgInvalidOAuthProvider)
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

	// Resolve user type from role claim mapping (if configured)
	resolvedType := resolveRoleType(userInfo, provider)

	// Check if user exists by email (email is the unique identifier)
	var user models.User
	err = database.DB.Where("email = ?", email).First(&user).Error

	if err != nil {
		// User not found, create new user
		username := generateUsername(name)
		userType := "normal"
		if resolvedType != "" {
			userType = resolvedType
		}
		user = models.User{
			Username:    username,
			DisplayName: displayName,
			Email:       email,
			Type:        userType,
			IsActive:    true,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			c.Redirect(http.StatusFound, "/login?error=user_creation_failed")
			return
		}
	} else {
		// User exists — sync display name and role type on every login.
		updates := map[string]interface{}{}
		if displayName != "" && displayName != user.DisplayName {
			updates["display_name"] = displayName
			user.DisplayName = displayName
		}
		if resolvedType != "" && resolvedType != user.Type {
			updates["type"] = resolvedType
			user.Type = resolvedType
		}
		if len(updates) > 0 {
			database.DB.Model(&user).Updates(updates)
		}
	}

	if !user.IsActive {
		c.Redirect(http.StatusFound, "/login?error=account_disabled")
		return
	}

	jwtToken, err := utils.GenerateToken(user.ID, user.Username, user.Type)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_generation_failed")
		return
	}

	setSessionCookie(c, jwtToken)
	c.Redirect(http.StatusFound, "/dashboard")
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

// resolveRoleType resolves the highest-priority user type from the role claim.
// Returns "" if no role mapping is configured (caller should not change type).
func resolveRoleType(userInfo map[string]interface{}, provider *config.OAuthConfig) string {
	if provider.RoleClaim == "" || len(provider.RoleMapping) == 0 {
		return ""
	}

	raw, ok := userInfo[provider.RoleClaim]
	if !ok {
		return "normal"
	}

	// Claim may be a string (split by separator) or a JSON array.
	var roles []string
	switch v := raw.(type) {
	case string:
		sep := provider.RoleSeparator
		if sep == "" {
			sep = ","
		}
		for _, r := range strings.Split(v, sep) {
			if r = strings.TrimSpace(r); r != "" {
				roles = append(roles, r)
			}
		}
	case []interface{}:
		for _, r := range v {
			if s, ok := r.(string); ok {
				roles = append(roles, s)
			}
		}
	}

	// Priority: admin(3) > verified(2) > normal(1)
	priority := map[string]int{"normal": 1, "verified": 2, "admin": 3}
	best, bestP := "normal", 0
	for _, role := range roles {
		if mapped, ok := provider.RoleMapping[role]; ok {
			if p := priority[mapped]; p > bestP {
				best, bestP = mapped, p
			}
		}
	}
	return best
}

// setSessionCookie sets the sf_session cookie scoped to /api/
func setSessionCookie(c *gin.Context, token string) {
	cfg := config.GetConfig()
	secure := c.Request.TLS != nil
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sf_session", token, cfg.JWT.Expire*3600, "/api/", "", secure, true)
}

// clearSessionCookie expires the sf_session cookie
func clearSessionCookie(c *gin.Context) {
	secure := c.Request.TLS != nil
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sf_session", "", -1, "/api/", "", secure, true)
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
