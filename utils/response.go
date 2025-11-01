package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Success sends a successful response
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data:    data,
	})
}

// SuccessWithMessage sends a successful response with custom message
func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: message,
		Data:    data,
	})
}

// Error sends an error response
func Error(c *gin.Context, code int, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: message,
	})
}

// ErrorWithStatus sends an error response with HTTP status code
func ErrorWithStatus(c *gin.Context, httpStatus int, code int, message string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: message,
	})
}

// BadRequest sends a bad request error
func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    400,
		Message: message,
	})
}

// Unauthorized sends an unauthorized error
func Unauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    401,
		Message: message,
	})
}

// Forbidden sends a forbidden error
func Forbidden(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    403,
		Message: message,
	})
}

// NotFound sends a not found error
func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    404,
		Message: message,
	})
}

// InternalServerError sends an internal server error
func InternalServerError(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    500,
		Message: message,
	})
}
