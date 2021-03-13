import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as globalaccelerator from '@aws-cdk/aws-globalaccelerator';
import * as route53 from '@aws-cdk/aws-route53';
import * as ssm from '@aws-cdk/aws-ssm';
import {DbClusterStack} from '../data/db-cluster-stack';
import {EcsCdStack} from '../cd/ecs-cd-stack';
import {PrivateSubnetGroup} from '../network/private-subnet-group-construct';
import {NetworkStack} from '../network-stack';
import {DnsStack} from '../dns-stack';
import {RegionGroup} from '../application-account';
import {CrossRegionParameter} from '@henrist/cdk-cross-region-params';

export interface ApiStackProps extends cdk.StackProps {
  repositoryNamespace: string;
  imageTag: string;
  isProduction: boolean;
  ciAccount: string;
  network: NetworkStack;
  dns: DnsStack;
  cidr: string;
  regionGroup: RegionGroup;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const applicationName = 'api';
    const repositoryName = `${props.repositoryNamespace}/${applicationName}`;
    const containerPort = 3000;

    const subnetGroup = new PrivateSubnetGroup(this, 'SubnetGroup', {
      vpc: props.network.vpc,
      cidr: props.cidr,
      usedAzCount: props.network.azCount,
      maxAzCount: props.network.maxAzCount,
      networkAcl: props.network.workloads.networkAcl,
      routeTables: props.network.workloads.routeTables,
    });

    const database = new DbClusterStack(this, 'Data', {
      network: props.network,
      dbClusterIdentifier: applicationName,
      isProduction: props.isProduction,
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.network.vpc,
      description: `${applicationName} service`,
      allowAllOutbound: false,
    });

    securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
    securityGroup.addEgressRule(database.securityGroup, ec2.Port.tcp(5432));
    database.securityGroup.addIngressRule(securityGroup, ec2.Port.tcp(5432));

    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName,
      imageScanOnPush: true,
    });

    repository.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowPushFromCIAccount',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(props.ciAccount)],
        actions: [
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
          'ecr:BatchCheckLayerAvailability',
        ],
      })
    );

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      description: `Execution Role assumed by ${applicationName}`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonEC2ContainerRegistryReadOnly'
        ),
      ],
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      description: `Task Role assumed by ${applicationName}`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        SSMAgent: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssmmessages:CreateControlChannel',
                'ssmmessages:CreateDataChannel',
                'ssmmessages:OpenControlChannel',
                'ssmmessages:OpenDataChannel',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:PutLogEvents',
              ],
              resources: ['', '::log-stream:', ':/aws/smm/*'].map(
                suffix =>
                  `arn:${this.partition}:logs:${this.region}:${this.account}:log-group${suffix}`
              ),
            }),
          ],
        }),
      },
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'TaskDefinition',
      {
        family: applicationName,
        cpu: 1024,
        memoryLimitMiB: 2048,
        executionRole,
        taskRole,
      }
    );

    taskDefinition
      .addContainer('DefaultContainer', {
        image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
        logging: new ecs.AwsLogDriver({
          streamPrefix: applicationName,
          logRetention: 365,
        }),
        healthCheck: {
          command: [
            'CMD-SHELL',
            `curl -f http://localhost:${containerPort}/health || exit 1`,
          ],
          startPeriod: cdk.Duration.seconds(30),
        },
        environment: {
          DATABASE_HOST: database.endpointAddress,
          DATABASE_PORT: database.endpointPort,
          DATABASE_NAME: 'postgres',
          DATABASE_SSL: 'true',
        },
        secrets: {
          DATABASE_CREDENTIAL: ecs.Secret.fromSecretsManager(database.secret),
        },
      })
      .addPortMappings({containerPort});

    const debugTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      'DebugTaskDefinition',
      {
        family: `${applicationName}-debug`,
        cpu: 2048,
        memoryLimitMiB: 8192,
        executionRole,
        taskRole,
      }
    );

    debugTaskDefinition
      .addContainer('DefaultContainer', {
        image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
        command: ['sleep', 'infinity'],
        logging: new ecs.AwsLogDriver({
          streamPrefix: `${applicationName}-debug`,
          logRetention: 365,
        }),
        environment: {
          DATABASE_HOST: database.endpointAddress,
          DATABASE_PORT: database.endpointPort,
          DATABASE_NAME: 'postgres',
          DATABASE_SSL: 'true',
        },
        secrets: {
          DATABASE_CREDENTIAL: ecs.Secret.fromSecretsManager(database.secret),
        },
      })
      .addPortMappings({containerPort});

    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: applicationName,
      vpc: props.network.vpc,
    });

    const commonServiceProps: Partial<ecs.FargateServiceProps> = {
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      securityGroup,
      assignPublicIp: false,
      vpcSubnets: props.network.vpc.selectSubnets({
        subnets: subnetGroup.subnets,
      }),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    };

    const service = new ecs.FargateService(this, 'Service', {
      ...commonServiceProps,
      cluster,
      serviceName: `${applicationName}-service`,
      taskDefinition,
      desiredCount: 0,
    });

    const debugService = new ecs.FargateService(this, 'DebugService', {
      ...commonServiceProps,
      cluster,
      serviceName: `${applicationName}-debug`,
      taskDefinition: debugTaskDefinition,
      desiredCount: 0,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      deregistrationDelay: cdk.Duration.seconds(15),
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: containerPort,
      vpc: props.network.vpc,
      healthCheck: {
        interval: cdk.Duration.seconds(30),
        port: `${containerPort}`,
        path: '/health',
      },
      targetType: elbv2.TargetType.IP,
    });

    service.attachToApplicationTargetGroup(targetGroup);

    const loadBalancerSecurityGroup = new ec2.SecurityGroup(
      this,
      'LoadBalancerSecurityGroup',
      {
        vpc: props.network.vpc,
        description: `${applicationName} service load balancer`,
        allowAllOutbound: false,
      }
    );

    loadBalancerSecurityGroup.addEgressRule(
      securityGroup,
      ec2.Port.tcp(containerPort)
    );
    securityGroup.addIngressRule(
      loadBalancerSecurityGroup,
      ec2.Port.tcp(containerPort)
    );

    const loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      'LoadBalancer',
      {
        vpc: props.network.vpc,
        securityGroup: loadBalancerSecurityGroup,
        internetFacing: false,
        vpcSubnets: props.network.vpc.selectSubnets({
          subnets: props.network.internalLoadBalancers.subnetGroup.subnets,
        }),
      }
    );

    const loadBalancerListener = loadBalancer.addListener(
      'LoadBalancerListener',
      {
        port: 443,
        certificates: [
          {
            certificateArn: props.dns.certificate.certificateArn,
          },
        ],
        open: true,
      }
    );

    loadBalancerListener.addTargetGroups('Targets', {
      targetGroups: [targetGroup],
    });

    let acceleratorListener: globalaccelerator.IListener;
    const acceleratorListenerParameterName = [
      props.regionGroup.name,
      applicationName,
      'acceleratorListenerArn',
    ].join('/');

    if (this.region === props.regionGroup.primaryRegion) {
      const accelerator = new globalaccelerator.Accelerator(
        this,
        'Accelerator',
        {
          acceleratorName: [props.regionGroup.name, applicationName].join('-'),
        }
      );

      acceleratorListener = new globalaccelerator.Listener(
        this,
        'AcceleratorListener',
        {
          accelerator,
          portRanges: [{fromPort: 443, toPort: 443}],
        }
      );

      const recordSet = new route53.RecordSet(this, 'RecordSet', {
        zone: props.dns.publicHostedZone,
        recordName: 'api',
        recordType: route53.RecordType.A,
        target: route53.RecordTarget.fromValues(accelerator.dnsName),
      });

      for (const region of props.regionGroup.replicaRegions) {
        const crossRegionParameter = new CrossRegionParameter(
          this,
          `AcceleratorListenerParameter-${region}`,
          {
            name: acceleratorListenerParameterName,
            region,
            value: acceleratorListener.listenerArn,
          }
        );
      }
    } else {
      acceleratorListener = globalaccelerator.Listener.fromListenerArn(
        this,
        'AcceleratorListenerArn',
        ssm.StringParameter.valueForStringParameter(
          this,
          acceleratorListenerParameterName
        )
      );
    }

    const endpointGroup = new globalaccelerator.EndpointGroup(
      this,
      'EndpointGroup',
      {
        listener: acceleratorListener,
      }
    );

    endpointGroup.addLoadBalancer('LoadBalancer', loadBalancer);

    const cd = new EcsCdStack(this, 'CD', {
      ecrAccount: this.account,
      imageTag: props.imageTag,
      repository,
      cluster,
      services: [
        {name: 'Service', service},
        {name: 'DebugService', service: debugService},
      ],
    });
  }
}
