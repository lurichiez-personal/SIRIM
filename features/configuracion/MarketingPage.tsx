import React, { useState, useEffect } from 'react';
import { useMarketingStore } from '../../stores/useMarketingStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const MarketingPage: React.FC = () => {
    const { plans, landingImageUrl, updatePlanPrice, updateLandingImage } = useMarketingStore();

    const [basicoPrice, setBasicoPrice] = useState(0);
    const [proPrice, setProPrice] = useState(0);
    const [premiumPrice, setPremiumPrice] = useState(0);
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        if (plans) {
            setBasicoPrice(plans.basico.price);
            setProPrice(plans.pro.price);
            setPremiumPrice(plans.premium.price);
        }
        if (landingImageUrl) {
            setImageUrl(landingImageUrl);
        }
    }, [plans, landingImageUrl]);

    const handlePriceSave = (e: React.FormEvent) => {
        e.preventDefault();
        updatePlanPrice('basico', basicoPrice);
        updatePlanPrice('pro', proPrice);
        updatePlanPrice('premium', premiumPrice);
        alert('Precios actualizados!');
    };

    const handleImageSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateLandingImage(imageUrl);
        alert('Imagen actualizada!');
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
                    <form onSubmit={handleImageSave}>
                        <CardHeader>
                            <CardTitle>Gestionar Contenido Landing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="imageUrl" className="block text-sm font-medium text-secondary-700">URL de Imagen Principal</label>
                                <input type="text" id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 block w-full border border-secondary-300 rounded-md p-2" placeholder="https://ejemplo.com/imagen.png" />
                                {imageUrl && <img src={imageUrl} alt="Vista previa de la imagen" className="mt-4 rounded-md shadow-md max-h-48 w-full object-cover"/>}
                            </div>
                        </CardContent>
                         <div className="p-4 bg-secondary-50 border-t flex justify-end">
                            <Button type="submit">Guardar Imagen</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default MarketingPage;
