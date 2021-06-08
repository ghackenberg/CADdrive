# FH OÖ Audit Platform

## Screenshots

![Screenshot](./screenshot.png)

## Scripts

Install dependencies.

```
cd <root> && npm install
cd <root>/common && npm install
cd <root>/backend && npm install
cd <root>/worker && npm install
cd <root>/frontend && npm install
cd <root>/gateway && npm install
```

Start development.

```
cd <root> && npm run start-dev
```

Start production.

```
cd <root> && npm run start
```

## Diagrams

```mermaid
classDiagram
    class Common
    class Backend {
        port = 3001
    }
    class Worker {
        port = 3002
    }
    class Frontend {
        port = 3003
    }
    class Gateway {
        port = 3000
    }
    
    <<Service>> Backend
    <<Service>> Worker
    <<Service>> Frontend
    <<Service>> Gateway

    Gateway -- Backend: /api
    Gateway -- Worker: /worker.js
    Gateway -- Frontend: /
    Backend -- Common
    Worker -- Common
    Frontend -- Common
```

## Modules

* [Common](./common)
* [Backend](./backend)
* [Frontend](./frontend)
* [Worker](./worker)
* [Gateway](./gateway)