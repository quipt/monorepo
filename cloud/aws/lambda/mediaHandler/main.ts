import * as AWS from 'aws-sdk';
import {S3Event, Context} from 'aws-lambda';

export async function handler(event: S3Event, context: Context) {
  console.log({event, context});
}