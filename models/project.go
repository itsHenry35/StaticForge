package models

import (
	"time"

	"gorm.io/gorm"
)

type Project struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Name        string `gorm:"uniqueIndex;not null;size:100" json:"name"`
	DisplayName string `gorm:"size:200" json:"display_name"`
	Description string `gorm:"type:text" json:"description"`
	UserID      uint   `gorm:"not null;index" json:"user_id"`
	IsPublished bool   `gorm:"default:false" json:"is_published"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
	Password    string `gorm:"size:255" json:"-"` // bcrypt hash for access password
	HasPassword bool   `gorm:"default:false" json:"has_password"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for Project model
func (Project) TableName() string {
	return "projects"
}

// BeforeCreate hook
func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.DisplayName == "" {
		p.DisplayName = p.Name
	}
	return nil
}

// GetPath returns the file system path for this project
func (p *Project) GetPath(dataDir string, username string) string {
	return dataDir + "/" + username + "/" + p.Name
}
