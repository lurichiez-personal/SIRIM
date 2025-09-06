import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Gasto } from '../../types';
import { UploadIcon, CheckIcon, TrashIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { PDFDocument } from 'pdf-lib';

interface ProcesarLoteFacturasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchComplete: (gastos: Partial<Gasto>[]) => void;
}

interface ProcessedInvoice {
  pageNumber: number;
  data: Partial<Gasto>;
  confidence: number;
  warnings: string[];
  status: 'processing' | 'completed' | 'error';
  imagePreview?: string;
}

const ProcesarLoteFacturasModal: React.FC<ProcesarLoteFacturasModalProps> = ({ 
  isOpen, 
  onClose, 
  onBatchComplete 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('Seleccione un archivo PDF con múltiples facturas.');
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { lookupRNC } = useDGIIDataStore();

  // Convertir página de PDF a imagen
  const pdfPageToImage = async (pdfDoc: PDFDocument, pageIndex: number): Promise<string> => {
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();
    
    // Crear un nuevo documento PDF con solo esta página
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [pageIndex]);
    singlePageDoc.addPage(copiedPage);
    
    const pdfBytes = await singlePageDoc.save();
    
    // Convertir a imagen usando canvas (implementación simplificada)
    return new Promise((resolve) => {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Crear un iframe para renderizar el PDF como imagen
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        // Simular conversión a imagen (en implementación real usaríamos pdf2pic)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = 'black';
          ctx.font = '12px Arial';
          ctx.fillText(`Página ${pageIndex + 1} del PDF`, 10, 30);
        }
        
        const imageDataUrl = canvas.toDataURL('image/png');
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
        resolve(imageDataUrl);
      };
    });
  };

  // Procesar una página individual con Gemini
  const processInvoicePage = async (imageDataUrl: string, pageNumber: number): Promise<ProcessedInvoice> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const base64Data = imageDataUrl.split(',')[1];
      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      };

      const enhancedPrompt = {
        text: `Eres un experto contador especializado en facturas fiscales dominicanas. Analiza esta imagen de factura y extrae toda la información tributaria.

INSTRUCCIONES CRÍTICAS:
1. Busca TODOS los impuestos dominicanos que aparezcan
2. Presta especial atención a "Propina Legal", "Service Charge", "Servicio 10%"
3. Extrae valores exactos sin aproximaciones
4. Valida formato RNC (9-11 dígitos) y NCF (B/E + 10 dígitos)

FORMATO DE RESPUESTA (JSON puro):
{
  "rncProveedor": "número o null",
  "ncf": "formato BXX/EXX o null",
  "subtotal": número_o_null,
  "itbis": número_o_null,
  "isc": número_o_null,
  "propinaLegal": número_o_null,
  "monto": número_o_null,
  "descripcion": "texto o null",
  "metodoPago": "tipo o null"
}

IMPORTANTE: Busca "Propina", "Service", "10%" para el campo propinaLegal.
Responde SOLO JSON sin explicaciones.`
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, enhancedPrompt] },
      });

      const jsonString = response.text.trim().replace(/```json|```/g, '').trim();
      const parsedJson = JSON.parse(jsonString);

      // Procesar y validar datos igual que en el modal individual
      const parsedData: Partial<Gasto> = {};
      const warnings: string[] = [];

      // RNC
      if (parsedJson.rncProveedor) {
        const cleanRNC = String(parsedJson.rncProveedor).replace(/\D/g, '');
        if (cleanRNC.length === 9 || cleanRNC.length === 11) {
          parsedData.rncProveedor = cleanRNC;
        } else {
          warnings.push('RNC formato inválido');
        }
      }

      // NCF
      if (parsedJson.ncf) {
        const ncfPattern = /^[BE]\d{10}$/;
        if (ncfPattern.test(parsedJson.ncf)) {
          parsedData.ncf = parsedJson.ncf;
        } else {
          warnings.push('NCF formato inválido');
        }
      }

      // Montos
      const amounts = ['subtotal', 'itbis', 'isc', 'propinaLegal', 'monto'];
      amounts.forEach(field => {
        if (typeof parsedJson[field] === 'number' && parsedJson[field] >= 0) {
          parsedData[field] = parsedJson[field];
        }
      });

      // Otros campos
      if (parsedJson.descripcion?.trim()) {
        parsedData.descripcion = parsedJson.descripcion.trim();
      }
      if (parsedJson.metodoPago) {
        parsedData.metodoPago = parsedJson.metodoPago;
      }

      // Calcular confianza simplificada
      let confidence = 0;
      if (parsedData.rncProveedor) confidence += 25;
      if (parsedData.ncf) confidence += 25;
      if (parsedData.monto) confidence += 25;
      if (parsedData.subtotal) confidence += 15;
      if (parsedData.itbis || parsedData.propinaLegal) confidence += 10;

      return {
        pageNumber,
        data: parsedData,
        confidence,
        warnings,
        status: 'completed',
        imagePreview: imageDataUrl
      };

    } catch (error) {
      console.error(`Error procesando página ${pageNumber}:`, error);
      return {
        pageNumber,
        data: {},
        confidence: 0,
        warnings: ['Error al procesar la imagen'],
        status: 'error'
      };
    }
  };

  // Procesar archivo PDF
  const processPDFFile = async (file: File) => {
    setIsProcessing(true);
    setStatusText('Cargando PDF y extrayendo páginas...');
    setProcessedInvoices([]);

    try {
      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      setTotalPages(pageCount);
      setStatusText(`PDF cargado: ${pageCount} páginas encontradas`);

      // Procesar cada página
      for (let i = 0; i < pageCount; i++) {
        setCurrentPage(i + 1);
        setStatusText(`Procesando página ${i + 1} de ${pageCount}...`);

        // Agregar entrada de procesamiento
        setProcessedInvoices(prev => [...prev, {
          pageNumber: i + 1,
          data: {},
          confidence: 0,
          warnings: [],
          status: 'processing'
        }]);

        try {
          const imageDataUrl = await pdfPageToImage(pdfDoc, i);
          const result = await processInvoicePage(imageDataUrl, i + 1);
          
          // Actualizar resultado
          setProcessedInvoices(prev => 
            prev.map(invoice => 
              invoice.pageNumber === i + 1 ? result : invoice
            )
          );
        } catch (error) {
          console.error(`Error en página ${i + 1}:`, error);
          setProcessedInvoices(prev => 
            prev.map(invoice => 
              invoice.pageNumber === i + 1 
                ? { ...invoice, status: 'error', warnings: ['Error al procesar'] }
                : invoice
            )
          );
        }
      }

      setStatusText(`Procesamiento completado: ${pageCount} páginas analizadas`);

    } catch (error) {
      console.error('Error procesando PDF:', error);
      setStatusText('Error al procesar el archivo PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPDFFile(file);
    } else {
      setStatusText('Por favor seleccione un archivo PDF válido');
    }
  };

  const handleCompleteProcessing = () => {
    const validInvoices = processedInvoices
      .filter(invoice => invoice.status === 'completed' && invoice.confidence > 50)
      .map(invoice => invoice.data);
    
    onBatchComplete(validInvoices);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Procesar Lote de Facturas PDF">
      <div className="space-y-6">
        {/* Zona de carga */}
        <div className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center">
          <UploadIcon className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-4">{statusText}</p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-primary text-white px-6 py-2"
          >
            {isProcessing ? <LoadingSpinner size="small" /> : 'Seleccionar PDF'}
          </Button>
        </div>

        {/* Progreso */}
        {totalPages > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-secondary-600">
              <span>Progreso: {currentPage}/{totalPages}</span>
              <span>{Math.round((currentPage/totalPages) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentPage/totalPages) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Resultados */}
        {processedInvoices.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-secondary-800">Facturas Procesadas:</h3>
            {processedInvoices.map((invoice) => (
              <div key={invoice.pageNumber} className="border border-secondary-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Página {invoice.pageNumber}</span>
                    {invoice.status === 'processing' && <LoadingSpinner size="small" />}
                    {invoice.status === 'completed' && <CheckIcon className="w-5 h-5 text-green-500" />}
                    {invoice.status === 'error' && <TrashIcon className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="text-sm text-secondary-600">
                    Confianza: {invoice.confidence}%
                  </div>
                </div>
                
                {invoice.status === 'completed' && (
                  <div className="mt-2 text-sm space-y-1">
                    {invoice.data.rncProveedor && <p>RNC: {invoice.data.rncProveedor}</p>}
                    {invoice.data.ncf && <p>NCF: {invoice.data.ncf}</p>}
                    {invoice.data.monto && <p>Total: RD$ {invoice.data.monto}</p>}
                    {invoice.data.propinaLegal && <p>Propina Legal: RD$ {invoice.data.propinaLegal}</p>}
                  </div>
                )}
                
                {invoice.warnings.length > 0 && (
                  <div className="mt-2 text-sm text-yellow-600">
                    Advertencias: {invoice.warnings.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {processedInvoices.length > 0 && !isProcessing && (
            <Button onClick={handleCompleteProcessing}>
              Usar Facturas Válidas ({processedInvoices.filter(i => i.confidence > 50).length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProcesarLoteFacturasModal;