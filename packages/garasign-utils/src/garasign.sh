#! /usr/bin/env bash

if [ -z "$1" ]; then
  echo "Usage: garasign.sh <file>"
  exit 1
fi

if [ -z ${garasign_username+omitted} ]; then echo "garasign_username is unset" && exit 1; fi
if [ -z ${garasign_password+omitted} ]; then echo "garasign_password is unset" && exit 1; fi
if [ -z ${artifactory_username+omitted} ]; then echo "artifactory_username is unset" && exit 1; fi
if [ -z ${artifactory_password+omitted} ]; then echo "artifactory_password is unset" && exit 1; fi

ARTIFACTORY_HOST="artifactory.corp.mongodb.com"

logout_artifactory() {
  docker logout "${ARTIFACTORY_HOST}" > /dev/null 2>&1
  echo "Logged out from artifactory"
}
trap logout_artifactory EXIT

echo "Logging into docker artifactory"
echo "${artifactory_password}" | docker login --password-stdin --username ${artifactory_username} ${ARTIFACTORY_HOST} > /dev/null 2>&1

# If the docker login failed, exit
[ $? -ne 0 ] && exit $?

cat <<EOL > signing-envfile
GRS_CONFIG_USER1_USERNAME=${garasign_username}
GRS_CONFIG_USER1_PASSWORD=${garasign_password}
EOL

directory=$(pwd)
file=$1

echo "File to be signed: $file"
echo "Working directory: $directory"

docker run \
  --env-file=signing-envfile \
  --rm \
  -v $directory:$directory \
  -w $directory \
  ${ARTIFACTORY_HOST}/release-tools-container-registry-local/garasign-gpg \
  /bin/bash -c "gpgloader && gpg --yes -v --armor -o $file.sig --detach-sign $file"

rm signing-envfile
echo "Finished signing $file"