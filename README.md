# What is it?
- A full-stack web application in a monorepo
- TypeScript all the way... CDK for IaC, Angular front-end, AppSync & TypeScript lambda backends
- The CDK Pipeline
  - Builds and deploys the pipeline itself
  - Builds the lambda functions and angular application
  - Deploys the CloudFormation and Angular application for each environment

# What can you do with it?
- Log in with Auth0
- Upload short videos and make boards out of them
- Favorite a board
- Caption the videos
- Delete videos and boards

# Areas that need improvement
- Testing
  - cdk
  - angular
  - lambda
  - synthetics
- Documentation (need to update REAMDEs)
- UI
  - Home page (logged in and logged out)
  - All/my boards list, need to paginate
  - Implement features on the features list
- The GraphQL API schema
  - Pagination