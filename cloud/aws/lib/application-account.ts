import {Construct} from 'constructs';
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
  auth0Issuer: string;

  constructor(props: {
    applicationAccountType: ApplicationAccountType;
    accountId: string;
    ciAccountId: string;
    regionGroups?: RegionGroup[];
    brand: Brand;
    baseDomain: string;
    auth0ClientId: string;
    auth0Issuer: string;
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
    this.auth0Issuer = props.auth0Issuer;
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
        awsmobile: {
          aws_appsync_graphqlEndpoint: `${audience}graphql`,
          aws_appsync_region: 'us-east-1',
          aws_appsync_authenticationType: 'OPENID_CONNECT',
        },
      }),
    };
  }

  stageName(regionGroupName: string, region: string) {
    return [
      this.brand,
      this.applicationAccountType,
      regionGroupName,
      region,
    ].join('-');
  }

  stages(construct: Construct) {
    return this.regionGroups
      .map(regionGroup =>
        [regionGroup.primaryRegion, ...regionGroup.replicaRegions].map(
          region =>
            new ApplicationStage(
              construct,
              this.stageName(regionGroup.name, region),
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
                auth0ClientId: this.auth0ClientId,
                auth0Issuer: this.auth0Issuer,
              }
            )
        )
      )
      .flat();
  }
}
