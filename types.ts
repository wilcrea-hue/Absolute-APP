
export type Category = 'Mobiliario' | 'Electrónica' | 'Arquitectura Efímera' | 'Decoración' | 'Servicios';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  image: string;
  stock: number;
  priceSell: number;
  priceRent: number;
}

export type TransactionType = 'Compra' | 'Alquiler';

export interface CartItem extends Product {
  quantity: number;
  type: TransactionType;
}

export type OrderStatus = 'Cotización' | 'Pendiente' | 'En Proceso' | 'Entregado' | 'Finalizado' | 'Cancelado';
export type OrderType = 'quote' | 'purchase';

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
  assignedCoordinatorEmail?: string; // Nuevo: Email del coordinador asignado secuencialmente
  status: OrderStatus;
  orderType: OrderType;
  startDate: string;
  endDate: string;
  createdAt: string;
  originLocation: string; // Default warehouse
  destinationLocation: string; // Event city
  totalAmount: number;
  discountApplied?: number; // Porcentaje de descuento aplicado al crear la orden
  
  // New Workflow Structure
  workflow: Record<WorkflowStageKey, StageData>;
}

export interface User {
  email: string;
  password?: string; // Campo para seguridad
  role: 'admin' | 'user' | 'logistics' | 'coordinator' | 'operations_manager';
  name: string;
  phone?: string; 
  status?: 'active' | 'on-hold';
  discountPercentage?: number; // Nuevo campo para descuentos personalizados
}
