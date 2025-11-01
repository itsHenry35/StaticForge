package types

type OAuthLoginRequest struct {
	Provider string `json:"provider" binding:"required"`
	Code     string `json:"code" binding:"required"`
}

type OAuthProviderResponse struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
}
