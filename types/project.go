package types

type PublicProjectInfoResponse struct {
	DisplayName string `json:"display_name"`
}

type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
}

type UpdateProjectRequest struct {
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	IsSecure    *bool  `json:"is_secure"`
}

type PublishProjectRequest struct {
	IsPublished bool   `json:"is_published"`
	Password    string `json:"password"` // optional
}

type VerifyProjectPasswordRequest struct {
	Password string `json:"password" binding:"required"`
}

type ProjectResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	UserID      uint   `json:"user_id"`
	Username    string `json:"username"`
	OwnerType   string `json:"owner_type"`
	IsPublished bool   `json:"is_published"`
	IsActive    bool   `json:"is_active"`
	IsSecure    bool   `json:"is_secure"`
	HasPassword bool   `json:"has_password"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type ProjectDetailResponse struct {
	ProjectResponse
}
