# Profiles API

A NestJS-based API service that creates user profiles by aggregating data from external APIs (Genderize, Agify, and Nationalize). The service predicts gender, age, and nationality based on a given name and stores the profile in a PostgreSQL database.

## Features

- **Profile Creation**: Create profiles with predicted demographic data
- **External API Integration**: Fetches data from:
  - [Genderize.io](https://genderize.io/) - Gender prediction
  - [Agify.io](https://agify.io/) - Age prediction
  - [Nationalize.io](https://nationalize.io/) - Nationality prediction
- **PostgreSQL Database**: Persistent storage with TypeORM
- **Validation**: Input validation with class-validator
- **Error Handling**: Custom validation exception filter
- **CORS Enabled**: Supports cross-origin requests
- **Docker Support**: Containerized deployment

## API Endpoint

### POST /api/profiles

Creates a new profile based on the provided name.

**Request Body:**

```json
{
  "name": "John Doe"
}
```

**Response (Success):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "john doe",
    "gender": "male",
    "gender_probality": 0.99,
    "sample_size": 1234,
    "age": 35,
    "age_group": "adult",
    "country_id": "US",
    "country_probability": 0.15,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error):**

```json
{
  "status": "error",
  "message": "Insufficient gender data for this name"
}
```

## Prerequisites

- Node.js (v20 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd profile-api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/profiles_db
PORT=3000
```

4. Ensure PostgreSQL is running and the database exists.

## Running the Application

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker build -t profiles-api .
docker run -p 3000:3000 --env-file .env profiles-api
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── app.module.ts           # Main application module
├── main.ts                 # Application bootstrap
├── filters/
│   └── validation-exeception.filter.ts  # Custom validation error handler
├── profile/
│   ├── profile.module.ts
│   ├── profile.controller.ts
│   ├── profile.service.ts
│   ├── entities/
│   │   └── profile.entity.ts
│   ├── dto/
│   │   ├── create-profile.dto.ts
│   └── interface/
│       ├── external-api.interface.ts
│       └── internal.interface.ts
```

## Database Schema

The `profiles` table includes:

- `id`: UUID primary key
- `name`: Unique profile name (lowercase, trimmed)
- `gender`: Predicted gender
- `gender_probality`: Gender prediction probability
- `sample_size`: Gender API sample size
- `age`: Predicted age
- `age_group`: Age classification (child, teenager, adult, senior)
- `country_id`: Top predicted country code
- `country_probability`: Country prediction probability
- `created_at`: Timestamp

## Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## License

UNLICENSED</content>
<parameter name="filePath">README.md
