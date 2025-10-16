# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Torch is an internal system for an SES company to process and display job opportunities and talent information from partner emails. The system receives ~20,000 emails daily from partners, extracts relevant information using AI (hiding sensitive details like margins and pricing), and makes it available to internal staff for market analysis and information sharing.

## System Architecture

The system consists of three main components:

1. **Batch Processing (Google Apps Script)**
   - Triggered every 5 minutes
   - Fetches incoming emails from Gmail
   - Extracts necessary data and original content
   - Stores processed data in the database

2. **Database (NeonDB)**
   - PostgreSQL-compatible database
   - Managed via Prisma ORM

3. **Application (Next.js)**
   - Frontend-only implementation initially
   - User authentication: Google OAuth restricted to @luxy-inc.com domain
   - Core features: job listings, search, and detail views
   - UI: TailwindCSS + shadcn-ui components
   - Deployment: Vercel

## Technology Stack

- **Frontend Framework**: Next.js
- **Styling**: TailwindCSS + shadcn-ui
- **ORM**: Prisma
- **Database**: NeonDB (PostgreSQL)
- **Batch Processing**: Google Apps Script (GAS)
- **Deployment**: Vercel
- **Development Environment**: Docker

## Authentication

Access is restricted to users with @luxy-inc.com Google accounts. The system is internal-facing only and does not require strict SLA guarantees.

## Language Note

The requirements document (docs/request.md) is written in Japanese. This is an internal Japanese company project.
- やりとりは日本語でお願いします