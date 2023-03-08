#!/bin/bash

if [ "$( docker container inspect -f '{{.State.Status}}' price-snitch 2>/dev/null)" == "running" ]; then
    docker stop price-snitch
    docker rm price-snitch
fi

docker run -m 16G --name=price-snitch -v price-snitch:/home/node/data tka85/price-snitch:latest