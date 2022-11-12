import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as util from 'util';
import * as crypto from 'crypto';
import {Readable} from 'stream';

import {S3} from '@aws-sdk/client-s3';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {
  UpdateCommand,
  UpdateCommandInput,
  PutCommand,
  PutCommandInput,
} from '@aws-sdk/lib-dynamodb';
import {S3Event, S3Handler} from 'aws-lambda';

type env = {
  PROCESSED_BUCKET: string;
  FFMPEG_ARGS: string;
  MIME_TYPES: string;
  VIDEO_MAX_DURATION: string;
  ENDPOINT_URL?: string;
  HASHES_TABLE: string;
};

const {
  PROCESSED_BUCKET,
  FFMPEG_ARGS = "-c:a copy -vf scale='min(320\\,iw):-2' -movflags +faststart out.mp4 -vf thumbnail -vf scale='min(320\\,iw):-2' -vframes 1 out.png",
  MIME_TYPES = '{"png":"image/png","mp4":"video/mp4"}',
  VIDEO_MAX_DURATION = '120',
  ENDPOINT_URL,
  HASHES_TABLE,
} = process.env as env;

const opts = ENDPOINT_URL ? {endpoint: ENDPOINT_URL} : {};

const s3 = new S3(opts);
const docClient = new DynamoDBClient({});

const tempDir = os.tmpdir();
const download = path.join(tempDir, 'download');
console.log(download);

/**
 * Creates a readable stream from an S3 Object reference
 */
async function downloadFile(Bucket: string, Key: string) {
  const {Body} = await s3.getObject({Bucket, Key});

  await new Promise<void>((resolve, reject) => {
    (Body as Readable)
      .pipe(fs.createWriteStream(download))
      .on('error', err => reject(err))
      .on('close', () => resolve());
  });
}

/**
 * Normalizes the location of a cloud storage object for S3
 */
export function getFileLocation({
  Records: [
    {
      s3: {bucket, object},
    },
  ],
}: S3Event): {bucket: string; key: string} {
  return {
    bucket: bucket.name,
    key: decodeURIComponent(object.key).replace(/\+/g, ' '),
  };
}

export function checkM3u(file: string) {
  const fileContents = fs.readFileSync(file).toString();

  if (/^#EXT/g.test(fileContents)) {
    throw new Error('File looks like an M3U, bailing out');
  }
}

const extensionRegex = /\.(\w+)$/;

function getExtension(filename: string) {
  return filename.match(extensionRegex)[1];
}

const outputDir = path.join(tempDir, 'outputs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const mimeTypes = JSON.parse(MIME_TYPES);
const videoMaxDuration = +VIDEO_MAX_DURATION;

/**
 * Runs FFprobe and ensures that the input file has a valid stream and meets the maximum duration threshold.
 */
async function ffprobe(): Promise<void> {
  console.log('Starting FFprobe');

  return new Promise((resolve, reject) => {
    const args: string[] = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-i',
      'download',
    ];
    const opts = {
      cwd: tempDir,
    };

    const output = child_process.execSync(['ffprobe', ...args].join(' '), opts);

    const stdout = output.toString();

    console.log(stdout);

    const {streams, format} = JSON.parse(stdout);

    const hasVideoStream = streams.some(
      ({codec_type, duration}: {codec_type: string; duration: number}) =>
        codec_type === 'video' &&
        (duration || format.duration) <= videoMaxDuration
    );

    if (!hasVideoStream) {
      reject('FFprobe: no valid video stream found');
    } else {
      console.log('Valid video stream found. FFprobe finished.');
      resolve();
    }
  });
}

/**
 * Runs the FFmpeg executable
 *
 * @param {string} keyPrefix - The prefix for the key (filename minus extension)
 * @returns {Promise}
 */
function ffmpeg(keyPrefix: string): Promise<void> {
  console.log('Starting FFmpeg');

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-loglevel',
      'warning',
      '-i',
      '../download',
      ...FFMPEG_ARGS.replace('$KEY_PREFIX', keyPrefix).split(' '),
    ];
    const opts = {
      cwd: outputDir,
    };

    child_process
      .spawn('ffmpeg', args, opts)
      .on('message', msg => console.log(msg))
      .on('error', reject)
      .on('close', resolve);
  });
}

/**
 * Deletes a file
 *
 * @param {!string} localFilePath - The location of the local file
 */
function removeFile(localFilePath: string) {
  console.log(`Deleting ${localFilePath}`);

  fs.unlinkSync(localFilePath);
}

/**
 * Transforms, uploads, and deletes an output file
 */
async function uploadFile(keyPrefix: string, filename: string) {
  const extension = getExtension(filename);
  const mimeType = mimeTypes[extension];
  const fileFullPath = path.join(outputDir, filename);
  const rmFiles = [fileFullPath];

  console.log(`Uploading ${mimeType}`);

  await s3.putObject({
    Bucket: PROCESSED_BUCKET,
    Key: `${keyPrefix}.${extension}`,
    Body: fs.readFileSync(fileFullPath),
    ContentType: mimeType,
    CacheControl: 'max-age=31536000',
  });

  console.log(`${mimeType} ${filename} complete.`);

  rmFiles.forEach(removeFile);
}

/**
 * Uploads the output files
 */
async function uploadFiles(keyPrefix: string) {
  return Promise.all(
    fs.readdirSync(outputDir).map(filename => uploadFile(keyPrefix, filename))
  );
}

async function confirmUpload(file: string) {
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest();

  const params: UpdateCommandInput = {
    TableName: HASHES_TABLE,
    Key: {
      hash,
    },
    UpdateExpression: 'set #0 = :0',
    ExpressionAttributeNames: {
      '#0': 'uploadPending',
    },
    ExpressionAttributeValues: {
      ':0': false,
    },
  };

  await docClient.send(new UpdateCommand(params));
}

async function addHashForNewFile(file: string, id: string) {
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest();

  const params: PutCommandInput = {
    TableName: HASHES_TABLE,
    Item: {
      hash,
      id,
      uploadPending: false,
      processed: true,
    },
  };

  await docClient.send(new PutCommand(params));
}

/**
 * The Lambda Function handler
 */
export const handler: S3Handler = async event => {
  console.log(util.inspect(event, {depth: 10}));
  const sourceLocation = getFileLocation(event);
  const keyPrefix = sourceLocation.key.replace(/\.[^/.]+$/, '');

  const s3Record = event.Records[0].s3;

  await downloadFile(s3Record.bucket.name, s3Record.object.key);
  checkM3u(download);
  await ffprobe();
  await confirmUpload(download);
  await ffmpeg(keyPrefix);
  removeFile(download);
  await addHashForNewFile(path.join(outputDir, 'out.mp4'), sourceLocation.key);
  await Promise.all([uploadFiles(keyPrefix)]);
};
