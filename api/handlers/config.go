package handlers

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/itsHenry35/StaticForge/config"
	"github.com/itsHenry35/StaticForge/types"
	"github.com/itsHenry35/StaticForge/utils"
)

// GetPublicConfig returns public configuration
func GetPublicConfig(c *gin.Context) {
	cfg := config.GetConfig()

	utils.Success(c, types.PublicConfigResponse{
		AllowRegister: cfg.AllowRegister,
		LogoURL:       cfg.LogoURL,
		SiteName:      cfg.SiteName,
	})
}

// GetConfig returns full configuration (admin only)
func GetConfig(c *gin.Context) {
	cfg := config.GetConfig()

	var oauthConfigs []types.OAuthConfigFull
	for _, oauth := range cfg.OAuth {
		oauthConfigs = append(oauthConfigs, types.OAuthConfigFull{
			Name:         oauth.Name,
			Icon:         oauth.Icon,
			ClientID:     oauth.ClientID,
			ClientSecret: oauth.ClientSecret,
			WellKnownURL: oauth.WellKnownURL,
			Scopes:       oauth.Scopes,
			FieldMapping: oauth.FieldMapping,
		})
	}

	var replacements []types.ReplacementRule
	for _, rule := range cfg.Replacements {
		replacements = append(replacements, types.ReplacementRule{
			From: rule.From,
			To:   rule.To,
		})
	}

	utils.Success(c, types.ConfigResponse{
		AllowRegister:       cfg.AllowRegister,
		OAuth:               oauthConfigs,
		Replacements:        replacements,
		AllowedIframeOrigin: cfg.AllowedIframeOrigin,
		LogoURL:             cfg.LogoURL,
		SiteName:            cfg.SiteName,
	})
}

// UpdateConfig updates configuration (admin only)
func UpdateConfig(c *gin.Context) {
	var req types.UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, utils.MsgInvalidRequest)
		return
	}

	cfg := config.GetConfig()

	// Update all config fields
	cfg.AllowRegister = req.AllowRegister
	cfg.AllowedIframeOrigin = req.AllowedIframeOrigin
	cfg.LogoURL = req.LogoURL
	cfg.SiteName = req.SiteName

	// Update OAuth providers
	cfg.OAuth = []config.OAuthConfig{}
	for _, oauth := range req.OAuth {
		cfg.OAuth = append(cfg.OAuth, config.OAuthConfig{
			Name:         oauth.Name,
			Icon:         oauth.Icon,
			ClientID:     oauth.ClientID,
			ClientSecret: oauth.ClientSecret,
			WellKnownURL: oauth.WellKnownURL,
			Scopes:       oauth.Scopes,
			FieldMapping: oauth.FieldMapping,
		})
	}

	// Update replacement rules
	cfg.Replacements = []config.ReplacementRule{}
	for _, rule := range req.Replacements {
		cfg.Replacements = append(cfg.Replacements, config.ReplacementRule{
			From: rule.From,
			To:   rule.To,
		})
	}

	// Discover OIDC endpoints for new providers (non-fatal: log and continue)
	if err := cfg.InitializeOAuth(); err != nil {
		log.Printf("Warning: OIDC discovery failed: %v", err)
	}

	// Save config to file
	if err := cfg.SaveConfig("config.json"); err != nil {
		utils.InternalServerError(c, utils.MsgConfigUpdateFailed)
		return
	}

	utils.SuccessWithCode(c, utils.MsgConfigUpdated, nil)
}
