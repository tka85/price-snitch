#!/bin/bash

[[ "`jq -r .dependencies.chromedriver ./package.json | awk -F'.' '{print$1"."$2}'`" != "`google-chrome-stable --version | awk -F' ' '{print$3}' | awk -F. '{print$1"."$2}'`" ]] && \
    echo -e "\nERROR:\n\tInstalled version of $(google-chrome-stable --version)is not compatible with chromdriver npm packge version $(jq -r .dependencies.chromedriver ./package.json)" && \
    exit 1;

exit 0;
