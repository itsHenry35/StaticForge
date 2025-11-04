package utils

// Message codes for i18n
const (
	// General success codes
	MsgSuccess            = "success"
	MsgOperationSuccess   = "success_operation"

	// Auth success codes
	MsgLoginSuccess       = "success_login"
	MsgRegisterSuccess    = "success_register"
	MsgLogoutSuccess      = "success_logout"

	// Common error codes
	MsgInvalidRequest  = "error_invalid_request"
	MsgUnauthorized    = "error_unauthorized"
	MsgForbidden       = "error_forbidden"
	MsgNotFound        = "error_not_found"
	MsgInternalError   = "error_internal_server"
	MsgDatabaseError   = "error_database"

	// Auth error codes
	MsgInvalidCredentials     = "error_invalid_credentials"
	MsgWrongPassword          = "error_wrong_password"
	MsgAccountDisabled        = "error_account_disabled"
	MsgAccountUsesOAuth       = "error_account_uses_oauth"
	MsgTokenGenerationFailed  = "error_token_generation_failed"
	MsgInvalidToken           = "error_invalid_token"
	MsgTokenExpired           = "error_token_expired"

	// Registration error codes
	MsgRegistrationDisabled   = "error_registration_disabled"
	MsgInvalidUsername        = "error_invalid_username"
	MsgInvalidEmail           = "error_invalid_email"
	MsgInvalidPassword        = "error_invalid_password"
	MsgUsernameExists         = "error_username_exists"
	MsgEmailExists            = "error_email_exists"
	MsgPasswordHashFailed     = "error_password_hash_failed"
	MsgUserCreationFailed     = "error_user_creation_failed"

	// OAuth error codes
	MsgInvalidOAuthProvider   = "error_invalid_oauth_provider"
	MsgOAuthFailed            = "error_oauth_failed"
	MsgTokenExchangeFailed    = "error_token_exchange_failed"
	MsgUserInfoFailed         = "error_userinfo_failed"
	MsgUserInfoReadFailed     = "error_userinfo_read_failed"
	MsgUserInfoParseFailed    = "error_userinfo_parse_failed"
	MsgMissingName            = "error_missing_name"

	// Project success codes
	MsgProjectCreated         = "success_project_created"
	MsgProjectUpdated         = "success_project_updated"
	MsgProjectDeleted         = "success_project_deleted"
	MsgProjectPublished       = "success_project_published"
	MsgProjectUnpublished     = "success_project_unpublished"

	// Project error codes
	MsgInvalidProjectName     = "error_invalid_project_name"
	MsgProjectExists          = "error_project_exists"
	MsgProjectNotFound        = "error_project_not_found"
	MsgProjectCreationFailed  = "error_project_creation_failed"
	MsgProjectUpdateFailed    = "error_project_update_failed"
	MsgProjectDeleteFailed    = "error_project_delete_failed"
	MsgProjectPublishFailed   = "error_project_publish_failed"
	MsgProjectUnpublishFailed = "error_project_unpublish_failed"

	// File success codes
	MsgFileUploaded           = "success_file_uploaded"
	MsgFileSaved              = "success_file_saved"
	MsgFileDeleted            = "success_file_deleted"
	MsgFileRenamed            = "success_file_renamed"
	MsgFileMoved              = "success_file_moved"
	MsgDirectoryCreated       = "success_directory_created"
	MsgDirectoryDeleted       = "success_directory_deleted"

	// File error codes
	MsgFileNotFound           = "error_file_not_found"
	MsgFileUploadFailed       = "error_file_upload_failed"
	MsgFileDeleteFailed       = "error_file_delete_failed"
	MsgFileReadFailed         = "error_file_read_failed"
	MsgFileWriteFailed        = "error_file_write_failed"
	MsgFileRenameFailed       = "error_file_rename_failed"
	MsgFileMoveFailed         = "error_file_move_failed"
	MsgInvalidFilePath        = "error_invalid_file_path"
	MsgInvalidFileName        = "error_invalid_file_name"
	MsgDirectoryCreationFailed = "error_directory_creation_failed"
	MsgDirectoryDeleteFailed  = "error_directory_delete_failed"

	// User success codes
	MsgUserUpdated            = "success_user_updated"
	MsgUserDeleted            = "success_user_deleted"
	MsgPasswordUpdated        = "success_password_updated"

	// User error codes
	MsgUserNotFound           = "error_user_not_found"
	MsgUserUpdateFailed       = "error_user_update_failed"
	MsgUserDeleteFailed       = "error_user_delete_failed"
	MsgPasswordUpdateFailed   = "error_password_update_failed"
	MsgOldPasswordIncorrect   = "error_old_password_incorrect"
	MsgCannotDeleteSelf       = "error_cannot_delete_self"

	// Config success codes
	MsgConfigUpdated          = "success_config_updated"

	// Config error codes
	MsgConfigUpdateFailed     = "error_config_update_failed"
	MsgInvalidConfig          = "error_invalid_config"

	// Analytics error codes
	MsgAnalyticsQueryFailed   = "error_analytics_query_failed"
	MsgAnalyticsNotFound      = "error_analytics_not_found"

	// Admin error codes
	MsgAdminRequired          = "error_admin_required"
	MsgCannotModifySelf       = "error_cannot_modify_self"
)
