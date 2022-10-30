# Welcome to the Quipt CDK TypeScript project!

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `yarn build`           compile typescript to js
 * `yarn watch`           watch for changes and compile
 * `yarn test`            perform the jest unit tests
 * `yarn cdk deploy`      deploy this stack to your default AWS account/region
 * `yarn cdk diff`        compare deployed stack with current state
 * `yarn cdk synth`       emits the synthesized CloudFormation template

# Account Structure
There are several AWS accounts involved that separate concerns when deploying to different environments.

## CI Account
The CI account hosts the CDK Pipeline and does the deployments.

## Application Accounts
The application or workload accounts host the application and infrastructure itself. Each environment gets its own AWS account.

# Application Architecture
![Architecture Diagram](./doc/architecture.svg)
