import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import {NetworkBuilder} from '@aws-cdk/aws-ec2/lib/network-util';

export interface SubnetGroupProps {
  vpc: ec2.Vpc;
  cidr: string;
  usedAzCount: number;
  maxAzCount: number;
  networkAcl: ec2.NetworkAcl;
  routeTables?: ec2.CfnRouteTable[];
}

export class PrivateSubnetGroup extends cdk.Construct {
  readonly routeTables: ec2.CfnRouteTable[] = [];
  readonly subnets: ec2.Subnet[] = [];

  constructor(scope: cdk.Construct, id: string, props: SubnetGroupProps) {
    super(scope, id);

    const networkBuilder = new NetworkBuilder(props.cidr);
    const mask = networkBuilder.networkCidr.mask + Math.log2(props.maxAzCount);

    for (let i = 0; i < props.usedAzCount; i++) {
      this.routeTables[i] = props.routeTables
        ? props.routeTables[i]
        : new ec2.CfnRouteTable(this, `RouteTable${i}`, {
            vpcId: props.vpc.vpcId,
          });

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
          networkAcl: props.networkAcl,
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
    }
  }
}
