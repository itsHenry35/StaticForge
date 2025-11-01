export interface User {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  user_id: number;
  username: string;
  is_published: boolean;
  is_active: boolean;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface File {
  path: string;
  name: string;
  size: number;
  mime_type: string;
  is_folder: boolean;
  updated_at: string;
  content?: string;
}

export interface Analytics {
  total_pv: number;
  total_uv: number;
  today_pv: number;
  today_uv: number;
  trend_data: TrendData[];
}

export interface TrendData {
  date: string;
  pv: number;
  uv: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  display_name?: string;
  email: string;
  password: string;
}

export interface OAuthProvider {
  name: string;
  icon: string;
  auth_url: string;
  redirect_url: string;
  scopes: string[];
}

export interface OAuthLoginRequest {
  provider: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateProjectRequest {
  name: string;
  display_name?: string;
  description?: string;
}

export interface UpdateProjectRequest {
  display_name?: string;
  description?: string;
}

export interface PublishProjectRequest {
  is_published: boolean;
  password?: string;
}

export interface UpdateFileRequest {
  content: string;
}

export interface RenameFileRequest {
  new_name: string;
}

export interface MoveFileRequest {
  source_path: string;
  target_path: string;
}

export interface CreateFolderRequest {
  path: string;
  name: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateUserRequest {
  display_name?: string;
  email?: string;
  password?: string;
}

export interface SystemStats {
  total_users: number;
  total_projects: number;
}

export interface PublicConfig {
  allow_register: boolean;
}

export interface OAuthConfigFull {
  name: string;
  icon: string;
  client_id: string;
  client_secret: string;
  well_known_url: string;
  scopes: string[];
  field_mapping: {
    name?: string;
    email?: string;
    display_name?: string;
  };
}

export interface ReplacementRule {
  from: string;
  to: string;
}

export interface ConfigData {
  allow_register: boolean;
  oauth: OAuthConfigFull[];
  replacements: ReplacementRule[];
}
