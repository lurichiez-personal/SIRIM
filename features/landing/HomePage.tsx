import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { ShieldCheckIcon, DocumentChartBarIcon, CpuChipIcon, ChatBubbleLeftRightIcon } from '../../components/icons/Icons';
import { Card } from '../../components/ui/Card';
import { useMarketingStore } from '../../stores/useMarketingStore.ts';

const features = [
  {
    name: 'Facturación Inteligente y Rápida',
    description: 'Crea facturas con NCF, gestiona clientes y productos, y envía cotizaciones profesionales en minutos. Todo integrado y fácil de usar.',
    icon: DocumentChartBarIcon,
  },
  {
    name: 'Impuestos sin Estrés',
    description: 'Genera los reportes 606, 607 y 608 listos para la DGII. Nuestro sistema clasifica tus gastos y ventas para que cumplas sin complicaciones.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Control Total con IA',
    description: 'Escanea tus facturas de gastos con la cámara y deja que nuestra IA extraiga los datos. Concilia tus cuentas bancarias de forma inteligente.',
    icon: CpuChipIcon,
  },
]

const testimonials = [
    {
        body: 'SIRIM ha transformado la forma en que llevo la contabilidad de mi Pyme. Lo que antes me tomaba días, ahora lo hago en horas. ¡El reporte 607 es mágico!',
        author: {
            name: 'Luisa Martinez',
            handle: 'Dueña de Tienda, Santo Domingo',
        },
    },
    {
        body: 'Como contador, manejo varias empresas. SIRIM me permite tener todo centralizado y al día. La funcionalidad multi-empresa es robusta y muy fácil de usar.',
        author: {
            name: 'Carlos Fernández',
            handle: 'Contador CPA',
        },
    },
     {
        body: 'La función de escanear facturas de gastos con el celular es increíble. Le tomo una foto al recibo y SIRIM se encarga del resto. He ahorrado incontables horas.',
        author: {
            name: 'Ana Sofia Peralta',
            handle: 'Diseñadora Freelance',
        },
    },
]


const HomePage: React.FC = () => {
    const { landingImageUrls, subscribeToMarketingContent } = useMarketingStore();

    useEffect(() => {
        const unsubscribe = subscribeToMarketingContent();
        return () => unsubscribe();
    }, [subscribeToMarketingContent]);

    return (
        <>
            {/* Hero Section */}
            <div className="relative isolate overflow-hidden bg-white">
                <svg className="absolute inset-0 -z-10 h-full w-full stroke-secondary-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                    <defs>
                        <pattern id="0787a7c5-978c-4f66-83c7-11c213f99cb7" width="200" height="200" x="50%" y="-1" patternUnits="userSpaceOnUse">
                            <path d="M.5 200V.5H200" fill="none" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" strokeWidth="0" fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)" />
                </svg>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-secondary-900 tracking-tight">
                            La Contabilidad de tu Negocio, <span className="text-primary">Simplificada.</span>
                        </h1>
                        <p className="mt-6 text-lg text-secondary-600">
                            SIRIM es la plataforma todo-en-uno para la gestión de impuestos y contabilidad en República Dominicana. Facturación, gastos, reportes DGII y más, en un solo lugar.
                        </p>
                        <div className="mt-10">
                            <Link to="/registro">
                                <Button size="md" className="px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-shadow">
                                    Empieza tu prueba de 30 días
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="mt-16 sm:mt-20 flow-root">
                        <div className="relative -m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                             <div className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                                <div className="flex w-max animate-marquee space-x-8 py-4">
                                    {landingImageUrls.length > 0 ? (
                                        [...landingImageUrls, ...landingImageUrls].map((url, i) => (
                                            <div key={i} className="flex-shrink-0">
                                                <img
                                                    src={url}
                                                    alt={`App screenshot ${i + 1}`}
                                                    className="w-80 h-48 bg-white object-cover object-left-top shadow-xl rounded-xl ring-1 ring-black/5"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex-shrink-0">
                                            <div className="w-80 h-48 bg-secondary-200 shadow-xl rounded-xl ring-1 ring-black/5 flex items-center justify-center">
                                                <p className="text-secondary-500">Imágenes de la app aparecerán aquí</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-secondary-50 py-24 sm:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base font-semibold leading-7 text-primary">Todo lo que necesitas</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">Una plataforma para cada necesidad fiscal</p>
                        <p className="mt-6 text-lg leading-8 text-secondary-600">
                            Desde emitir tu primera factura hasta generar reportes complejos para la DGII.
                        </p>
                    </div>
                    <div className="mt-16 max-w-2xl mx-auto lg:max-w-none">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                            {features.map((feature) => (
                                <div key={feature.name} className="flex flex-col">
                                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-secondary-900">
                                        <feature.icon className="h-7 w-7 flex-none text-primary" aria-hidden="true" />
                                        {feature.name}
                                    </dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-secondary-600">
                                        <p className="flex-auto">{feature.description}</p>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
            
             {/* Testimonial section */}
            <div className="relative isolate bg-white py-24 sm:py-32">
                <div className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl" aria-hidden="true">
                    <div className="ml-[max(50%,38rem)] aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#93c5fd] to-[#005a9c]"></div>
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">Lo que dicen nuestros clientes</h2>
                    </div>
                    <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm leading-6 text-secondary-900 sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-3">
                        {testimonials.map((testimonial) => (
                        <Card key={testimonial.author.handle} className="space-y-8 rounded-2xl bg-secondary-50/50 p-8 shadow-sm">
                            <figure className="h-full flex flex-col justify-between">
                            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary mb-4" />
                            <blockquote className="text-secondary-800 flex-grow">
                                <p>{`“${testimonial.body}”`}</p>
                            </blockquote>
                            <figcaption className="mt-6 flex items-center gap-x-4">
                                <div>
                                <div className="font-semibold">{testimonial.author.name}</div>
                                <div className="text-secondary-600">{testimonial.author.handle}</div>
                                </div>
                            </figcaption>
                            </figure>
                        </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
             <div className="bg-primary">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="relative isolate overflow-hidden px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                           ¿Listo para transformar tu contabilidad?
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
                           Únete a cientos de empresas en República Dominicana que ya confían en SIRIM.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link to="/registro">
                                <Button variant="secondary" className="bg-white text-primary hover:bg-secondary-100 px-8 py-3 text-lg">
                                    Empezar ahora
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HomePage;