import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {DnsStack} from './dns-stack';
import {WebStack, WebStackProps} from './applications/web-stack';
import {RegionGroup} from './application-account';
import {AppsyncStack} from './applications/appsync-stack';

export interface ApplicationStageProps extends cdk.StageProps {
  isProduction: boolean;
  vpcCidr: string;
  azCount: number;
  zoneName: string;
  ciAccountId: string;
  imageTag: string;
  regionGroup: RegionGroup;
  web: Pick<WebStackProps, 'configJson'>;
  auth0ClientId: string;
  auth0Issuer: string;
}

export class ApplicationStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: ApplicationStageProps) {
    super(scope, id, props);

    const dns = new DnsStack(this, 'DNS', {
      zoneName: props.zoneName,
    });

    const applicationProps = {
      repositoryNamespace: 'quipt',
      dns,
      imageTag: props.imageTag,
      ciAccount: props.ciAccountId,
      regionGroup: props.regionGroup,
    };

    const web = new WebStack(this, 'Web', {
      ...applicationProps,
      ...props.web,
    });

    const appsync = new AppsyncStack(this, 'Appsync', {
      clientId: props.auth0ClientId,
      issuer: props.auth0Issuer,
      dns,
    });
  }
}
