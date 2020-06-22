import path from 'path';
import { getCustomRepository, getRepository, Not, In } from 'typeorm';
import fs from 'fs';
import csvParse from 'csv-parse';
import TransactionsRepository from '../repositories/TransactionsRepository';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
// import AppError from '../errors/AppError';

interface Request {
  csvFilename: string;
}

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async loadCSV(filePath: string): Promise<CSVTransaction[]> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const csvTransactions = [] as CSVTransaction[];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line;
      csvTransactions.push({ title, value, type, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return csvTransactions;
  }

  async execute({ csvFilename }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const csvFilePath = path.join(uploadConfig.directory, csvFilename);

    const csvTransactions = await this.loadCSV(csvFilePath);

    const csvCategoriesWithoutDuplicates = csvTransactions
      .map(csvTransaction => csvTransaction.category)
      .filter((category, index, self) => self.indexOf(category) === index);

    const existingCategories = await categoriesRepository.find({
      where: {
        title: In(csvCategoriesWithoutDuplicates),
      },
    });

    const existingCategoriesTitle = existingCategories.map(
      existingCategory => existingCategory.title,
    );

    const newCategories = csvCategoriesWithoutDuplicates.filter(
      csvCategory => !existingCategoriesTitle.includes(csvCategory),
    );

    const categories = await categoriesRepository.create(
      newCategories.map(newCategory => ({ title: newCategory })),
    );

    const allCategories = [...existingCategories, ...categories];

    await categoriesRepository.save(categories);

    const transactions = transactionsRepository.create(
      csvTransactions.map(csvTransaction => ({
        title: csvTransaction.title,
        value: csvTransaction.value,
        type: csvTransaction.type,
        category: allCategories.find(
          category => category.title === csvTransaction.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    fs.promises.unlink(csvFilePath);

    return transactions;
  }
}

export default ImportTransactionsService;
