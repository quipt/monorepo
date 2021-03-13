#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {
  ApplicationAccountType,
  ApplicationAccount,
  Brand,
} from '../lib/application-account';
// import { CIAccount } from '../lib/ci-account';
import {CdkPipelineStack} from '../lib/cdk-pipeline-stack';

const globalPrimaryAccountId = '204102652951'; // Quipt Primary
const globalPrimaryRegion = 'us-east-1';

const applicationAccounts = [
  {
    applicationAccountType: ApplicationAccountType.dev,
    brand: Brand.Quipt,
    accountId: '264149948773',
    auth0ClientId: '',
    regionGroups: [
      {
        name: 'US',
        primaryRegion: globalPrimaryRegion,
        replicaRegions: [],
      },
    ],
    baseDomain: 'dev.qui.pt',
  },
  // {
  //   applicationAccountType: ApplicationAccountType.test,
  //   brand: Brand.Quipt,
  //   accountId: '387742483181',
  //   auth0ClientId: '',
  //   regionGroups: [{
  //     name: 'US',
  //     primaryRegion: globalPrimaryRegion,
  //     replicaRegions: ['us-east-2', 'us-west-2'],
  //   }],
  //   baseDomain: 'test.qui.pt',
  // },
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
  //   baseDomain: 'qui.pt',
  // },
].map(
  props =>
    new ApplicationAccount({
      ciAccountId: globalPrimaryAccountId,
      ...props,
    })
);

// const ciAccount = new CIAccount({
//   accountId: globalPrimaryAccountId,
//   region: globalPrimaryRegion,
//   applicationAccounts,
// });

const app = new cdk.App();

const cdkPipelineStack = new CdkPipelineStack(app, 'CdkPipelineStack', {
  env: {
    account: globalPrimaryAccountId,
    region: globalPrimaryRegion,
  },
  applicationAccounts,
  // ciAccount,
});

app.synth();
