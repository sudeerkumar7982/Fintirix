# Fintirix 💹

A full-stack stock & mutual fund trading simulator built with:

- **Frontend**: React 19 + Vite + Chart.js
- **Backend**: Spring Boot 3.2 + MySQL
- **Auth**: JWT + Google OAuth

## Project Structure

```
Fintirix/
├── frontend/       # React app (Vite)
└── backend/        # Spring Boot app (Maven)
```

## Getting Started

### Prerequisites
- Node.js 18+
- JDK 21
- MySQL 8+
- Maven 3.9+

### Backend
```bash
cd backend
mvn spring-boot:run
```
Runs on `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`

## Database
Configure MySQL credentials in:
`backend/src/main/resources/application.properties`
