export enum VehicleStatus {
    AVAILABLE = 'AVAILABLE',
    RENTED = 'RENTED',
    MAINTENANCE = 'MAINTENANCE',
    UNAVAILABLE = 'UNAVAILABLE'
}

export enum RentalStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

export interface Vehicle {
    id?: number;
    brand: string;
    model: string;
    licensePlate: string;
    seats: number;
    hasWifi: boolean;
    hasBabySeat: boolean;
    luggageCapacity: number;
    fuelType: string;
    year: number;
    transmission: string;
    location: string;
    latitude?: number;
    longitude?: number;
    dailyPrice: number;
    photoUrl: string;
    imageUrl?: string;
    description: string;
    color: string;
    category: string;
    hasAC: boolean;
    mileage: number;
    insuranceInfo: string;
    depositAmount: number;
    consumption: string;
    status: VehicleStatus;
    available?: boolean;
    rating?: number;
    owner?: any;
}

export interface RentalContract {
    id?: number;
    vehicle: Vehicle;
    renter: any;
    owner: any;
    startDate: string;
    endDate: string;
    proposedPrice: number;
    driverDiscountPercentage: number;
    finalPrice: number;
    totalPrice?: number;
    status: RentalStatus;
    paymentStatus?: string;
    pickupLocation?: string;
    returnLocation?: string;
    clientNotes?: string;
    createdAt?: string;
}

export interface RentalRequest {
    vehicleId: number;
    startDate: string;
    endDate: string;
    pickupLocation?: string;
    returnLocation?: string;
    message?: string;
    proposedPrice?: number;
    clientNotes?: string;
}
