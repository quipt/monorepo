import * as cdk from '@aws-cdk/core';
import {WebStackProps} from './applications/web-stack';
import {ApplicationStage} from './application-stage';

const availabilityZoneCounts = new Map([
  ['us-east-1', 4],
  ['us-east-2', 3],
  ['us-west-2', 4],
]);

export enum Brand {
  Quipt = 'Quipt',
}

export enum ApplicationAccountType {
  dev = 'dev',
  test = 'test',
  prod = 'prod',
}

export interface RegionGroup {
  name: string;
  primaryRegion: string;
  replicaRegions: string[];
}

export class ApplicationAccount {
  applicationAccountType!: ApplicationAccountType;
  accountId: string;
  ciAccountId: string;
  brand: Brand;
  baseDomain: string;
  regionGroups: RegionGroup[];
  auth0ClientId: string;

  constructor(props: {
    applicationAccountType: ApplicationAccountType;
    accountId: string;
    ciAccountId: string;
    regionGroups?: RegionGroup[];
    brand: Brand;
    baseDomain: string;
    auth0ClientId: string;
  }) {
    this.applicationAccountType = props.applicationAccountType;
    this.accountId = props.accountId;
    this.ciAccountId = props.ciAccountId;
    this.regionGroups = props.regionGroups || [
      {
        name: 'US',
        primaryRegion: 'us-east-1',
        replicaRegions: [],
      },
    ];
    this.brand = props.brand;
    this.baseDomain = props.baseDomain;
    this.auth0ClientId = props.auth0ClientId;
  }

  get allRegions() {
    return [
      ...new Set(
        this.regionGroups
          .map(regionGroup => [
            regionGroup.primaryRegion,
            ...regionGroup.replicaRegions,
          ])
          .flat()
      ),
    ];
  }

  get prefix() {
    return [this.brand, this.applicationAccountType].join('-');
  }

  get isProduction() {
    return this.applicationAccountType === ApplicationAccountType.prod;
  }

  get branch() {
    return this.isProduction
      ? 'master'
      : this.applicationAccountType.toString();
  }

  get imageTag() {
    return `branch_${this.branch}`;
  }

  get zoneName() {
    return this.isProduction
      ? this.baseDomain
      : [this.applicationAccountType, this.baseDomain].join('.');
  }

  get webConfig(): Pick<WebStackProps, 'configJson'> {
    const audience = `https://${['api', this.zoneName].join('.')}/`;

    return {
      configJson: JSON.stringify({
        apiUri: `${audience}graphql`,
        auth0: {
          domain: `${this.brand.toLowerCase()}.us.auth0.com`,
          clientId: this.auth0ClientId,
          audience,
        },
        theme: this.brand.toLowerCase(),
        brand: this.brand,
      }),
    };
  }

  stages(construct: cdk.Construct) {
    return this.regionGroups
      .map(regionGroup =>
        [regionGroup.primaryRegion, ...regionGroup.replicaRegions].map(
          region =>
            new ApplicationStage(
              construct,
              [
                this.brand,
                this.applicationAccountType,
                regionGroup.name,
                region,
              ].join('-'),
              {
                env: {account: this.accountId, region},
                isProduction: this.isProduction,
                vpcCidr: `10.${[...availabilityZoneCounts.keys()].indexOf(
                  region
                )}.0.0/16`,
                regionGroup,
                azCount: availabilityZoneCounts.get(region)!,
                zoneName: this.zoneName,
                ciAccountId: this.ciAccountId,
                imageTag: this.imageTag,
                web: this.webConfig,
              }
            )
        )
      )
      .flat();
  }
}
