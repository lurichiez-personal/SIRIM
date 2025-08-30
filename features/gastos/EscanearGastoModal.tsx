import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Gasto } from '../../types';
import { UploadIcon } from '../../components/icons/Icons';

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
        setStatusText('Procesando imagen...');

        try {
            const { data: { text } } = await Tesseract.recognize(imageSource, 'spa', {
                logger: m => console.log(m)
            });
            console.log("OCR Text:", text);
            setStatusText('Extrayendo datos...');
            
            const rncRegex = /(?:RNC|Rne|Ruc|Cédula)[:\s]*([\d-]+)/i;
            const ncfRegex = /[BE]\d{10}/;
            const totalRegex = /(?:TOTAL|Total|Tota1)[:\s]*\$?\s*([\d,]+\.\d{2})/i;
            
            const rncMatch = text.match(rncRegex);
            const ncfMatch = text.match(ncfRegex);
            const totalMatch = text.match(totalRegex);
            
            const extractedData: Partial<Gasto> = {};
            if (rncMatch?.[1]) extractedData.rncProveedor = rncMatch[1].replace(/-/g, '');
            if (ncfMatch?.[0]) extractedData.ncf = ncfMatch[0];
            if (totalMatch?.[1]) extractedData.monto = parseFloat(totalMatch[1].replace(/,/g, ''));

            setStatusText('Datos extraídos. ¡Listo para crear el gasto!');
            onScanComplete(extractedData);
            
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