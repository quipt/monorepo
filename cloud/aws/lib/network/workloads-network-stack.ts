import * as cdk from '@aws-cdk/core';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import * as ec2 from '@aws-cdk/aws-ec2';
import {Cidrs} from '../network-stack';
import {PublicNetworkStack} from './public-network-stack';

export interface PrivateNetworkStackProps
  extends cloudformation.NestedStackProps {
  vpc: ec2.Vpc;
  usedAzCount: number;
  cidrs: Cidrs;
  publicNetwork: PublicNetworkStack;
}

export class WorkloadsNetworkStack extends cloudformation.NestedStack {
  readonly routeTables: ec2.CfnRouteTable[] = [];
  readonly networkAcl: ec2.NetworkAcl;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: PrivateNetworkStackProps
  ) {
    super(scope, id, props);

    for (let i = 0; i < props.usedAzCount; i++) {
      this.routeTables[i] = new ec2.CfnRouteTable(this, `RouteTable${i}`, {
        vpcId: props.vpc.vpcId,
      });

      const cfnRoute = new ec2.CfnRoute(this, `RouteTableDefaultRoute${i}`, {
        destinationCidrBlock: '0.0.0.0/0',
        natGatewayId: props.publicNetwork.natGateways[i].ref,
        routeTableId: this.routeTables[i].ref,
      });
    }

    this.networkAcl = new ec2.NetworkAcl(this, 'NetworkAcl', {
      vpc: props.vpc,
    });

    // Ingress ACLs

    const networkAclIngressPublic = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressPublic',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.cidrs.public),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclIngressInternalLoadBalancers = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressInternalLoadBalancers',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 200,
        cidr: ec2.AclCidr.ipv4(props.cidrs.internalLoadBalancers),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclIngressData = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressData',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 300,
        cidr: ec2.AclCidr.ipv4(props.cidrs.data),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    const networkAclIngressEndpoints = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressEndpoints',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 400,
        cidr: ec2.AclCidr.ipv4(props.cidrs.endpoints),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    const networkAclIngressVpcDeny = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressVpcDeny',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1000,
        cidr: ec2.AclCidr.ipv4(props.vpc.vpcCidrBlock),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.DENY,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclIngressInternetEphemeral = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressInternetEphemeral',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1100,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    // Egress ACLs

    const networkAclEgressPublic = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressPublic',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.cidrs.public),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    const networkAclEgressInternalLoadBalancers = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressInternalLoadBalancers',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.cidrs.internalLoadBalancers),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    const networkAclEgressData = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressData',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 200,
        cidr: ec2.AclCidr.ipv4(props.cidrs.data),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(5432),
      }
    );

    const networkAclEgressEndpoints = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressEndpoints',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 300,
        cidr: ec2.AclCidr.ipv4(props.cidrs.endpoints),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(443),
      }
    );

    const networkAclEgressVpcDeny = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressVpcDeny',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1000,
        cidr: ec2.AclCidr.ipv4(props.vpc.vpcCidrBlock),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.DENY,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclEgressInternetHttp = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressInternetHttp',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1100,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(80),
      }
    );

    const networkAclEgressInternetHttps = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressInternetHttps',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1200,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(443),
      }
    );

    const networkAclEgressInternetEphemeral = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressInternetEphemeral',
      {
        networkAcl: this.networkAcl,
        ruleNumber: 1300,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );
  }
}
