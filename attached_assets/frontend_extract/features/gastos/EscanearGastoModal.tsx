import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Gasto } from '../../types';
import { UploadIcon, CameraIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

interface EscanearGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: Partial<Gasto>) => void;
}

const EscanearGastoModal: React.FC<EscanearGastoModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [statusText, setStatusText] = useState('Encienda la cámara o suba un archivo.');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const { lookupRNC } = useDGIIDataStore();

    const processImageWithGemini = async (imageSource: string | File) => {
        setIsScanning(true);
        setStatusText('Iniciando análisis con IA...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let imagePart;
            if (typeof imageSource === 'string') { // Base64 data URL
                const base64Data = imageSource.split(',')[1];
                const mimeType = imageSource.match(/data:(.*);base64,/)?.[1] || 'image/png';
                 imagePart = {
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                };
            } else { // File object
                 const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(imageSource);
                });
                imagePart = {
                     inlineData: {
                        mimeType: imageSource.type,
                        data: base64Data,
                    },
                }
            }
            
            setStatusText('Analizando imagen de factura...');
            
            const textPart = {
                text: `Analiza esta imagen de una factura de República Dominicana. Extrae la siguiente información en formato JSON. No inventes valores. Si no encuentras un valor, déjalo como null.
                - rncProveedor: El RNC del proveedor (un número de 9 u 11 dígitos).
                - ncf: El Número de Comprobante Fiscal (un string que empieza con B o E y tiene 11 caracteres en total, como B0100000123).
                - subtotal: El monto antes de impuestos. A menudo etiquetado como "Sub-Total" o "Monto Facturado".
                - itbis: El monto del ITBIS o impuesto. A menudo etiquetado como "ITBIS", "ITEBIS" o "18%".
                - isc: El monto del Impuesto Selectivo al Consumo. A menudo etiquetado como "ISC".
                - propinaLegal: El monto de la propina de ley. A menudo etiquetado como "% Ley", "Propina" o "Servicio".
                - monto: El monto total a pagar. A menudo etiquetado como "Total a Pagar" o "TOTAL".
                - descripcion: Una descripción general o concepto de la compra. Busca un texto descriptivo, no los items individuales.
                - metodoPago: El método de pago. Busca palabras como "Efectivo", "Tarjeta", "Transferencia", "Crédito".
                
                Prioriza encontrar el RNC y el NCF primero en cualquier parte del documento. Para los montos numéricos (subtotal, itbis, isc, propinaLegal, monto), búscalos en la parte final del documento, que es donde suelen estar los totales. Devuelve solo el objeto JSON sin formato adicional.
                Ejemplo de respuesta:
                {
                  "rncProveedor": "130999888",
                  "ncf": "B0100003456",
                  "subtotal": 15000.00,
                  "itbis": 2700.00,
                  "isc": 500.00,
                  "propinaLegal": 1500.00,
                  "monto": 19700.00,
                  "descripcion": "Compra de papelería",
                  "metodoPago": "Efectivo"
                }`
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });

            setStatusText('Extrayendo datos...');
            const jsonString = response.text.trim().replace(/```json|```/g, '').trim();
            const parsedJson = JSON.parse(jsonString);

            const parsedData: Partial<Gasto> = {};

            if (parsedJson.rncProveedor) parsedData.rncProveedor = String(parsedJson.rncProveedor).replace(/\D/g, '');
            if (parsedJson.ncf) parsedData.ncf = parsedJson.ncf;
            if (typeof parsedJson.subtotal === 'number') parsedData.subtotal = parsedJson.subtotal;
            if (typeof parsedJson.itbis === 'number') parsedData.itbis = parsedJson.itbis;
            if (typeof parsedJson.isc === 'number') parsedData.isc = parsedJson.isc;
            if (typeof parsedJson.propinaLegal === 'number') parsedData.propinaLegal = parsedJson.propinaLegal;
            if (typeof parsedJson.monto === 'number') parsedData.monto = parsedJson.monto;
            if (parsedJson.descripcion) parsedData.descripcion = parsedJson.descripcion;
            if (parsedJson.metodoPago) parsedData.metodoPago = parsedJson.metodoPago;

            if (parsedData.rncProveedor) {
                setStatusText('Verificando RNC en base de datos...');
                const providerInfo = await lookupRNC(parsedData.rncProveedor);
                if (providerInfo) {
                    parsedData.proveedorNombre = providerInfo.nombre;
                }
            }

            setStatusText('¡Datos extraídos! Listo para crear el gasto.');
            onScanComplete(parsedData);

        } catch (error) {
            console.error("Gemini API Error:", error);
            setStatusText('No se pudo leer la imagen con la IA. Verifique la imagen e intente de nuevo.');
        } finally {
            setIsScanning(false);
        }
    };

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
        if(videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        return () => {
            stopCamera();
            setIsCameraOn(false);
        };
    }, [isOpen]);

    const handleToggleCamera = (checked: boolean) => {
        setIsCameraOn(checked);
        if (checked) {
            startCamera();
        } else {
            stopCamera();
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || !isCameraOn) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const imageDataUrl = canvas.toDataURL('image/png');
        processImageWithGemini(imageDataUrl);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if(isCameraOn) handleToggleCamera(false);
            processImageWithGemini(file);
        }
        event.target.value = ''; 
    };
    
    const handleCloseModal = () => {
        stopCamera();
        setIsCameraOn(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCloseModal} title="Registrar Gasto Automáticamente">
            <div className="p-6 text-center">
                 <div className="flex justify-center mb-4">
                    <ToggleSwitch id="camera-toggle" checked={isCameraOn} onChange={handleToggleCamera} label="Encender Cámara" />
                </div>

                <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                    {isCameraOn ? (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-secondary-400">
                            <CameraIcon className="h-16 w-16 mx-auto" />
                            <p className="mt-2 text-sm">La cámara está apagada</p>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <p className="mt-4 text-sm text-secondary-600 min-h-[20px]">{statusText}</p>

                <div className="mt-4">
                    <Button onClick={handleCapture} disabled={isScanning || !isCameraOn} className="w-full">
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
                        accept="image/jpeg,image/png"
                    />
                    <Button
                        variant="secondary"
                        leftIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                        className="w-full"
                    >
                        Subir Archivo (JPG, PNG)
                    </Button>
                </div>

                <div className="mt-6">
                    <Button variant="secondary" onClick={handleCloseModal} disabled={isScanning}>Cancelar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default EscanearGastoModal;