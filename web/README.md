# StaticForge Web Frontend

Modern web interface for StaticForge - A self-hosted platform for managing and publishing static websites.

## Features

- **User Authentication**
  - Username/password login and registration
  - OAuth/OpenID Connect support with custom providers
  - JWT-based authentication
  - User profile management

- **Project Management**
  - Create and manage multiple static website projects
  - Monaco Editor with syntax highlighting
  - File tree navigation with upload, rename, and delete operations
  - Real-time auto-save with debouncing

- **Publishing System**
  - One-click publish/unpublish
  - Optional password protection for published sites
  - Cookie-based access control
  - Custom consent flow

- **Analytics Dashboard**
  - Page view (PV) and unique visitor (UV) tracking
  - Daily trend visualization
  - Real-time statistics

- **Admin Panel**
  - User management (enable/disable, delete)
  - Project oversight across all users
  - System statistics

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design 5
- **Styling**: Tailwind CSS 4
- **Routing**: React Router DOM v7
- **Code Editor**: Monaco Editor
- **HTTP Client**: Axios
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Backend server running on http://localhost:8080

### Installation

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env

# Start development server
pnpm dev
```

The application will be available at http://localhost:5173

### Build for Production

```bash
# Build optimized production bundle
pnpm build

# Preview production build locally
pnpm preview
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── Layout.tsx   # Main application layout
│   └── ProtectedRoute.tsx  # Route protection wrapper
├── contexts/        # React contexts
│   └── AuthContext.tsx     # Authentication state management
├── pages/          # Page components
│   ├── Login.tsx          # Login page
│   ├── Register.tsx       # Registration page
│   ├── OAuthCallback.tsx  # OAuth callback handler
│   ├── Dashboard.tsx      # User dashboard
│   ├── Projects.tsx       # Projects list
│   ├── ProjectEditor.tsx  # Monaco editor interface
│   ├── Profile.tsx        # User profile
│   ├── Admin.tsx          # Admin panel
│   └── SiteAuth.tsx       # Static site auth page
├── services/       # API services
│   └── api.ts      # Axios API client
├── types/         # TypeScript type definitions
│   └── index.ts
└── utils/         # Utility functions
```

## Key Features Explained

### File Editor
- **Monaco Editor**: Full-featured code editor with syntax highlighting for HTML, CSS, JavaScript, and more
- **File Tree**: Hierarchical file navigation with folder support
- **Auto-save**: Changes are automatically saved after 2 seconds of inactivity
- **File Operations**: Upload, rename, delete files and create folders

### Publishing Flow
1. User clicks "Publish" in settings
2. Optionally sets a password for access control
3. Site becomes accessible at `/s/{projectName}`
4. First-time visitors see consent page at `/auth/{projectName}`
5. Password-protected sites require authentication

### Access Control
- **Consent Cookie**: Set on first visit, expires in 1 year
- **Auth Cookie**: For password-protected sites, expires in 7 days
- Automatic redirect flow for authentication

### Admin Features
- View all users and projects
- Enable/disable user accounts
- Delete users and their projects
- System-wide statistics

## API Integration

The frontend communicates with the backend API at `http://localhost:8080`. All API endpoints are defined in `src/services/api.ts`.

### Authentication
- JWT tokens stored in localStorage
- Automatic token injection via Axios interceptors
- Auto-redirect to login on 401 responses

## Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Functional components with React Hooks
- Async/await for asynchronous operations

### State Management
- React Context API for global state (auth)
- Local state with useState for component-specific state
- No external state management library required

## Contributing

This is part of the StaticForge project. For backend setup and deployment instructions, refer to the main project README.

## License

Part of the StaticForge project.
