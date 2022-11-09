#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  AwsSolutionsChecks,
  HIPAASecurityChecks,
  NIST80053R4Checks,
  NIST80053R5Checks,
  PCIDSS321Checks,
} from 'cdk-nag';
import {Aspects} from 'aws-cdk-lib';
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
  {
    applicationAccountType: ApplicationAccountType.prod,
    brand: Brand.Quipt,
    accountId: '929570751740',
    auth0Issuer: 'https://quipt.us.auth0.com/',
    auth0ClientId: 'pEWqq2rrEN1alynHNzu5odaux7uNTFnY',
    regionGroups: [
      {
        name: 'US',
        primaryRegion: globalPrimaryRegion,
        replicaRegions: [],
      },
    ],
    baseDomain,
  },
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

// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
// Aspects.of(app).add(new HIPAASecurityChecks({ verbose: true }));
// Aspects.of(app).add(new NIST80053R4Checks({ verbose: true }));
// Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
// Aspects.of(app).add(new PCIDSS321Checks({ verbose: true }));

app.synth();
