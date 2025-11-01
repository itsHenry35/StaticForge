package utils

import (
	"crypto/rand"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

const (
	// PasswordCharset defines characters for random password generation
	PasswordCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword verifies a password against its hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateRandomPassword generates a random password with specified length
func GenerateRandomPassword(length int) (string, error) {
	password := make([]byte, length)
	charsetLen := big.NewInt(int64(len(PasswordCharset)))

	for i := range password {
		num, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			return "", err
		}
		password[i] = PasswordCharset[num.Int64()]
	}

	return string(password), nil
}
