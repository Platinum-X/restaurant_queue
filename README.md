# Restaurant Queue System

A rapid prototype built to verify the potential of "Vibe Coding" – coded using **AntiGravity** and **Google DeepMind's Gemini** models to quickly generate working software solutions.

## Purpose

This project aims to replace traditional hardware-based "buzzers" used in restaurants for table management. Instead of handing out physical devices, venues can manage a digital queue, and guests can track their status via their own smartphones.

## Key Features

-   **Admin Dashboard**:
    -   Manage the waitlist/queue.
    -   Assign tables and seat guests.
    -   Track seated guests and table duration.
    -   "Call" guests when their table is ready.
-   **Guest View**:
    -   Real-time status updates (Waiting / Ready / Seated).
    -   Mobile-friendly interface accessed via QR code or link.
-   **No Hardware**: Eliminates the cost and maintenance of physical buzzer systems.

## Tech Stack

-   **Backend**: Python (FastAPI), SQLAlchemy, SQLite/MySQL.
-   **Frontend (Admin)**: React, Vite, TailwindCSS.
-   **Frontend (Guest)**: React, Vite, TailwindCSS.

## Project Structure

-   `/backend` - API server and database models.
-   `/frontend-admin` - Dashboard for restaurant staff.
-   `/frontend-guest` - Public-facing view for customers.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Admin Frontend
```bash
cd frontend-admin
npm install
npm run dev
```

### Guest Frontend
```bash
cd frontend-guest
npm install
npm run dev
```

> **Development Note:**
> To test the QR code functionality with a mobile device, expose the Guest Frontend using **ngrok**:
> ```bash
> ngrok http 5174
> ```
> Then update `frontend-admin/.env` with the public URL (e.g., `GUEST_APP=https://your-url.ngrok-free.dev`).
