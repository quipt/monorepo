import { Injectable } from '@nestjs/common';
import { ReturnModel, InjectModel } from '@skypress/nestjs-dynamodb';
import { User } from './user.schema';
import { UserInput } from './user.input';

const returnModel = ReturnModel<User>();

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof returnModel,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id);
  }

  async create(input: UserInput): Promise<User> {
    return this.userModel.create(input);
  }

  async delete(input: string) {
    return this.userModel.findByIdAndDelete(input);
  }

  async update(id: string, item: UserInput): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, item);
  }

  async find(input: Partial<UserInput>): Promise<User[]> {
    return this.userModel.find(input);
  }
}