// import * as pipelines from 'aws-cdk-lib/pipelines'
// import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
// import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

// class S3DeployStep extends pipelines.Step implements pipelines.ICodePipelineActionFactory {
//     constructor(
//         private readonly provider: codepipeline_actions.JenkinsProvider,
//         private readonly input: pipelines.FileSet
//     ) {
//         super('S3DeployStep');
//     }

//     public produceAction(stage: codepipeline.IStage, options: pipelines.ProduceActionOptions): pipelines.CodePipelineActionFactoryResult {

//       stage.addAction(new codepipeline_actions.S3DeployAction({
//           actionName: 'S3Deploy',
//           stage: deployStage,
//           bucket: targetBucket,
//           input: sourceOutput,
//           runOrder: options.runOrder,
//       }));

//       return { runOrdersConsumed: 1 };
//     }
//   }

//   // ...

//   pipeline.addStage(stage, {post: [new S3DeployStep()]});
// }
