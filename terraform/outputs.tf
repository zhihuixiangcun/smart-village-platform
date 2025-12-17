# Output values for Smart Village Platform Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

# EKS Cluster Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

# Node Groups Outputs
output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
}

# Database Outputs
output "aurora_cluster_endpoint" {
  description = "RDS Aurora cluster endpoint"
  value       = module.aurora.cluster_endpoint
}

output "aurora_cluster_reader_endpoint" {
  description = "RDS Aurora cluster reader endpoint"
  value       = module.aurora.cluster_reader_endpoint
}

output "aurora_cluster_id" {
  description = "RDS Aurora cluster identifier"
  value       = module.aurora.cluster_id
}

output "aurora_cluster_resource_id" {
  description = "RDS Aurora cluster resource ID"
  value       = module.aurora.cluster_resource_id
}

output "aurora_cluster_members" {
  description = "List of RDS instances that are a part of this cluster"
  value       = module.aurora.cluster_members
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.redis_endpoint
}

output "redis_port" {
  description = "Redis cluster port"
  value       = module.redis.redis_port
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint"
  value       = module.redis.redis_configuration_endpoint
  sensitive   = true
}

# S3 Outputs
output "uploads_bucket_id" {
  description = "Name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "ARN of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_domain_name" {
  description = "Domain name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.bucket_domain_name
}

# Security Outputs
output "eks_cluster_security_group_id" {
  description = "ID of the EKS cluster security group"
  value       = aws_security_group.eks_additional.id
}

output "eks_node_security_group_id" {
  description = "ID of the EKS node shared security group"
  value       = aws_security_group.eks_nodes.id
}

# KMS Outputs
output "eks_kms_key_arn" {
  description = "ARN of the KMS key used for EKS encryption"
  value       = aws_kms_key.eks.arn
}

output "s3_kms_key_arn" {
  description = "ARN of the KMS key used for S3 encryption"
  value       = aws_kms_key.s3.arn
}

output "cloudwatch_kms_key_arn" {
  description = "ARN of the KMS key used for CloudWatch encryption"
  value       = aws_kms_key.cloudwatch.arn
}

# IAM Outputs
output "aws_load_balancer_controller_role_arn" {
  description = "ARN of the AWS Load Balancer Controller IAM role"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "external_dns_role_arn" {
  description = "ARN of the External DNS IAM role"
  value       = aws_iam_role.external_dns.arn
}

# Application Configuration Outputs
output "application_secrets" {
  description = "Application secrets for configuration"
  value = {
    jwt_secret         = random_password.jwt_secret.result
    mongodb_password   = random_password.mongodb_password.result
    redis_password     = random_password.redis_password.result
  }
  sensitive = true
}

# Load Balancer Outputs
output "nginx_ingress_controller_dns" {
  description = "DNS name of the nginx ingress controller load balancer"
  value       = helm_release.nginx_ingress.status[0].load_balancer[0].ingress[0].hostname
}

# Kubernetes Configuration
output "kubectl_config" {
  description = "kubectl config command to configure access to the EKS cluster"
  value       = "aws eks --region ${var.aws_region} update-kubeconfig --name ${module.eks.cluster_id}"
}

# Monitoring URLs
output "monitoring_urls" {
  description = "URLs for monitoring and observability tools"
  value = {
    grafana_url     = "https://${var.domain_name}/grafana"
    prometheus_url  = "https://${var.domain_name}/prometheus"
    alertmanager_url = "https://${var.domain_name}/alertmanager"
  }
}

# Application URLs
output "application_urls" {
  description = "URLs for the Smart Village Platform"
  value = {
    main_app    = "https://${var.domain_name}"
    api_docs    = "https://${var.domain_name}/api/docs"
    monitoring  = "https://${var.domain_name}/monitoring"
    health_check = "https://${var.domain_name}/health"
  }
}