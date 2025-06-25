
package com.PdfAnnotation.pdfannotation.service;

import com.PdfAnnotation.pdfannotation.dto.AnnotationRequest;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDBorderStyleDictionary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Service
public class PdfAnnotationService {

    private static final Logger logger = LoggerFactory.getLogger(PdfAnnotationService.class);

    public byte[] annotatePdf(InputStream pdfInputStream, List<AnnotationRequest> annotations) throws IOException {
        try (PDDocument document = PDDocument.load(pdfInputStream)) {

            for (AnnotationRequest annotation : annotations) {
                applyAnnotation(document, annotation);
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }


private void applyAnnotation(PDDocument document, AnnotationRequest annotation) throws IOException {
    logger.info("Applying annotation: {}", annotation);

    int pageIndex = annotation.getPageNumber() - 1;
    if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
        throw new IllegalArgumentException("Invalid page number: " + annotation.getPageNumber());
    }

    PDPage page = document.getPage(pageIndex);
    PDRectangle pageSize = page.getMediaBox();

    float pdfWidth = pageSize.getWidth();
    float pdfHeight = pageSize.getHeight();

    logger.info("PDF page dimensions: {}x{}", pdfWidth, pdfHeight);

    float finalX, finalY, finalWidth, finalHeight;
    
    if (annotation.getCanvasWidth() != null && annotation.getCanvasHeight() != null) {
        float canvasWidth = annotation.getCanvasWidth().floatValue();
        float canvasHeight = annotation.getCanvasHeight().floatValue();
        
        logger.info("Canvas dimensions: {}x{}", canvasWidth, canvasHeight);
        logger.info("Original canvas coordinates: x={}, y={}, w={}, h={}", 
                   annotation.getX(), annotation.getY(), annotation.getWidth(), annotation.getHeight());
        
        // Calculate scale factors
        float scaleX = pdfWidth / canvasWidth;
        float scaleY = pdfHeight / canvasHeight;
        
        logger.info("Scale factors: scaleX={}, scaleY={}", scaleX, scaleY);
        
        // Convert coordinates
        finalX = annotation.getX().floatValue() * scaleX;
        finalWidth = annotation.getWidth().floatValue() * scaleX;
        finalHeight = annotation.getHeight().floatValue() * scaleY;
        
        float canvasY = annotation.getY().floatValue();
        finalY = pdfHeight - (canvasY * scaleY) - finalHeight;
        
    } else {
        finalX = annotation.getX().floatValue();
        finalY = pdfHeight - annotation.getY().floatValue() - annotation.getHeight().floatValue();
        finalWidth = annotation.getWidth().floatValue();
        finalHeight = annotation.getHeight().floatValue();
    }

    logger.info("Final PDF coordinates: x={}, y={}, w={}, h={}", finalX, finalY, finalWidth, finalHeight);

    if (finalX < 0 || finalY < 0 || finalX + finalWidth > pdfWidth || finalY + finalHeight > pdfHeight) {
        logger.warn("Annotation coordinates outside page bounds. Adjusting...");
        finalX = Math.max(0, Math.min(finalX, pdfWidth - finalWidth));
        finalY = Math.max(0, Math.min(finalY, pdfHeight - finalHeight));
        finalWidth = Math.min(finalWidth, pdfWidth - finalX);
        finalHeight = Math.min(finalHeight, pdfHeight - finalY);
        logger.info("Adjusted coordinates: x={}, y={}, w={}, h={}", finalX, finalY, finalWidth, finalHeight);
    }

    coverOriginalText(document, page, finalX, finalY, finalWidth, finalHeight);

    addStyledAnnotationText(document, page, annotation, finalX, finalY, finalWidth, finalHeight);

    if (annotation.getLink() != null && !annotation.getLink().trim().isEmpty()) {
        addHyperlink(page, annotation, finalX, finalY, finalWidth, finalHeight);
    }
}
    private void coverOriginalText(PDDocument document, PDPage page, 
                                 float x, float y, float width, float height) throws IOException {
        try (PDPageContentStream contentStream = new PDPageContentStream(
                document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

            contentStream.setNonStrokingColor(Color.WHITE);
            
            contentStream.addRect(x, y, width, height);
            contentStream.fill();

            logger.info("Covered original text area at ({}, {}) with dimensions {}x{}", x, y, width, height);
        }
    }
    private void addStyledAnnotationText(PDDocument document, PDPage page, AnnotationRequest annotation,
    float x, float y, float width, float height) throws IOException {
try (PDPageContentStream contentStream = new PDPageContentStream(
document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

PDFont font = getFont(annotation.getFontStyle());
float fontSize = annotation.getFontSize() != null ? annotation.getFontSize() : 12f;

String text = annotation.getSelectedText();

float textWidth = font.getStringWidth(text) / 1000f * fontSize;
float textHeight = font.getFontDescriptor().getCapHeight() / 1000f * fontSize;

float descent = font.getFontDescriptor().getDescent() / 1000f * fontSize;
float textX = x;
float textY = y + (height - textHeight) / 2f - descent;

if (textWidth < width) {
textX = x + (width - textWidth) / 2f;
}

PDColor textColor = parseColor(annotation.getColor());

if (annotation.getBackgroundColor() != null && !annotation.getBackgroundColor().trim().isEmpty()) {
PDColor backgroundColor = parseColor(annotation.getBackgroundColor());
contentStream.setNonStrokingColor(backgroundColor);
contentStream.addRect(x, y, width, height);
contentStream.fill();
}

float leading = 1.5f * fontSize; 
float cursorX = x + 2;
float cursorY = y + height - fontSize; 

contentStream.beginText();
contentStream.setFont(font, fontSize);
contentStream.setNonStrokingColor(textColor);
contentStream.newLineAtOffset(cursorX, cursorY);

String[] words = text.split(" ");
StringBuilder lineBuilder = new StringBuilder();

for (String word : words) {
    String testLine = lineBuilder.length() == 0 ? word : lineBuilder + " " + word;
    float size = font.getStringWidth(testLine) / 1000f * fontSize;

    if (cursorY < y) break;

    if (size > width - 4) { 
        contentStream.showText(lineBuilder.toString());
        contentStream.newLineAtOffset(0, -leading);
        cursorY -= leading;
        lineBuilder = new StringBuilder(word);
    } else {
        lineBuilder = new StringBuilder(testLine);
    }
}

// Draw the remaining line
if (cursorY >= y && lineBuilder.length() > 0) {
    contentStream.showText(lineBuilder.toString());
}
contentStream.endText();


// Optional: Border
if (annotation.getBorderColor() != null && !annotation.getBorderColor().trim().isEmpty()) {
PDColor borderColor = parseColor(annotation.getBorderColor());
contentStream.setStrokingColor(borderColor);
contentStream.setLineWidth(annotation.getBorderWidth() != null ? annotation.getBorderWidth() : 1f);
contentStream.addRect(x, y, width, height);
contentStream.stroke();
}

logger.info("Added styled text '{}' at ({}, {}) with font '{}' and size {}",
text, textX, textY, annotation.getFontStyle(), fontSize);
}
}


    private void addHyperlink(PDPage page, AnnotationRequest annotation, 
                            float normalizedX, float normalizedY, float normalizedWidth, float normalizedHeight) throws IOException {
        PDAnnotationLink linkAnnotation = new PDAnnotationLink();

        PDRectangle linkRect = new PDRectangle(
                normalizedX,
                normalizedY,
                normalizedWidth,
                normalizedHeight
        );
        linkAnnotation.setRectangle(linkRect);

        PDActionURI uriAction = new PDActionURI();
        uriAction.setURI(annotation.getLink());
        linkAnnotation.setAction(uriAction);

        PDBorderStyleDictionary borderStyle = new PDBorderStyleDictionary();
        borderStyle.setWidth(0);
        linkAnnotation.setBorderStyle(borderStyle);

        page.getAnnotations().add(linkAnnotation);

        logger.info("Added hyperlink '{}' at ({}, {})", annotation.getLink(), normalizedX, normalizedY);
    }

    private PDFont getFont(String fontStyle) {
        if (fontStyle == null || fontStyle.trim().isEmpty()) {
            return PDType1Font.HELVETICA;
        }

        switch (fontStyle.toLowerCase()) {
            case "bold":
                return PDType1Font.HELVETICA_BOLD;
            case "italic":
                return PDType1Font.HELVETICA_OBLIQUE;
            case "bold-italic":
            case "bolditalic":
                return PDType1Font.HELVETICA_BOLD_OBLIQUE;
            case "times":
                return PDType1Font.TIMES_ROMAN;
            case "times-bold":
                return PDType1Font.TIMES_BOLD;
            case "times-italic":
                return PDType1Font.TIMES_ITALIC;
            case "times-bold-italic":
                return PDType1Font.TIMES_BOLD_ITALIC;
            case "courier":
                return PDType1Font.COURIER;
            case "courier-bold":
                return PDType1Font.COURIER_BOLD;
            case "courier-italic":
                return PDType1Font.COURIER_OBLIQUE;
            case "courier-bold-italic":
                return PDType1Font.COURIER_BOLD_OBLIQUE;
            default:
                return PDType1Font.HELVETICA;
        }
    }

    private PDColor parseColor(String colorString) {
        try {
            if (colorString == null || colorString.trim().isEmpty()) {
                return new PDColor(new float[]{0, 0, 0}, PDDeviceRGB.INSTANCE); // Default to black
            }

            if (colorString.startsWith("#")) {
                colorString = colorString.substring(1);
            }

            Color color = parseNamedColor(colorString);
            if (color == null) {
                if (colorString.length() == 6) {
                    color = Color.decode("#" + colorString);
                } else if (colorString.length() == 3) {
                    String expanded = "" + colorString.charAt(0) + colorString.charAt(0) +
                            colorString.charAt(1) + colorString.charAt(1) +
                            colorString.charAt(2) + colorString.charAt(2);
                    color = Color.decode("#" + expanded);
                } else {
                    throw new IllegalArgumentException("Invalid color format: " + colorString);
                }
            }

            float[] rgb = new float[3];
            rgb[0] = color.getRed() / 255f;
            rgb[1] = color.getGreen() / 255f;
            rgb[2] = color.getBlue() / 255f;

            return new PDColor(rgb, PDDeviceRGB.INSTANCE);

        } catch (Exception e) {
            logger.warn("Failed to parse color '{}', using black as default", colorString);
            return new PDColor(new float[]{0, 0, 0}, PDDeviceRGB.INSTANCE);
        }
    }

    private Color parseNamedColor(String colorName) {
        if (colorName == null) return null;
        
        switch (colorName.toLowerCase()) {
            case "red": return Color.RED;
            case "blue": return Color.BLUE;
            case "green": return Color.GREEN;
            case "yellow": return Color.YELLOW;
            case "orange": return Color.ORANGE;
            case "pink": return Color.PINK;
            case "purple": return Color.MAGENTA;
            case "magenta": return Color.MAGENTA;
            case "cyan": return Color.CYAN;
            case "black": return Color.BLACK;
            case "white": return Color.WHITE;
            case "gray":
            case "grey": return Color.GRAY;
            case "darkgray":
            case "darkgrey": return Color.DARK_GRAY;
            case "lightgray":
            case "lightgrey": return Color.LIGHT_GRAY;
            default: return null;
        }
    }
}