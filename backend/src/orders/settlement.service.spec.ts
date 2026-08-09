import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SettlementService } from './settlement.service';
import { Order } from './entities/order.entity';
import { OrderItem, OrderStatusHistory } from './entities/order-items.entity';
import { GasStation } from '../stations/entities/gas-station.entity';
import { RidersService } from '../riders/riders.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderStatus } from '../common/enums';

describe('SettlementService', () => {
  let service: SettlementService;
  let orderRepo: any;
  let ridersService: jest.Mocked<Partial<RidersService>>;
  let inventoryService: jest.Mocked<Partial<InventoryService>>;
  let txnManager: any;

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), update: jest.fn() };
    ridersService = { creditWallet: jest.fn() };
    inventoryService = { commitReservation: jest.fn() };

    txnManager = {
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn((_e, v) => v),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(OrderStatusHistory), useValue: {} },
        { provide: getRepositoryToken(GasStation), useValue: {} },
        { provide: DataSource, useValue: { transaction: (cb: any) => cb(txnManager) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
        { provide: RidersService, useValue: ridersService },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  it('is idempotent — does nothing if already COMPLETED', async () => {
    orderRepo.findOne.mockResolvedValue({ id: '1', status: OrderStatus.COMPLETED });
    await service.settle('1');
    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  it('skips when order is not confirmed', async () => {
    orderRepo.findOne.mockResolvedValue({ id: '1', status: OrderStatus.DELIVERED });
    await service.settle('1');
    expect(orderRepo.update).not.toHaveBeenCalled();
  });

  it('splits total into commission + station + rider and credits rider', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: '1', orderNumber: 'PG-1', status: OrderStatus.CUSTOMER_CONFIRMED,
      total: 130, deliveryFee: 10, stationId: 'st1', riderId: 'r1',
    });

    await service.settle('1');

    // commission = 10% of 130 = 13; rider = 70% of 10 = 7; station = 130 - 13 - 7 = 110
    expect(txnManager.update).toHaveBeenCalledWith(Order, '1', expect.objectContaining({
      platformCommission: 13,
      riderEarning: 7,
      stationEarning: 110,
      status: OrderStatus.COMPLETED,
    }));
    expect(ridersService.creditWallet).toHaveBeenCalledWith('r1', 7, '1', expect.anything());
  });
});
