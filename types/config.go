package types

type PublicConfigResponse struct {
	AllowRegister bool   `json:"allow_register"`
	LogoURL       string `json:"logo_url"`
	SiteName      string `json:"site_name"`
}

type ConfigResponse struct {
	AllowRegister       bool              `json:"allow_register"`
	OAuth               []OAuthConfigFull `json:"oauth"`
	Replacements        []ReplacementRule `json:"replacements"`
	AllowedIframeOrigin string            `json:"allowed_iframe_origin"`
	LogoURL             string            `json:"logo_url"`
	SiteName            string            `json:"site_name"`
}

type ReplacementRule struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type OAuthConfig struct {
	Name         string            `json:"name"`
	Icon         string            `json:"icon"`
	ClientID     string            `json:"client_id"`
	Scopes       []string          `json:"scopes"`
	FieldMapping map[string]string `json:"field_mapping"`
}

type OAuthConfigFull struct {
	Name         string            `json:"name"`
	Icon         string            `json:"icon"`
	ClientID     string            `json:"client_id"`
	ClientSecret string            `json:"client_secret"`
	WellKnownURL string            `json:"well_known_url"`
	Scopes       []string          `json:"scopes"`
	FieldMapping map[string]string `json:"field_mapping"`
}

type UpdateConfigRequest struct {
	AllowRegister       bool                   `json:"allow_register"`
	OAuth               []OAuthProviderRequest `json:"oauth"`
	Replacements        []ReplacementRule      `json:"replacements"`
	AllowedIframeOrigin string                 `json:"allowed_iframe_origin"`
	LogoURL             string                 `json:"logo_url"`
	SiteName            string                 `json:"site_name"`
}

type OAuthProviderRequest struct {
	Name         string            `json:"name"`
	Icon         string            `json:"icon"`
	ClientID     string            `json:"client_id"`
	ClientSecret string            `json:"client_secret"`
	WellKnownURL string            `json:"well_known_url"`
	Scopes       []string          `json:"scopes"`
	FieldMapping map[string]string `json:"field_mapping"`
}
