import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('insufficient balance');
    }

    const categoryFound = await categoriesRepository.findOne({
      where: { title: category },
    });

    let newCategory;
    if (!categoryFound) {
      const categoryCreated = await categoriesRepository.create({
        title: category,
      });
      newCategory = await categoriesRepository.save(categoryCreated);
    }

    const transaction = await transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryFound
        ? categoryFound.id
        : newCategory && newCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
