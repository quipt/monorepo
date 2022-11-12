import {handler} from './main';
import {Context} from 'aws-lambda';

const event = {
  Records: [
    {
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-east-1',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      userIdentity: {
        principalId: 'EXAMPLE',
      },
      requestParameters: {
        sourceIPAddress: '127.0.0.1',
      },
      responseElements: {
        'x-amz-request-id': 'EXAMPLE123456789',
        'x-amz-id-2':
          'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH',
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'testConfigRule',
        bucket: {
          name: 'quipt-dev-us-us-east-1-appsy-uploadbucketd2c1da78-19gcoqwfgf3a',
          ownerIdentity: {
            principalId: 'EXAMPLE',
          },
          arn: 'arn:aws:s3:::quipt-dev-us-us-east-1-appsy-uploadbucketd2c1da78-19gcoqwfgf3a',
        },
        object: {
          key: 'SampleVideo_1280x720_10mb.mp4',
          size: 1024,
          eTag: '0123456789abcdef0123456789abcdef',
          sequencer: '0A1B2C3D4E5F678901',
        },
      },
    },
  ],
};

handler(event, {} as Context, () => { return null; });
