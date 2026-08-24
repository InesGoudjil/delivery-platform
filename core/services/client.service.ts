import { Client } from '@/core/entities/client';
import { IClientRepository, CreateClientDTO } from '@/core/repositories/client.repository';

export class ClientService {
  constructor(private readonly clientRepo: IClientRepository) {}

  async getClientById(id: string): Promise<Client | null> {
    return this.clientRepo.findById(id);
  }

  async listClients(workspaceId: string): Promise<Client[]> {
    return this.clientRepo.listByWorkspaceId(workspaceId);
  }

  async createClient(dto: CreateClientDTO): Promise<Client> {
    if (dto.phoneNumber) {
      const existing = await this.clientRepo.findByPhone(dto.workspaceId, dto.phoneNumber);
      if (existing) return existing;
    }

    if (dto.email) {
      const existing = await this.clientRepo.findByEmail(dto.workspaceId, dto.email);
      if (existing) return existing;
    }

    return this.clientRepo.create(dto);
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return this.clientRepo.update(id, data);
  }

  async deleteClient(id: string): Promise<void> {
    return this.clientRepo.delete(id);
  }
}
