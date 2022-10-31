import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import {Construct} from 'constructs';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export interface DnsStackProps extends cdk.StackProps {
  zoneName: string;
}

export class DnsStack extends cdk.Stack {
  readonly publicHostedZone: route53.PublicHostedZone;
  readonly privateHostedZone?: route53.PrivateHostedZone;
  readonly certificate: certificatemanager.Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Hosted Zones

    this.publicHostedZone = new route53.PublicHostedZone(
      this,
      'PublicHostedZone',
      {
        zoneName: props.zoneName,
      }
    );

    // Certificates

    this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: props.zoneName,
      subjectAlternativeNames: [`*.${props.zoneName}`],
      validation: certificatemanager.CertificateValidation.fromDns(
        this.publicHostedZone
      ),
    });
  }
}
