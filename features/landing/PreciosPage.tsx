import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckIcon, XMarkIcon } from '../../components/icons/Icons';
import { useMarketingStore } from '../../stores/useMarketingStore';

const features = [
    { category: 'Facturación', name: 'Facturas de Venta', plans: { basico: true, pro: true, premium: true } },
    { category: 'Facturación', name: 'Cotizaciones', plans: { basico: true, pro: true, premium: true } },
    { category: 'Facturación', name: 'Notas de Crédito/Débito', plans: { basico: true, pro: true, premium: true } },
    { category: 'Facturación', name: 'Facturación Recurrente', plans: { basico: false, pro: true, premium: true } },
    { category: 'Gastos e Inventario', name: 'Registro de Gastos', plans: { basico: true, pro: true, premium: true } },
    { category: 'Gastos e Inventario', name: 'Escaneo de Gastos con IA', plans: { basico: false, pro: true, premium: true } },
    { category: 'Gastos e Inventario', name: 'Manejo de Inventario', plans: { basico: false, pro: true, premium: true } },
    { category: 'Impuestos (DGII)', name: 'Reporte 606 (Compras)', plans: { basico: true, pro: true, premium: true } },
    { category: 'Impuestos (DGII)', name: 'Reporte 607 (Ventas)', plans: { basico: true, pro: true, premium: true } },
    { category: 'Impuestos (DGII)', name: 'Reporte 608 (Anulados)', plans: { basico: true, pro: true, premium: true } },
    { category: 'Impuestos (DGII)', name: 'Anexo A / IT-1 (Preliminar)', plans: { basico: false, pro: true, premium: true } },
    { category: 'Contabilidad', name: 'Libro Diario Automático', plans: { basico: false, pro: true, premium: true } },
    { category: 'Contabilidad', name: 'Reportes Financieros', plans: { basico: false, pro: true, premium: true } },
    { category: 'Contabilidad', name: 'Conciliación Bancaria', plans: { basico: false, pro: true, premium: true } },
    { category: 'Nómina', name: 'Gestión de Empleados', plans: { basico: false, pro: false, premium: true } },
    { category: 'Nómina', name: 'Cálculo y Procesamiento de Nómina', plans: { basico: false, pro: false, premium: true } },
    { category: 'Colaboración', name: 'Gestión de Usuarios y Roles', plans: { basico: false, pro: true, premium: true } },
    { category: 'Colaboración', name: 'Portal de Clientes', plans: { basico: false, pro: false, premium: true } },
];

const PreciosPage: React.FC = () => {
    const { plans } = useMarketingStore();
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const unsub = useMarketingStore.persist.onFinishHydration(() => setHydrated(true));
        // Also check if already hydrated
        if(useMarketingStore.persist.hasHydrated()){
            setHydrated(true);
        }
        return unsub;
    }, []);

    const PriceDisplay = ({ price }: { price: number | undefined }) => {
        if (!hydrated || price === undefined) {
            return <div className="h-10 w-20 bg-secondary-200 animate-pulse rounded-md mx-auto mt-2"></div>;
        }
        return <p className="text-4xl font-bold mt-2">${price} <span className="text-lg font-normal text-secondary-500">/ mes</span></p>;
    };

    return (
        <div className="bg-secondary-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-secondary-900">Planes para cada etapa de tu negocio</h1>
                    <p className="mt-4 text-lg text-secondary-600">Empieza con una prueba gratuita de 30 días en cualquier plan. Sin tarjeta de crédito.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {/* Plan Básico */}
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Básico</CardTitle>
                            <PriceDisplay price={plans?.basico?.price} />
                            <p className="text-sm text-secondary-600 mt-2">Ideal para freelancers y emprendedores que inician.</p>
                        </CardHeader>
                        <CardContent className="text-center space-y-3">
                            <Link to="/registro?plan=basico&trial=true">
                                <Button variant="outline" className="w-full">Prueba gratis por 30 días</Button>
                            </Link>
                            <Link to="/registro?plan=basico&trial=false">
                                <Button className="w-full">Comprar Ahora</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Plan Pro */}
                    <Card className="border-2 border-primary ring-4 ring-primary-100 relative">
                         <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                            <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">Recomendado</span>
                        </div>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Pro</CardTitle>
                            <PriceDisplay price={plans?.pro?.price} />
                            <p className="text-sm text-secondary-600 mt-2">Para Pymes en crecimiento que necesitan automatización.</p>
                        </CardHeader>
                        <CardContent className="text-center space-y-3">
                            <Link to="/registro?plan=pro&trial=true">
                                <Button variant="outline" className="w-full">Prueba gratis por 30 días</Button>
                            </Link>
                            <Link to="/registro?plan=pro&trial=false">
                                <Button className="w-full">Comprar Ahora</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Plan Premium */}
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Premium</CardTitle>
                            <PriceDisplay price={plans?.premium?.price} />
                            <p className="text-sm text-secondary-600 mt-2">La solución completa con nómina y colaboración avanzada.</p>
                        </CardHeader>
                        <CardContent className="text-center space-y-3">
                            <Link to="/registro?plan=premium&trial=true">
                                <Button variant="outline" className="w-full">Prueba gratis por 30 días</Button>
                            </Link>
                            <Link to="/registro?plan=premium&trial=false">
                                <Button className="w-full">Comprar Ahora</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Feature Comparison */}
                <h2 className="text-3xl font-bold text-center mb-8">Compara las funcionalidades</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-lg font-semibold text-secondary-800">Funcionalidad</th>
                                <th className="px-6 py-4 text-center text-lg font-semibold text-secondary-800">Básico</th>
                                <th className="px-6 py-4 text-center text-lg font-semibold text-primary">Pro</th>
                                <th className="px-6 py-4 text-center text-lg font-semibold text-secondary-800">Premium</th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature, index) => {
                                const isNewCategory = index === 0 || features[index - 1].category !== feature.category;
                                return (
                                    <React.Fragment key={feature.name}>
                                        {isNewCategory && (
                                            <tr className="bg-secondary-100">
                                                <td colSpan={4} className="px-6 py-2 text-sm font-bold text-secondary-600">{feature.category}</td>
                                            </tr>
                                        )}
                                        <tr className="border-b border-secondary-200">
                                            <td className="px-6 py-4 text-sm text-secondary-700">{feature.name}</td>
                                            <td className="px-6 py-4 text-center">{feature.plans.basico ? <CheckIcon className="h-6 w-6 text-green-500 mx-auto" /> : <XMarkIcon className="h-6 w-6 text-secondary-400 mx-auto" />}</td>
                                            <td className="px-6 py-4 text-center">{feature.plans.pro ? <CheckIcon className="h-6 w-6 text-green-500 mx-auto" /> : <XMarkIcon className="h-6 w-6 text-secondary-400 mx-auto" />}</td>
                                            <td className="px-6 py-4 text-center">{feature.plans.premium ? <CheckIcon className="h-6 w-6 text-green-500 mx-auto" /> : <XMarkIcon className="h-6 w-6 text-secondary-400 mx-auto" />}</td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PreciosPage;