#! /usr/bin/env bash

set -e

if [ -z "$1" ]; then
  echo "Usage: garasign.sh <file>"
  exit 1
fi

if [ -z ${garasign_username+omitted} ]; then echo "garasign_username is unset" && exit 1; fi
if [ -z ${garasign_password+omitted} ]; then echo "garasign_password is unset" && exit 1; fi
if [ -z ${artifactory_username+omitted} ]; then echo "artifactory_username is unset" && exit 1; fi
if [ -z ${artifactory_password+omitted} ]; then echo "artifactory_password is unset" && exit 1; fi
if [ -z ${method+omitted} ]; then echo "method must either be gpg or jsign" && exit 1; fi

ARTIFACTORY_HOST="artifactory.corp.mongodb.com"

logout_artifactory() {
  docker logout "${ARTIFACTORY_HOST}" > /dev/null 2>&1
  echo "Logged out from artifactory"
}
trap logout_artifactory EXIT

echo "Logging into docker artifactory"
echo "${artifactory_password}" | docker login --password-stdin --username ${artifactory_username} ${ARTIFACTORY_HOST} > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Docker login failed" >&2
  exit 1
fi

directory=$(pwd)
file=$1

echo "File to be signed: $file using $method"
echo "Working directory: $directory"

gpg_sign() {
  docker run \
    -e GRS_CONFIG_USER1_USERNAME="${garasign_username}" \
    -e GRS_CONFIG_USER1_PASSWORD="${garasign_password}" \
    --rm \
    -v $directory:$directory \
    -w $directory \
    ${ARTIFACTORY_HOST}/release-tools-container-registry-local/garasign-gpg \
    /bin/bash -c "gpgloader && gpg --yes -v --armor -o '$file.sig' --detach-sign '$file'"
}

jsign_sign() {
  docker run \
    -e GRS_CONFIG_USER1_USERNAME="${garasign_username}" \
    -e GRS_CONFIG_USER1_PASSWORD="${garasign_password}" \
    --rm \
    -v $directory:$directory \
    -w $directory \
    artifactory.corp.mongodb.com/release-tools-container-registry-local/garasign-jsign \
    /bin/bash -c "jsign -t 'http://timestamp.digicert.com' -a 'mongo-authenticode-2021' '$file'"
}

if [[ $method == "gpg" ]]; then
  gpg_sign 
elif [[ $method == "jsign" ]]; then
  jsign_sign
else
  echo "Unknown signing method: $method"
  exit 1
fi
echo "Finished signing $file"