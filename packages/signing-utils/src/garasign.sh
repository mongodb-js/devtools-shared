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
if [ -z ${method+omitted} ]; then echo "method must either be gpg, rpm_gpg or jsign" && exit 1; fi

ARTIFACTORY_HOST="artifactory.corp.mongodb.com"
ENV_FILE="signing-envfile"

echo "GRS_CONFIG_USER1_USERNAME=${username}" >> "${ENV_FILE}"
echo "GRS_CONFIG_USER1_PASSWORD=${password}" >> "${ENV_FILE}"

cleanup() {
  docker logout "${ARTIFACTORY_HOST}" > /dev/null 2>&1
  rm -r "${ENV_FILE}" || true
  echo "Logged out from artifactory"
}
trap cleanup EXIT

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
    --env-file="${ENV_FILE}" \
    --rm \
    -v $directory:$directory \
    -w $directory \
    ${ARTIFACTORY_HOST}/release-tools-container-registry-local/garasign-gpg \
    /bin/bash -c "gpgloader && gpg --yes -v --armor -o '$file.sig' --detach-sign '$file'"
}

jsign_sign() {
  docker run \
    --env-file="${ENV_FILE}" \
    --rm \
    -v $directory:$directory \
    -w $directory \
    ${ARTIFACTORY_HOST}/release-tools-container-registry-local/garasign-jsign \
    /bin/bash -c "jsign -t 'http://timestamp.digicert.com' -a 'mongo-authenticode-2021' '$file'"
}

rpm_gpg_sign() {
  # For signing an rpm using garasign-gpg image, we need to install rpm and then import the signing key (keyId)
  # into rpm manually. This script assumes, by default there's only one key in the gpg keyring and it's the one
  # to be used for signing. The rpm signing command is copied from: 
  # https://github.com/mongodb-devprod-infrastructure/barque/blob/3c03fe0b6a5a0d0221a78d688de6015f546fc495/sign/rpm.go#L21
  docker run \
    --env-file="${ENV_FILE}" \
    --rm \
    -v $directory:$directory \
    -w $directory \
    ${ARTIFACTORY_HOST}/release-tools-container-registry-local/garasign-gpg \
    /bin/bash -c "gpgloader \
      && apt update -y && apt install -y rpm \
      && keyId=\$(gpg --list-keys --keyid-format=long --with-colons  | awk -F: 'NR==2 {print \$5}') \
      && tmpFile=\$(mktemp) && gpg --export -a \$keyId > \$tmpFile && rpm --import \$tmpFile && rm \$tmpFile \
      && rpm --addsign \
        --define \"_gpg_name \$keyId\" \
        --define \"__gpg_sign_cmd \$(which gpg) \$(which gpg) --local-user=\$keyId --verbose --verbose --no-armor --digest-algo=sha256 --output %{__signature_filename} --detach-sign %{__plaintext_filename}\" $file \
    "
}

if [[ $method == "gpg" ]]; then
  gpg_sign 
elif [[ $method == "rpm_gpg" ]]; then
  rpm_gpg_sign
elif [[ $method == "jsign" ]]; then
  jsign_sign
else
  echo "Unknown signing method: $method"
  exit 1
fi
echo "Finished signing $file"