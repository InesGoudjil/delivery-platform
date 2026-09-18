import { Delivery, DeliveryStatus, CreateDeliveryDTO, UpdateDeliveryDTO } from "../entities/delivery";

export interface IDeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
  findByShareToken(shareToken: string): Promise<Delivery | null>;
  listByWorkspaceId(workspaceId: string): Promise<Delivery[]>;
  listByClientId(clientId: string): Promise<Delivery[]>;
  create(dto: CreateDeliveryDTO): Promise<Delivery>;
  update(id: string, data: UpdateDeliveryDTO): Promise<Delivery>;
  updateStatus(id: string, status: DeliveryStatus, approvedByName?: string): Promise<Delivery>;
  delete(id: string): Promise<void>;
}
