
import { Product } from './types';

// Logo actualizado basado en la imagen proporcionada
export const LOGO_URL = "https://absolutecompany.co/app/imagenes/logo4.png";

export const PRODUCTS: Product[] = [
  // Arquitectura Efímera
  {
    id: 'ae-1',
    name: 'Stand 3x3',
    category: 'Arquitectura Efímera',
    description: 'Estructura modular estándar 3x3m para ferias.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 3x3.png',
    stock: 5,
  },
  {
    id: 'ae-2',
    name: 'Stand 4x3',
    category: 'Arquitectura Efímera',
    description: 'Estructura modular amplia 4x3m.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 4x3.png',
    stock: 2,
  },
  {
    id: 'ae-3',
    name: 'Stand 5x3',
    category: 'Arquitectura Efímera',
    description: 'Estructura premium 5x3m.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 5x3.png',
    stock: 5,
  },
  
  // Mobiliario
  {
    id: 'mob-1',
    name: 'Mesa Blanca Rectangular',
    category: 'Mobiliario',
    description: 'Mesa plegable para eventos.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/Mesa Blanca Rectangular.png',
    stock: 50,
  },
  {
    id: 'mob-2',
    name: 'Sillas Rattan Sintético Mesedoras',
    category: 'Mobiliario',
    description: 'Silla de diseño ergonómico.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/sillas Rattan Sintético Mesedoras.png',
    stock: 100,
  },
  {
    id: 'mob-3',
    name: 'Counter de Recepción',
    category: 'Mobiliario',
    description: 'Mueble para registro de asistentes.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/Counter de Recepción.png',
    stock: 10,
  },
  {
    id: 'mob-4',
    name: 'Mueble de Exhibición',
    category: 'Mobiliario',
    description: 'Vitrina con iluminación LED.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/Mueble de Exhibición.png',
    stock: 8,
  },

  // Electrónica
  {
    id: 'elec-1',
    name: 'Pantalla LED 55"',
    category: 'Electrónica',
    description: 'Smart TV 4K para presentaciones.',
    image: 'https://absolutecompany.co/app/imagenes/Electrónica/Pantalla LED 55.png',
    stock: 15,
  },
  {
    id: 'elec-2',
    name: 'Computador Portátil',
    category: 'Electrónica',
    description: 'Laptop i7 16GB RAM para control.',
    image: 'https://absolutecompany.co/app/imagenes/Electrónica/Computador Portátil.png',
    stock: 10,
  },
  {
    id: 'elec-3',
    name: 'Impresora Multifuncional',
    category: 'Electrónica',
    description: 'Impresora láser color.',
    image: 'https://absolutecompany.co/app/imagenes/Electrónica/impresora.png',
    stock: 5,
  },

  // Decoración
  {
    id: 'dec-1',
    name: 'Roll Up Publicitario',
    category: 'Decoración',
    description: 'Estructura de aluminio 85x200cm.',
    image: 'https://absolutecompany.co/app/imagenes/Decoraci%C3%B3n/Roll Up Publicitario.png',
    stock: 30,
  },
  {
    id: 'dec-2',
    name: 'Vinilo Adhesivo (m²)',
    category: 'Decoración',
    description: 'Impresión de alta calidad por metro cuadrado.',
    image: 'https://absolutecompany.co/app/imagenes/Decoraci%C3%B3n/Vinilo Adhesivo.png',
    stock: 1000,
  },
  {
    id: 'dec-3',
    name: 'Crispetera',
    category: 'Decoración',
    description: 'Máquina de palomitas estilo vintage.',
    image: 'https://absolutecompany.co/app/imagenes/Decoraci%C3%B3n/Crispetera.png',
    stock: 4,
  },
  {
    id: 'dec-4',
    name: 'Cafetera Industrial',
    category: 'Decoración',
    description: 'Cafetera para catering de eventos.',
    image: 'https://absolutecompany.co/app/imagenes/Decoraci%C3%B3n/cafetera-industrial.png',
    stock: 6,
  },

  // Servicios
  {
    id: 'serv-1',
    name: 'Diseño de Stand',
    category: 'Servicios',
    description: 'Servicio de diseño 3D personalizado.',
    image: 'https://absolutecompany.co/app/imagenes/Servicios/diseño.png',
    stock: 999,
  },
  {
    id: 'serv-2',
    name: 'Transporte',
    category: 'Servicios',
    description: 'Logística de entrega y recogida.',
    image: 'https://absolutecompany.co/app/imagenes/Servicios/trasnporte.png',
    stock: 999,
  },
];
