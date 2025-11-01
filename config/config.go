package config

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
)

type Config struct {
	Server        ServerConfig      `json:"server"`
	Database      DatabaseConfig    `json:"database"`
	Redis         RedisConfig       `json:"redis"`
	JWT           JWTConfig         `json:"jwt"`
	OAuth         []OAuthConfig     `json:"oauth"`
	Upload        UploadConfig      `json:"upload"`
	AllowRegister bool              `json:"allow_register"`
	Replacements  []ReplacementRule `json:"replacements"`
	mu            sync.RWMutex      `json:"-"`
}

type ReplacementRule struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type ServerConfig struct {
	Host string `json:"host"`
	Port int    `json:"port"`
	Mode string `json:"mode"` // debug, release
}

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database"`
	Charset  string `json:"charset"`
}

type RedisConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

type JWTConfig struct {
	Secret string `json:"secret"`
	Expire int    `json:"expire"` // hours
}

type OAuthConfig struct {
	Name         string            `json:"name"`
	Icon         string            `json:"icon"`
	ClientID     string            `json:"client_id"`
	ClientSecret string            `json:"client_secret"`
	WellKnownURL string            `json:"well_known_url"` // OIDC discovery URL
	Scopes       []string          `json:"scopes"`
	FieldMapping map[string]string `json:"field_mapping"` // name, email, display_name

	// Auto-discovered from well_known_url
	AuthURL     string `json:"-"`
	TokenURL    string `json:"-"`
	UserInfoURL string `json:"-"`
}

type UploadConfig struct {
	MaxSize int64  `json:"max_size"` // bytes
	DataDir string `json:"data_dir"`
}

var (
	AppConfig *Config
	once      sync.Once
)

// GenerateRandomKey generates a random base64 encoded key
func GenerateRandomKey(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// GetConfig returns the singleton config instance
func GetConfig() *Config {
	once.Do(func() {
		AppConfig = &Config{}
	})
	return AppConfig
}

// LoadConfig loads configuration from file
func LoadConfig(path string) (*Config, error) {
	cfg := GetConfig()

	// Check if config file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Create default config
		if err := createDefaultConfig(path); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
	}

	// Load config file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	cfg.mu.Lock()
	defer cfg.mu.Unlock()

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return cfg, nil
}

// SaveConfig saves configuration to file
func (c *Config) SaveConfig(path string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// createDefaultConfig creates a default configuration file
func createDefaultConfig(path string) error {
	jwtSecret, err := GenerateRandomKey(32)
	if err != nil {
		return fmt.Errorf("failed to generate JWT secret: %w", err)
	}

	defaultConfig := &Config{
		Server: ServerConfig{
			Host: "0.0.0.0",
			Port: 8080,
			Mode: "release",
		},
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     3306,
			Username: "root",
			Password: "password",
			Database: "staticforge",
			Charset:  "utf8mb4",
		},
		Redis: RedisConfig{
			Host:     "localhost",
			Port:     6379,
			Password: "",
			DB:       0,
		},
		JWT: JWTConfig{
			Secret: jwtSecret,
			Expire: 168, // 7 days
		},
		OAuth:         []OAuthConfig{},
		Upload: UploadConfig{
			MaxSize: 100 * 1024 * 1024, // 100MB
			DataDir: "data/projects",
		},
		AllowRegister: true,
		Replacements:  []ReplacementRule{},
	}

	data, err := json.MarshalIndent(defaultConfig, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// GetDSN returns MySQL DSN string
func (c *Config) GetDSN() string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		c.Database.Username,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.Database,
		c.Database.Charset,
	)
}

// GetRedisAddr returns Redis address string
func (c *Config) GetRedisAddr() string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return fmt.Sprintf("%s:%d", c.Redis.Host, c.Redis.Port)
}

// GetServerAddr returns server address string
func (c *Config) GetServerAddr() string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// AddOAuthProvider adds a new OAuth provider
func (c *Config) AddOAuthProvider(provider OAuthConfig) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.OAuth = append(c.OAuth, provider)
	return nil
}

// RemoveOAuthProvider removes an OAuth provider by name
func (c *Config) RemoveOAuthProvider(name string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for i, p := range c.OAuth {
		if p.Name == name {
			c.OAuth = append(c.OAuth[:i], c.OAuth[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("provider %s not found", name)
}

// GetOAuthProvider returns an OAuth provider by name
func (c *Config) GetOAuthProvider(name string) (*OAuthConfig, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, p := range c.OAuth {
		if p.Name == name {
			return &p, nil
		}
	}

	return nil, fmt.Errorf("provider %s not found", name)
}

// OIDCDiscovery represents the OIDC discovery document
type OIDCDiscovery struct {
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	UserinfoEndpoint      string `json:"userinfo_endpoint"`
}

// DiscoverOIDC fetches OIDC configuration from well-known URL
func (o *OAuthConfig) DiscoverOIDC() error {
	if o.WellKnownURL == "" {
		return fmt.Errorf("well_known_url is not set")
	}

	resp, err := http.Get(o.WellKnownURL)
	if err != nil {
		return fmt.Errorf("failed to fetch OIDC discovery: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("OIDC discovery returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read OIDC discovery response: %w", err)
	}

	var discovery OIDCDiscovery
	if err := json.Unmarshal(body, &discovery); err != nil {
		return fmt.Errorf("failed to parse OIDC discovery: %w", err)
	}

	o.AuthURL = discovery.AuthorizationEndpoint
	o.TokenURL = discovery.TokenEndpoint
	o.UserInfoURL = discovery.UserinfoEndpoint

	return nil
}

// InitializeOAuth initializes all OAuth providers by discovering their endpoints
// Note: RedirectURL will be set dynamically in the OAuth handler based on request
func (c *Config) InitializeOAuth() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for i := range c.OAuth {
		// Discover OIDC endpoints
		if c.OAuth[i].WellKnownURL != "" {
			if err := c.OAuth[i].DiscoverOIDC(); err != nil {
				return fmt.Errorf("failed to discover OIDC for %s: %w", c.OAuth[i].Name, err)
			}
		}
	}

	return nil
}

// ApplyReplacements applies configured replacement rules to content
func (c *Config) ApplyReplacements(content string) string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := content
	for _, rule := range c.Replacements {
		if rule.From != "" {
			result = strings.ReplaceAll(result, rule.From, rule.To)
		}
	}
	return result
}
