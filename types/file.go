package types

// CreateFolderRequest is used for creating folders
type CreateFolderRequest struct {
	Path string `json:"path" binding:"required"`
	Name string `json:"name" binding:"required"`
}
