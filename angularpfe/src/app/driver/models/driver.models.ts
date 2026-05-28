/**
 * Modèles de données pour le module Chauffeur GoRide.
 * Ces interfaces définissent la structure exacte attendue par le backend.
 */

export interface DriverProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalRides: number;
  completedTrips: number;
  memberSince: string;
  isOnline: boolean;
  licenseNumber: string;
  city: string;
  address: string;
  cin: string;
  role: string;
  status: 'VALIDATED' | 'PENDING' | 'REJECTED';
  
  // Driver specific
  mainZone: string;
  experienceYears: number;
  licenseSince: number;
  availability: string;
  acceptanceRate: number;
  cancellationRate: number;
  bio: string;
}

export type DocumentStatus = 'VALIDATED' | 'PENDING' | 'MISSING' | 'REJECTED';

export interface DriverDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  uploadDate?: string;
  fileUrl?: string;
}

export interface DriverPreferences {
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  autoAvailability: boolean;
  preferredRadius: number;
  preferredZone: string;
}

export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  type: 'Berline' | 'SUV' | 'Van' | 'Économique';
  status: 'active' | 'maintenance' | 'inactive';
  image: string;
  insuranceExpiry: string;
  technicalControlExpiry: string;
  fuelType: string;
  mileage: number;
}

export type RideStatus = 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'annulee';

export interface Ride {
  id: string;
  passengerName: string;
  passengerAvatar: string;
  passengerPhone: string;
  passengerRating: number;
  from: string;
  to: string;
  distance: string;
  duration: string;
  date: string;
  time: string;
  amount: number;
  status: RideStatus;
  paymentMethod: 'cash' | 'card';
  notes?: string;
}

export interface RideRequest {
  id: string;
  passengerName: string;
  passengerAvatar: string;
  passengerRating: number;
  from: string;
  to: string;
  distance: string;
  estimatedDuration: string;
  estimatedAmount: number;
  requestedAt: string;
  vehicleType: string;
  paymentMethod: 'cash' | 'card';
}

export interface Earning {
  id: string;
  rideId: string;
  date: string;
  passengerName: string;
  from: string;
  to: string;
  route: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  tip: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
}

export interface EarningStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  todayRides: number;
  weekRides: number;
  monthRides: number;
  averagePerRide: number;
  weeklyData: number[];
  weeklyLabels: string[];
}

export interface Review {
  id: number;
  passengerName: string;
  passengerAvatar: string;
  rating: number;
  comment: string;
  date: string;
  rideId: string;
}

export type HistoryType = 
  | 'TRIP_COMPLETED' 
  | 'TRIP_CANCELLED' 
  | 'REQUEST_ACCEPTED' 
  | 'REQUEST_REJECTED' 
  | 'EARNING_CREATED' 
  | 'PAYMENT_RECEIVED' 
  | 'WITHDRAWAL_REQUESTED' 
  | 'VEHICLE_RENTED' 
  | 'VEHICLE_RENTAL_COMPLETED' 
  | 'REVIEW_RECEIVED';

export type HistoryStatus = 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'PAID' 
  | 'PENDING' 
  | 'ACTIVE';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  description: string;
  date: string;
  status: HistoryStatus;
  amount?: number;
  relatedEntityId?: string;
  relatedEntityType?: string;
  icon?: string;
  metadata?: any;
}

export interface HistorySummary {
  completedTrips: number;
  cancelledTrips: number;
  totalEarnings: number;
  totalReviews: number;
}

export type ConversationType = 'PASSENGER' | 'OWNER' | 'SUPPORT' | 'COMPANY';

export interface ChatMessage {
  id: string;
  sender: 'DRIVER' | 'PARTICIPANT' | 'SUPPORT';
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'file';
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantName: string;
  participantRole: string;
  avatar?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'TRIP' | 'REQUEST' | 'VEHICLE' | 'SUPPORT' | 'OFFER';
  relatedTitle?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'ACTIVE' | 'ARCHIVED';
  messages: ChatMessage[];
}

export type NotificationType = 
  | 'NEW_REQUEST' 
  | 'REQUEST_ACCEPTED' 
  | 'REQUEST_REJECTED' 
  | 'NEW_MESSAGE' 
  | 'PAYMENT_RECEIVED' 
  | 'WITHDRAWAL_STATUS' 
  | 'EARNING_CREATED' 
  | 'VEHICLE_RENTED' 
  | 'REVIEW_RECEIVED' 
  | 'COMPANY_OFFER' 
  | 'DOCUMENT_STATUS' 
  | 'SYSTEM';

export interface DriverNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  important: boolean;
  actionUrl: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: any;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  important: number;
  today: number;
}

export type ReviewerType = 'PASSENGER' | 'COMPANY';

export interface DriverReview {
  id: string;
  reviewerType: ReviewerType;
  reviewerName: string;
  reviewerRole?: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  relatedEntityId?: string;
  relatedEntityType?: 'TRIP' | 'OFFER' | 'MISSION';
  relatedTitle?: string;
  status: 'PUBLISHED' | 'HIDDEN';
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  passengerReviews: number;
  companyReviews: number;
}

export interface DriverGivenReview {
  id: string;
  rentalId: string;
  driverId: string;
  vehicleId: string;
  vehicleName: string;
  ownerId: string;
  ownerName: string;
  ownerRating: number;
  ownerComment: string;
  vehicleRating: number;
  vehicleComment: string;
  recommendOwner: boolean;
  recommendVehicle: boolean;
  createdAt: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface VehicleRentalHistory {
  rentalId: string;
  vehicleId: string;
  vehicleName: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  status: 'COMPLETED' | 'ONGOING' | 'CANCELLED';
  price?: number;
}

export interface DriverAvailabilitySettings {
  autoOnline: boolean;
  workingDays: { day: string; active: boolean }[];
  startTime: string;
  endTime: string;
  autoBreak: boolean;
  mainZone: string;
  workRadius: number;
}

export interface DriverTripPreferences {
  sharedTrips: boolean;
  companyMissions: boolean;
  longDistance: boolean;
  minDistance: number;
  maxDistance: number;
  minPrice: number;
  maxPassengers: number;
}

export interface DriverRequestSettings {
  autoAccept: boolean;
  minPassengerRating: number;
  rejectOutOfZone: boolean;
  maxWaitingTime: number;
  immediateRequests: boolean;
  scheduledRequests: boolean;
}

export interface DriverNotificationSettings {
  newRequest: boolean;
  newMessage: boolean;
  paymentReceived: boolean;
  withdrawalStatus: boolean;
  reviewReceived: boolean;
  companyOffer: boolean;
  documentStatus: boolean;
  availabilityReminder: boolean;
  app: boolean;
  email: boolean;
  sms: boolean;
}

export interface DriverPrivacySettings {
  showPhone: boolean;
  showVehicle: boolean;
  showRating: boolean;
  allowCompanyContact: boolean;
  allowPerformanceData: boolean;
  hideProfileOffline: boolean;
}

export interface DriverAppSettings {
  language: string;
  theme: string;
  timeFormat: string;
  distanceUnit: string;
  currency: string;
}

export interface FullDriverSettings {
  availability: DriverAvailabilitySettings;
  tripPreferences: DriverTripPreferences;
  requestSettings: DriverRequestSettings;
  notifications: DriverNotificationSettings;
  privacy: DriverPrivacySettings;
  app: DriverAppSettings;
}
