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

// Success sends a successful response with default success message
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: MsgSuccess,
		Data:    data,
	})
}

// SuccessWithCode sends a successful response with a specific message code
func SuccessWithCode(c *gin.Context, messageCode string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: messageCode,
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

// Error sends an error response with message code
func Error(c *gin.Context, code int, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: messageCode,
	})
}

// ErrorWithStatus sends an error response with HTTP status code and message code
func ErrorWithStatus(c *gin.Context, httpStatus int, code int, messageCode string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: messageCode,
	})
}

// BadRequest sends a bad request error with message code
func BadRequest(c *gin.Context, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    400,
		Message: messageCode,
	})
}

// Unauthorized sends an unauthorized error with message code
func Unauthorized(c *gin.Context, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    401,
		Message: messageCode,
	})
}

// Forbidden sends a forbidden error with message code
func Forbidden(c *gin.Context, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    403,
		Message: messageCode,
	})
}

// NotFound sends a not found error with message code
func NotFound(c *gin.Context, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    404,
		Message: messageCode,
	})
}

// InternalServerError sends an internal server error with message code
func InternalServerError(c *gin.Context, messageCode string) {
	c.JSON(http.StatusOK, Response{
		Code:    500,
		Message: messageCode,
	})
}
