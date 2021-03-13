import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import {NetworkBuilder} from '@aws-cdk/aws-ec2/lib/network-util';
import {PublicNetworkStack} from './network/public-network-stack';
import {DataNetworkStack} from './network/data-network-stack';
import {WorkloadsNetworkStack} from './network/workloads-network-stack';
import {InternalLoadBalancersNetworkStack} from './network/internal-load-balancers-network-stack';

export interface NetworkStackProps extends cdk.StackProps {
  vpcCidr: string;
  azCount: number;
  maxAzCount?: number;
}

export interface Cidrs {
  public: string;
  internalLoadBalancers: string;
  data: string;
  endpoints: string;
  workloads: string;
}

export class NetworkStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly internetGateway: ec2.CfnInternetGateway;
  readonly public: PublicNetworkStack;
  readonly internalLoadBalancers: InternalLoadBalancersNetworkStack;
  readonly data: DataNetworkStack;
  readonly workloads: WorkloadsNetworkStack;
  readonly azCount: number;
  readonly maxAzCount: number;
  readonly cidrs: Cidrs;

  constructor(scope: cdk.Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.azCount = props.azCount;
    this.maxAzCount = props.maxAzCount || 8;

    const networkBuilder = new NetworkBuilder(props.vpcCidr);

    this.cidrs = {
      public: networkBuilder.addSubnet(22),
      internalLoadBalancers: networkBuilder.addSubnet(22),
      data: networkBuilder.addSubnet(22),
      endpoints: networkBuilder.addSubnet(22),
      workloads: networkBuilder.addSubnet(17),
    };

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: props.vpcCidr,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [],
    });

    this.internetGateway = new ec2.CfnInternetGateway(this, 'InternetGateway');

    const vpcInternetGatewayAttachment = new ec2.CfnVPCGatewayAttachment(
      this,
      'VpcInternetGatewayAttachment',
      {
        vpcId: this.vpc.vpcId,
        internetGatewayId: this.internetGateway.ref,
      }
    );

    const commonProps = {
      vpc: this.vpc,
      cidrs: this.cidrs,
      usedAzCount: props.azCount,
      maxAzCount: this.maxAzCount,
    };

    this.public = new PublicNetworkStack(this, 'Public', {
      ...commonProps,
      gatewayId: this.internetGateway.ref,
    });

    this.internalLoadBalancers = new InternalLoadBalancersNetworkStack(
      this,
      'InternalLoadBalancers',
      {
        ...commonProps,
      }
    );

    this.data = new DataNetworkStack(this, 'Data', {
      ...commonProps,
    });

    this.workloads = new WorkloadsNetworkStack(this, 'Workloads', {
      ...commonProps,
      publicNetwork: this.public,
    });
  }
}
