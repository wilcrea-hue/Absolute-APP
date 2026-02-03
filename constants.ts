
import { Product } from './types';

// Logo actualizado basado en la imagen proporcionada
export const LOGO_URL = "https://absolutecompany.co/app/imagenes/logo4.png";

export const PRODUCTS: Product[] = [
  // Arquitectura Efímera
  {
    id: 'ae-1',
    name: 'Stand básico',
    category: 'Arquitectura Efímera',
    description: 'Estructura modular estándar 3x3m para ferias.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 3x3.png',
    stock: 5,
    priceSell: 1500000,
    priceRent: 450000,
  },
  {
    id: 'ae-2',
    name: 'Stand estandar',
    category: 'Arquitectura Efímera',
    description: 'Estructura modular amplia 4x3m.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 4x3.png',
    stock: 2,
    priceSell: 2200000,
    priceRent: 650000,
  },
  {
    id: 'ae-3',
    name: 'Stand premium',
    category: 'Arquitectura Efímera',
    description: 'Estructura premium 5x3m.',
    image: 'https://absolutecompany.co/app/imagenes/Arquitectura Efímera/Stand 5x3.png',
    stock: 5,
    priceSell: 3500000,
    priceRent: 950000,
  },
  
  // Mobiliario
  {
    id: 'mob-1',
    name: 'Mesa Blanca Rectangular',
    category: 'Mobiliario',
    description: 'Mesa plegable para eventos.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/Mesa Blanca Rectangular.png',
    stock: 50,
    priceSell: 120000,
    priceRent: 15000,
  },
  {
    id: 'mob-2',
    name: 'Sillas Rattan Sintético Mesedoras',
    category: 'Mobiliario',
    description: 'Silla de diseño ergonómico.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/sillas Rattan Sintético Mesedoras.png',
    stock: 100,
    priceSell: 180000,
    priceRent: 25000,
  },
  {
    id: 'mob-3',
    name: 'Counter de Recepción',
    category: 'Mobiliario',
    description: 'Mueble para registro de asistentes.',
    image: 'https://absolutecompany.co/app/imagenes/mobiliario/Counter de Recepción.png',
    stock: 10,
    priceSell: 850000,
    priceRent: 120000,
  },

  // Electrónica
  {
    id: 'elec-1',
    name: 'Pantalla LED 55"',
    category: 'Electrónica',
    description: 'Smart TV 4K para presentaciones.',
    image: 'https://absolutecompany.co/app/imagenes/Electrónica/Pantalla LED 55.png',
    stock: 15,
    priceSell: 2800000,
    priceRent: 250000,
  },
  {
    id: 'elec-2',
    name: 'Computador Portátil',
    category: 'Electrónica',
    description: 'Laptop i7 16GB RAM para control.',
    image: 'https://absolutecompany.co/app/imagenes/Electrónica/Computador Portátil.png',
    stock: 10,
    priceSell: 3500000,
    priceRent: 150000,
  },

  // Servicios
  {
    id: 'serv-1',
    name: 'Diseño de Stand',
    category: 'Servicios',
    description: 'Servicio de diseño 3D personalizado.',
    image: 'https://absolutecompany.co/app/imagenes/Servicios/diseño.png',
    stock: 999,
    priceSell: 500000,
    priceRent: 500000,
  },
  {
    id: 'serv-2',
    name: 'Transporte',
    category: 'Servicios',
    description: 'Logística de entrega y recogida.',
    image: 'https://absolutecompany.co/app/imagenes/Servicios/trasnporte.png',
    stock: 999,
    priceSell: 120000,
    priceRent: 120000,
  },
];
