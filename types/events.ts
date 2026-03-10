// Типи даних для модуля Управління подіями (Event Management)

export type EventType = 
  | 'birthday' 
  | 'corporate' 
  | 'graduation' 
  | 'holiday' 
  | 'other';

export type EventStatus = 
  | 'draft' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 
  | 'unpaid' 
  | 'deposit' 
  | 'paid' 
  | 'refunded';

export type ResourceType = 
  | 'room' 
  | 'animator' 
  | 'equipment' 
  | 'other';

export type ServiceCategory = 
  | 'food' 
  | 'animation' 
  | 'room' 
  | 'equipment' 
  | 'other';

// ============================================
// Event Package Types
// ============================================

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface EventPackage {
  _id?: string;
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  duration: number; // у хвилинах
  includedServices: ServiceItem[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Resource Types
// ============================================

export interface Resource {
  _id?: string;
  id: string;
  name: string;
  type: ResourceType;
  capacity?: number; // для кімнат
  skills?: string[]; // для аніматорів
  status: 'available' | 'booked' | 'maintenance' | 'inactive';
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceBooking {
  resourceId: string;
  resourceName: string;
  startTime: string;
  endTime: string;
}

// ============================================
// Event Types
// ============================================

export interface Event {
  _id?: string;
  id: string;
  
  // Основна інформація
  title: string;
  eventType: EventType;
  status: EventStatus;
  
  // Клієнт
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Подія
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // у хвилинах
  
  // Гості
  childGuests: number;
  adultGuests: number;
  totalGuests: number;
  
  // Пакет та послуги
  packageId?: string;
  packageName: string;
  customServices: ServiceItem[];
  
  // Ресурси
  assignedRooms: ResourceBooking[];
  assignedAnimators: ResourceBooking[];
  assignedEquipment: ResourceBooking[];
  
  // Зв'язок з чеком
  checkId?: string; // ID чеку в cash-register

  // Фінанси
  basePrice: number;
  additionalServicesTotal: number;
  extraGuestsTotal: number;
  subtotal: number;
  discount: number;
  discountReason?: string;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  
  // Коментарі
  internalNotes?: string; // для персоналу
  clientNotes?: string; // побажання клієнта
  
  // Метадані
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Statistics & Analytics Types
// ============================================

export interface EventStatistics {
  totalEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalRevenue: number;
  averageCheck: number;
  conversionRate: number;
  popularPackages: { packageId: string; name: string; count: number }[];
  eventsByType: Record<EventType, number>;
  eventsByStatus: Record<EventStatus, number>;
}

export interface EventRevenuePoint {
  period: string;
  revenue: number;
  events: number;
  profit: number;
}

export interface PopularItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export interface EventAnalytics {
  revenue: EventRevenuePoint[];
  popularPackages: PopularItem[];
  popularServices: PopularItem[];
  eventsByType: Record<EventType, number>;
  eventsByStatus: Record<EventStatus, number>;
  conversionRate: number;
  averageCheck: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface EventListParams {
  startDate?: string;
  endDate?: string;
  status?: EventStatus;
  eventType?: EventType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventListResponse {
  success: boolean;
  data: Event[];
  total: number;
  page?: number;
  limit?: number;
}

export interface EventResponse {
  success: boolean;
  data: Event;
}

export interface EventPaymentResponse {
  success: boolean;
  data: {
    total: number;
    paid: number;
    remaining: number;
    status: PaymentStatus;
  };
}

// ============================================
// Notification Types
// ============================================

export type NotificationChannel = 'email' | 'sms' | 'telegram' | 'push';

export type NotificationType = 
  | 'confirmation' 
  | 'reminder' 
  | 'thankyou' 
  | 'payment' 
  | 'internal';

export interface EventNotification {
  eventId: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
}

// ============================================
// Task Types (для персоналу)
// ============================================

export type TaskType = 
  | 'kitchen' 
  | 'animation' 
  | 'setup' 
  | 'cleanup' 
  | 'other';

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface EventTask {
  _id?: string;
  id: string;
  eventId: string;
  taskType: TaskType;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate: string;
  dueTime?: string;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Resource Availability Check
// ============================================

export interface ResourceAvailabilityParams {
  resourceId?: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType?: EventType;
}

export interface ResourceConflict {
  resourceId: string;
  resourceName: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
}

export interface ResourceAvailabilityResponse {
  success: boolean;
  available: boolean;
  conflicts: ResourceConflict[];
  availableResources?: Resource[];
}

// ============================================
// Invoice/Receipt Types
// ============================================

export interface EventInvoice {
  eventId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountReason?: string;
  total: number;
  paidAmount: number;
  remaining: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ============================================
// Calendar View Types
// ============================================

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  eventType: EventType;
  status: EventStatus;
  clientName: string;
  totalGuests: number;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    paymentStatus: PaymentStatus;
    total: number;
    paidAmount: number;
  };
}

export interface CalendarFilters {
  viewMode: CalendarViewMode;
  selectedDate: string;
  eventTypes: EventType[];
  statuses: EventStatus[];
  searchQuery: string;
}
