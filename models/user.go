package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Username    string `gorm:"uniqueIndex;not null;size:50" json:"username"`
	DisplayName string `gorm:"size:100" json:"display_name"`
	Email       string `gorm:"uniqueIndex;size:255" json:"email"`
	Password    string `gorm:"size:255" json:"-"` // bcrypt hash, can be empty for OAuth users
	IsAdmin     bool   `gorm:"default:false" json:"is_admin"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`

	// Relations
	Projects []Project `gorm:"foreignKey:UserID" json:"projects,omitempty"`
}

// TableName specifies the table name for User model
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return nil
}

// HasPassword checks if user has a password set
func (u *User) HasPassword() bool {
	return u.Password != ""
}
