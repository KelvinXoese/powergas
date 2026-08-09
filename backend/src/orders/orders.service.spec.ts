import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem, OrderStatusHistory } from './entities/order-items.entity';
import { CylinderInventory } from '../inventory/entities/cylinder-inventory.entity';
import { OrderStatus } from '../common/enums';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockRepo = () => ({ findOne: jest.fn(), save: jest.fn(), update: jest.fn(), count: jest.fn(), findAndCount: jest.fn(), find: jest.fn() });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderStatusHistory), useValue: mockRepo() },
        { provide: getRepositoryToken(CylinderInventory), useValue: mockRepo() },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidTransition (private, tested via updateStatus)', () => {
    it('allows PENDING → ACCEPTED', () => {
      const valid = (service as any).isValidTransition(OrderStatus.PENDING, OrderStatus.ACCEPTED);
      expect(valid).toBe(true);
    });

    it('rejects PENDING → DELIVERED', () => {
      const valid = (service as any).isValidTransition(OrderStatus.PENDING, OrderStatus.DELIVERED);
      expect(valid).toBe(false);
    });

    it('rejects transitions out of COMPLETED', () => {
      const valid = (service as any).isValidTransition(OrderStatus.COMPLETED, OrderStatus.PENDING);
      expect(valid).toBe(false);
    });

    it('allows full happy path sequence', () => {
      const seq = [
        [OrderStatus.PENDING, OrderStatus.ACCEPTED],
        [OrderStatus.ACCEPTED, OrderStatus.INVENTORY_RESERVED],
        [OrderStatus.INVENTORY_RESERVED, OrderStatus.PREPARING],
        [OrderStatus.PREPARING, OrderStatus.RIDER_ASSIGNED],
        [OrderStatus.DELIVERED, OrderStatus.CUSTOMER_CONFIRMED],
      ];
      seq.forEach(([from, to]) => {
        expect((service as any).isValidTransition(from, to)).toBe(true);
      });
    });
  });
});
