import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactionsRepository = getRepository(Transaction);
    const transactions = await transactionsRepository.find();

    const income = transactions.reduce((total: number, item: Transaction) => {
      return total + (item.type === 'income' ? item.value : 0);
    }, 0);

    const outcome = transactions.reduce((total: number, item: Transaction) => {
      return total + (item.type === 'outcome' ? item.value : 0);
    }, 0);

    const total = income - outcome;

    const balance = {
      income,
      outcome,
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
