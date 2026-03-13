package handlers

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// BuildFS holds the embedded web/dist filesystem, set during route setup.
var BuildFS fs.FS

// ServeErrorPage reads a compiled error page from BuildFS, injects params as
// window.__SF, and writes the response directly (no redirect, URL unchanged).
func ServeErrorPage(c *gin.Context, statusCode int, filename string, params map[string]string) {
	if BuildFS == nil {
		c.String(http.StatusInternalServerError, "error page unavailable")
		return
	}
	data, err := fs.ReadFile(BuildFS, filename)
	if err != nil {
		c.String(http.StatusInternalServerError, "error page not found: "+filename)
		return
	}

	html := string(data)

	if len(params) > 0 {
		b, _ := json.Marshal(params)
		inject := "<script>window.__SF=" + string(b) + ";</script>"
		html = strings.Replace(html, "</head>", inject+"</head>", 1)
	}

	c.Header("Cache-Control", "no-cache")
	c.Data(statusCode, "text/html; charset=utf-8", []byte(html))
}
