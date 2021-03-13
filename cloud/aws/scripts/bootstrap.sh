#!/usr/bin/env bash

export CDK_NEW_BOOTSTRAP=1
export PIPELINE_ACCOUNT_ID=204102652951

sso() {
  unset AWS_PROFILE
  export AWS_PROFILE=$1
  aws sts get-caller-identity &> /dev/null || aws sso login || (unset AWS_PROFILE && aws-configure-sso-profile --profile $1)
  eval $(aws-export-credentials --env-export)
}

sso quipt-primary
yarn cdk bootstrap \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust ${PIPELINE_ACCOUNT_ID} \
    aws://204102652951/us-east-1

sso quipt-prod
yarn cdk bootstrap \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust ${PIPELINE_ACCOUNT_ID} \
    aws://929570751740/us-east-1

sso quipt-test
yarn cdk bootstrap \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust ${PIPELINE_ACCOUNT_ID} \
    aws://387742483181/us-east-1

sso quipt-dev
yarn cdk bootstrap \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust ${PIPELINE_ACCOUNT_ID} \
    aws://264149948773/us-east-1