export interface Review {
    id?: number;
    reservationId: number;
    clientId?: number;
    clientName?: string;
    vehicleId?: number;
    vehicleName?: string;
    ownerId?: number;
    ownerName?: string;
    vehicleRating: number;
    ownerRating: number;
    comment: string;
    createdAt?: Date;
    updatedAt?: Date;
}
