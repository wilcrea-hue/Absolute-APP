
export type Category = 'Mobiliario' | 'Electrónica' | 'Arquitectura Efímera' | 'Decoración' | 'Servicios';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  image: string;
  stock: number;
  priceRent: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Cotización' | 'Pendiente' | 'En Proceso' | 'Entregado' | 'Finalizado' | 'Cancelado';
export type OrderType = 'quote' | 'rental';

export interface Signature {
  name: string;
  dataUrl: string; // Base64 image
  location: string; // Mandatory field
  timestamp: string;
}

export type WorkflowStageKey = 
  | 'bodega_check'
  | 'bodega_to_coord'
  | 'coord_to_client'
  | 'client_to_coord'
  | 'coord_to_bodega';

export interface ItemCheck {
  verified: boolean;
  notes: string;
}

export interface NoteEntry {
  text: string;
  timestamp: string;
  userEmail: string;
  userName: string;
}

export interface StageData {
  status: 'pending' | 'completed';
  timestamp?: string;
  signature?: Signature;
  receivedBy?: Signature;
  itemChecks: Record<string, ItemCheck>;
  photos: string[];
  files: string[];
  generalNotes?: string;
  notesHistory?: NoteEntry[];
}

export interface Order {
  id: string;
  items: CartItem[];
  userEmail: string;
  assignedCoordinatorEmail?: string; 
  status: OrderStatus;
  orderType: OrderType;
  startDate: string;
  endDate: string;
  createdAt: string;
  originLocation: string;
  destinationLocation: string;
  totalAmount: number;
  discountApplied?: number; 
  workflow: Record<WorkflowStageKey, StageData>;
}

export interface User {
  email: string;
  password?: string; 
  role: 'admin' | 'user' | 'logistics' | 'coordinator' | 'operations_manager';
  name: string;
  phone?: string; 
  status?: 'active' | 'on-hold';
  discountPercentage?: number; 
}
