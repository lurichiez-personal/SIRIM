import { NominaEmpleado, Empleado, Desvinculacion } from "../types";
import { useTenantStore } from "../stores/useTenantStore";

const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

const openHtmlInNewTab = (htmlContent: string, title: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
        newWindow.onload = () => {
            newWindow.document.title = title;
        };
    }
};

export const generarVoucherPago = (empleadoNomina: NominaEmpleado, periodo: string) => {
    const empresa = useTenantStore.getState().selectedTenant;

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Volante de Pago - ${empleadoNomina.nombre}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                .p-8 { padding: 2rem; } .p-6 { padding: 1.5rem; } .p-4 { padding: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mb-2 { margin-bottom: 0.5rem; } .mt-4 { margin-top: 1rem; } .mt-6 { margin-top: 1.5rem; }
                .text-2xl { font-size: 1.5rem; } .text-xl { font-size: 1.25rem; } .text-lg { font-size: 1.125rem; }
                .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; }
                .text-center { text-align: center; } .text-right { text-align: right; }
                .border { border: 1px solid #e5e7eb; } .border-b { border-bottom: 1px solid #e5e7eb; } .rounded-lg { border-radius: 0.5rem; } .rounded-md { border-radius: 0.375rem; }
                .bg-gray-100 { background-color: #f3f4f6; } .bg-gray-50 { background-color: #f9fafb; }
                .text-green-700 { color: #15803d; } .text-red-700 { color: #b91c1c; } .text-blue-700 { color: #1d4ed8; }
                .grid { display: grid; } .grid-cols-2 { grid-template-columns: repeat(2, 1fr); } .gap-8 { gap: 2rem; }
                .flex { display: flex; } .justify-between { justify-content: space-between; }
                .max-w-3xl { max-width: 48rem; } .mx-auto { margin-left: auto; margin-right: auto; }
                .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .pb-1 { padding-bottom: 0.25rem; }
            </style>
        </head>
        <body class="font-sans p-8">
            <div class="max-w-3xl mx-auto border rounded-lg p-6">
                <header class="text-center mb-6">
                    <h1 class="text-2xl font-bold">${empresa?.nombre || 'Empresa'}</h1>
                    <p>RNC: ${empresa?.rnc || 'N/A'}</p>
                    <h2 class="text-xl font-semibold mt-4">Volante de Pago</h2>
                    <p>Período: ${periodo}</p>
                </header>
                <section class="mb-6">
                    <h3 class="font-bold border-b pb-1 mb-2">Información del Empleado</h3>
                    <p><strong>Nombre:</strong> ${empleadoNomina.nombre}</p>
                </section>
                <section class="grid grid-cols-2 gap-8">
                    <div>
                        <h4 class="font-bold text-green-700">Ingresos</h4>
                        <div class="flex justify-between py-1 border-b">
                            <span>Salario Bruto</span>
                            <span>${formatCurrency(empleadoNomina.salarioBruto)}</span>
                        </div>
                        <div class="flex justify-between py-1 font-bold">
                            <span>Total Ingresos</span>
                            <span>${formatCurrency(empleadoNomina.salarioBruto)}</span>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold text-red-700">Deducciones</h4>
                        <div class="flex justify-between py-1 border-b">
                            <span>Seguro Familiar de Salud (SFS)</span>
                            <span>${formatCurrency(empleadoNomina.sfs)}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b">
                            <span>Fondo de Pensiones (AFP)</span>
                            <span>${formatCurrency(empleadoNomina.afp)}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b">
                            <span>Impuesto Sobre la Renta (ISR)</span>
                            <span>${formatCurrency(empleadoNomina.isr)}</span>
                        </div>
                         <div class="flex justify-between py-1 font-bold">
                            <span>Total Deducciones</span>
                            <span>${formatCurrency(empleadoNomina.totalDeduccionesEmpleado)}</span>
                        </div>
                    </div>
                </section>
                <section class="mt-6 text-right bg-gray-100 p-4 rounded-md">
                    <p class="text-lg font-bold">Salario Neto a Pagar: <span class="text-blue-700">${formatCurrency(empleadoNomina.salarioNeto)}</span></p>
                </section>
            </div>
        </body>
        </html>
    `;
    openHtmlInNewTab(html, `Volante-${empleadoNomina.nombre}`);
};


export const generarCartaDescargo = (desvinculacion: Desvinculacion, empleado: Empleado) => {
     const empresa = useTenantStore.getState().selectedTenant;
     const fechaSalida = new Date(desvinculacion.fechaSalida + 'T00:00:00').toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
     const hoy = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });

     const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Carta de Descargo - ${empleado.nombre}</title>
            <style>
                body { font-family: 'Times New Roman', serif; line-height: 1.8; font-size: 12pt; }
                .container { max-width: 800px; margin: auto; padding: 40px; }
                p { margin-bottom: 1.5em; text-align: justify; }
                .signature { margin-top: 80px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center; font-weight: bold; margin-bottom: 40px;">ACTO DE DESCARGO Y FINIQUITO LEGAL</h1>
                
                <p>Yo, <strong>${empleado.nombre.toUpperCase()}</strong>, dominicano(a), mayor de edad, portador(a) de la Cédula de Identidad y Electoral No. ${empleado.cedula}, domiciliado(a) y residente en esta ciudad, por medio del presente acto, declaro formalmente haber recibido de la empresa <strong>${empresa?.nombre.toUpperCase()}</strong>, RNC No. ${empresa?.rnc}, la suma de <strong>${formatCurrency(desvinculacion.prestaciones.total)}</strong>, por concepto de mis prestaciones laborales, calculadas hasta la fecha ${fechaSalida}, desglosadas de la siguiente manera:</p>
                
                <ul>
                    <li>Preaviso: ${formatCurrency(desvinculacion.prestaciones.preaviso)}</li>
                    <li>Auxilio de Cesantía: ${formatCurrency(desvinculacion.prestaciones.cesantia)}</li>
                    <li>Vacaciones: ${formatCurrency(desvinculacion.prestaciones.vacaciones)}</li>
                    <li>Salario de Navidad: ${formatCurrency(desvinculacion.prestaciones.salarioNavidad)}</li>
                </ul>

                <p>Por tanto, otorgo formal descargo y finiquito legal por el tiempo que estuve prestando mis servicios en dicha empresa, declarando no tener nada más que reclamar en el presente ni en el futuro, por ningún concepto, ya sea por salarios caídos, horas extras, comisiones, preaviso, cesantía, vacaciones, salario de navidad, ni por ningún otro concepto establecido en el Código de Trabajo de la República Dominicana o cualquier otra ley.</p>

                <p>En la ciudad de Santo Domingo, Distrito Nacional, República Dominicana, a los ${hoy.split(' de ')[0]} días del mes de ${hoy.split(' de ')[1]} del año ${hoy.split(' de ')[2]}.</p>

                <div class="signature">
                    <p>_____________________________________</p>
                    <p><strong>${empleado.nombre.toUpperCase()}</strong></p>
                    <p>Cédula No. ${empleado.cedula}</p>
                </div>
            </div>
        </body>
        </html>
     `;
     openHtmlInNewTab(html, `Descargo-${empleado.nombre}`);
}
