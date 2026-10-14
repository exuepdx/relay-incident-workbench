#!/usr/bin/env bash
# Deploys the Northstar telemetry API to an AWS Lambda function URL in us-east-1.
# Requires: aws cli v2 with credentials, Node 22, esbuild (npm i -D esbuild).
#
#   TELEMETRY_API_TOKEN=$(openssl rand -hex 24) ./deploy-lambda.sh
#
set -euo pipefail
REGION="${AWS_REGION:-us-east-1}"
FN="${LAMBDA_NAME:-northstar-telemetry-api}"
ROLE="${LAMBDA_ROLE:-northstar-telemetry-api-role}"
: "${TELEMETRY_API_TOKEN:?Set TELEMETRY_API_TOKEN to a random secret}"

cd "$(dirname "$0")"
npm run --silent build:lambda

if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  sleep 10
fi
ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)

if aws lambda get-function --function-name "$FN" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FN" --region "$REGION" --zip-file fileb://lambda.zip >/dev/null
  aws lambda wait function-updated --function-name "$FN" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FN" --region "$REGION" \
    --environment "Variables={TELEMETRY_API_TOKEN=$TELEMETRY_API_TOKEN}" >/dev/null
else
  aws lambda create-function --function-name "$FN" --region "$REGION" \
    --runtime nodejs22.x --handler index.handler --role "$ROLE_ARN" \
    --zip-file fileb://lambda.zip --timeout 10 --memory-size 256 \
    --environment "Variables={TELEMETRY_API_TOKEN=$TELEMETRY_API_TOKEN}" >/dev/null
  aws lambda wait function-active --function-name "$FN" --region "$REGION"
  aws lambda add-permission --function-name "$FN" --region "$REGION" \
    --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl \
    --principal '*' --function-url-auth-type NONE >/dev/null
  aws lambda create-function-url-config --function-name "$FN" --region "$REGION" --auth-type NONE >/dev/null
fi
URL=$(aws lambda get-function-url-config --function-name "$FN" --region "$REGION" --query FunctionUrl --output text)
echo "TELEMETRY_API_URL=$URL"
echo "Verify: curl -s -H 'Authorization: Bearer \$TELEMETRY_API_TOKEN' ${URL}incidents"
