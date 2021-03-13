import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { PublicNetworkAclEntries } from './public-network-acl-entries-construct';
import { Cidrs } from '../network-stack';

export interface PublicNetworkStackProps
  extends cloudformation.NestedStackProps {
  vpc: ec2.Vpc;
  gatewayId: string;
  cidrs: Cidrs;
  usedAzCount: number;
  maxAzCount: number;
}

export class PublicNetworkStack extends cloudformation.NestedStack {
  readonly networkAcl: ec2.NetworkAcl;
  readonly subnets: ec2.Subnet[] = [];
  readonly routeTables: ec2.CfnRouteTable[] = [];
  readonly natGateways: ec2.CfnNatGateway[] = [];

  constructor(
    scope: cdk.Construct,
    id: string,
    props: PublicNetworkStackProps
  ) {
    super(scope, id, props);

    this.networkAcl = new ec2.NetworkAcl(this, 'NetworkAcl', {
      vpc: props.vpc,
    });

    // Subnets

    const networkBuilder = new NetworkBuilder(props.cidrs.public);
    const mask = networkBuilder.networkCidr.mask + Math.log2(props.maxAzCount);

    for (let i = 0; i < props.usedAzCount; i++) {
      this.routeTables[i] = new ec2.CfnRouteTable(this, `RouteTable${i}`, {
        vpcId: props.vpc.vpcId,
      });

      const routeTableDefaultRoute = new ec2.CfnRoute(
        this,
        `RouteTableDefaultRoute${i}`,
        {
          destinationCidrBlock: '0.0.0.0/0',
          gatewayId: props.gatewayId,
          routeTableId: this.routeTables[i].ref,
        }
      );

      this.subnets[i] = new ec2.Subnet(this, `Subnet${i}`, {
        availabilityZone: props.vpc.availabilityZones[i],
        cidrBlock: networkBuilder.addSubnet(mask),
        mapPublicIpOnLaunch: false,
        vpcId: props.vpc.vpcId,
      });

      this.subnets[i].node.tryRemoveChild('RouteTable');
      this.subnets[i].node.tryRemoveChild('RouteTableAssociation');

      const subnetNetworkAclAssociation = new ec2.SubnetNetworkAclAssociation(
        this,
        `SubnetNetworkAclAssociation${i}`,
        {
          subnet: this.subnets[i],
          networkAcl: this.networkAcl,
        }
      );

      const cfnSubnetRouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(
        this,
        `SubnetRouteTableAssociation${i}`,
        {
          subnetId: this.subnets[i].subnetId,
          routeTableId: this.routeTables[i].ref,
        }
      );

      const eip = new ec2.CfnEIP(this, `Eip${i}`, {
        domain: props.vpc.vpcId,
      });

      this.natGateways[i] = new ec2.CfnNatGateway(this, `NatGateway${i}`, {
        subnetId: this.subnets[i].subnetId,
        allocationId: eip.attrAllocationId,
      });
    }

    const networkAclEntries = new PublicNetworkAclEntries(
      this,
      'PublicNetworkAclEntries',
      {
        networkAcl: this.networkAcl,
        vpcCidrBlock: props.vpc.vpcCidrBlock,
        workloadsCidr: props.cidrs.workloads,
      }
    );
  }
}
