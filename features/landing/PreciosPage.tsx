import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckIcon, XMarkIcon, ChevronRightIcon } from '../../components/icons/Icons';
import { useMarketingStore } from '../../stores/useMarketingStore';

const PlanFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-center space-x-3">
        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
        <span className="text-sm text-secondary-700">{children}</span>
    </li>
);

const FaqItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-5 text-left font-medium text-secondary-800"
            >
                <span>{question}</span>
                <ChevronRightIcon className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && <div className="pb-5 pr-12 text-base text-secondary-600">{children}</div>}
        </div>
    );
};


const PreciosPage: React.FC = () => {
    const { plans } = useMarketingStore();
    const [hydrated, setHydrated] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        const unsub = useMarketingStore.persist.onFinishHydration(() => setHydrated(true));
        if(useMarketingStore.persist.hasHydrated()){
            setHydrated(true);
        }
        return unsub;
    }, []);

    const getPlanPrice = (monthlyPrice: number | undefined) => {
        if (monthlyPrice === undefined) return undefined;
        return billingCycle === 'yearly' ? monthlyPrice * 10 : monthlyPrice; // 2 months free for yearly
    };

    const PriceDisplay = ({ price }: { price: number | undefined }) => {
        if (!hydrated || price === undefined) {
            return <div className="h-10 w-24 bg-secondary-200 animate-pulse rounded-md"></div>
        }
        return <p className="text-4xl font-bold">${price}</p>;
    };

    return (
        <div className="bg-secondary-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12 max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-secondary-900 sm:text-5xl">Planes para cada etapa de tu negocio</h1>
                    <p className="mt-4 text-lg text-secondary-600">Empieza con una prueba gratuita de 30 días en cualquier plan. Sin tarjeta de crédito.</p>
                     <div className="mt-8 flex justify-center">
                        <div className="relative flex rounded-full bg-secondary-200 p-1">
                            <button onClick={() => setBillingCycle('monthly')} className={`relative z-10 w-28 rounded-full py-1.5 text-sm font-medium transition focus-visible:outline-2 ${billingCycle === 'monthly' ? 'text-secondary-900' : 'text-secondary-600'}`}>Mensual</button>
                            <button onClick={() => setBillingCycle('yearly')} className={`relative z-10 w-28 rounded-full py-1.5 text-sm font-medium transition focus-visible:outline-2 ${billingCycle === 'yearly' ? 'text-secondary-900' : 'text-secondary-600'}`}>Anual</button>
                            <span className={`absolute inset-y-1 left-1 w-28 transform rounded-full bg-white shadow-sm transition-transform ${billingCycle === 'yearly' ? 'translate-x-full' : ''}`} />
                        </div>
                    </div>
                    {billingCycle === 'yearly' && <p className="mt-4 text-sm font-semibold text-green-600">¡Ahorras el equivalente a 2 meses!</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Plan Básico */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold">Básico</CardTitle>
                            <p className="text-sm text-secondary-600 h-10">Ideal para freelancers y emprendedores que inician.</p>
                            <div className="flex items-baseline gap-x-2 pt-4">
                                <PriceDisplay price={getPlanPrice(plans?.basico?.price)} />
                                <span className="text-sm font-semibold text-secondary-600">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                             <Link to="/registro" className="w-full mt-4"><Button variant="secondary" className="w-full">Comenzar prueba</Button></Link>
                             <ul className="mt-8 space-y-3 text-sm flex-grow">
                                <PlanFeature>Facturación y Cotizaciones</PlanFeature>
                                <PlanFeature>Registro de Gastos</PlanFeature>
                                <PlanFeature>Reportes 606, 607, 608</PlanFeature>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Plan Pro */}
                    <Card className="flex flex-col border-2 border-primary ring-4 ring-primary-100 relative">
                         <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2"><span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">Recomendado</span></div>
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold">Pro</CardTitle>
                            <p className="text-sm text-secondary-600 h-10">Para Pymes en crecimiento que necesitan automatización y contabilidad integrada.</p>
                            <div className="flex items-baseline gap-x-2 pt-4">
                                <PriceDisplay price={getPlanPrice(plans?.pro?.price)} />
                                 <span className="text-sm font-semibold text-secondary-600">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                            <Link to="/registro" className="w-full mt-4"><Button className="w-full">Comenzar prueba</Button></Link>
                            <ul className="mt-8 space-y-3 text-sm flex-grow">
                                <PlanFeature>Todo lo del plan Básico, y además:</PlanFeature>
                                <PlanFeature>Contabilidad Automática</PlanFeature>
                                <PlanFeature>Escaneo de Gastos con IA</PlanFeature>
                                <PlanFeature>Gestión de Inventario</PlanFeature>
                                <PlanFeature>Usuarios y Roles</PlanFeature>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Plan Premium */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl font-semibold">Premium</CardTitle>
                            <p className="text-sm text-secondary-600 h-10">La solución completa con nómina y colaboración avanzada.</p>
                             <div className="flex items-baseline gap-x-2 pt-4">
                                <PriceDisplay price={getPlanPrice(plans?.premium?.price)} />
                                 <span className="text-sm font-semibold text-secondary-600">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                             <Link to="/registro" className="w-full mt-4"><Button variant="secondary" className="w-full">Comenzar prueba</Button></Link>
                             <ul className="mt-8 space-y-3 text-sm flex-grow">
                                <PlanFeature>Todo lo del plan Pro, y además:</PlanFeature>
                                <PlanFeature>Módulo de Nómina Completo</PlanFeature>
                                <PlanFeature>Portal de Clientes</PlanFeature>
                                <PlanFeature>Soporte Prioritario</PlanFeature>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                
                 {/* FAQs */}
                <div className="mx-auto mt-24 max-w-4xl">
                    <h2 className="text-center text-3xl font-bold leading-10 tracking-tight text-secondary-900">
                        Preguntas Frecuentes
                    </h2>
                    <div className="mt-8">
                        <FaqItem question="¿Qué sucede después de mis 30 días de prueba gratuita?">
                            <p>
                                Después de tu prueba, podrás elegir el plan que mejor se adapte a tus necesidades para continuar usando SIRIM. No te cobraremos nada automáticamente. Si decides no continuar, tu cuenta quedará inactiva pero podrás exportar tus datos.
                            </p>
                        </FaqItem>
                        <FaqItem question="¿Puedo cambiar de plan en cualquier momento?">
                           <p>
                                ¡Sí! Puedes cambiar tu plan (subir o bajar) en cualquier momento desde el panel de configuración de tu cuenta. El cambio se aplicará a partir del próximo ciclo de facturación.
                            </p>
                        </FaqItem>
                        <FaqItem question="¿Mis datos están seguros?">
                            <p>
                                La seguridad de tus datos es nuestra máxima prioridad. Utilizamos encriptación de nivel bancario y toda tu información se almacena en servidores seguros de Google Cloud. Nunca compartimos tus datos con terceros.
                            </p>
                        </FaqItem>
                         <FaqItem question="¿Necesito ser un experto en contabilidad para usar SIRIM?">
                           <p>
                                No. SIRIM está diseñado para ser intuitivo y fácil de usar para dueños de negocios, no solo para contadores. Automatizamos la mayor parte de la complejidad contable para que puedas concentrarte en tu negocio.
                            </p>
                        </FaqItem>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PreciosPage;