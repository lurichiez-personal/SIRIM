import React, { useState, useEffect, useRef } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const PersonalizacionPage: React.FC = () => {
    const { selectedTenant, updateTenant } = useTenantStore();
    
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [accentColor, setAccentColor] = useState('#005A9C');
    const [footerText, setFooterText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (selectedTenant) {
            setLogoUrl(selectedTenant.logoUrl || '');
            setAccentColor(selectedTenant.accentColor || '#005A9C');
            setFooterText(selectedTenant.footerText || '');
        }
    }, [selectedTenant]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant) return;
        setIsSaving(true);

        let finalLogoUrl = selectedTenant.logoUrl || '';

        if (logoFile) {
            try {
                // Generate a clean filename using timestamp to avoid any special character issues
                const fileExtension = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
                const fileName = `logo_${Date.now()}.${fileExtension}`;
                const storagePath = `logos/${selectedTenant.id}/${fileName}`;
                const storageRef = ref(storage, storagePath);
                
                const metadata = {
                    contentType: logoFile.type,
                };

                const snapshot = await uploadBytes(storageRef, logoFile, metadata);
                finalLogoUrl = await getDownloadURL(snapshot.ref);
            } catch (error: any) {
                console.error("Error uploading logo:", error);
                let message = "Hubo un error al subir el logo.";
                if (error.code === 'storage/unauthorized') {
                    message = "No tiene permiso para subir archivos. Verifique las reglas de seguridad o que su usuario tenga el rol correcto.";
                } else if (error.code === 'storage/retry-limit-exceeded') {
                    message = "Se excedió el límite de tiempo. Verifique su conexión.";
                }
                alert(message);
                setIsSaving(false);
                return;
            }
        }
        
        await updateTenant({ ...selectedTenant, logoUrl: finalLogoUrl, accentColor, footerText });
        setIsSaving(false);
        alert('Configuración guardada!');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoUrl(URL.createObjectURL(file)); // Show local preview
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Personalización de Plantillas</h1>
            <Card className="max-w-2xl">
                <form ref={formRef} onSubmit={handleSave}>
                    <CardHeader>
                        <CardTitle>Configure la apariencia de sus documentos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label htmlFor="logoFile" className="block text-sm font-medium text-secondary-700">Logo de la Empresa</label>
                            <input type="file" id="logoFile" onChange={handleFileChange} className="mt-1 block w-full text-sm text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100" accept="image/png, image/jpeg" />
                             {logoUrl && <img src={logoUrl} alt="Vista previa del logo" className="mt-2 h-16 object-contain border p-2 rounded-md"/>}
                        </div>
                         <div>
                            <label htmlFor="accentColor" className="block text-sm font-medium text-secondary-700">Color de Acento</label>
                            <div className="flex items-center space-x-2 mt-1">
                                <input type="color" id="accentColor" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10 w-10 p-1 border border-secondary-300 rounded-md" />
                                <span className="font-mono p-2 rounded-md border">{accentColor}</span>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="footerText" className="block text-sm font-medium text-secondary-700">Texto de Pie de Página</label>
                            <textarea id="footerText" value={footerText} onChange={e => setFooterText(e.target.value)} rows={3} className="mt-1 block w-full border border-secondary-300 rounded-md p-2" placeholder="Ej: Gracias por su compra."/>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
};

export default PersonalizacionPage;