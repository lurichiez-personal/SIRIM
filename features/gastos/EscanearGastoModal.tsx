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

interface ScanResult {
  data: Partial<Gasto>;
  confidence: number;
  warnings: string[];
}

interface ConfidenceScore {
  field: string;
  score: number;
  required: boolean;
}

const EscanearGastoModal: React.FC<EscanearGastoModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [statusText, setStatusText] = useState('Encienda la cámara o suba un archivo.');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const { lookupRNC } = useDGIIDataStore();

    // Calcular nivel de confianza basado en datos extraídos
    const calculateConfidence = (data: Partial<Gasto>, originalResponse: any): ConfidenceScore[] => {
        const scores: ConfidenceScore[] = [];
        
        // RNC - Campo crítico
        const rncScore = data.rncProveedor && data.rncProveedor.length >= 9 ? 95 : 
                        originalResponse.rncProveedor ? 60 : 0;
        scores.push({ field: 'RNC', score: rncScore, required: true });
        
        // NCF - Campo crítico 
        const ncfPattern = /^[BE]\d{10}$/;
        const ncfScore = data.ncf && ncfPattern.test(data.ncf) ? 95 : 
                        originalResponse.ncf ? 50 : 0;
        scores.push({ field: 'NCF', score: ncfScore, required: true });
        
        // Monto total - Campo crítico
        const montoScore = typeof data.monto === 'number' && data.monto > 0 ? 90 : 
                          originalResponse.monto !== null ? 40 : 0;
        scores.push({ field: 'Monto Total', score: montoScore, required: true });
        
        // Subtotal - Importante pero no crítico
        const subtotalScore = typeof data.subtotal === 'number' && data.subtotal > 0 ? 85 : 
                             originalResponse.subtotal !== null ? 30 : 0;
        scores.push({ field: 'Subtotal', score: subtotalScore, required: false });
        
        // ITBIS - Importante
        const itbisScore = typeof data.itbis === 'number' ? 80 : 
                          originalResponse.itbis !== null ? 25 : 0;
        scores.push({ field: 'ITBIS', score: itbisScore, required: false });
        
        // Descripción - Importante
        const descripScore = data.descripcion && data.descripcion.trim().length > 5 ? 75 : 
                           originalResponse.descripcion ? 40 : 0;
        scores.push({ field: 'Descripción', score: descripScore, required: false });
        
        return scores;
    };

    const processImageWithGemini = async (imageSource: string | File) => {
        setIsScanning(true);
        setStatusText('Iniciando análisis avanzado con IA...');
        setScanResult(null);
        setShowValidation(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            let imagePart;
            if (typeof imageSource === 'string') {
                const base64Data = imageSource.split(',')[1];
                const mimeType = imageSource.match(/data:(.*);base64,/)?.[1] || 'image/png';
                imagePart = {
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                };
            } else {
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
                };
            }
            
            setStatusText('Análisis profundo de factura dominicana...');
            
            const enhancedPrompt = {
                text: `Eres un experto en facturas fiscales dominicanas. Analiza esta imagen con máxima precisión y extrae EXACTAMENTE la información solicitada. 

INSTRUCCIONES CRÍTICAS:
1. Solo extrae datos que REALMENTE veas en la imagen
2. Para números, busca los valores exactos sin aproximaciones
3. Valida que el RNC tenga 9 u 11 dígitos
4. Valida que el NCF siga el formato correcto (B/E + 10 dígitos)
5. Si no estás 100% seguro de un valor, márcalo como null

FORMATO DE RESPUESTA (JSON puro):
{
  "rncProveedor": "número de 9-11 dígitos o null",
  "ncf": "formato BXX...XX o EXX...XX o null", 
  "subtotal": número_decimal_o_null,
  "itbis": número_decimal_o_null,
  "isc": número_decimal_o_null,
  "propinaLegal": número_decimal_o_null,
  "monto": número_decimal_o_null,
  "descripcion": "texto_descriptivo o null",
  "metodoPago": "Efectivo/Tarjeta/Transferencia/Crédito o null",
  "confidence_notes": "observaciones sobre la calidad de los datos extraídos"
}

CAMPOS A BUSCAR:
- RNC: Registro Nacional del Contribuyente (9 u 11 dígitos)
- NCF: Número de Comprobante Fiscal (B0100001234 o E310001234)
- Subtotal: Monto antes de impuestos
- ITBIS: Impuesto sobre Transferencia de Bienes (usualmente 18%)
- ISC: Impuesto Selectivo al Consumo
- Propina Legal: Propina obligatoria (usualmente 10%)
- Monto/Total: Valor total a pagar
- Descripción: Concepto principal de la compra
- Método de Pago: Como se pagó

Responde SOLO con el JSON, sin explicaciones adicionales.`
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, enhancedPrompt] },
            });

            setStatusText('Validando datos extraídos...');
            const jsonString = response.text.trim().replace(/```json|```/g, '').trim();
            const parsedJson = JSON.parse(jsonString);

            // Procesamiento y validación mejorada
            const parsedData: Partial<Gasto> = {};
            const warnings: string[] = [];

            // RNC con validación estricta
            if (parsedJson.rncProveedor) {
                const cleanRNC = String(parsedJson.rncProveedor).replace(/\D/g, '');
                if (cleanRNC.length === 9 || cleanRNC.length === 11) {
                    parsedData.rncProveedor = cleanRNC;
                } else {
                    warnings.push('RNC no tiene formato válido (9 u 11 dígitos)');
                }
            } else {
                warnings.push('RNC no detectado en la imagen');
            }

            // NCF con validación de formato
            if (parsedJson.ncf) {
                const ncfPattern = /^[BE]\d{10}$/;
                if (ncfPattern.test(parsedJson.ncf)) {
                    parsedData.ncf = parsedJson.ncf;
                } else {
                    warnings.push('NCF no tiene formato válido (B/E + 10 dígitos)');
                }
            } else {
                warnings.push('NCF no detectado en la imagen');
            }

            // Validación de montos con coherencia matemática
            const amounts = ['subtotal', 'itbis', 'isc', 'propinaLegal', 'monto'];
            amounts.forEach(field => {
                if (typeof parsedJson[field] === 'number' && parsedJson[field] >= 0) {
                    parsedData[field] = parsedJson[field];
                }
            });

            // Verificación de coherencia matemática
            if (parsedData.subtotal && parsedData.monto) {
                const calculatedTotal = (parsedData.subtotal || 0) + 
                                      (parsedData.itbis || 0) + 
                                      (parsedData.isc || 0) + 
                                      (parsedData.propinaLegal || 0);
                const difference = Math.abs(calculatedTotal - parsedData.monto);
                const tolerance = parsedData.monto * 0.05; // 5% tolerancia
                
                if (difference > tolerance) {
                    warnings.push('Los montos no suman correctamente - verificar manualmente');
                }
            }

            // Otros campos
            if (parsedJson.descripcion && parsedJson.descripcion.trim().length > 2) {
                parsedData.descripcion = parsedJson.descripcion.trim();
            } else {
                warnings.push('Descripción no detectada o muy corta');
            }

            if (parsedJson.metodoPago) {
                parsedData.metodoPago = parsedJson.metodoPago;
            }

            // Búsqueda de proveedor por RNC
            if (parsedData.rncProveedor) {
                setStatusText('Verificando RNC en base de datos DGII...');
                try {
                    const providerInfo = await lookupRNC(parsedData.rncProveedor);
                    if (providerInfo) {
                        parsedData.proveedorNombre = providerInfo.nombre;
                    } else {
                        warnings.push('RNC no encontrado en base de datos DGII');
                    }
                } catch (error) {
                    warnings.push('Error al verificar RNC en base de datos');
                }
            }

            // Calcular confianza general
            const confidenceScores = calculateConfidence(parsedData, parsedJson);
            const requiredFields = confidenceScores.filter(s => s.required);
            const avgRequiredScore = requiredFields.reduce((sum, s) => sum + s.score, 0) / requiredFields.length;
            const allFieldsScore = confidenceScores.reduce((sum, s) => sum + s.score, 0) / confidenceScores.length;
            const overallConfidence = (avgRequiredScore * 0.7) + (allFieldsScore * 0.3);

            const result: ScanResult = {
                data: parsedData,
                confidence: Math.round(overallConfidence),
                warnings
            };

            setScanResult(result);
            setStatusText(`Análisis completado - Confianza: ${result.confidence}%`);

            // Si la confianza es >= 97%, procesar automáticamente
            if (result.confidence >= 97) {
                setStatusText('¡Excelente! Datos extraídos con alta confianza.');
                setTimeout(() => {
                    onScanComplete(result.data);
                }, 1500);
            } else {
                // Mostrar validación manual si confianza < 97%
                setShowValidation(true);
                setStatusText(`Confianza ${result.confidence}% - Se requiere validación manual`);
            }

        } catch (error) {
            console.error("Error en análisis AI:", error);
            setStatusText('Error al procesar la imagen. Intente con una imagen más clara.');
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
    
    const handleValidateAndProceed = () => {
        if (scanResult) {
            onScanComplete(scanResult.data);
        }
    };

    const handleRetryScanning = () => {
        setScanResult(null);
        setShowValidation(false);
        setStatusText('Intente con una imagen más clara o mejor iluminada.');
    };

    const handleCloseModal = () => {
        stopCamera();
        setIsCameraOn(false);
        setScanResult(null);
        setShowValidation(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCloseModal} title="Registrar Gasto Automáticamente">
            <div className="p-6 text-center">
                {!showValidation ? (
                    // Vista de escaneo normal
                    <>
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
                                {isScanning ? 'Analizando...' : 'Capturar con Cámara'}
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
                    </>
                ) : (
                    // Vista de validación manual
                    <>
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">⚠️</div>
                            <h3 className="text-lg font-semibold text-secondary-800">Validación Manual Requerida</h3>
                            <p className="text-sm text-secondary-600 mt-2">
                                Confianza: {scanResult?.confidence}% (Se requiere 97% para procesamiento automático)
                            </p>
                        </div>

                        {scanResult && (
                            <div className="bg-secondary-50 rounded-lg p-4 mb-6 text-left">
                                <h4 className="font-semibold mb-3 text-secondary-800">Datos Extraídos:</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-medium">RNC:</span>
                                        <span className={scanResult.data.rncProveedor ? 'text-green-600' : 'text-red-500'}>
                                            {scanResult.data.rncProveedor || 'No detectado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">NCF:</span>
                                        <span className={scanResult.data.ncf ? 'text-green-600' : 'text-red-500'}>
                                            {scanResult.data.ncf || 'No detectado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Monto Total:</span>
                                        <span className={scanResult.data.monto ? 'text-green-600' : 'text-red-500'}>
                                            {scanResult.data.monto ? `RD$ ${scanResult.data.monto.toLocaleString()}` : 'No detectado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Subtotal:</span>
                                        <span className={scanResult.data.subtotal ? 'text-green-600' : 'text-secondary-500'}>
                                            {scanResult.data.subtotal ? `RD$ ${scanResult.data.subtotal.toLocaleString()}` : 'No detectado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">ITBIS:</span>
                                        <span className={scanResult.data.itbis ? 'text-green-600' : 'text-secondary-500'}>
                                            {scanResult.data.itbis ? `RD$ ${scanResult.data.itbis.toLocaleString()}` : 'No detectado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Proveedor:</span>
                                        <span className={scanResult.data.proveedorNombre ? 'text-green-600' : 'text-secondary-500'}>
                                            {scanResult.data.proveedorNombre || 'No identificado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-medium">Descripción:</span>
                                        <span className={scanResult.data.descripcion ? 'text-green-600' : 'text-secondary-500'}>
                                            {scanResult.data.descripcion || 'No detectada'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {scanResult && scanResult.warnings.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
                                <h5 className="font-semibold text-yellow-800 mb-2 flex items-center">
                                    ⚠️ Advertencias:
                                </h5>
                                <ul className="text-sm text-yellow-700 space-y-1">
                                    {scanResult.warnings.map((warning, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="mr-2">•</span>
                                            <span>{warning}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-blue-800">
                                <strong>Instrucción:</strong> Por favor revise los datos extraídos y corríjalos manualmente al crear el gasto si es necesario. Los campos críticos son RNC, NCF y Monto Total.
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <Button 
                                onClick={handleValidateAndProceed}
                                className="flex-1"
                                variant="primary"
                            >
                                Usar Datos Extraídos
                            </Button>
                            <Button 
                                onClick={handleRetryScanning}
                                variant="secondary"
                                className="flex-1"
                            >
                                Intentar de Nuevo
                            </Button>
                        </div>

                        <div className="mt-4">
                            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default EscanearGastoModal;