#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  ApplicationAccountType,
  ApplicationAccount,
  Brand,
} from '../lib/application-account';
import {CdkPipelineStack} from '../lib/cdk-pipeline-stack';

const globalPrimaryAccountId = '204102652951'; // Quipt Primary
const globalPrimaryRegion = 'us-east-1';
const baseDomain = 'qui.pt';

const applicationAccounts = [
  {
    applicationAccountType: ApplicationAccountType.dev,
    brand: Brand.Quipt,
    accountId: '264149948773',
    auth0Issuer: 'https://quipt.us.auth0.com/',
    auth0ClientId: 'CYJFCD8djT400wpCS57Sn1E2799jx9fm',
    regionGroups: [
      {
        name: 'US',
        primaryRegion: globalPrimaryRegion,
        replicaRegions: [],
      },
    ],
    baseDomain,
  },
  {
    applicationAccountType: ApplicationAccountType.test,
    brand: Brand.Quipt,
    accountId: '387742483181',
    auth0Issuer: 'https://quipt.us.auth0.com/',
    auth0ClientId: 'KGdVPmiBLURfCxiGo5TQb0KEZ1n1LDUk',
    regionGroups: [
      {
        name: 'US',
        primaryRegion: globalPrimaryRegion,
        replicaRegions: [],
      },
    ],
    baseDomain,
  },
  // {
  //   applicationAccountType: ApplicationAccountType.prod,
  //   brand: Brand.Quipt,
  //   accountId: '264149948773',
  //   auth0ClientId: '',
  //   regionGroups: [{
  //     name: 'US',
  //     primaryRegion: globalPrimaryRegion,
  //     replicaRegions: ['us-east-2', 'us-west-2'],
  //   }],
  //   baseDomain,
  // },
].map(
  props =>
    new ApplicationAccount({
      ciAccountId: globalPrimaryAccountId,
      ...props,
    })
);

const app = new cdk.App();

const cdkPipelineStack = new CdkPipelineStack(app, 'CdkPipelineStack', {
  env: {
    account: globalPrimaryAccountId,
    region: globalPrimaryRegion,
  },
  applicationAccounts,
});

app.synth();
