# Profiles API

A NestJS-based API service for Stage 2 of the Backend Wizards challenge. Creates and queries user profiles with advanced filtering, sorting, pagination, and natural language search. Aggregates data from external APIs (Genderize, Agify, Nationalize) and stores in PostgreSQL.

## Features

- **Profile Creation**: Create profiles with predicted demographic data, handling duplicates
- **Advanced Querying**: Filter, sort, and paginate profiles via GET /api/profiles
- **Natural Language Search**: Query profiles in plain English via GET /api/profiles/search
- **Database Seeding**: Populate with 2026 profiles from JSON file
- **External API Integration**: Fetches data from:
  - [Genderize.io](https://genderize.io/) - Gender prediction
  - [Agify.io](https://agify.io/) - Age prediction
  - [Nationalize.io](https://nationalize.io/) - Nationality prediction
- **PostgreSQL Database**: Persistent storage with TypeORM and indexes
- **Validation**: Input validation with class-validator
- **Error Handling**: Custom exception filters
- **CORS Enabled**: Supports cross-origin requests
- **Docker Support**: Containerized deployment

## API Endpoints

### POST /api/profiles

Creates a new profile based on the provided name. If a profile with the same name exists, returns the existing one.

**Request Body:**

```json
{
  "name": "John Doe"
}
```

**Response (Success - New):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "john doe",
    "gender": "male",
    "gender_probability": 0.99,
    "age": 35,
    "age_group": "adult",
    "country_id": "US",
    "country_name": "United States",
    "country_probability": 0.15,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Response (Success - Existing):**

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ...existing profile... }
}
```

**Response (Error):**

```json
{
  "status": "error",
  "message": "Genderize returned an invalid response"
}
```

### GET /api/profiles

Retrieves all profiles with optional filters, sorting, and pagination.

**Query Parameters:**

- `gender`: string
- `age_group`: string
- `country_id`: string
- `min_age`: number
- `max_age`: number
- `min_gender_probability`: number
- `min_country_probability`: number
- `sort_by`: age | created_at | gender_probability (default: created_at)
- `order`: asc | desc (default: desc)
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 50)

**Response (Success):**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [
    {
      "id": "uuid",
      "name": "john doe",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 35,
      "age_group": "adult",
      "country_id": "US",
      "country_name": "United States",
      "country_probability": 0.15,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}
```

### GET /api/profiles/{id}

Retrieves a single profile by ID.

**Response (Success):**

```json
{
  "status": "success",
  "data": { ...profile object... }
}
```

**Response (Error):**

```json
{
  "status": "error",
  "message": "Profile not found"
}
```

### GET /api/profiles/search

Searches profiles using natural language queries with pagination.

**Query Parameters:**

- `q`: string (required)
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 50)

**Response (Success):** Same as GET /api/profiles.

**Response (Error):**

```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

### DELETE /api/profiles/{id}

Deletes a profile by ID.

**Response (Success):** 204 No Content

**Response (Error):**

```json
{
  "status": "error",
  "message": "Profile not found"
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

5. Seed the database with profiles:
   ```bash
   npm run seed
   ```
   This populates the DB with 2026 profiles from `seed_profiles.json`.

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

- `id`: UUID v7 primary key
- `name`: Unique profile name (lowercase, trimmed)
- `gender`: Predicted gender
- `gender_probability`: Gender prediction probability
- `age`: Predicted age
- `age_group`: Age classification (child, teenager, adult, senior)
- `country_id`: Top predicted country ISO code
- `country_name`: Full country name
- `country_probability`: Country prediction probability
- `created_at`: UTC timestamp

**Indexes:** gender, age_group, country_id, age, created_at

## Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in watch mode
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run seed` - Seed the database with profiles
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## Natural Language Parsing

The GET /api/profiles/search endpoint supports rule-based parsing of plain English queries into database filters. No AI or LLMs are used—parsing relies on keyword matching and predefined mappings.

### Approach

1. Split the query into words (lowercase).
2. Identify supported keywords and apply mappings to filters.
3. Combine filters with AND logic.
4. If no valid filters are found, return an error.

### Supported Keywords and Mappings

| Keyword(s)                      | Filter Applied         | Example                                |
| ------------------------------- | ---------------------- | -------------------------------------- |
| male, female                    | gender                 | "male" → gender=male                   |
| young                           | min_age=16, max_age=24 | "young males" → gender=male, age 16-24 |
| above X (X is number)           | min_age=X              | "above 30" → min_age=30                |
| teenagers, adult, child, senior | age_group              | "teenagers" → age_group=teenager       |
| from X (X is country name)      | country_id (mapped)    | "from nigeria" → country_id=NG         |

### Parsing Logic

- **Gender**: Direct match to "male" or "female".
- **Age Groups**: Match to stored groups (teenager, adult, etc.).
- **Age Ranges**: "young" sets fixed range; "above X" sets minimum.
- **Country**: "from" followed by name maps to ISO code (e.g., nigeria → NG, kenya → KE, angola → AO).
- **Combination**: Multiple keywords combine (e.g., "adult males from kenya" → gender=male, age_group=adult, country_id=KE).
- **Error Handling**: Queries without recognizable keywords return "Unable to interpret query".

### Limitations

- No support for logical operators (e.g., "and", "or").
- No complex phrases or synonyms (e.g., "guys" instead of "males").
- No multi-country queries.
- Case-insensitive, but exact keyword matching.
- Limited country mappings (based on task examples and seeded data).

### Examples

- "young males" → gender=male, min_age=16, max_age=24
- "females above 30" → gender=female, min_age=30
- "adult males from kenya" → gender=male, age_group=adult, country_id=KE

This parser ensures simple, predictable queries for demographic filtering.

## License

UNLICENSED</content>
<parameter name="filePath">README.md
