# Granja Pro – Technology Stack

## Overview
Granja Pro is a modern SaaS platform designed for small and medium poultry egg farmers.  
The system is mobile-first, simple, fast, and optimized for daily farm operations.

The product must deliver high operational value with a lean architecture, allowing fast development, low infrastructure complexity, and strong scalability potential.

## Architecture

Frontend:
- Next.js
- React
- TailwindCSS
- TypeScript
- Mobile-first design

Backend:
- Supabase
- Supabase Database
- Supabase Auth
- Supabase Storage
- Supabase Realtime

Database:
- PostgreSQL (managed by Supabase)

Authentication:
- Supabase Auth
- Role-based access control
- Row Level Security (RLS)

API / Data Access:
- Supabase client
- Auto-generated APIs from Supabase
- Optional server actions / edge functions for advanced business logic

Deployment (future):
- Vercel (frontend)
- Supabase Cloud (backend infrastructure)
- Docker (optional for future services)

## Principles

- Simple and scalable architecture
- Lean MVP infrastructure
- Reusable UI components
- Mobile-first interface
- Clean and maintainable code
- Fast product iteration
- Low operational overhead

## UI Design

The UI should follow these rules:

- Large touch-friendly components
- Clear visual hierarchy
- Minimal friction for data entry
- Agritech aesthetic
- Green / earth color palette
- Fast loading
- Simple navigation
- High readability in outdoor environments

The target user often uses a **smartphone in the farm environment**, sometimes with limited connectivity, limited time, and low technical familiarity.

## Backend Strategy

The MVP should avoid a custom backend server unless strictly necessary.

Supabase will be used as the main backend infrastructure layer, providing:

- database
- authentication
- storage
- realtime capabilities
- secure data access policies

This reduces development complexity and accelerates time-to-market.

## Security Model

The platform must enforce data isolation across farms.

Core security rules:

- each user belongs to a farm
- each farm can only access its own data
- all operational tables must include `farm_id`
- access control must be enforced through Supabase Row Level Security (RLS)

## Future Expansion

As the product grows, the architecture may expand with:

- Edge Functions for custom backend logic
- background jobs
- notifications
- integrations with payment providers
- advanced analytics services
- dedicated microservices if scale demands it