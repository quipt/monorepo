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
  // Validate hash
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return null;
  }

  // Validate size
  if (size > 0x3200000) {
    return null;
  }

  const hashItem = await checkIfExists(hash);

  if (hashItem?.id && hashItem?.uploadPending === false) {
    return {
      __typename: 'Duplicate',
      duplicate: hashItem.id,
    };
  }

  const key = hashItem?.id || nanoid();

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
    (acc, [key, val]) => ({...acc, [key.replace(/-/g, '_')]: val}),
    {}
  );

  return {
    __typename: 'Token',
    key,
    fields: fields_,
  };
}
