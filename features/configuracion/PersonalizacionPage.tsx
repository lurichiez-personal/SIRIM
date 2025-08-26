import React, { useState, useEffect, useRef } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { useToastStore } from '../../stores/useToastStore';

const PersonalizacionPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { settings, updateSettings } = useSettingsStore();
    const { showSuccess } = useToastStore();
    
    const [logoUrl, setLogoUrl] = useState('');
    const [accentColor, setAccentColor] = useState('#005A9C');
    const [footerText, setFooterText] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (selectedTenant) {
            const tenantSettings = settings[selectedTenant.id];
            if (tenantSettings) {
                setLogoUrl(tenantSettings.logoUrl || '');
                setAccentColor(tenantSettings.accentColor);
                setFooterText(tenantSettings.footerText || '');
            } else {
                // Reset to default if no settings found for the new tenant
                setLogoUrl('');
                setAccentColor('#005A9C');
                setFooterText('');
            }
        }
    }, [selectedTenant, settings]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant) return;
        updateSettings(selectedTenant.id, { logoUrl, accentColor, footerText });
        showSuccess('Configuración de personalización guardada correctamente.');
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
                            <label htmlFor="logoUrl" className="block text-sm font-medium text-secondary-700">URL del Logo</label>
                            <input type="text" id="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="mt-1 block w-full border border-secondary-300 rounded-md p-2" placeholder="https://ejemplo.com/logo.png" />
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
                            <Button type="submit">Guardar Cambios</Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
};

export default PersonalizacionPage;