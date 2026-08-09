import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Address) private readonly addressRepo: Repository<Address>,
  ) {}

  async createProfile(userId: string): Promise<Customer> {
    const customer = this.customerRepo.create({ userId });
    return this.customerRepo.save(customer);
  }

  async findByUserId(userId: string): Promise<Customer> {
    let customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) {
      // Lazily provision a customer profile on first access.
      customer = await this.createProfile(userId);
    }
    return customer;
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.addressRepo.update({ userId }, { isDefault: false });
    }
    const address = this.addressRepo.create({ ...dto, userId });
    return this.addressRepo.save(address);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressRepo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'DESC' } });
  }

  async updateAddress(userId: string, addressId: string, dto: Partial<CreateAddressDto>): Promise<Address> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    if (dto.isDefault) await this.addressRepo.update({ userId }, { isDefault: false });
    await this.addressRepo.update(addressId, dto);
    return this.addressRepo.findOneOrFail({ where: { id: addressId } });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    await this.addressRepo.softDelete(addressId);
  }
}
