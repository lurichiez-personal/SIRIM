import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useMarketingStore } from '../../stores/useMarketingStore';

const HomePage: React.FC = () => {
    const { landingImageUrl } = useMarketingStore();

    return (
        <>
            <div className="relative isolate overflow-hidden bg-white">
                <svg className="absolute inset-0 -z-10 h-full w-full stroke-secondary-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                    <defs>
                        <pattern id="0787a7c5-978c-4f66-83c7-11c213f99cb7" width="200" height="200" x="50%" y="-1" patternUnits="userSpaceOnUse">
                            <path d="M.5 200V.5H200" fill="none" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" strokeWidth="0" fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)" />
                </svg>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 sm:pt-32 sm:pb-40">
                    <div className="max-w-2xl text-center mx-auto">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-secondary-900 tracking-tight">
                            La Contabilidad de tu Negocio, <span className="text-primary">Simplificada.</span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-secondary-600">
                            SIRIM es la plataforma todo-en-uno para la gestión de impuestos y contabilidad en República Dominicana. Facturación, gastos, reportes DGII y más, en un solo lugar.
                        </p>
                        <div className="mt-10">
                            <Link to="/precios">
                                <Button size="md" className="px-8 py-3 text-lg rounded-full">
                                    Empieza tu prueba de 30 días
                                </Button>
                            </Link>
                        </div>
                    </div>
                     <div className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-secondary-900/5 p-2 ring-1 ring-inset ring-secondary-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            {landingImageUrl ? (
                                <img src={landingImageUrl} alt="App screenshot of an accounting dashboard with charts" width="2432" height="1442" className="rounded-md shadow-2xl ring-1 ring-secondary-900/10" />
                            ) : (
                                <div className="aspect-video w-full bg-secondary-200 animate-pulse rounded-md"></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HomePage;