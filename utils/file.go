package utils

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
)

// EnsureDir ensures a directory exists, creates if not
func EnsureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

// SaveUploadedFile saves an uploaded file to specified path
func SaveUploadedFile(file *multipart.FileHeader, dst string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// Ensure directory exists
	if err := EnsureDir(filepath.Dir(dst)); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

// DeleteFile deletes a file
func DeleteFile(path string) error {
	return os.Remove(path)
}

// DeleteDir deletes a directory and all its contents
func DeleteDir(path string) error {
	return os.RemoveAll(path)
}

// FileExists checks if a file exists
func FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// GetFileSize returns file size in bytes
func GetFileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

// ReadFile reads file content
func ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

// WriteFile writes content to file
func WriteFile(path string, content []byte) error {
	// Ensure directory exists
	if err := EnsureDir(filepath.Dir(path)); err != nil {
		return err
	}
	return os.WriteFile(path, content, 0644)
}

// RenameFile renames a file
func RenameFile(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}

// CopyFile copies a file from src to dst
func CopyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	// Ensure directory exists
	if err := EnsureDir(filepath.Dir(dst)); err != nil {
		return err
	}

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// GetMimeType returns MIME type based on file extension
func GetMimeType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".html", ".htm":
		return "text/html"
	case ".css":
		return "text/css"
	case ".js":
		return "application/javascript"
	case ".json":
		return "application/json"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".txt":
		return "text/plain"
	case ".md":
		return "text/markdown"
	case ".xml":
		return "application/xml"
	case ".pdf":
		return "application/pdf"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".eot":
		return "application/vnd.ms-fontobject"
	case ".otf":
		return "font/otf"
	default:
		return "application/octet-stream"
	}
}

// ListFiles lists all files in a directory recursively
func ListFiles(root string) ([]string, error) {
	var files []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			files = append(files, filepath.ToSlash(relPath))
		}
		return nil
	})
	return files, err
}

// CreateDefaultIndexHTML creates a default index.html file
func CreateDefaultIndexHTML(projectName string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to %s</h1>
        <p>Start editing to build your website!</p>
    </div>
</body>
</html>`, projectName, projectName)
}
