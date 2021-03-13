import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface PublicNetworkAclEntriesProps {
  networkAcl: ec2.NetworkAcl;
  vpcCidrBlock: string;
  workloadsCidr: string;
}

export class PublicNetworkAclEntries extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: PublicNetworkAclEntriesProps
  ) {
    super(scope, id);

    // Ingress ACLs

    const networkAclIngressWorkloadsEphemeral = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressWorkloadsEphemeral',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.workloadsCidr),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    const networkAclIngressVpcDeny = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressVpcDeny',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 1000,
        cidr: ec2.AclCidr.ipv4(props.vpcCidrBlock),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.DENY,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclIngressInternetHttps = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressInternetHttps',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 1200,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(443),
      }
    );

    const networkAclIngressInternetEphemeral = new ec2.NetworkAclEntry(
      this,
      'NetworkAclIngressInternetEphemeral',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 1300,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );

    // Egress ACLs

    const networkAclEgressWorkloads = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressWorkloads',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(props.workloadsCidr),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclEgressVpcDeny = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressVpcDeny',
      {
        networkAcl: props.networkAcl,
        ruleNumber: 1000,
        cidr: ec2.AclCidr.ipv4(props.vpcCidrBlock),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.DENY,
        traffic: ec2.AclTraffic.allTraffic(),
      }
    );

    const networkAclEgressInternetHttp = new ec2.NetworkAclEntry(
      this,
      'NetworkAclEgressInternetHttp',
      {
        networkAcl: props.networkAcl,
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
        networkAcl: props.networkAcl,
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
        networkAcl: props.networkAcl,
        ruleNumber: 1300,
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      }
    );
  }
}
