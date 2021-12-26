import * as AWS from 'aws-sdk';
import {S3Event, Context} from 'aws-lambda';
import * as util from 'util';

export async function handler(event: S3Event, context: Context) {
  console.log(util.inspect(event, {depth: 10}));
  console.log(process.env);
}
