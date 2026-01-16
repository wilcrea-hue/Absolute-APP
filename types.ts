
export type Category = 'Mobiliario' | 'Electrónica' | 'Arquitectura Efímera' | 'Decoración' | 'Servicios';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  image: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Pendiente' | 'En Proceso' | 'Entregado' | 'Finalizado' | 'Cancelado';

export interface Signature {
  name: string;
  dataUrl: string; // Base64 image
  location: string; // Mandatory field
  timestamp: string;
}

// New Workflow Types
export type WorkflowStageKey = 
  | 'bodega_check'      // 1. Jefe de Bodega (Verificación inicial)
  | 'bodega_to_coord'   // 2. Bodega a Coordinador
  | 'coord_to_client'   // 3. Coordinador a Cliente
  | 'client_to_coord'   // 4. Cliente a Coordinador
  | 'coord_to_bodega';  // 5. Coordinador a Jefe de Bodega (Retorno)

export interface ItemCheck {
  verified: boolean;
  notes: string;
}

export interface StageData {
  status: 'pending' | 'completed';
  timestamp?: string;
  signature?: Signature; // Authorized By / Delivered By
  receivedBy?: Signature; // New field for Receiver
  itemChecks: Record<string, ItemCheck>; // Key is productId
  photos: string[]; // Base64 strings
  files: string[]; // Base64 strings or names
  generalNotes?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  userEmail: string;
  status: OrderStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  originLocation: string; // Default warehouse
  destinationLocation: string; // Event city
  
  // New Workflow Structure
  workflow: Record<WorkflowStageKey, StageData>;
}

export interface User {
  email: string;
  role: 'admin' | 'user' | 'logistics' | 'coordinator';
  name: string;
  phone?: string; // Nuevo campo para registro de celular
  status?: 'active' | 'on-hold'; // Nuevo campo para control de acceso
}