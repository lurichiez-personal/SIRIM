import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Gasto } from '../../types';
import { UploadIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';

interface EscanearGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: Partial<Gasto>) => void;
}

const parseNumber = (str: string): number => {
    return parseFloat(str.replace(/[^\d.]/g, '').replace(/,/g, '.'));
};

// This function parses the detailed OCR data to find relevant fields.
const parseOCRData = (lines: Tesseract.Line[]): Partial<Gasto> => {
    const extractedData: Partial<Gasto> = {};
    const KEYWORDS = {
        subtotal: ['subtotal', 'sub-total', 'base imponible', 'monto afecto'],
        itbis: ['itbis', 'itebis', 'impuesto', 'itbms'],
        total: ['total', 'tota1', 'a pagar'],
    };

    const foundValues: { [key in 'subtotal' | 'itbis' | 'total']?: number } = {};

    lines.forEach(line => {
        // Find RNC and NCF using regex on the line text
        const rncMatch = line.text.match(/(?:RNC|Rne|Ruc|Cédula)[:\s]*([\d-]+)/i);
        if (rncMatch?.[1] && !extractedData.rncProveedor) {
            extractedData.rncProveedor = rncMatch[1].replace(/-/g, '');
        }

        const ncfMatch = line.text.match(/[BE]\d{10}/);
        if (ncfMatch?.[0] && !extractedData.ncf) {
            extractedData.ncf = ncfMatch[0];
        }

        // Find numeric values based on keywords
        for (const key of Object.keys(KEYWORDS) as ('subtotal' | 'itbis' | 'total')[]) {
            if (foundValues[key]) continue;

            const keywordRegex = new RegExp(`(?:${KEYWORDS[key].join('|')})`, 'i');
            if (keywordRegex.test(line.text)) {
                // Find the most likely number on this line
                const numberRegex = /([\d,]+\.\d{2})/;
                const numberMatch = line.text.match(numberRegex);

                if (numberMatch?.[0]) {
                    const numberStr = numberMatch[0];
                    let totalConfidence = 0;
                    let wordCount = 0;

                    // Check confidence of the words that make up the number
                    line.words.forEach(word => {
                        // A simple check to see if the word is part of the number string
                        // This is a heuristic and might not be perfect, but works for most cases.
                        if (numberStr.includes(word.text.replace(/,/g, ''))) {
                            totalConfidence += word.confidence;
                            wordCount++;
                        }
                    });

                    if (wordCount > 0) {
                        const avgConfidence = totalConfidence / wordCount;
                        // User requested a 97% confidence threshold
                        if (avgConfidence >= 97) {
                            foundValues[key] = parseNumber(numberStr);
                        }
                    }
                }
            }
        }
    });
    
    if (foundValues.subtotal) extractedData.subtotal = foundValues.subtotal;
    if (foundValues.itbis) extractedData.itbis = foundValues.itbis;
    if (foundValues.total) extractedData.monto = foundValues.total;
    
    return extractedData;
}


const EscanearGastoModal: React.FC<EscanearGastoModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [statusText, setStatusText] = useState('Apunte la cámara a la factura o suba un archivo.');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const { lookupRNC } = useDGIIDataStore();

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setStatusText('Error al acceder a la cámara. Verifique los permisos.');
        }
    };
    
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const processImage = async (imageSource: Tesseract.ImageLike) => {
        setIsScanning(true);
        setStatusText('Reconociendo texto...');

        try {
            const { data } = await Tesseract.recognize(imageSource, 'spa', {
                logger: m => setStatusText(`Procesando: ${m.status} (${Math.round(m.progress * 100)}%)`)
            });
            
            setStatusText('Extrayendo datos de la factura...');
            // FIX: The `Page` object from Tesseract may not have a direct `lines` property. Instead, iterate through `paragraphs` to get all lines.
            const parsedData = parseOCRData((data.paragraphs || []).flatMap(p => p.lines));
            
            // If RNC was found, look up the provider name from the local DGII database
            if (parsedData.rncProveedor) {
                setStatusText('Verificando RNC en la base de datos local...');
                const providerInfo = await lookupRNC(parsedData.rncProveedor);
                if (providerInfo) {
                    parsedData.proveedorNombre = providerInfo.nombre;
                }
            }

            setStatusText('¡Datos extraídos! Listo para crear el gasto.');
            onScanComplete(parsedData);
            
        } catch (error) {
            console.error("OCR Error:", error);
            setStatusText('No se pudo leer la imagen. Intente de nuevo.');
        } finally {
            setIsScanning(false);
        }
    }

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const imageDataUrl = canvas.toDataURL('image/png');
        processImage(imageDataUrl);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processImage(file);
        }
        // Reset file input to allow selecting the same file again
        event.target.value = ''; 
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Gasto Automáticamente">
            <div className="p-6 text-center">
                <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <p className="mt-4 text-sm text-secondary-600 min-h-[20px]">{statusText}</p>

                <div className="mt-4">
                    <Button onClick={handleCapture} disabled={isScanning || !stream} className="w-full">
                        {isScanning ? 'Escaneando...' : 'Capturar con Cámara'}
                    </Button>
                </div>

                <div className="flex items-center my-4">
                    <hr className="flex-grow border-secondary-200" />
                    <span className="mx-2 text-xs text-secondary-500">O</span>
                    <hr className="flex-grow border-secondary-200" />
                </div>

                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/jpeg,image/png,application/pdf"
                    />
                    <Button
                        variant="secondary"
                        leftIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                        className="w-full"
                    >
                        Subir Archivo (PDF, JPG, PNG)
                    </Button>
                </div>

                <div className="mt-6">
                    <Button variant="secondary" onClick={onClose} disabled={isScanning}>Cancelar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default EscanearGastoModal;