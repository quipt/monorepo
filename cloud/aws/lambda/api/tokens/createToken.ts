import * as AWS from 'aws-sdk';
import {nanoid} from 'nanoid';

const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();

const {HASHES_TABLE, UPLOAD_BUCKET_NAME} = process.env;

async function checkIfExists(hash: string) {
  const resp = await docClient
    .get({
      TableName: HASHES_TABLE!,
      Key: {
        hash: Buffer.from(hash, 'hex'),
      },
      AttributesToGet: ['id', 'uploadPending'],
    })
    .promise();

  return resp.Item;
}

export default async function createToken(
  hash: string,
  size: number,
  originalUploader: string
) {
  const hashItem = await checkIfExists(hash);

  if (hashItem?.id && hashItem?.uploadPending === false) {
    return {
      duplicate: hashItem.id,
    };
  }

  const key = nanoid();

  await docClient
    .put({
      TableName: HASHES_TABLE!,
      Item: {
        hash: Buffer.from(hash, 'hex'),
        id: key,
        uploadPending: true,
        originalUploader,
      },
    })
    .promise();

  const params = {
    Bucket: UPLOAD_BUCKET_NAME,
    Conditions: [
      {key},
      {acl: 'private'},
      ['starts-with', '$Content-Type', 'video/'],
      ['content-length-range', size, size],
      {'x-amz-content-sha256': hash},
    ],
  };

  const {fields} = s3.createPresignedPost(params);

  const fields_ = Object.entries(fields).reduce(
    (acc, [key, val]) => ({...acc, [key.replace('-', '_')]: val}),
    {}
  );

  return {
    key,
    fields: fields_,
  };
}
