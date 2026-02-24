import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { Gasto, MetodoPago } from '../../types.ts';
import { CameraIcon } from '../../components/icons/Icons.tsx';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';

interface EscanearGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: Partial<Gasto>) => void;
}

const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL', '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS', '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS', '05 - GASTOS DE REPRESENTACIÓN', '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS', '08 - GASTOS EXTRAORDINARIOS', '09 - COMPRAS E GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS', '11 - GASTOS DE SEGUROS',
];

const EscanearGastoModal: React.FC<EscanearGastoModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { selectedTenant } = useTenantStore();
    const { lookupRNC } = useDGIIDataStore();
    const { showAlert } = useAlertStore();

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('Seleccione un archivo o use la cámara.');

    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setStatusText('Seleccione un archivo o use la cámara.');
        }
    }, [isOpen]);

    const processImageWithGemini = async (imageFile: File): Promise<Partial<Gasto>> => {
        if (!selectedTenant) {
            throw new Error('No se ha seleccionado una empresa. Por favor, seleccione una empresa antes de escanear.');
        }

        try {
            // Fix: Use gemini-3-flash-preview for invoice scanning task
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
            const imagePart = { inlineData: { mimeType: imageFile.type, data: base64Data } };
            
            const schema = {
              type: Type.OBJECT, properties: {
                rncCoincide: { type: Type.BOOLEAN, description: "Indica si el RNC del cliente en la factura coincide con el RNC esperado." },
                rncCliente: { type: Type.STRING, description: "El RNC o Cédula del cliente/comprador a quien se emitió la factura." },
                rncProveedor: { type: Type.STRING, description: "El RNC o Cédula del proveedor." },
                proveedorNombre: { type: Type.STRING, description: "El nombre del proveedor." },
                fecha: { type: Type.STRING, description: "La fecha en formato YYYY-MM-DD." },
                ncf: { type: Type.STRING, description: "El Número de Comprobante Fiscal (NCF)." },
                metodoPago: { type: Type.STRING, description: `El método de pago. Debe coincidir con uno de los siguientes valores: '${Object.values(MetodoPago).join("', '")}'.` },
                subtotal: { type: Type.NUMBER, description: "El monto total antes de impuestos." },
                itbis: { type: Type.NUMBER, description: "El monto total del ITBIS." },
                monto: { type: Type.NUMBER, description: "El monto total final a pagar." },
                descripcion: { type: Type.STRING, description: "Una descripción general de los ítems o un resumen." },
                categoriaGasto: { type: Type.STRING, description: "La categoría de gasto más apropiada para el reporte 606 de la DGII." },
              }
            };

            const promptText = `Analiza esta imagen de una factura de República Dominicana. El RNC de la empresa que está registrando este gasto es ${selectedTenant.rnc}. Primero, busca el RNC del cliente/comprador en la factura. Compara el RNC encontrado con el RNC esperado (${selectedTenant.rnc}). En el campo 'rncCoincide', pon 'true' si coinciden o si no encuentras el RNC del cliente en la factura, y 'false' si encuentras un RNC de cliente diferente. Luego, extrae los demás datos solicitados. Basado en el nombre del proveedor y los ítems, sugiere la categoría de gasto más apropiada para el reporte 606 de la DGII de la siguiente lista: '${GASTO_CATEGORIAS_606.join("', '")}'.`;
            const textPart = { text: promptText };

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', contents: { parts: [imagePart, textPart] },
                config: { responseMimeType: "application/json", responseSchema: schema },
            });

            const parsedData: Partial<Gasto> & { rncCliente?: string, rncCoincide?: boolean } = JSON.parse(response.text.trim());

            if (parsedData.rncCoincide === false) {
                 throw new Error(`La factura no pertenece a la empresa seleccionada. RNC en factura: ${parsedData.rncCliente || 'No encontrado'}, RNC de la empresa: ${selectedTenant.rnc}.`);
            }

            // If an RNC is found, always use it to look up the official name from DGII DB.
            if (parsedData.rncProveedor && typeof parsedData.rncProveedor === 'string') {
                setStatusText('RNC del proveedor encontrado. Verificando en la base de datos de la DGII...');
                const providerInfo = await lookupRNC(parsedData.rncProveedor);
                if (providerInfo) {
                    // Overwrite any name extracted by the AI with the official one.
                    parsedData.proveedorNombre = providerInfo.nombre;
                } else if (!parsedData.proveedorNombre) {
                    // If lookup fails and AI didn't find a name either, prompt user.
                    parsedData.proveedorNombre = "NOMBRE NO ENCONTRADO - POR FAVOR, VERIFICAR";
                }
            } else if (!parsedData.proveedorNombre) {
                // If no RNC and no name found.
                parsedData.proveedorNombre = "NOMBRE NO ENCONTRADO - POR FAVOR, INTRODUCIR MANUALMENTE";
            }
            
            const { rncCliente, rncCoincide, ...gastoData } = parsedData;
            return gastoData;

        } catch (error) {
            console.error("Gemini API or Validation Error:", error);
            if (error instanceof Error) {
                throw error; // Re-throw the specific error message
            }
            throw new Error('No se pudo leer la imagen con la IA. Verifique su conexión o la calidad de la imagen.');
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedTenant) return;
        
        setIsProcessing(true);
        event.target.value = '';

        try {
            setStatusText('Analizando factura con IA... Esto puede tardar unos segundos.');
            const gastoData = await processImageWithGemini(file);
            
            setStatusText('¡Análisis completo!');
            onScanComplete(gastoData);

        } catch (error) {
            console.error("Error during file processing:", error);
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
            showAlert('Error de Escaneo', errorMessage);
            setIsProcessing(false);
            onClose(); // Close modal on error
        }
    };

    const renderContent = () => {
        if (isProcessing) {
            return (
                <div className="flex flex-col items-center justify-center h-80">
                    <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-secondary-600 text-center">{statusText}</p>
                </div>
            );
        }
        
        return (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    leftIcon={<CameraIcon />} 
                    className="w-full max-w-xs py-4 text-lg"
                >
                    Escanear o Subir Factura
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment" 
                />
                <p className="text-sm text-secondary-500 text-center max-w-sm">
                    En móvil, esto abrirá su cámara. En escritorio, abrirá el selector de archivos.
                </p>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Escanear Factura de Gasto" size="lg">
            <div className="p-6">
                {renderContent()}
            </div>
        </Modal>
    );
};

export default EscanearGastoModal;