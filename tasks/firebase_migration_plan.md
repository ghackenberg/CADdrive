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

# CADdrive Backend to Google Firebase Migration Plan

## Introduction
This document outlines a plan to migrate the existing CADdrive backend, currently built with NestJS and a relational database, to a serverless architecture using Google Firebase for core services. A new client-side API package will be created to abstract backend interactions, ensuring future flexibility.

## Current Architecture Summary
*   **Backend Framework:** NestJS
*   **Database:** TypeORM-based relational database.
*   **API:** RESTful API.
*   **Authentication:** Custom JWT and API key implementation.
*   **File Storage:** Local filesystem (`./uploads`).
*   **Real-time Communication:** MQTT.
*   **Background Jobs:** Server-side rendering of 3D models.

## Proposed Architecture
This migration will replace the custom database, file storage, and real-time components with managed Firebase services. The existing NestJS backend will be refactored into a collection of serverless functions.

*   **Client API (`packages/client`):** A new TypeScript package that encapsulates all direct Firebase interactions, providing a clean API for clients.
*   **Database:** Cloud Firestore for NoSQL document storage.
*   **Authentication:** Firebase Authentication for user management.
*   **File Storage:** Firebase Storage for file assets.
*   **Real-time Communication:** Cloud Firestore real-time listeners, exposed through the `packages/client` package.
*   **Backend Functions (`packages/backend`):** The existing `packages/backend` package will be refactored. Instead of running a persistent server, its business logic (e.g., 3D rendering, email notifications) will be deployed as individual, trigger-based Firebase Cloud Functions.

## Migration Steps

### Phase 1: Preparation and Setup

1.  **Firebase Project Setup:**
    *   Create a new Firebase project.
    *   Enable Authentication, Firestore, Storage, and Cloud Functions.
    *   Set up the Firebase CLI.

### Phase 2: Core Service Migration (Data and Files)

#### 2.1. Database Migration (Relational to Firestore)

1.  **Data Model Transformation:**
    *   Design an optimized NoSQL schema for Cloud Firestore based on the existing TypeORM entities.
2.  **Data Migration:**
    *   Develop scripts to extract data from the current database, transform it, and import it into Firestore using the Firebase Admin SDK.

#### 2.2. File Storage Migration

1.  **Migrate Existing Files:**
    *   Migrate all files from the local `./uploads` directory to a Firebase Storage bucket.
    *   Update data in Firestore to reference the new Storage URLs.

### Phase 3: CADdrive Client API Implementation (`packages/client`)

A new package, `caddrive-client`, will be created to handle all direct communication with Firebase. **To minimize frontend refactoring, this new client will be designed to be a drop-in replacement for the existing clients, implementing the interfaces defined in `packages/common`.**

1.  **Package Setup:**
    *   Create a new TypeScript package within the `packages` directory.
    *   Add the Firebase JS SDK as a dependency.
2.  **API Implementation (Interface Compatibility):**
    *   **Data & REST Interfaces:** The client will implement the REST interfaces defined in `packages/common/src/rest.ts` (e.g., `ProductREST`, `UserREST`, `IssueREST`). Instead of making `axios` calls, the methods will interact with Cloud Firestore.
    *   **Authentication:** Implement a module that wraps the Firebase Authentication SDK but exposes a compatible interface for token handling and user state.
    *   **Real-time Subscriptions:** The client will provide a real-time API compatible with the existing subscription model in `CacheAPI`, using Firestore's `onSnapshot` listeners internally.
    *   **File Storage:** Create a module for file handling that matches the expected input/output of the current file upload/download logic.

### Phase 4: Frontend Migration (`packages/frontend`)

The frontend will be refactored to use the new `packages/client` package. Due to the compatible interface, this will primarily be an implementation swap.

1.  **Integrate `packages/client`:**
    *   Add the new client package as a dependency.
2.  **Replace Client Implementations:**
    *   The existing client implementations in `src/scripts/clients/` (like `ProductClient`, `UserClient`, `MqttAPI`) will be replaced with a single, unified client instance from the `packages/client` package.
    *   Since the interfaces are compatible, the impact on UI components and hooks (`src/scripts/components/` and `src/scripts/hooks/`) will be minimized. The main change will be how the clients are initialized and accessed.
    *   The `CacheAPI` will be updated to use the new client's real-time subscription methods instead of MQTT.

### Phase 5: Backend Functions (`packages/backend`)

The business logic from the existing NestJS application will be extracted and deployed as individual, event-driven Cloud Functions.

1.  **3D Model Rendering Function:**
    *   Refactor the rendering logic (`renderGlb`, `renderLDraw`) into a Firebase Cloud Function.
    *   This function will be triggered by a **Cloud Storage event** whenever a new 3D model is uploaded.
    *   The function will render the image and save it back to Firebase Storage, updating the corresponding document in Firestore.
2.  **Email Sending Functions:**
    *   Extract email sending logic into one or more Cloud Functions.
    *   **Example Triggers:**
        *   An **Authentication trigger** (`onCreateUser`) can send a welcome email to new users.
        *   A **Firestore trigger** (`onWrite` to a `comments` collection) can trigger an email notification to subscribed users.
    *   These functions will use an email sending service (e.g., SendGrid, Mailgun) via its API.

### Phase 6: Testing and Deployment

1.  **Testing:**
    *   Write unit and integration tests for the `caddrive-client` package and the new Cloud Functions.
    *   Use Firebase Emulators for local development and testing.
2.  **Deployment:**
    *   Deploy Firebase components (Firestore rules, Storage rules, Cloud Functions).
    *   Deploy the refactored frontend application, preferably using Firebase Hosting.

## Potential Challenges & Considerations
*   **API Design:** Designing a clean and maintainable API for the `caddrive-client` package is critical.
*   **Cold Starts:** Cloud Function cold starts could impact the performance of background tasks.
*   **Data Structure:** The transition from a relational to a NoSQL data model remains a key challenge.

## Next Steps
1.  **Create `caddrive-client` package skeleton.**
2.  Design and implement the data models and security rules for Firestore.
3.  Implement the `caddrive-client` API (Auth, Firestore, Storage).
4.  Refactor the `caddrive-backend` package into individual Cloud Functions and configure their triggers.
5.  Refactor the frontend application to use the new `caddrive-client` package.
6.  Migrate data and files to Firebase.
7.  Implement and deploy the background rendering and email Cloud Functions.
8.  Deploy the frontend application.


