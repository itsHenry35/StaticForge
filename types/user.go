package types

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
}

type UpdateUserRequest struct {
	DisplayName string `json:"display_name"`
	Email       string `json:"email" binding:"omitempty,email"`
	Password    string `json:"password" binding:"omitempty,min=6"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type UserResponse struct {
	ID          uint   `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	IsAdmin     bool   `json:"is_admin"`
	IsActive    bool   `json:"is_active"`
	CreatedAt   string `json:"created_at"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}
