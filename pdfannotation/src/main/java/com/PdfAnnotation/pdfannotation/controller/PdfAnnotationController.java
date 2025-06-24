package com.PdfAnnotation.pdfannotation.controller;

import com.PdfAnnotation.pdfannotation.dto.AnnotationRequest;
import com.PdfAnnotation.pdfannotation.service.PdfAnnotationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "*") // Configure this properly in production
public class PdfAnnotationController {
    
    private static final Logger logger = LoggerFactory.getLogger(PdfAnnotationController.class);
    
    @Autowired
    private PdfAnnotationService pdfAnnotationService;

    @PostMapping("/annotate")
    public ResponseEntity<?> annotatePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam("annotations") String annotationsJson) {
        
        try {
            logger.info("Received PDF annotation request. File: {}, Annotations: {}", 
                       file.getOriginalFilename(), annotationsJson);
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
            }
            
            if (!file.getContentType().equals("application/pdf")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File must be a PDF"));
            }
            
            List<AnnotationRequest> annotations;
            try {
                annotations = parseAnnotations(annotationsJson);
            } catch (Exception e) {
                logger.error("Failed to parse annotations JSON", e);
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid annotations format: " + e.getMessage()));
            }
            
            // Validate annotations
            for (int i = 0; i < annotations.size(); i++) {
                AnnotationRequest annotation = annotations.get(i);
                if (annotation.getSelectedText() == null || annotation.getSelectedText().trim().isEmpty()) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Annotation " + i + ": Selected text is required"));
                }
                if (annotation.getPageNumber() == null || annotation.getPageNumber() < 1) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Annotation " + i + ": Valid page number is required"));
                }
                if (annotation.getColor() == null || annotation.getColor().trim().isEmpty()) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Annotation " + i + ": Color is required"));
                }
            }
            
            byte[] annotatedPdf = pdfAnnotationService.annotatePdf(file.getInputStream(), annotations);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "annotated_" + file.getOriginalFilename());
            headers.setContentLength(annotatedPdf.length);
            
            logger.info("Successfully processed PDF with {} annotations", annotations.size());
            
            return new ResponseEntity<>(annotatedPdf, headers, HttpStatus.OK);
            
        } catch (IOException e) {
            logger.error("Error processing PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to process PDF: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    @PostMapping("/annotate-json")
    public ResponseEntity<?> annotatePdfWithJson(
            @RequestParam("file") MultipartFile file,
            @RequestBody @Valid List<AnnotationRequest> annotations) {
        
        try {
            logger.info("Received PDF annotation request via JSON. File: {}, Annotations count: {}", 
                       file.getOriginalFilename(), annotations.size());
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
            }
            
            if (!file.getContentType().equals("application/pdf")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File must be a PDF"));
            }
            
            byte[] annotatedPdf = pdfAnnotationService.annotatePdf(file.getInputStream(), annotations);
            
            // Return annotated PDF
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "annotated_" + file.getOriginalFilename());
            headers.setContentLength(annotatedPdf.length);
            
            logger.info("Successfully processed PDF with {} annotations", annotations.size());
            
            return new ResponseEntity<>(annotatedPdf, headers, HttpStatus.OK);
            
        } catch (IOException e) {
            logger.error("Error processing PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to process PDF: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "PDF Annotation Service",
            "version", "1.0.0"
        ));
    }

    private List<AnnotationRequest> parseAnnotations(String annotationsJson) throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        return mapper.readValue(annotationsJson, 
            mapper.getTypeFactory().constructCollectionType(List.class, AnnotationRequest.class));
    }
}