import { Injectable } from '@nestjs/common';
import { ReturnModel, InjectModel } from '@skypress/nestjs-dynamodb';
import { Board } from './board.schema';
// import { BoardInput } from './board.input';

const ReturnModelInstance = ReturnModel<Board>()

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board)
    private readonly boardModel: typeof ReturnModelInstance,
  ) {}

  async findAll(): Promise<Board[]> {
    return this.boardModel.find();
  }

  async findById(id: string): Promise<Board> {
    return this.boardModel.findById(id);
  }

  // async create(input: BoardInput): Promise<Board> {
  //   return this.boardModel.create(input);
  // }

  // async delete(input: string): Promise<DynamoDB.DeleteItemOutput> {
  //   return this.boardModel.findByIdAndDelete(input)
  // }

  // async update(id: string, item: BoardInput): Promise<Board> {
  //   return this.boardModel.findByIdAndUpdate(id, item)
  // }

  // async find(input: Partial<BoardInput>): Promise<Board[]> {
  //   return this.boardModel.find(input)
  // }
}
