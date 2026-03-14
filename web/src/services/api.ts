import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  OAuthLoginRequest,
  AuthResponse,
  User,
  Project,
  File,
  Analytics,
  CreateProjectRequest,
  UpdateProjectRequest,
  PublishProjectRequest,
  CreateFolderRequest,
  ChangePasswordRequest,
  UpdateUserRequest,
  OAuthProvider,
  SystemStats,
  PublicConfig,
  ConfigData,
  OAuthConfigFull,
  PublicProjectInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * 通用API调用包装器
 * 自动提取响应中的data字段
 */
const callApi = async <T>(
  apiCall: () => Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<ApiResponse<T>> => {
  const response = await apiCall();
  return response.data;
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          const isAuthRequest = error.config?.url?.includes('/api/auth/');
          if (!isAuthRequest) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication APIs
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return await callApi(() => this.client.post<ApiResponse<AuthResponse>>('/api/auth/register', data));
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return await callApi(() => this.client.post<ApiResponse<AuthResponse>>('/api/auth/login', data));
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout').catch(() => {});
  }

  async getOAuthProviders(): Promise<ApiResponse<OAuthProvider[]>> {
    return await callApi(() => this.client.get<ApiResponse<OAuthProvider[]>>('/api/auth/oauth/providers'));
  }

  async oauthLogin(data: OAuthLoginRequest): Promise<ApiResponse<AuthResponse>> {
    return await callApi(() => this.client.post<ApiResponse<AuthResponse>>('/api/auth/oauth/login', data));
  }

  // User APIs
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return await callApi(() => this.client.get<ApiResponse<User>>('/api/user/me'));
  }

  async updateCurrentUser(data: UpdateUserRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.put<ApiResponse<void>>('/api/user/me', data));
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.post<ApiResponse<void>>('/api/user/change-password', data));
  }

  // Project APIs
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return await callApi(() => this.client.get<ApiResponse<Project[]>>('/api/projects'));
  }

  async getProject(id: number): Promise<ApiResponse<Project>> {
    return await callApi(() => this.client.get<ApiResponse<Project>>(`/api/projects/${id}`));
  }

  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return await callApi(() => this.client.post<ApiResponse<Project>>('/api/projects', data));
  }

  async updateProject(id: number, data: UpdateProjectRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.put<ApiResponse<void>>(`/api/projects/${id}`, data));
  }

  async deleteProject(id: number): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.delete<ApiResponse<void>>(`/api/projects/${id}`));
  }

  async publishProject(id: number, data: PublishProjectRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.post<ApiResponse<void>>(`/api/projects/${id}/publish`, data));
  }

  // File APIs
  async getProjectFiles(projectId: number): Promise<ApiResponse<File[]>> {
    return await callApi(() =>
      this.client.get<ApiResponse<File[]>>(`/api/projects/${projectId}/files`)
    );
  }

  async uploadFile(projectId: number, file: globalThis.File, path?: string, overwrite?: boolean): Promise<ApiResponse<File>> {
    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }
    if (overwrite) {
      formData.append('overwrite', 'true');
    }
    return await callApi(() =>
      this.client.post<ApiResponse<File>>(
        `/api/projects/${projectId}/files/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
    );
  }

  async getFileByPath(projectId: number, filePath: string): Promise<ApiResponse<File>> {
    return await callApi(() =>
      this.client.get<ApiResponse<File>>(`/api/projects/${projectId}/files/content`, {
        params: { path: filePath }
      })
    );
  }

  async updateFileByPath(projectId: number, filePath: string, content: string): Promise<ApiResponse<void>> {
    return await callApi(() =>
      this.client.put<ApiResponse<void>>(`/api/projects/${projectId}/files/content`, {
        path: filePath,
        content: content
      })
    );
  }

  async deleteFileByPath(projectId: number, filePath: string): Promise<ApiResponse<void>> {
    return await callApi(() =>
      this.client.delete<ApiResponse<void>>(`/api/projects/${projectId}/files/delete`, {
        data: { path: filePath }
      })
    );
  }

  async renameFileByPath(projectId: number, filePath: string, newName: string): Promise<ApiResponse<void>> {
    return await callApi(() =>
      this.client.post<ApiResponse<void>>(`/api/projects/${projectId}/files/rename`, {
        path: filePath,
        new_name: newName
      })
    );
  }

  async moveFileByPath(projectId: number, sourcePath: string, targetPath: string, overwrite?: boolean): Promise<ApiResponse<File>> {
    return await callApi(() =>
      this.client.post<ApiResponse<File>>(`/api/projects/${projectId}/files/move`, {
        source_path: sourcePath,
        target_path: targetPath,
        overwrite: overwrite ?? false,
      })
    );
  }

  async createFolder(projectId: number, data: CreateFolderRequest): Promise<ApiResponse<File>> {
    return await callApi(() =>
      this.client.post<ApiResponse<File>>(`/api/projects/${projectId}/folders`, data)
    );
  }

  // Analytics APIs
  async getProjectAnalytics(projectId: number): Promise<ApiResponse<Analytics>> {
    return await callApi(() =>
      this.client.get<ApiResponse<Analytics>>(`/api/projects/${projectId}/analytics`)
    );
  }

  // Admin APIs
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    return await callApi(() => this.client.get<ApiResponse<User[]>>('/api/admin/users'));
  }

  async getUser(id: number): Promise<ApiResponse<User>> {
    return await callApi(() => this.client.get<ApiResponse<User>>(`/api/admin/users/${id}`));
  }

  async updateUser(id: number, data: UpdateUserRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.put<ApiResponse<void>>(`/api/admin/users/${id}`, data));
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.delete<ApiResponse<void>>(`/api/admin/users/${id}`));
  }

  async toggleUserStatus(id: number): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.post<ApiResponse<void>>(`/api/admin/users/${id}/toggle-status`));
  }

  async setUserType(id: number, type: 'normal' | 'verified' | 'admin'): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.post<ApiResponse<void>>(`/api/admin/users/${id}/set-type`, { type }));
  }

  async getAllProjects(): Promise<ApiResponse<Project[]>> {
    return await callApi(() => this.client.get<ApiResponse<Project[]>>('/api/admin/projects'));
  }

  async toggleProjectStatus(id: number): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.post<ApiResponse<void>>(`/api/admin/projects/${id}/toggle-status`));
  }

  async updateProjectAsAdmin(id: number, data: UpdateProjectRequest): Promise<ApiResponse<void>> {
    return await callApi(() => this.client.put<ApiResponse<void>>(`/api/admin/projects/${id}`, data));
  }

  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    return await callApi(() => this.client.get<ApiResponse<SystemStats>>('/api/admin/stats'));
  }

  // Config
  async getPublicConfig(): Promise<ApiResponse<PublicConfig>> {
    return await callApi(() => this.client.get<ApiResponse<PublicConfig>>('/api/config/public'));
  }

  async getPublicProjectInfo(name: string): Promise<ApiResponse<PublicProjectInfo>> {
    return await callApi(() => this.client.get<ApiResponse<PublicProjectInfo>>(`/api/projects/public/${name}`));
  }

  async getConfig(): Promise<ApiResponse<ConfigData>> {
    return await callApi(() => this.client.get<ApiResponse<ConfigData>>('/api/admin/config'));
  }

  async updateConfig(data: { allow_register: boolean; oauth: OAuthConfigFull[]; replacements?: { from: string; to: string }[], allowed_iframe_origin: string; logo_url?: string; site_name?: string; site_host?: string; secure_host?: string }): Promise<ApiResponse<null>> {
    return await callApi(() => this.client.put<ApiResponse<null>>('/api/admin/config', data));
  }
}

export const apiService = new ApiService();
