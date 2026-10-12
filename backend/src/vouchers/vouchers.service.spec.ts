import { BadRequestException } from '@nestjs/common';
import { UserRole, VoucherStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.guard.js';
import { SignatureStorage } from '../signatures/signature-storage.js';
import { VoucherDetails, VoucherRepository } from './voucher.repository.js';
import { VouchersService } from './vouchers.service.js';

const employee: AuthenticatedUser = {
  id: 'employee-1',
  email: 'employee@example.test',
  role: UserRole.EMPLOYEE,
};

const draft = {
  id: 'voucher-1',
  status: VoucherStatus.DRAFT,
  employeeSignaturePath: null,
  directorSignaturePath: null,
  amount: { toNumber: () => 12.5 },
} as unknown as VoucherDetails;

describe('VouchersService', () => {
  let repository: VoucherRepository;
  let storage: SignatureStorage;
  let service: VouchersService;
  let list: ReturnType<typeof vi.fn>;
  let submit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    submit = vi.fn();
    repository = {
      createDraft: vi.fn(),
      findOne: vi.fn().mockResolvedValue(draft),
      list,
      updateDraft: vi.fn(),
      deleteDraft: vi.fn(),
      attachEmployeeSignature: vi.fn(),
      submit,
      approve: vi.fn(),
      reject: vi.fn(),
    } as unknown as VoucherRepository;
    storage = {
      save: vi.fn(),
      getAbsolutePath: vi.fn(),
      remove: vi.fn(),
    } as unknown as SignatureStorage;
    service = new VouchersService(repository, storage);
  });

  it('scopes employee voucher lists to the authenticated employee', async () => {
    await service.list(employee, { page: 1, pageSize: 20 } as never);

    expect(list).toHaveBeenCalledWith({
      ownerId: employee.id,
      query: { page: 1, pageSize: 20 },
    });
  });

  it('refuses to submit a draft without an employee signature', async () => {
    await expect(service.submit(employee, draft.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(submit).not.toHaveBeenCalled();
  });
});