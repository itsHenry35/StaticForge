package types

type PublicConfigResponse struct {
	AllowRegister bool `json:"allow_register"`
}

type ConfigResponse struct {
	AllowRegister bool              `json:"allow_register"`
	OAuth         []OAuthConfig     `json:"oauth"`
	Replacements  []ReplacementRule `json:"replacements"`
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
	AllowRegister bool                   `json:"allow_register"`
	OAuth         []OAuthProviderRequest `json:"oauth"`
	Replacements  []ReplacementRule      `json:"replacements"`
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
