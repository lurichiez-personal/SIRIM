import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Gasto } from '../../types';
import { UploadIcon } from '../../components/icons/Icons';
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
    const [statusText, setStatusText] = useState('Apunte la cámara a la factura o suba un archivo.');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStage, setOcrStage] = useState('');

    const startCamera = async () => {
        if (!cameraEnabled) return;
        
        try {
            // Configuración responsive de cámara
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: "environment", // Cámara trasera por defecto
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    aspectRatio: { ideal: 16/9 }
                }
            };

            // Detectar dispositivo móvil/tablet para ajustar configuración
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(navigator.userAgent) || (window.innerWidth >= 768 && window.innerWidth <= 1024);
            
            if (isMobile) {
                // Configuración optimizada para móviles
                constraints.video = {
                    facingMode: "environment",
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    aspectRatio: { ideal: 16/9 }
                };
            } else if (isTablet) {
                // Configuración optimizada para tablets
                constraints.video = {
                    facingMode: "environment",
                    width: { ideal: 1600, max: 1920 },
                    height: { ideal: 900, max: 1080 },
                    aspectRatio: { ideal: 16/9 }
                };
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStatusText('📱 Cámara activada. Apunte a la factura y capture.');
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setStatusText('❌ Error al acceder a la cámara. Verifique los permisos o use "Subir Archivo".');
        }
    };
    
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatusText('Cámara desactivada. Puede subir un archivo o reactivar la cámara.');
    };

    useEffect(() => {
        if (isOpen && cameraEnabled) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, cameraEnabled]);

    const processImage = async (imageSource: Tesseract.ImageLike) => {
        setIsScanning(true);
        setStatusText('🔍 Procesando imagen con OCR avanzado específico para facturas dominicanas...');

        try {
            // Configuración OCR optimizada para facturas dominicanas
            const { data: { text } } = await Tesseract.recognize(imageSource, 'spa', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setStatusText(`📖 Reconociendo texto... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            console.log("📄 OCR Text completo para análisis:");
            console.log("=".repeat(50));
            console.log(text);
            console.log("=".repeat(50));
            
            setStatusText('🧮 Extrayendo datos específicos de factura dominicana...');
            
            // Expresiones regulares mejoradas para extraer todos los campos
            const rncRegex = /(?:RNC|Rne|Ruc|Cédula)[:\s]*([\d-]+)/i;
            const ncfRegex = /[BE]\d{10}/;
            
            // Patrones MEJORADOS para nombre del emisor/proveedor - más flexibles
            const nombreEmisorPatterns = [
                /(?:Razón\s*Social|Nombre|Empresa|Emisor)[:\s]*([A-Za-z0-9\s,\.&\-\(\)]{5,}?)(?:\n|RNC|Teléfono|Tel|$)/i,
                /^([A-Za-z0-9\s,\.&\-\(\)]{8,50})(?:\s*\n)/m, // Primera línea que parece nombre
                /\n([A-Za-z0-9\s,\.&\-\(\)]{10,50})\s*\n/m, // Línea entre otras que parece nombre
                /^(.+?)(?:\s*RNC|\s*Tel|\s*Teléfono)/mi, // Todo hasta RNC o teléfono
                /(?:De:|Para:|Proveedor:)\s*([A-Za-z0-9\s,\.&\-\(\)]{5,}?)(?:\n|$)/i
            ];
            
            // Patrones SUPER MEJORADOS específicos para facturas dominicanas como LA ESCENA
            const totalRegex = /(?:TOTAL\s*A\s*PAGAR|TOTAL|Total|GRAN\s*TOTAL|NETO\s*A\s*PAGAR)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            const subtotalRegex = /(?:Sub-Total|SUBTOTAL|Sub\s*total|VALOR\s*NETO|VALOR\s*GRAVADO)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            const itbisRegex = /(?:Itbis\s*18%|ITBIS\s*18%|ITBIS|I\.T\.B\.I\.S|Impuesto|IVA)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            const iscRegex = /(?:ISC|I\.S\.C|Impuesto\s*Selectivo|Selectivo)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            const propinaRegex = /(?:Propina\s*Legal\s*10%|PROPINA\s*LEGAL|Propina|Servicio|Tip|LEY\s*16-00)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            const descuentoRegex = /(?:DESCUENTO|Descuento|Desc\.|Rebaja|BONIFICACIÓN)[:\s]*(?:RD\$|RD\s*\$|\$)?\s*([\d,]+\.?\d{0,2})/i;
            
            // Función SUPER MEJORADA para extraer nombre del proveedor - Análisis específico del TOP
            const extractProviderName = (text: string): string | null => {
                console.log("🔍 Analizando texto para nombre:", text.substring(0, 200));
                
                // Dividir el texto en líneas y limpiar
                const lines = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                
                console.log("📋 Primeras 8 líneas:", lines.slice(0, 8));
                
                // ESTRATEGIA 1: Buscar específicamente en las primeras 3 líneas (header absoluto)
                for (let i = 0; i < Math.min(3, lines.length); i++) {
                    const line = lines[i].trim();
                    
                    // Filtrar líneas que claramente no son nombres
                    if (line.length < 4 || 
                        /^\d+$/.test(line) || // Solo números
                        /(Tel|Phone|RNC|NCF|Fecha|Date|Total|Subtotal)/i.test(line) || // Palabras clave
                        line.includes('@') || // Email
                        /^\d{3}-\d{3}-\d{4}$/.test(line) // Teléfono
                    ) {
                        continue;
                    }
                    
                    // Buscar líneas que parecen nombres de empresa
                    if (line.length >= 4 && line.length <= 100 && /[A-Za-z]{3,}/.test(line)) {
                        let nombre = line
                            .replace(/[^\w\s&\-\(\),\.]/g, ' ') // Limpiar caracteres especiales pero mantener &,-,()
                            .replace(/\s+/g, ' ') // Normalizar espacios
                            .trim();
                        
                        // Manejo especial de S.R.L, SRL, etc.
                        nombre = nombre.replace(/\b(SRL|S\.R\.L\.?|SOCIEDAD)\b/gi, 'S.R.L.');
                        
                        console.log(`✅ Nombre candidato línea ${i}: "${nombre}"`);
                        return nombre.substring(0, 80);
                    }
                }
                
                // ESTRATEGIA 2: Buscar patrones específicos de nombres de empresa
                const nombrePatterns = [
                    /^([A-Za-z][A-Za-z0-9\s&\-\(\),\.]{4,80})\s*(?:\n|$)/m,
                    /(?:^|\n)([A-Z][A-Za-z0-9\s&\-\(\),\.]{6,80})(?=\s*\n.*(?:RNC|Tel|Phone))/i,
                    /(?:Empresa|Company|Razón Social)[:\s]*([A-Za-z0-9\s&\-\(\),\.]{4,80})/i
                ];
                
                for (const pattern of nombrePatterns) {
                    const match = text.match(pattern);
                    if (match?.[1]) {
                        const nombre = match[1]
                            .replace(/[^\w\s&\-\(\),\.]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .replace(/\b(SRL|S\.R\.L\.?|SOCIEDAD)\b/gi, 'S.R.L.')
                            .trim();
                        
                        if (nombre.length >= 4 && /[A-Za-z]{3,}/.test(nombre)) {
                            console.log(`✅ Nombre encontrado por patrón: "${nombre}"`);
                            return nombre.substring(0, 80);
                        }
                    }
                }
                
                console.log("❌ No se pudo extraer nombre del proveedor");
                return null;
            };
            
            // Función SÚPER MEJORADA para limpiar y parsear números - específica para formatos dominicanos
            const parseCleanNumber = (value: string | undefined): number => {
                if (!value) return 0;
                
                console.log(`🔢 Parseando número: "${value}"`);
                
                // Limpiar el texto paso a paso
                let cleaned = value
                    .replace(/[^\d,\.\s]/g, '') // Quitar todo excepto números, comas, puntos y espacios
                    .trim();
                
                console.log(`🔢 Después de limpiar: "${cleaned}"`);
                
                // Manejar diferentes formatos
                if (cleaned.includes(',') && cleaned.includes('.')) {
                    // Formato: 1,234.56 (comas para miles, punto para decimales)
                    cleaned = cleaned.replace(/,(?=\d{3})/g, '');
                } else if (cleaned.includes(',') && !cleaned.includes('.')) {
                    // Podría ser 1,234 (miles) o 1,50 (decimales)
                    const parts = cleaned.split(',');
                    if (parts.length === 2 && parts[1].length <= 2) {
                        // Formato: 1,50 (coma como decimal)
                        cleaned = cleaned.replace(',', '.');
                    } else {
                        // Formato: 1,234 (coma como miles)
                        cleaned = cleaned.replace(/,/g, '');
                    }
                } else if (cleaned.includes('.')) {
                    // Solo punto - mantener como está
                    // Formato: 1234.56 o 1.234.56
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                        // Formato: 1.234.56 (puntos para miles y decimales)
                        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
                    }
                }
                
                const parsed = parseFloat(cleaned);
                const result = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
                
                console.log(`🔢 Resultado final: ${result}`);
                return result;
            };
            
            // Extraer datos
            const rncMatch = text.match(rncRegex);
            const ncfMatch = text.match(ncfRegex);
            const nombreProveedor = extractProviderName(text);
            const totalMatch = text.match(totalRegex);
            const subtotalMatch = text.match(subtotalRegex);
            const itbisMatch = text.match(itbisRegex);
            const iscMatch = text.match(iscRegex);
            const propinaMatch = text.match(propinaRegex);
            const descuentoMatch = text.match(descuentoRegex);
            
            const extractedData: Partial<Gasto & { 
                descuentoPorcentaje?: number; 
                propinaLegal?: number;
                aplicaISC?: boolean;
                iscMonto?: number;
            }> = {};
            
            // Datos básicos con extracción mejorada
            if (rncMatch?.[1]) {
                extractedData.rncProveedor = rncMatch[1].replace(/-/g, '');
            }
            if (ncfMatch?.[0]) {
                extractedData.ncf = ncfMatch[0];
            }
            if (nombreProveedor) {
                extractedData.proveedorNombre = nombreProveedor;
            }
            
            // Procesar montos con función mejorada de parsing
            const totalMonto = parseCleanNumber(totalMatch?.[1]);
            const subtotalMonto = parseCleanNumber(subtotalMatch?.[1]);
            const itbisMonto = parseCleanNumber(itbisMatch?.[1]);
            const iscMonto = parseCleanNumber(iscMatch?.[1]);
            const propinaMonto = parseCleanNumber(propinaMatch?.[1]);
            const descuentoMonto = parseCleanNumber(descuentoMatch?.[1]);
            
            console.log('📊 Montos detectados y parseados:', {
                totalTexto: totalMatch?.[1],
                total: totalMonto,
                subtotalTexto: subtotalMatch?.[1], 
                subtotal: subtotalMonto,
                itbisTexto: itbisMatch?.[1],
                itbis: itbisMonto,
                iscTexto: iscMatch?.[1],
                isc: iscMonto,
                propinaTexto: propinaMatch?.[1],
                propina: propinaMonto,
                descuentoTexto: descuentoMatch?.[1],
                descuento: descuentoMonto
            });
            
            // LÓGICA INTELIGENTE: Colocar montos donde corresponden y habilitar toggles automáticamente
            if (totalMonto > 0) {
                extractedData.monto = totalMonto;
                
                // 1. Si hay subtotal explícito, usarlo directamente
                if (subtotalMonto > 0) {
                    extractedData.subtotal = subtotalMonto;
                    
                    // Habilitar ITBIS si se detectó monto
                    if (itbisMonto > 0) {
                        extractedData.aplicaITBIS = true;
                        extractedData.itbis = itbisMonto;
                    } else {
                        // Si no hay ITBIS explícito pero hay subtotal, calcular
                        const itbisCalculado = subtotalMonto * 0.18;
                        if (Math.abs(totalMonto - subtotalMonto - itbisCalculado) < 1) {
                            extractedData.aplicaITBIS = true;
                            extractedData.itbis = itbisCalculado;
                        }
                    }
                    
                } else {
                    // 2. No hay subtotal explícito - calcularlo inteligentemente
                    let impuestosTotales = 0;
                    
                    // Sumar todos los impuestos detectados
                    if (itbisMonto > 0) {
                        impuestosTotales += itbisMonto;
                        extractedData.aplicaITBIS = true;
                        extractedData.itbis = itbisMonto;
                    }
                    
                    if (propinaMonto > 0) {
                        impuestosTotales += propinaMonto;
                        extractedData.propinaLegal = propinaMonto;
                    }
                    
                    if (iscMonto > 0) {
                        impuestosTotales += iscMonto;
                        extractedData.aplicaISC = true;
                        extractedData.iscMonto = iscMonto;
                    }
                    
                    // Calcular subtotal: Total - impuestos
                    let subtotalCalculado = totalMonto - impuestosTotales;
                    
                    // Si no se detectaron impuestos, asumir que el total incluye ITBIS
                    if (impuestosTotales === 0 && totalMonto > 0) {
                        subtotalCalculado = totalMonto / 1.18;
                        const itbisCalculado = totalMonto - subtotalCalculado;
                        extractedData.aplicaITBIS = true;
                        extractedData.itbis = Math.round(itbisCalculado * 100) / 100;
                    }
                    
                    extractedData.subtotal = Math.max(0, Math.round(subtotalCalculado * 100) / 100);
                }
                
                // 3. Manejar descuentos si se detectaron
                if (descuentoMonto > 0 && extractedData.subtotal && extractedData.subtotal > 0) {
                    const descuentoPorcentaje = (descuentoMonto / extractedData.subtotal) * 100;
                    extractedData.descuentoPorcentaje = Math.round(descuentoPorcentaje * 100) / 100;
                }
                
                // 4. Propina específica si se detectó pero no se procesó arriba
                if (propinaMonto > 0 && !extractedData.propinaLegal) {
                    extractedData.propinaLegal = propinaMonto;
                }
                
                // 5. ISC específico si se detectó
                if (iscMonto > 0) {
                    extractedData.aplicaISC = true;
                    extractedData.iscMonto = iscMonto;
                }
            }
            
            // Agregar fecha actual si no se detectó una fecha específica
            extractedData.fecha = new Date().toISOString().split('T')[0];
            
            console.log('Datos extraídos:', extractedData);
            setStatusText('✅ Datos extraídos exitosamente. Revise y complete los campos faltantes.');
            onScanComplete(extractedData);
            
        } catch (error) {
            console.error("OCR Error:", error);
            setStatusText('❌ No se pudo leer la imagen. Intente con mejor iluminación o calidad.');
        } finally {
            setIsScanning(false);
        }
    }

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || !cameraEnabled) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Configuración responsive de captura
        const isMobile = window.innerWidth <= 768;
        const captureWidth = isMobile ? Math.min(video.videoWidth, 1280) : video.videoWidth;
        const captureHeight = isMobile ? Math.min(video.videoHeight, 720) : video.videoHeight;
        
        canvas.width = captureWidth;
        canvas.height = captureHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            // Mejorar calidad de captura
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            
            // Capturar imagen con mejor resolución
            context.drawImage(video, 0, 0, captureWidth, captureHeight);
            
            // Aplicar filtros para mejorar OCR en móviles
            if (isMobile) {
                const imageData = context.getImageData(0, 0, captureWidth, captureHeight);
                // Aumentar contraste ligeramente para mejor OCR
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const brightness = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
                    const factor = brightness > 128 ? 1.1 : 0.9; // Aumentar contraste
                    imageData.data[i] = Math.min(255, imageData.data[i] * factor);
                    imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] * factor);
                    imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] * factor);
                }
                context.putImageData(imageData, 0, 0);
            }
        }
        
        const imageDataUrl = canvas.toDataURL('image/png', 0.95); // Alta calidad
        processImage(imageDataUrl);
    };

    const handleCameraToggle = (enabled: boolean) => {
        setCameraEnabled(enabled);
        if (enabled) {
            startCamera();
        } else {
            stopCamera();
        }
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
        <Modal isOpen={isOpen} onClose={onClose} title="Escanear Comprobante de Gasto">
            <div className="p-4 sm:p-6">
                {/* Toggle para activar/desactivar cámara con diseño responsive */}
                <div className="mb-4 flex items-center justify-between bg-secondary-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">📷</span>
                        <div>
                            <label className="text-sm font-medium text-secondary-900 block">
                                Activar Cámara
                            </label>
                            <p className="text-xs text-secondary-600">
                                Escanear con cámara del dispositivo
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch 
                        id="camera-toggle" 
                        checked={cameraEnabled} 
                        onChange={handleCameraToggle}
                    />
                </div>
                
                {/* Vista de cámara con diseño responsive */}
                {cameraEnabled && (
                    <div className="relative w-full bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }} // Efecto espejo para mejor UX
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlay de guía responsive */}
                        <div className="absolute inset-2 sm:inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none opacity-70">
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
                                📄 Alinee la factura dentro del marco
                            </div>
                            
                            {/* Puntos de alineación en las esquinas */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-white"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-white"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-white"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-white"></div>
                        </div>
                        
                        {/* Indicador de calidad en móviles */}
                        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">
                            {stream ? '🟢 VIVO' : '🔴 SIN SEÑAL'}
                        </div>
                    </div>
                )}
                
                {/* Estado y botones con diseño responsive */}
                <div className="text-center">
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 min-h-[20px] flex items-center justify-center font-medium">
                            {statusText}
                        </p>
                    </div>

                    {cameraEnabled && (
                        <div className="mb-4">
                            <Button 
                                onClick={handleCapture} 
                                disabled={isScanning || !stream} 
                                className="w-full py-3 text-lg font-semibold"
                            >
                                {isScanning ? '⏳ Escaneando...' : '📸 Capturar Factura'}
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center my-6">
                        <hr className="flex-grow border-secondary-200" />
                        <span className="mx-3 text-xs font-medium text-secondary-500 bg-white px-2">
                            O SUBIR ARCHIVO
                        </span>
                        <hr className="flex-grow border-secondary-200" />
                    </div>

                    <div className="mb-6">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                        />
                        <Button
                            variant="secondary"
                            leftIcon={<UploadIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            className="w-full py-3 text-base font-medium"
                        >
                            📁 Subir Archivo (PDF, JPG, PNG)
                        </Button>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={onClose} 
                            disabled={isScanning} 
                            className="flex-1 py-2"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EscanearGastoModal;