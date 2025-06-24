package com.PdfAnnotation.pdfannotation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class AnnotationRequest {
    
    @NotBlank(message = "Selected text is required")
    private String selectedText;
    
    @NotNull(message = "Page number is required")
    @Positive(message = "Page number must be positive")
    private Integer pageNumber;
    
    @NotNull(message = "X coordinate is required")
    private Double x;
    
    @NotNull(message = "Y coordinate is required")
    private Double y;
    
    @NotNull(message = "Width is required")
    private Double width;
    
    @NotNull(message = "Height is required")
    private Double height;
    
    @NotBlank(message = "Color is required")
    private String color;
    
    private String link;
    
    private String fontStyle;
    
    private Float fontSize;
    
    private Double viewportWidth;
    private Double viewportHeight;
    
    private String backgroundColor;  
    private String borderColor;      
    private Float borderWidth;       


    private Float canvasWidth;
    private Float canvasHeight;
    private Float pdfWidth;
    private Float pdfHeight;
    private Float scale;
        
    // 
    public AnnotationRequest() {}
    
    public AnnotationRequest(String selectedText, Integer pageNumber, Double x, Double y, 
                           Double width, Double height, String color) {
        this.selectedText = selectedText;
        this.pageNumber = pageNumber;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    public Float getCanvasWidth() { return canvasWidth; }
public void setCanvasWidth(Float canvasWidth) { this.canvasWidth = canvasWidth; }

public Float getCanvasHeight() { return canvasHeight; }
public void setCanvasHeight(Float canvasHeight) { this.canvasHeight = canvasHeight; }

public Float getPdfWidth() { return pdfWidth; }
public void setPdfWidth(Float pdfWidth) { this.pdfWidth = pdfWidth; }

public Float getPdfHeight() { return pdfHeight; }
public void setPdfHeight(Float pdfHeight) { this.pdfHeight = pdfHeight; }

public Float getScale() { return scale; }
public void setScale(Float scale) { this.scale = scale; }
    // Getters and Setters
    public String getSelectedText() {
        return selectedText;
    }
    
    public void setSelectedText(String selectedText) {
        this.selectedText = selectedText;
    }
    
    public Integer getPageNumber() {
        return pageNumber;
    }
    
    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }
    
    public Double getX() {
        return x;
    }
    
    public void setX(Double x) {
        this.x = x;
    }
    
    public Double getY() {
        return y;
    }
    
    public void setY(Double y) {
        this.y = y;
    }
    
    public Double getWidth() {
        return width;
    }
    
    public void setWidth(Double width) {
        this.width = width;
    }
    
    public Double getHeight() {
        return height;
    }
    
    public void setHeight(Double height) {
        this.height = height;
    }
    
    public String getColor() {
        return color;
    }
    
    public void setColor(String color) {
        this.color = color;
    }
    
    public String getLink() {
        return link;
    }
    
    public void setLink(String link) {
        this.link = link;
    }
    
    public String getFontStyle() {
        return fontStyle;
    }
    
    public void setFontStyle(String fontStyle) {
        this.fontStyle = fontStyle;
    }
    
    public Float getFontSize() {
        return fontSize;
    }
    
    public void setFontSize(Float fontSize) {
        this.fontSize = fontSize;
    }
    
    public Double getViewportWidth() {
        return viewportWidth;
    }
    
    public void setViewportWidth(Double viewportWidth) {
        this.viewportWidth = viewportWidth;
    }
    
    public Double getViewportHeight() {
        return viewportHeight;
    }
    
    public void setViewportHeight(Double viewportHeight) {
        this.viewportHeight = viewportHeight;
    }
    
    public String getBackgroundColor() {
        return backgroundColor;
    }
    
    public void setBackgroundColor(String backgroundColor) {
        this.backgroundColor = backgroundColor;
    }
    
    public String getBorderColor() {
        return borderColor;
    }
    
    public void setBorderColor(String borderColor) {
        this.borderColor = borderColor;
    }
    
    public Float getBorderWidth() {
        return borderWidth;
    }
    
    public void setBorderWidth(Float borderWidth) {
        this.borderWidth = borderWidth;
    }
    
    @Override
    public String toString() {
        return "AnnotationRequest{" +
                "selectedText='" + selectedText + '\'' +
                ", pageNumber=" + pageNumber +
                ", x=" + x +
                ", y=" + y +
                ", width=" + width +
                ", height=" + height +
                ", color='" + color + '\'' +
                ", link='" + link + '\'' +
                ", fontStyle='" + fontStyle + '\'' +
                ", fontSize=" + fontSize +
                ", viewportWidth=" + viewportWidth +
                ", viewportHeight=" + viewportHeight +
                ", backgroundColor='" + backgroundColor + '\'' +
                ", borderColor='" + borderColor + '\'' +
                ", borderWidth=" + borderWidth +
                '}';
    }
}