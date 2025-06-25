'use client';

import { useEffect, useRef, useState } from 'react';

interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport }): PDFRenderTask;
  getTextContent(): Promise<TextContent>;
}

interface PDFPageViewport {
  width: number;
  height: number;
  transform: number[];
}

interface PDFRenderTask {
  promise: Promise<void>;
}

interface TextContent {
  items: TextItem[];
}

interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

interface Annotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selectedText: string;
  color: string;
  fontStyle: string;
  fontSize: number;
  link: string;
}

interface SelectionData {
  selectedText: string;
  pageNumber: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fontSize: number;
  fontStyle: string;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function PDFViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [textLayer, setTextLayer] = useState<TextItem[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1.5);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelection, setPendingSelection] = useState<SelectionData | null>(null);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [selectedLink, setSelectedLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const predefinedColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Teal', value: '#14b8a6' },
  ];

  useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  };
  document.head.appendChild(script);

  return () => {
    document.head.removeChild(script);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
  };
}, []);

  const loadPDF = async (file?: File) => {
  try {
    let pdfUrl: string;
    
    if (file) {
      pdfUrl = URL.createObjectURL(file);
      setFileUrl(pdfUrl);
    } else if (fileUrl) {
      pdfUrl = fileUrl;
    } else {
      console.error('No PDF file to load');
      return;
    }

    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    setPdfDoc(pdf);
    setTotalPages(pdf.numPages);
    renderPage(pdf, 1);
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file && file.type === 'application/pdf') {
    setUploadedFile(file);
    setAnnotations([]);
    loadPDF(file);
  } else {
    alert('Please select a valid PDF file.');
  }
};

  const renderPage = async (pdf: PDFDocumentProxy, pageNum: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      const textContent = await page.getTextContent();
      setTextLayer(textContent.items as TextItem[]);
      setCurrentPage(pageNum);

      renderAnnotations(context, pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const renderAnnotations = (context: CanvasRenderingContext2D, pageNum: number) => {
    const pageAnnotations = annotations.filter(ann => ann.pageNumber === pageNum);
    
    pageAnnotations.forEach(annotation => {
      context.fillStyle = annotation.color + '40';
      context.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      
      context.strokeStyle = annotation.color;
      context.lineWidth = 2;
      context.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) return;

    setIsSelecting(false);
    extractSelectedText();
  };

const canvasToPdfCoordinates = (
  canvasX: number, 
  canvasY: number, 
  canvasWidth: number, 
  canvasHeight: number, 
  pdfWidth: number, 
  pdfHeight: number
): { x: number; y: number; scaleX: number; scaleY: number } => {
  const scaleX = pdfWidth / (canvasWidth / scale);
  const scaleY = pdfHeight / (canvasHeight / scale);
  
  const pdfX = canvasX * scaleX / scale;
  const pdfY = canvasY * scaleY / scale;
  
  return { x: pdfX, y: pdfY, scaleX, scaleY };
};


const extractSelectedText = async (): Promise<void> => {
  if (!selectionStart || !selectionEnd || !textLayer.length || !pdfDoc) return;

  const minX = Math.min(selectionStart.x, selectionEnd.x);
  const maxX = Math.max(selectionStart.x, selectionEnd.x);
  const minY = Math.min(selectionStart.y, selectionEnd.y);
  const maxY = Math.max(selectionStart.y, selectionEnd.y);

  if (Math.abs(maxX - minX) < 10 || Math.abs(maxY - minY) < 10) {
    setSelectionStart(null);
    setSelectionEnd(null);
    return;
  }

  try {
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = canvasRef.current;
    if (!canvas) return;

    const topLeft = canvasToPdfCoordinates(minX, minY, canvas.width, canvas.height, viewport.width, viewport.height);
    const bottomRight = canvasToPdfCoordinates(maxX, maxY, canvas.width, canvas.height, viewport.width, viewport.height);

    let selectedText = '';
    let fontSize = 12;
    let fontStyle = 'normal';

    textLayer.forEach((item: TextItem) => {
      const [scaleX, , , scaleY, transX, transY] = item.transform;
      const x = transX * scale;
      const y = (canvas.height || 0) - (transY * scale);
      const width = item.width * scale;
      const height = item.height * scale;

      if (x < maxX && x + width > minX && y < maxY && y + height > minY) {
        selectedText += item.str + ' ';
        
        fontSize = Math.abs(scaleY);
        fontStyle = item.fontName || 'normal';
      }
    });

    if (selectedText.trim()) {
      const selectionData: SelectionData = {
        selectedText: selectedText.trim(),
        pageNumber: currentPage,
        coordinates: {
          x: Math.round(topLeft.x),
          y: Math.round(Math.min(topLeft.y, bottomRight.y)),
          width: Math.round(Math.abs(bottomRight.x - topLeft.x)),
          height: Math.round(Math.abs(topLeft.y - bottomRight.y)),
        },
        fontSize: Math.round(fontSize),
        fontStyle: fontStyle,
      };

      setPendingSelection(selectionData);
      setShowAnnotationDialog(true);
    }

    setSelectionStart(null);
    setSelectionEnd(null);
  } catch (error) {
    console.error('Error extracting selected text:', error);
    setSelectionStart(null);
    setSelectionEnd(null);
  }
};

  const handleAnnotationSave = () => {
    if (!pendingSelection) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      pageNumber: pendingSelection.pageNumber,
      x: pendingSelection.coordinates.x,
      y: pendingSelection.coordinates.y,
      width: pendingSelection.coordinates.width,
      height: pendingSelection.coordinates.height,
      selectedText: pendingSelection.selectedText,
      color: selectedColor,
      fontStyle: pendingSelection.fontStyle,
      fontSize: pendingSelection.fontSize,
      link: selectedLink,
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }

    setShowAnnotationDialog(false);
    setPendingSelection(null);
    setSelectedLink('');
  };

  const handleAnnotationCancel = () => {
    setShowAnnotationDialog(false);
    setPendingSelection(null);
    setSelectedLink('');
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  };

  const sendAnnotationsToAPI = async () => {
  if (annotations.length === 0) {
    alert('No annotations to save. Please select some text first.');
    return;
  }

  if (!uploadedFile) {
    alert('No PDF file uploaded. Please upload a PDF first.');
    return;
  }

  setIsProcessing(true);
  
  try {
    const formData = new FormData();
    formData.append('file', uploadedFile, uploadedFile.name);
    
    const apiAnnotations = annotations.map(ann => ({
      pageNumber: ann.pageNumber,
      x: Math.round(ann.x),
      y: Math.round(ann.y),
      width: Math.round(ann.width),
      height: Math.round(ann.height),
      selectedText: ann.selectedText,
      color: ann.color,
      fontStyle: ann.fontStyle,
      fontSize: ann.fontSize,
      link: ann.link || ''
    }));
    
    formData.append('annotations', JSON.stringify(apiAnnotations));

    console.log('Sending annotations:', apiAnnotations);

    const response = await fetch('http://localhost:8080/api/pdf/annotate', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotated_${uploadedFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`Successfully processed ${annotations.length} annotations and downloaded the file!`);
    } else {
      console.error('API Error:', response.statusText);
      alert('Error processing annotations: ' + response.statusText);
    }
  } catch (error) {
    console.error('Network Error:', error);
    alert('Network error occurred: ' + error);
  } finally {
    setIsProcessing(false);
  }
};

  const goToPage = (pageNum: number) => {
    if (pdfDoc && pageNum >= 1 && pageNum <= totalPages) {
      renderPage(pdfDoc, pageNum);
    }
  };

  const handleZoom = (newScale: number) => {
    setScale(newScale);
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-25 to-lavender-50 relative">
      <div className="absolute top-12 left-8 w-72 h-64 bg-purple-100 rounded-full mix-blend-multiply filter blur-2xl opacity-40 transform rotate-12"></div>
      <div className="absolute top-32 right-16 w-56 h-48 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 transform -rotate-45"></div>
      <div className="absolute bottom-24 left-1/4 w-48 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-25 transform rotate-6"></div>
      <div className="absolute bottom-48 right-1/3 w-32 h-56 bg-lavender-100 rounded-full mix-blend-multiply filter blur-lg opacity-35 transform -rotate-12"></div>

      <div className="bg-white/60 backdrop-blur-sm border-b border-purple-200/50 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-800">PDF Annotator</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!pdfDoc && (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-purple-100 p-8 text-center">
    <div className="max-w-md mx-auto">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">upload your pdf</h3>
      <p className="text-purple-600 mb-6">drag & drop or click to select a pdf file to annotate</p>
      
      <div className="relative">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-4 rounded-xl font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all cursor-pointer">
          choose pdf file
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-3">supports pdf files up to 50mb</p>
    </div>
  </div>
)}
      <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center bg-purple-50 rounded-xl p-2 space-x-2 border border-purple-200">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-purple-700"
              >
                ← prev
              </button>
              
              <div className="px-4 py-2 bg-gradient-to-r from-purple-400 to-indigo-400 text-white rounded-lg text-sm font-medium">
                {currentPage}/{totalPages}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-purple-700"
              >
                next →
              </button>
            </div>

            <div className="flex items-center bg-purple-50 rounded-xl p-2 space-x-2 border border-purple-200">
              <button
                onClick={() => handleZoom(scale - 0.2)}
                disabled={scale <= 0.5}
                className="w-8 h-8 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50 text-purple-600 flex items-center justify-center"
              >
                -
              </button>
              
              <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm font-medium text-purple-700 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              
              <button
                onClick={() => handleZoom(scale + 0.2)}
                disabled={scale >= 3}
                className="w-8 h-8 bg-white rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50 text-purple-600 flex items-center justify-center"
              >
                +
              </button>
            </div>

            <button
              onClick={sendAnnotationsToAPI}
              disabled={isProcessing || annotations.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>working on it...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>download pdf</span>
                  {annotations.length > 0 && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                      {annotations.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
              i
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-1">how to use this thing</h3>
              <p className="text-purple-700 text-sm leading-relaxed">
                click and drag exactly over text to highlight it. pick a color, maybe add a link, then download your pdf. 
                that's literally it.
              </p>
            </div>
          </div>
        </div>

        {annotations.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-purple-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
                <h3 className="font-medium text-gray-800">
                  your highlights ({annotations.length})
                </h3>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="bg-purple-25 hover:bg-purple-50 rounded-lg p-3 transition-colors border border-purple-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded border-2 border-white shadow-sm" 
                          style={{ backgroundColor: annotation.color }}
                        ></div>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          p.{annotation.pageNumber}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 text-sm line-clamp-2">
                          {annotation.selectedText.length > 60 ? 
                            `"${annotation.selectedText.substring(0, 60)}..."` : 
                            `"${annotation.selectedText}"`
                          }
                        </p>
                        {annotation.link && (
                          <p className="text-xs text-blue-600 mt-1">🔗 has link</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAnnotation(annotation.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          ref={containerRef}
          className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden"
        >
          <div className="p-6 bg-gradient-to-b from-purple-25 to-white">
            <div className="relative inline-block mx-auto">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="border border-purple-200 cursor-crosshair rounded-lg shadow-md"
                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              />
              
              {isSelecting && selectionStart && selectionEnd && (
                <div
                  className="absolute border-2 border-purple-400 bg-purple-200 bg-opacity-20 pointer-events-none rounded"
                  style={{
                    left: Math.min(selectionStart.x, selectionEnd.x),
                    top: Math.min(selectionStart.y, selectionEnd.y),
                    width: Math.abs(selectionEnd.x - selectionStart.x),
                    height: Math.abs(selectionEnd.y - selectionStart.y),
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
  {!pdfDoc && uploadedFile && (
    <div className="text-purple-600 bg-purple-50 px-4 py-2 rounded-full inline-flex items-center space-x-2 border border-purple-200">
      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">loading {uploadedFile.name}...</span>
    </div>
  )}
  {pdfDoc && (
    <div className="text-green-600 bg-green-50 px-4 py-2 rounded-full inline-flex items-center space-x-2 border border-green-200">
      <span className="text-sm">ready to highlight • {uploadedFile?.name}</span>
    </div>
  )}
        </div>
      </div>

      {showAnnotationDialog && pendingSelection && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-purple-100">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🎨</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">customize highlight</h3>
                  <p className="text-purple-600 text-sm">make it look how you want</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">selected text</label>
                  <div className="bg-purple-25 rounded-lg p-3 border border-purple-100">
                    <p className="text-gray-800 text-sm max-h-24 overflow-y-auto">
                      "{pendingSelection.selectedText}"
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={`w-full h-10 rounded-lg border-2 transition-all ${
                          selectedColor === color.value 
                            ? 'border-gray-800 scale-105' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {selectedColor === color.value && (
                          <span className="text-white text-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">link (optional)</label>
                  <input
                    type="url"
                    value={selectedLink}
                    onChange={(e) => setSelectedLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleAnnotationSave}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-md transition-all text-sm"
                >
                  save highlight
                </button>
                <button
                  onClick={handleAnnotationCancel}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}