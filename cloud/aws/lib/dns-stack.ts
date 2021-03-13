import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';

export interface DnsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  zoneName: string;
}

export class DnsStack extends cdk.Stack {
  readonly publicHostedZone: route53.PublicHostedZone;
  readonly privateHostedZone: route53.PrivateHostedZone;
  readonly certificate: certificatemanager.Certificate;

  constructor(scope: cdk.Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Hosted Zones

    this.publicHostedZone = new route53.PublicHostedZone(
      this,
      'PublicHostedZone',
      {
        zoneName: props.zoneName,
      }
    );

    this.privateHostedZone = new route53.PrivateHostedZone(
      this,
      'PrivateHostedZone',
      {
        zoneName: props.zoneName,
        vpc: props.vpc,
      }
    );

    // Certificates

    this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: `*.${props.zoneName}`,
      validationMethod: certificatemanager.ValidationMethod.DNS,
    });
  }
}
