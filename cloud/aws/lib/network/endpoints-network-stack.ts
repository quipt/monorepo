import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import { PrivateSubnetGroup } from './private-subnet-group-construct';
import { Cidrs } from '../network-stack';

export interface EndpointsNetworkStackProps
  extends cloudformation.NestedStackProps {
  vpc: ec2.Vpc;
  cidrs: Cidrs;
  usedAzCount: number;
  maxAzCount: number;
}

export class EndpointsNetworkStack extends cdk.NestedStack {
  readonly networkAcl: ec2.NetworkAcl;
  readonly subnetGroup: PrivateSubnetGroup;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: EndpointsNetworkStackProps
  ) {
    super(scope, id, props);

    this.networkAcl = new ec2.NetworkAcl(this, 'NetworkAcl', {
      vpc: props.vpc,
    });

    this.subnetGroup = new PrivateSubnetGroup(this, 'SubnetGroup', {
      vpc: props.vpc,
      cidr: props.cidrs.endpoints,
      networkAcl: this.networkAcl,
      usedAzCount: props.usedAzCount,
      maxAzCount: props.maxAzCount,
    });

    // Ingress ACLs

    const networkAclIngressWorkloads = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressWorkloads',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.cidrs.workloads),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(443),
      }
    );

    // Egress ACLs

    const networkAclEgressWorkloads = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressWorkloads',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.cidrs.workloads),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );
  }
}
