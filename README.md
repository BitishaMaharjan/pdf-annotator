# PDF Annotation Application

This is a full-stack web application designed to allow users to upload, annotate, and download PDF files. The frontend is built using **Next.js**  and **PDF.js**, while the backend uses **Spring Boot** and **Apache PDFBox** for PDF processing and annotation.

## Features

- Upload and preview PDF files in the browser
- Annotate PDFs with highlights and links
- Customize annotation color and positioning
- Download annotated PDFs with applied changes

## Technologies Used

### Frontend

- Next.js 15
- Tailwind CSS 
- pdfjs-dist

### Backend

- Spring Boot 3.5.3
- Java 17
- Apache PDFBox
- Jakarta Bean Validation
- Maven

## Project Structure

project-root/
├── frontend/ # Next.js client
│ ├── pages/
│ ├── components/
│ └── public/
└── pdf-annotation/ # Spring Boot server
├── controller/
├── service/
├── dto/
├── config/
└── PdfAnnotationApplication.java

## API Endpoint

By default, the Spring Boot backend runs at:

http://localhost:8080

All API requests from the frontend should target this base URL (e.g., for annotation upload or download endpoints).

## Setup Instructions

### Backend (Spring Boot)

1. Navigate to the backend directory:
cd pdf-annotation

2. Build and run the server:
mvn clean install
mvn spring-boot:run


### Frontend (Next.js)

1. Navigate to the frontend directory:
cd frontend

2. Install dependencies:
npm install

3. Start the development server:
npm run dev


## How It Works

- The user uploads a PDF document via the frontend.
- The frontend  allows users to annotate selected areas.
- Annotations (including text, coordinates, colors, and  links) are sent to the Spring Boot backend.
- The backend processes and validates the annotations, and  modifies the PDF using Apache PDFBox.
- The pdf is downloaded after hitting the api from download button with the applied annotations.

## Assumptions

- PDF annotations and files are handled entirely in-memory during the session and are not stored persistently.
- The system is designed for single-user interaction per session; no concurrency or multi-user collaboration is supported in this version.
- Only highlight and hyperlink annotations are supported; no other types (e.g., comments, drawings) are implemented.
- Annotation data received from the frontend is expected to be well-structured; basic validation is performed on the backend.
- Files uploaded are assumed to be standard, well-formed PDFs; corrupted or encrypted PDFs are not handled.
- The current architecture assumes that performance will remain acceptable for PDF files up to ~10MB in size.
- No authentication or user-based access control is implemented; the application is intended for internal or controlled usage


## Possible Enhancements

- Persist annotations using a database (e.g., PostgreSQL or MongoDB)
- Add authentication and user-based access
- Export PDFs with embedded annotations
- Real-time collaborative annotation with WebSocket support
- Support more annotation types (comments, drawings, etc.)

