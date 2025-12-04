# CADdrive Backend to Google Firebase Migration Plan

## Introduction
This document outlines a plan to migrate the existing CADdrive backend, currently built with NestJS and a relational database, to Google Firebase. The migration aims to leverage Firebase's serverless architecture, managed services, and scalability.

## Current Architecture Summary
*   **Backend Framework:** NestJS
*   **Database:** TypeORM-based relational database (likely PostgreSQL or MySQL, inferred from TypeORM usage and entity definitions).
*   **API:** RESTful API covering user management, product, versioning, issues, comments, attachments, file handling, milestones, and team members.
*   **Authentication:** Custom authentication likely involving API keys and JWT tokens.
*   **File Storage:** Local filesystem (`./uploads` directory) for assets like 3D models and rendered images.
*   **Real-time Communication:** MQTT for real-time interactions.
*   **Background Jobs:** Server-side rendering of 3D models (GLB, LDR, MPD) into images, triggered by specific events (e.g., version updates).

## Proposed Firebase Architecture
*   **Backend:** Firebase Cloud Functions (for serverless execution of NestJS logic, possibly refactored).
*   **Database:** Cloud Firestore for NoSQL document storage.
*   **Authentication:** Firebase Authentication for user management.
*   **File Storage:** Firebase Storage (backed by Google Cloud Storage).
*   **Real-time Communication:** Cloud Firestore real-time listeners.
*   **Background Jobs:** Firebase Cloud Functions triggered by Cloud Storage events (for rendering).

## Migration Steps

### Phase 1: Preparation and Setup

1.  **Firebase Project Setup:**
    *   Create a new Firebase project in the Google Cloud Console.
    *   Enable required Firebase services: Authentication, Firestore, Storage, Cloud Functions.
    *   Set up Firebase CLI and link it to the project.

2.  **Codebase Analysis & Refactoring (Pre-migration):**
    *   **Dependency Audit:** Identify all external dependencies and assess their compatibility with Cloud Functions environment.
    *   **Configuration Externalization:** Ensure all environment-specific configurations (e.g., database connection strings, API keys) are externalized and manageable via Firebase environment variables or Firebase Remote Config.
    *   **Modularization Review:** NestJS modules are already well-defined; ensure they are isolated enough for potential future splitting into separate Cloud Functions if needed for granular scaling.

### Phase 2: Core Service Migration

#### 2.1. Authentication Migration

1.  **Firebase Authentication Integration:**
    *   Implement Firebase Authentication in the NestJS application for user sign-up, sign-in, and session management.
    *   Replace existing custom authentication logic (`KeyModule`, `TokenModule`, `UserModule` related authentication parts) with Firebase Auth SDK calls.
    *   Define user roles and permissions using Firebase Custom Claims if fine-grained access control is required beyond basic user states.
2.  **User Data Migration:**
    *   Export existing user data (excluding sensitive credentials like plain-text passwords, if any) from the current database.
    *   Import users into Firebase Authentication using the Firebase Admin SDK (hashed passwords can be imported directly if compatible with Firebase's hashing algorithms).

#### 2.2. Database Migration (Relational to Firestore)

1.  **Data Model Transformation:**
    *   Analyze existing TypeORM entities (`UserEntity`, `ProductEntity`, `VersionEntity`, etc.) and design an optimized NoSQL schema for Cloud Firestore.
    *   Consider collections, subcollections, and denormalization strategies suitable for Firestore's query capabilities.
    *   Define indexes required for efficient querying in Firestore.
2.  **Data Migration:**
    *   Develop scripts to extract data from the current relational database.
    *   Transform the extracted data into the new Firestore schema.
    *   Import data into Cloud Firestore collections using the Firebase Admin SDK.
    *   **Strategy:** Perform an initial bulk migration, followed by incremental migrations or a cut-over strategy to minimize downtime.

#### 2.3. File Storage Migration

1.  **Firebase Storage Integration:**
    *   Replace all local file operations (`fs` module usage, `./uploads` directory) with Firebase Storage SDK calls.
    *   Update logic for uploading, downloading, and managing files (attachments, product images, 3D models).
2.  **Existing File Migration:**
    *   Migrate all existing files from the `./uploads` directory to Firebase Storage buckets.
    *   Update database references (e.g., `imageType` and file paths stored in `VersionEntity`) to point to the new Firebase Storage URLs.

### Phase 3: API & Business Logic Adaptation

#### 3.1. NestJS on Cloud Functions

1.  **Cloud Functions Deployment:**
    *   Adapt the NestJS application to run as an HTTP Cloud Function. This typically involves wrapping the NestJS `rest.listen()` call within a Firebase Cloud Function HTTP trigger.
    *   Ensure all routes and middleware function correctly within the Cloud Functions environment.
    *   Handle CORS as needed for frontend applications.
2.  **Dependency Management:**
    *   Review `package.json` for dependencies. Ensure only necessary dependencies are deployed with Cloud Functions to minimize package size and cold start times.
    *   Address any native module dependencies that might not be compatible with Cloud Functions.

### Phase 4: Real-time & Background Processing

#### 4.1. Real-time Communication

1.  **MQTT Replacement:**
    *   Identify all areas currently using MQTT (`./mqtt.ts`).
    *   Replace MQTT client-side and server-side logic with Cloud Firestore real-time listeners or, if applicable, Firebase Realtime Database.
    *   Consider using Cloud Pub/Sub for messaging between services if direct database real-time features are not sufficient.

#### 4.2. Background Job Migration (3D Model Rendering)

1.  **Cloud Functions for Rendering:**
    *   Refactor the `fix()` function and rendering logic (`renderGlb`, `renderLDraw`) into separate Firebase Cloud Functions.
    *   Trigger these functions via Cloud Storage events (e.g., `onFinalize` when a new 3D model is uploaded to a specific storage bucket).
    *   Consider using Cloud Run for long-running or resource-intensive rendering tasks if Cloud Functions timeouts become an issue.
    *   Store rendered images back into Firebase Storage.

### Phase 5: Testing and Deployment

1.  **Unit & Integration Testing:**
    *   Update existing tests and write new ones for Firebase-specific logic (Authentication, Firestore, Storage, Cloud Functions).
    *   Utilize Firebase Emulators for local development and testing of Cloud Functions, Firestore, and other services.
2.  **Performance Testing:**
    *   Test the performance of Cloud Functions, especially cold start times and latency.
    *   Optimize functions for performance and cost.
3.  **Security Rules:**
    *   Implement robust Firebase Security Rules for Cloud Firestore and Firebase Storage to control data access.
4.  **Deployment:**
    *   Deploy all Firebase components (Functions, Firestore indexes, Storage rules).
    *   Update DNS records to point frontend applications to the new Firebase-hosted backend.

## Potential Challenges & Considerations
*   **Cost Optimization:** Cloud Functions and Firestore pricing models should be carefully monitored and optimized.
*   **Cold Starts:** Minimize cold start times for Cloud Functions by optimizing code, reducing dependencies, and allocating adequate memory.
*   **Data Structure:** Transitioning from a relational to a NoSQL data model requires careful planning to ensure efficient querying and data integrity.
*   **Transactions:** Re-evaluate existing transactional logic and adapt it to Firestore's transaction capabilities.
*   **External APIs/Services:** Ensure any external API integrations are compatible with Cloud Functions.

## Next Steps
1.  Detailed mapping of current database schema to Firestore schema.
2.  Development of data migration scripts.
3.  Refactoring authentication logic to use Firebase Auth.
4.  Refactoring file storage logic to use Firebase Storage.
5.  Adapting NestJS application for deployment on Cloud Functions.
6.  Migrating MQTT to Firebase real-time solutions.
7.  Migrating rendering background jobs to Cloud Functions.
