package models

import (
	"time"
)

type Analytics struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	ProjectID uint      `gorm:"not null;index:idx_project_date" json:"project_id"`
	Date      time.Time `gorm:"not null;index:idx_project_date;type:date" json:"date"`
	PV        int64     `gorm:"default:0" json:"pv"` // page views
	UV        int64     `gorm:"default:0" json:"uv"` // unique visitors

	// Relations
	Project Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// TableName specifies the table name for Analytics model
func (Analytics) TableName() string {
	return "analytics"
}
