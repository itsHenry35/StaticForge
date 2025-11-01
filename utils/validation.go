package utils

import (
	"regexp"
	"strings"
)

var (
	// UsernameRegex validates username (alphanumeric, underscore, hyphen, 3-50 chars)
	UsernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,50}$`)

	// EmailRegex validates email address
	EmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

	// ProjectNameRegex validates project name (alphanumeric, underscore, hyphen, 3-100 chars)
	ProjectNameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,100}$`)

	// AllowedFileExtensions defines allowed file extensions for upload
	AllowedFileExtensions = []string{
		".html", ".htm", ".css", ".js", ".json",
		".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
		".txt", ".md", ".xml", ".pdf",
		".woff", ".woff2", ".ttf", ".eot", ".otf",
	}

	// DangerousPatterns defines potentially dangerous patterns in HTML/JS
	DangerousPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?document\.cookie`),
		regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?localStorage`),
		regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?sessionStorage`),
		regexp.MustCompile(`(?i)javascript:\s*void`),
		regexp.MustCompile(`(?i)on\w+\s*=\s*["'].*?(document\.cookie|localStorage|sessionStorage)`),
	}
)

// ValidateUsername validates username format
func ValidateUsername(username string) bool {
	return UsernameRegex.MatchString(username)
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	return EmailRegex.MatchString(email)
}

// ValidateProjectName validates project name format
func ValidateProjectName(name string) bool {
	return ProjectNameRegex.MatchString(name)
}

// ValidatePassword validates password strength
func ValidatePassword(password string) bool {
	// At least 6 characters
	return len(password) >= 6
}

// IsAllowedFileExtension checks if file extension is allowed
func IsAllowedFileExtension(filename string) bool {
	lowerFilename := strings.ToLower(filename)
	for _, ext := range AllowedFileExtensions {
		if strings.HasSuffix(lowerFilename, ext) {
			return true
		}
	}
	return false
}

// SanitizeFilename removes dangerous characters from filename
func SanitizeFilename(filename string) string {
	// Remove path traversal attempts
	filename = strings.ReplaceAll(filename, "..", "")
	filename = strings.ReplaceAll(filename, "/", "")
	filename = strings.ReplaceAll(filename, "\\", "")

	return filename
}

// CheckXSSPatterns checks for dangerous XSS patterns in content
func CheckXSSPatterns(content string) bool {
	for _, pattern := range DangerousPatterns {
		if pattern.MatchString(content) {
			return true
		}
	}
	return false
}

// SanitizeHTML adds basic XSS protection headers suggestion
// Note: This is just a check; actual sanitization should be done on frontend
func SanitizeHTML(content string) string {
	// For this project, we'll just warn about dangerous patterns
	// The actual content is not modified as users may legitimately need these
	return content
}
