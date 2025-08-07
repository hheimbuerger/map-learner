# Map Learner

An interactive map learning application that evaluates hand-drawn maps.

## Configuration

### Backend URL

The frontend needs to know where to find the backend API. You can configure this in the `config.json` file:

```json
{
  "backendUrl": "http://your-backend-url:8000"
}
```

### Environment Variables (Backend)

The backend requires certain environment variables to be set. Create a `.env` file in the backend directory with the following variables:

```
EVALUATION_API_URL=https://api.example.com/evaluate
API_TIMEOUT=30
```

## Development

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Python 3.8+ (for backend)

### Installing Dependencies

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd ../backend
   pip install -e .
   pip install python-dotenv
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   python -m maplearner.app
   ```

2. In a separate terminal, start the frontend:
   ```bash
   cd frontend
   npm start
   ```

## Packaging the Application

### Building for Production

To create a production build of the application:

1. Make sure all dependencies are installed
2. Update the `config.json` with the production backend URL
3. Run the build command:
   ```bash
   cd frontend
   npm run dist
   ```

The packaged application will be available in the `frontend/dist` directory.

### Distribution Packages

The build process will create the following packages:
- Windows: NSIS installer and portable executable
- macOS: DMG and ZIP
- Linux: AppImage, DEB, and RPM packages

## Deployment

### Backend

1. Install the backend package on your server:
   ```bash
   pip install -e .
   pip install gunicorn
   ```

2. Run the backend with a production WSGI server:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:8000 maplearner.app:app
   ```

### Frontend

1. Build the frontend for production
2. Deploy the contents of the `dist` directory to a web server
3. Update the `config.json` with the production backend URL

## License

MIT
