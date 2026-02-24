import React, { useState, useEffect } from 'react';
import { useMarketingStore } from '../../stores/useMarketingStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { useConfirmationStore } from '../../stores/useConfirmationStore';

const MarketingPage: React.FC = () => {
    const { plans, landingImageUrls, updatePlanPrice, addLandingImage, removeLandingImage } = useMarketingStore();
    const { showConfirmation } = useConfirmationStore();

    const [basicoPrice, setBasicoPrice] = useState(0);
    const [proPrice, setProPrice] = useState(0);
    const [premiumPrice, setPremiumPrice] = useState(0);
    
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (plans) {
            setBasicoPrice(plans.basico.price);
            setProPrice(plans.pro.price);
            setPremiumPrice(plans.premium.price);
        }
    }, [plans]);

    const handlePriceSave = (e: React.FormEvent) => {
        e.preventDefault();
        updatePlanPrice('basico', basicoPrice);
        updatePlanPrice('pro', proPrice);
        updatePlanPrice('premium', premiumPrice);
        alert('Precios actualizados!');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            await addLandingImage(file);
            setIsUploading(false);
        }
    };

    const handleDelete = (url: string) => {
        showConfirmation(
            'Confirmar Eliminación',
            '¿Está seguro de que desea eliminar esta imagen del landing page?',
            () => removeLandingImage(url)
        );
    };
    
    const renderPriceInput = (label: string, value: number, setter: (val: number) => void) => (
        <div>
            <label className="block text-sm font-medium text-secondary-700">{label}</label>
            <div className="relative mt-1 rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-secondary-500 sm:text-sm">$</span>
                </div>
                <input
                    type="number"
                    value={value}
                    onChange={e => setter(Number(e.target.value))}
                    className="block w-full rounded-md border-secondary-300 pl-7 pr-12 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="0.00"
                    step="1"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-secondary-500 sm:text-sm">/ mes</span>
                </div>
            </div>
        </div>
    );


    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Marketing y Precios</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <form onSubmit={handlePriceSave}>
                        <CardHeader>
                            <CardTitle>Gestionar Precios de Planes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {renderPriceInput('Plan Básico', basicoPrice, setBasicoPrice)}
                           {renderPriceInput('Plan Pro', proPrice, setProPrice)}
                           {renderPriceInput('Plan Premium', premiumPrice, setPremiumPrice)}
                        </CardContent>
                        <div className="p-4 bg-secondary-50 border-t flex justify-end">
                            <Button type="submit">Guardar Precios</Button>
                        </div>
                    </form>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Gestionar Imágenes del Landing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {landingImageUrls.map(url => (
                                <div key={url} className="relative group">
                                    <img src={url} alt="Vista previa" className="aspect-video w-full object-cover rounded-md shadow" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                        <button onClick={() => handleDelete(url)} className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                             <label className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-secondary-300 rounded-md cursor-pointer hover:bg-secondary-50">
                                <PlusIcon className="h-8 w-8 text-secondary-400"/>
                                <span className="text-xs text-secondary-500 mt-1">Añadir Imagen</span>
                                <input type="file" onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={isUploading} />
                            </label>
                        </div>
                         {isUploading && <p className="text-sm text-center text-primary">Subiendo imagen...</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MarketingPage;