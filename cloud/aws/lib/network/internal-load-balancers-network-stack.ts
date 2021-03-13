import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import {PrivateSubnetGroup} from './private-subnet-group-construct';
import {PublicNetworkAclEntries} from './public-network-acl-entries-construct';
import {Cidrs} from '../network-stack';

export interface InternalLoadBalancersNetworkStackProps
  extends cloudformation.NestedStackProps {
  vpc: ec2.Vpc;
  cidrs: Cidrs;
  usedAzCount: number;
  maxAzCount: number;
}

export class InternalLoadBalancersNetworkStack extends cloudformation.NestedStack {
  readonly networkAcl: ec2.NetworkAcl;
  readonly subnetGroup: PrivateSubnetGroup;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: InternalLoadBalancersNetworkStackProps
  ) {
    super(scope, id, props);

    this.networkAcl = new ec2.NetworkAcl(this, 'NetworkAcl', {
      vpc: props.vpc,
    });

    this.subnetGroup = new PrivateSubnetGroup(this, 'SubnetGroup', {
      vpc: props.vpc,
      cidr: props.cidrs.internalLoadBalancers,
      networkAcl: this.networkAcl,
      usedAzCount: props.usedAzCount,
      maxAzCount: props.maxAzCount,
    });

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
