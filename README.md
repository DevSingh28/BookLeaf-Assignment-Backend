# BookLeaf Author Support Portal — Full Stack Assignment

**Live Demo:** [Frontend](https://book-leaf.netlify.app/) | [Backend API](https://bookleaf-assignment-backend.onrender.com)

**GitHub Repositories:** [Frontend](https://github.com/DevSingh28/BookLeaf-Assignment-Frontend) | [Backend](https://github.com/DevSingh28/BookLeaf-Assignment-Backend)

## Project Overview

This project was developed as a full-stack assignment to build an Author Support Portal for BookLeaf Publishing. It provides author and administrator interfaces for managing support tickets, handling author queries, and assisting the support team with AI-powered ticket classification and response drafting.

The application uses React and Vite for the frontend, Node.js and Express for the backend, PostgreSQL for data storage, and the Groq API for AI-assisted functionality.

The implementation focuses on the core requirements of the assignment, including authentication, ticket management, administrator workflows, internal notes, and AI-assisted support operations.

## Table of Contents

- [Live Demo](#live-demo)
- [GitHub Repositories](#github-repositories)
- [Project Overview](#project-overview-1)
- [Quick Start: Demo Login Credentials](#quick-start-demo-login-credentials)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [AI Integration](#ai-integration)
- [Ticket Classification](#ticket-classification)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Database Setup and Scripts](#database-setup-and-scripts)
- [Login Credentials and Registration Steps](#login-credentials-and-registration-steps)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [Database](#database)
- [Security and Access Control](#security-and-access-control)
- [Error Handling and AI Fallback](#error-handling-and-ai-fallback)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)

---

## Live Demo

**Frontend:** [https://book-leaf.netlify.app/](https://book-leaf.netlify.app/)

**Backend API:** [https://bookleaf-assignment-backend.onrender.com](https://bookleaf-assignment-backend.onrender.com)

The frontend is deployed on Netlify, while the backend API is deployed on Render.

The application uses PostgreSQL hosted on Render for persistent data storage.

> Note: The backend URL is the API service endpoint. Individual API endpoints depend on the routes implemented by the backend.

> Note: The backend is hosted on a Render service that may take a short time to wake up on the first request after a period of inactivity. If the first login or API call is slow, please wait a few seconds and try again.

## GitHub Repositories

- **Frontend:** [BookLeaf Assignment Frontend](https://github.com/DevSingh28/BookLeaf-Assignment-Frontend)
- **Backend:** [BookLeaf Assignment Backend](https://github.com/DevSingh28/BookLeaf-Assignment-Backend)

Both repositories contain the source code for their respective application layers.

---

## Project Overview

The BookLeaf Author Support & Communication Portal provides a centralized system for managing communication between authors and the support team.

Authors can submit tickets, describe their issues, exchange messages with administrators, and monitor ticket progress.

Administrators can manage incoming tickets, review ticket details, update ticket status and priority, communicate with authors, add internal notes, and use AI-assisted tools to classify tickets and prepare suggested responses.

The application combines a traditional support-ticket workflow with AI assistance while keeping administrators responsible for reviewing and sending generated responses.

### Project Objectives

- Provide a dedicated interface for authors and administrators.
- Centralize ticket creation, communication, and resolution.
- Organize tickets using categories, priorities, and statuses.
- Maintain persistent ticket and conversation data.
- Use AI to assist with ticket classification and response drafting.
- Ground AI-generated responses in relevant knowledge-base information.
- Support human review and editing of AI-generated drafts.
- Protect ticket data through authentication and authorization.
- Deploy the frontend and backend as independently managed services.

---

## Quick Start: Demo Login Credentials

Use these credentials to test the application without any additional setup.

### Admin Login

| Field | Value |
|---|---|
| Email | `admin@dev.com` |
| Password | `dev@admin` |

### Author Login

Every author from the provided demo dataset has the same default password:

| Field | Value |
|---|---|
| Email | Any author email from the demo dataset (see the `users` table seeded by `bookleaf_database.sql`) |
| Password | `Author@123` |

> These credentials are for evaluation and demonstration only. Change or remove them before using the application in a real production environment.

If you are running the project on a fresh database, follow [Database Setup and Scripts](#database-setup-and-scripts) first, otherwise the accounts above will not exist.

---

## Key Features

### Author Portal

- Author dashboard with ticket-related information.
- Create and submit support tickets.
- Select or view ticket categories and relevant details.
- View submitted tickets and their current status.
- Open individual ticket conversations.
- Exchange messages with the support team.
- View ticket updates and responses.
- Track support requests through the ticket lifecycle.

### Administrator Portal

- Administrator dashboard for monitoring support activity.
- View and manage support tickets.
- Inspect ticket details and conversation history.
- Update ticket status and priority.
- Assign tickets where supported by the workflow.
- Communicate with authors through ticket replies.
- Add internal notes for administrative communication.
- Access AI-assisted ticket classification and response drafting.
- Review AI-generated suggestions before sending responses.

### Ticket Management

The ticket workflow organizes support requests using categories, priorities, and statuses.

The application supports the ticket lifecycle implemented by the backend, including status changes and persistent conversation history.

Ticket operations are backed by PostgreSQL so that ticket details and messages remain available across sessions.

### AI-Assisted Support

The AI integration assists administrators by:

- Identifying the likely category of a support request.
- Recommending an appropriate priority.
- Providing classification confidence and reasoning where available.
- Generating suggested responses for administrators.
- Using relevant knowledge-base articles to inform response drafts.
- Allowing administrators to review and edit suggestions before sending them.

AI suggestions are intended to assist the support team rather than replace human judgment.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Axios for HTTP requests
- React Router and supporting libraries used by the application

### Backend

- Node.js
- Express.js
- JavaScript with ES modules
- PostgreSQL
- `pg` for database connectivity
- Parameterized SQL queries
- REST API architecture
- Cookie-based authentication and session handling
- Groq API for AI-assisted features

### Database

- PostgreSQL
- Render PostgreSQL hosting

### AI

- Groq API
- LLM-based ticket classification
- AI-assisted priority assessment
- Knowledge-grounded response drafting

### Deployment

- GitHub for source control
- Netlify for frontend hosting
- Render for backend hosting and PostgreSQL

---

## Application Architecture

The application follows a frontend/backend architecture.

```text
                  Author / Administrator
                            |
                            v
                    React Frontend
                         Netlify
                            |
                       HTTPS / API
                            |
                            v
                    Node.js + Express
                         Render
                       /         \
                      v           v
               PostgreSQL      Groq API
                 Render        AI Services
```

### Frontend Responsibilities

The frontend provides the user interface for authentication, dashboards, ticket management, conversations, and administrator workflows.

It communicates with the backend through HTTP requests.

### Backend Responsibilities

The backend manages authentication, authorization, ticket operations, message persistence, database queries, and AI-assisted workflows.

It validates incoming requests and enforces access restrictions before accessing protected resources.

### Database Responsibilities

PostgreSQL stores application data such as users, tickets, messages, attachments, books, royalty summaries, and other entities defined by the database schema.

### AI Service Responsibilities

The Groq API is used for supported AI-assisted operations, including ticket classification and response drafting.

The backend controls AI requests so that API credentials are not exposed to frontend users.

---

## AI Integration

The project uses the Groq API for AI-assisted support workflows.

### Why Groq?

Groq was selected because it offered an accessible API, fast inference, and a free usage option suitable for the development and demonstration requirements at the time of implementation.

The choice was primarily practical rather than a requirement to use a specific AI provider.

Other providers, including Gemini and Anthropic, could be considered in the future depending on availability, pricing, rate limits, model quality, and application requirements.

The AI integration is designed to keep provider-specific functionality on the backend.

### AI Ticket Assessment

The AI assessment workflow analyzes ticket information and produces a structured assessment, including classification and priority recommendations.

Where supported by the implementation, the assessment also includes confidence and reasoning.

The generated assessment is stored in the database so that administrators can inspect the result.

### AI Response Drafting

The response-drafting workflow uses the ticket context and relevant knowledge-base information to prepare a suggested reply.

The generated response is intended to help administrators respond consistently and efficiently.

Administrators remain responsible for reviewing the draft, making any necessary corrections, and deciding whether to send it.

### Knowledge-Base Grounding

Relevant knowledge-base articles can be used as context for response generation.

This helps the model produce responses based on available support information instead of relying exclusively on its general training.

The quality of a generated response depends on the relevance and completeness of the available knowledge-base content.

### Human Review

AI-generated drafts are suggestions, not automatically approved messages.

The administrator reviews the proposed response before sending it to the author.

This keeps the support team in control of customer-facing communication.

---

## Ticket Classification

The ticket classification workflow uses the following categories:

1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

The supported priority levels are:

- Critical
- High
- Medium
- Low

AI-assisted classification helps administrators identify the likely category and urgency of incoming support requests.

The final ticket state remains governed by the application's implemented ticket-management workflow.

---

## Installation and Setup

You can run the frontend and backend independently on your local machine.

### Prerequisites

Install the following:

- Node.js
- npm
- PostgreSQL or access to a compatible PostgreSQL database
- Git

A Groq API key is required for the AI features.

### 1. Clone the Repositories

Clone the frontend:

```bash
git clone https://github.com/DevSingh28/BookLeaf-Assignment-Frontend.git
```

Clone the backend:

```bash
git clone https://github.com/DevSingh28/BookLeaf-Assignment-Backend.git
```

### 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd BookLeaf-Assignment-Backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend root directory.

Use the [Environment Variables](#environment-variables) section below to configure it.

Configure your PostgreSQL connection and Groq API key before starting the backend.

Then apply the database schema and demo data, and create the login accounts, by following [Database Setup and Scripts](#database-setup-and-scripts) and [Login Credentials and Registration Steps](#login-credentials-and-registration-steps).

### 3. Set Up the Frontend

Open a separate terminal and navigate to the frontend directory:

```bash
cd BookLeaf-Assignment-Frontend
```

Install dependencies:

```bash
npm install
```

Configure the backend API URL using the frontend environment variable described below.

The frontend should point to your local backend during local development or to the deployed Render API when using the production environment.

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the backend root directory.

Use the following as a template and replace the placeholder values with your own configuration.

```env
PORT=5112
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME
JWT_TOKEN_SECRET=replace_with_a_secure_random_secret
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:5173
```

| Variable | Description |
|---|---|
| `PORT` | Port on which the backend server listens |
| `NODE_ENV` | Application environment, such as development or production |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_TOKEN_SECRET` | Secret used by the application's token-based authentication logic |
| `GROQ_API_KEY` | API key used for Groq-powered AI features |
| `FRONTEND_URL` | Allowed frontend origin for CORS configuration |

The exact variables required depend on the backend configuration. If the implementation uses additional environment variables, configure those as well.

The helper scripts described below read `DATABASE_URL` from the same `.env` file, so the backend `.env` must be configured before running them.

Do not commit your actual `.env` file or real credentials to GitHub.

### Frontend Environment Variables

Create a `.env` file in the frontend root directory.

```env
VITE_API_URL=http://localhost:5112/api
```

For local development, this points to the local backend.

For the deployed frontend, configure the following environment variable in Netlify:

```env
VITE_API_URL=https://bookleaf-assignment-backend.onrender.com/api
```

Make sure the URL matches the API prefix used by the Axios configuration.

If your Axios instance already appends `/api`, do not add that prefix twice.

Vite exposes variables prefixed with `VITE_` to browser code. Never store database credentials, JWT secrets, or private API keys in frontend environment variables.

---

## Database Setup and Scripts

The backend repository contains two folders that are required to get a working database with usable logins:

```text
backend/
├── database_table_creation_scripts/
│   └── bookleaf_database.sql
└── scripts/
    ├── createAdmin.js
    └── setAuthorPasswords.js
```

### Step 1: Create the Tables and Insert the Demo Data

The file `database_table_creation_scripts/bookleaf_database.sql` contains the SQL that creates all required tables and inserts the demo data provided with the assignment, including the authors, books, royalty information, and knowledge-base content.

Run it against your PostgreSQL database, for example with `psql`:

```bash
psql "YOUR_DATABASE_URL" -f database_table_creation_scripts/bookleaf_database.sql
```

You can also open the file in a PostgreSQL client such as pgAdmin or DBeaver and execute it there.

Creating an empty PostgreSQL database does not create the application tables. This step must be completed before anything else.

### Step 2: Set the Default Password for All Demo Authors

The demo dataset contains authors but no login passwords. The script `scripts/setAuthorPasswords.js` assigns the default password `Author@123` to every author from the demo data, stored as a secure hash.

From the backend directory, run:

```bash
node scripts/setAuthorPasswords.js
```

After it completes, every author from the demo dataset can log in with their email and the password `Author@123`.

### Step 3: Create an Administrator Account

Administrators cannot self-register through the author interface, so an admin account must be created with the script `scripts/createAdmin.js`.

The script takes three arguments in this order: full name, email, and password.

```bash
node scripts/createAdmin.js "Full Name" admin_email@example.com your_password
```

Example used to create the demo administrator:

```bash
node scripts/createAdmin.js "Dev" admin@dev.com dev@admin
```

Expected output:

```text
PostgreSQL client connected
Admin created successfully:
{
  id: 'ddb0f64e-7a16-41e7-a708-518e429f9267',
  full_name: 'Dev',
  email: 'admin@dev.com',
  role: 'admin'
}
```

The generated `id` will be different on your own database.

Run the command once for each additional administrator you want to create.

---

## Login Credentials and Registration Steps

This section explains how to log in and how to register new administrators. Without it, a fresh installation has no usable accounts.

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dev.com` | `dev@admin` |
| Author (all demo authors) | Any author email from the demo dataset | `Author@123` |

The demo admin account already exists on the deployed application, so you can log in with it directly at [https://book-leaf.netlify.app/](https://book-leaf.netlify.app/).

### How to Log In as an Author

1. Open the frontend application.
2. Go to the login page.
3. Enter the email address of any author from the demo dataset.
4. Enter the password `Author@123`.
5. Sign in to open the author dashboard.

### How to Log In as an Administrator

1. Open the frontend application.
2. Go to the login page.
3. Enter `admin@dev.com` as the email.
4. Enter `dev@admin` as the password.
5. Sign in to open the administrator dashboard.

### How to Register a New Administrator

New administrators are created from the backend using the helper script. This is the only supported way to add an admin account.

1. Make sure the backend `.env` file contains a valid `DATABASE_URL` for the database you want to use.
2. Make sure the database schema has already been applied (see [Database Setup and Scripts](#database-setup-and-scripts)).
3. From the backend directory, run:

```bash
node scripts/createAdmin.js "Your Name" your_email@example.com your_password
```

4. Wait for the `Admin created successfully` message.
5. Log in through the frontend with the email and password you just used.

If the email already exists in the database, the script will not be able to create a duplicate account. Use a different email address.

To create an administrator on the deployed application, point `DATABASE_URL` in your local `.env` to the Render PostgreSQL external connection URL and run the same command.

### How to Reset Author Passwords

If author passwords are changed or an author cannot log in, run the password script again:

```bash
node scripts/setAuthorPasswords.js
```

This restores the default password `Author@123` for the demo authors.

### Credential Summary

- Demo authors: password `Author@123`.
- Demo admin: `admin@dev.com` with password `dev@admin`.
- New admins: create them with `node scripts/createAdmin.js "Name" email password`.
- Default author passwords: set with `node scripts/setAuthorPasswords.js`.

> Security note: these shared demo credentials exist so that the assignment can be evaluated easily. In a real deployment, use strong unique passwords, remove the demo accounts, and never publish administrator credentials.

---

## Running the Application

### Start the Backend

From the backend directory, run:

```bash
npm start
```

This assumes that `package.json` defines a `start` script.

If the project uses a different development script, use the corresponding command defined in `package.json`.

### Start the Frontend

From the frontend directory, run:

```bash
npm run dev
```

Vite will print the local development URL in the terminal, typically:

```text
http://localhost:5173
```

Open the displayed URL in your browser.

Ensure that the backend is running, the database is accessible, the database setup steps are complete, and the frontend API URL is configured correctly.

### Production Build

To create a production build of the frontend:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Deployment

### Frontend — Netlify

The frontend is deployed at:

[https://book-leaf.netlify.app/](https://book-leaf.netlify.app/)

The deployment is connected to the frontend GitHub repository.

Typical Vite deployment settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| API environment variable | `VITE_API_URL` |

The frontend communicates with the deployed backend over HTTPS.

### Backend — Render

The backend is deployed at:

[https://bookleaf-assignment-backend.onrender.com](https://bookleaf-assignment-backend.onrender.com)

The deployment is connected to the backend GitHub repository.

Configure the required environment variables in the Render service settings.

The backend must have access to PostgreSQL and the Groq API key.

### PostgreSQL — Render

The application uses PostgreSQL hosted on Render.

When the backend and database are in the same Render region, the internal database URL is recommended for backend-to-database communication.

Use the external database URL for connections from outside Render when external access is required, for example when running the helper scripts from your local machine against the deployed database.

Keep database credentials in environment variables rather than source code.

### CORS and Authentication

The backend must allow requests from the deployed Netlify frontend origin.

For cookie-based authentication, the frontend and backend must be configured consistently for credentialed requests, CORS, HTTPS, and cookie attributes.

Browser privacy policies can affect cross-site cookie behavior, so authentication should be tested in the browsers used for evaluation.

---

## API Overview

The backend exposes REST API endpoints for the application's authentication, ticket management, messaging, administrator workflows, and AI-assisted functionality.

The exact routes and request/response schemas are defined by the backend implementation.

### Main API Areas

| API area | Purpose |
|---|---|
| Authentication | User login, logout, session restoration, and related authentication operations |
| Author tickets | Create and retrieve tickets belonging to the authenticated author |
| Ticket conversations | Retrieve ticket messages and exchange replies |
| Administrator tickets | Retrieve and manage tickets through administrator permissions |
| Ticket status and priority | Update supported ticket-management fields |
| Internal notes | Add administrator-only notes to ticket conversations |
| AI assessment | Classify tickets and recommend priority |
| AI response drafting | Generate suggested replies using ticket context and relevant knowledge-base information |

### API Base URLs

Local backend:

```text
http://localhost:5112/api
```

Production backend:

```text
https://bookleaf-assignment-backend.onrender.com/api
```

These are base URLs, not individual endpoint paths.

Refer to the corresponding route definitions in the backend source code for exact endpoint paths, HTTP methods, request bodies, and response formats.

Protected endpoints require the authentication mechanism implemented by the backend.

---

## Database

PostgreSQL is used for persistent application data.

The database schema includes the entities required by the application's workflows, such as:

- Users and authentication-related records.
- Support tickets.
- Ticket messages.
- Ticket attachments.
- Books and author-related information.
- Royalty summaries.
- Knowledge-base articles.
- AI assessment and response-draft records.

The table definitions and demo data are provided in `database_table_creation_scripts/bookleaf_database.sql`.

Before running the application against a new database, apply this script, then run the helper scripts in the `scripts` folder as described in [Database Setup and Scripts](#database-setup-and-scripts).

Do not assume that creating a PostgreSQL database automatically creates the application's tables.

---

## Security and Access Control

The application is designed to distinguish between author and administrator access.

Security-related responsibilities include:

- Authentication for protected application features.
- Role-based authorization for restricted operations.
- Restricting authors to tickets they are permitted to access.
- Validating requests before database operations.
- Using parameterized SQL queries to reduce SQL injection risk.
- Storing passwords as hashes rather than plain text.
- Keeping API keys and database credentials on the backend.
- Restricting cross-origin requests through CORS configuration.
- Keeping administrator internal notes separate from public author-facing replies.

Internal notes are intended for administrator use and should not be exposed as public ticket replies.

Production credentials must be configured through the hosting provider's environment settings.

---

## Error Handling and AI Fallback

AI services can fail because of network problems, rate limits, unavailable models, invalid responses, or provider-side errors.

The backend should handle such failures without exposing sensitive credentials or internal implementation details to users.

AI functionality is an enhancement to the support workflow. Core ticket operations should remain separate from successful AI responses wherever the implemented workflow permits.

AI-generated content should be reviewed by an administrator before it is sent to an author.

---

## Project Structure

The application is maintained in two repositories.

### Frontend Repository

The frontend repository contains the React application, user interface components, page layouts, API client configuration, styling, and frontend assets.

### Backend Repository

The backend repository contains the Express server, API routes, controllers, middleware, database connection and queries, authentication logic, and AI service integration.

```text
backend/
├── config/
│   └── db.js
├── controllers/
├── database_table_creation_scripts/
│   └── bookleaf_database.sql
├── middleware/
│   ├── admin.middleware.js
│   └── auth.middleware.js
├── routes/
├── scripts/
│   ├── createAdmin.js
│   └── setAuthorPasswords.js
├── services/
│   └── groq.service.js
├── utils/
│   └── pagination.js
├── .env.example
├── package.json
└── server.js
```

| Folder / file | Purpose |
|---|---|
| `config/db.js` | PostgreSQL connection setup |
| `controllers/` | Request handlers for authentication, tickets, messages, books, profile, dashboards, knowledge base, and AI |
| `database_table_creation_scripts/` | SQL script that creates the tables and inserts the demo data |
| `middleware/` | Authentication and administrator authorization middleware |
| `routes/` | Express route definitions |
| `scripts/createAdmin.js` | Creates an administrator account |
| `scripts/setAuthorPasswords.js` | Sets the default password for every demo author |
| `services/groq.service.js` | Groq API integration |
| `utils/pagination.js` | Pagination helper |
| `server.js` | Application entry point |

Each repository has its own dependencies and configuration.

Refer to each repository's `package.json` and source directories for further details.

---

## Future Improvements

Potential future improvements include:

- More comprehensive automated testing.
- Enhanced ticket analytics and reporting.
- Additional knowledge-base management tools.
- More granular ticket assignment and escalation workflows.
- Improved real-time notification delivery.
- Expanded AI evaluation and response-quality monitoring.
- Additional accessibility and usability improvements.
- A secure in-app flow for administrator registration and password management.

These are potential enhancements rather than claims about currently implemented functionality.

---

## Conclusion

The BookLeaf Author Support & Communication Portal brings author communication, ticket management, administrator workflows, and AI-assisted support into a single application.

The project uses React and Vite for the frontend, Node.js and Express for the backend, PostgreSQL for persistent storage, and the Groq API for AI-assisted functionality.

The frontend and backend are deployed independently, with the source code available through GitHub.

The architecture is designed to keep the application maintainable, protect sensitive configuration, and allow AI to assist administrators while retaining human control over customer-facing responses.
