import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsrepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsrepository.findOne(id);

    if (!transaction) {
      throw new AppError('transaction not found');
    }

    await transactionsrepository.delete(transaction.id);
  }
}

export default DeleteTransactionService;
