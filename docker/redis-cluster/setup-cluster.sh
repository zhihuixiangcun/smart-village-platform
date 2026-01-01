#!/bin/bash
# Redis Cluster Setup Script for Smart Village Platform
# This script initializes the Redis cluster with 3 masters and 3 replicas

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Smart Village Redis Cluster Setup ===${NC}"

# Check if Redis containers are running
echo -e "${YELLOW}Checking Redis containers...${NC}"
containers=("sv-redis-master-1" "sv-redis-master-2" "sv-redis-master-3"
            "sv-redis-replica-1" "sv-redis-replica-2" "sv-redis-replica-3")

for container in "${containers[@]}"; do
    if docker ps | grep -q $container; then
        echo -e "${GREEN}✓${NC} $container is running"
    else
        echo -e "${RED}✗${NC} $container is not running. Please start the cluster first with: docker-compose up -d"
        exit 1
    fi
done

# Wait for Redis to be ready
echo -e "${YELLOW}Waiting for Redis nodes to be ready...${NC}"
sleep 10

# Create the cluster
echo -e "${YELLOW}Creating Redis Cluster...${NC}"

docker exec sv-redis-master-1 redis-cli --cluster create \
  redis-master-1:7001 \
  redis-master-2:7002 \
  redis-master-3:7003 \
  --cluster-replicas 1 \
  --cluster-yes

# Verify cluster status
echo -e "${GREEN}Checking cluster status...${NC}"
docker exec sv-redis-master-1 redis-cli --cluster check redis-master-1:7001

# Show cluster nodes
echo -e "${GREEN}Cluster nodes:${NC}"
docker exec sv-redis-master-1 redis-cli -p 7001 cluster nodes

# Test cluster
echo -e "${YELLOW}Testing cluster...${NC}"
docker exec sv-redis-master-1 redis-cli -p 7001 set test:cluster "Smart Village Cache OK"
result=$(docker exec sv-redis-master-1 redis-cli -p 7001 get test:cluster)
if [ "$result" = "Smart Village Cache OK" ]; then
    echo -e "${GREEN}✓ Cluster test passed!${NC}"
else
    echo -e "${RED}✗ Cluster test failed!${NC}"
    exit 1
fi

echo -e "${GREEN}=== Redis Cluster Setup Complete ===${NC}"
echo -e "${GREEN}Redis Commander UI: http://localhost:8081${NC}"
echo -e "${GREEN}Prometheus Metrics:${NC}"
echo -e "  - Node 1: http://localhost:9121/metrics"
echo -e "  - Node 2: http://localhost:9122/metrics"
echo -e "  - Node 3: http://localhost:9123/metrics"
