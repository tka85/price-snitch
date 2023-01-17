#!/bin/bash

if [ "$( docker container inspect -f '{{.State.Status}}' price-tracker 2>/dev/null)" == "running" ]; then
    docker stop price-tracker
    docker rm price-tracker
fi

docker run -m 16G --name=price-tracker -v price-tracker:/opt/price-tracker/data tka85/price-tracker:latest